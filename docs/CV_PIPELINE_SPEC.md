# Floorplan — CV Pipeline Specification (Phase 1)

> **Companion document to:** `docs/BACKEND_SPEC.md`
> Version 1.0 | June 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Input Handling](#2-input-handling)
3. [Preprocessing](#3-preprocessing)
4. [Room Detection](#4-room-detection)
5. [Polygon Extraction](#5-polygon-extraction)
6. [Output Format](#6-output-format)
7. [Failure Modes & Fallbacks](#7-failure-modes--fallbacks)
8. [Performance Targets](#8-performance-targets)
9. [Test Cases](#9-test-cases)
10. [Phase 2 Migration Path](#10-phase-2-migration-path)

---

## 1. Overview

The Phase 1 CV pipeline is a classical computer vision implementation using OpenCV. It requires no trained model weights, has zero per-request API cost, and runs entirely on the FastAPI backend server.

Its job is narrow and well-defined: **given a floor plan image, return a list of polygon boundaries representing individual rooms in pixel coordinates.**

It does not classify room types (all rooms return `room_type: "unknown"`). It does not detect doors, windows, or furniture. Room type labeling is deferred to the user via the correction UI.

### Pipeline Summary

```
Input image (PNG)
    │
    ▼
1. Grayscale conversion
    │
    ▼
2. Noise reduction (Gaussian blur)
    │
    ▼
3. Edge detection (Canny)
    │
    ▼
4. Gap closing (morphological close)
    │
    ▼
5. Contour detection
    │
    ▼
6. Contour filtering (area, aspect ratio)
    │
    ▼
7. Polygon approximation
    │
    ▼
Output: list of room polygons
```

---

## 2. Input Handling

### 2.1 Accepted Input

The pipeline always receives a **PNG file path**. PDF and JPG conversion to PNG happens upstream in the FastAPI route handler before the CV pipeline is called. The pipeline never handles PDFs or JPGs directly.

```python
def detect_rooms(image_path: str) -> CVResult:
    """
    Entry point for the Phase 1 CV pipeline.

    Args:
        image_path: Absolute path to a PNG file on disk.

    Returns:
        CVResult dataclass (see Section 6).

    Raises:
        CVPipelineError: If the image cannot be loaded or processing fails fatally.
    """
```

### 2.2 Image Loading

```python
import cv2
import numpy as np

image = cv2.imread(image_path)

if image is None:
    raise CVPipelineError(f"Failed to load image at {image_path}")

image_height, image_width = image.shape[:2]
total_area_px = image_width * image_height
```

### 2.3 Image Size Constraints

| Constraint | Value | Reason |
|---|---|---|
| Minimum dimension | 400px on shortest side | Below this, walls are too thin to detect reliably |
| Maximum dimension | 6000px on longest side | Above this, processing time exceeds target |
| Maximum file size | 20MB | Enforced upstream in FastAPI upload handler |

If the image is larger than 6000px on its longest side, **resize before processing** (not before storage — the original full-resolution image is stored, only a resized copy is passed to the pipeline):

```python
MAX_DIM = 6000

def resize_for_cv(image: np.ndarray) -> tuple[np.ndarray, float]:
    """Returns resized image and the scale factor applied."""
    h, w = image.shape[:2]
    scale = 1.0
    if max(h, w) > MAX_DIM:
        scale = MAX_DIM / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image, scale
```

The `scale` factor is used at the end to project polygon coordinates back to the original image dimensions.

---

## 3. Preprocessing

### 3.1 Grayscale Conversion

```python
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
```

### 3.2 Contrast Normalization (CLAHE)

Many floor plan PDFs render with low contrast between walls and background. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to normalize before edge detection:

```python
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
gray = clahe.apply(gray)
```

This step significantly improves detection on light-colored or faded floor plans.

### 3.3 Noise Reduction

```python
# Gaussian blur to suppress JPEG/PNG compression artifacts and fine texture
blurred = cv2.GaussianBlur(gray, ksize=(5, 5), sigmaX=0)
```

Kernel size `(5, 5)` is the default. For high-resolution images (>3000px wide), increase to `(7, 7)` to handle proportionally thicker walls:

```python
kernel_size = (7, 7) if image_width > 3000 else (5, 5)
blurred = cv2.GaussianBlur(gray, kernel_size, 0)
```

---

## 4. Room Detection

### 4.1 Edge Detection (Canny)

```python
# threshold1: lower hysteresis threshold
# threshold2: upper hysteresis threshold
# apertureSize: Sobel kernel size (3 = standard)
edges = cv2.Canny(blurred, threshold1=50, threshold2=150, apertureSize=3)
```

**Threshold tuning guidance:**

| Floor plan type | threshold1 | threshold2 |
|---|---|---|
| High contrast (black walls, white bg) | 50 | 150 |
| Low contrast (grey walls) | 30 | 100 |
| Rendered/colored plans | 40 | 120 |

For Phase 1, use fixed values (50, 150). Adaptive thresholding is a Phase 2 concern.

### 4.2 Gap Closing (Morphological Close)

Wall lines in floor plans often have small gaps at doorways, openings, or rendering artifacts. Closing connects these gaps so rooms appear as fully enclosed contours:

```python
# Kernel shape: rectangle for straight walls
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))

# MORPH_CLOSE = dilation followed by erosion
# iterations=2 closes larger gaps without bloating the walls
closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
```

**Visual effect of this step:**

```
Before close:           After close:
█ █ █ _ █ █ █          █ █ █ █ █ █ █
                        (gap filled)
```

If rooms are consistently failing to close (detected as one large region instead of separate rooms), increase iterations to 3. If walls are merging into each other, decrease to 1.

### 4.3 Optional: Dilation Before Contour Detection

On thin-walled plans (walls rendered at 1–2px), a single dilation pass after closing helps contour detection:

```python
# Only apply if walls appear thin on inspection
dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
closed = cv2.dilate(closed, dilate_kernel, iterations=1)
```

This is off by default in Phase 1 — enable via environment variable `CV_DILATE_THIN_WALLS=true`.

---

## 5. Polygon Extraction

### 5.1 Contour Detection

```python
contours, hierarchy = cv2.findContours(
    closed,
    mode=cv2.RETR_CCOMP,       # Retrieves all contours with 2-level hierarchy
    method=cv2.CHAIN_APPROX_SIMPLE  # Compresses horizontal/vertical/diagonal segments
)
```

`RETR_CCOMP` is preferred over `RETR_EXTERNAL` because it captures inner rooms that may be enclosed by outer walls. The hierarchy is used in filtering (step 5.2) to distinguish interior rooms from outer boundaries.

### 5.2 Contour Filtering

Filter out contours that are clearly not rooms:

```python
MIN_AREA_RATIO = float(os.getenv("CV_MIN_ROOM_AREA_RATIO", "0.005"))  # 0.5% of image
MAX_AREA_RATIO = float(os.getenv("CV_MAX_ROOM_AREA_RATIO", "0.90"))   # 90% of image

min_area = total_area_px * MIN_AREA_RATIO
max_area = total_area_px * MAX_AREA_RATIO

valid_contours = []
for i, contour in enumerate(contours):
    area = cv2.contourArea(contour)

    # Filter by area
    if area < min_area or area > max_area:
        continue

    # Filter by aspect ratio — reject extreme slivers (likely wall artifacts)
    x, y, w, h = cv2.boundingRect(contour)
    aspect_ratio = max(w, h) / max(min(w, h), 1)
    if aspect_ratio > 10:
        continue

    # Filter by solidity — reject highly irregular shapes (noise)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity = area / hull_area if hull_area > 0 else 0
    if solidity < 0.4:
        continue

    valid_contours.append(contour)
```

**Filter thresholds explained:**

| Filter | Value | Rejects |
|---|---|---|
| Min area | 0.5% of image | Noise, small details, door swings |
| Max area | 90% of image | The full floor plan boundary, exterior walls |
| Aspect ratio | > 10:1 | Corridors rendered as thin rectangles, wall segments |
| Solidity | < 0.4 | Highly irregular noise contours |

### 5.3 Polygon Approximation

Simplify each contour to a polygon with fewer points:

```python
def contour_to_polygon(contour: np.ndarray, epsilon_ratio: float = 0.02) -> list[dict]:
    """
    Approximates a contour to a simplified polygon.

    Args:
        contour: OpenCV contour array.
        epsilon_ratio: Approximation accuracy as a ratio of contour perimeter.
                       Higher = fewer points, less accurate.
                       Lower = more points, more accurate.

    Returns:
        List of {"x": int, "y": int} dicts.
    """
    perimeter = cv2.arcLength(contour, closed=True)
    epsilon = epsilon_ratio * perimeter
    approx = cv2.approxPolyDP(contour, epsilon, closed=True)

    # Reshape from (N, 1, 2) to list of {"x", "y"} dicts
    return [{"x": int(pt[0][0]), "y": int(pt[0][1])} for pt in approx]
```

**`epsilon_ratio` guidance:**

| Value | Result |
|---|---|
| `0.01` | More points, follows curves better, noisier on straight walls |
| `0.02` | Default — good balance for rectilinear floor plans |
| `0.04` | Fewer points, cleaner rectangles, may cut corners |

Phase 1 uses `0.02` as the fixed value.

### 5.4 Minimum Polygon Points

After approximation, discard any polygon with fewer than 3 points (degenerate):

```python
polygons = [contour_to_polygon(c) for c in valid_contours]
polygons = [p for p in polygons if len(p) >= 3]
```

### 5.5 Coordinate Projection

If the image was resized in step 2.3, project all polygon coordinates back to original image dimensions:

```python
def scale_polygon(polygon: list[dict], scale: float) -> list[dict]:
    if scale == 1.0:
        return polygon
    return [{"x": int(pt["x"] / scale), "y": int(pt["y"] / scale)} for pt in polygon]

polygons = [scale_polygon(p, scale_factor) for p in polygons]
```

---

## 6. Output Format

### 6.1 Python Dataclasses

```python
# backend/cv/types.py
from dataclasses import dataclass, field

@dataclass
class DetectedRoom:
    label: str                      # Always "Room" in Phase 1 (no classification)
    room_type: str                  # Always "unknown" in Phase 1
    polygon_px: list[dict]          # [{"x": int, "y": int}, ...]
    confidence: float               # Estimated confidence: 0.0 – 1.0
                                    # Phase 1 uses area-based heuristic (see 6.2)
    area_px: int                    # Raw pixel area of the contour
    bbox: dict                      # {"x": int, "y": int, "w": int, "h": int}

@dataclass
class CVResult:
    phase: str                      # "phase1"
    rooms: list[DetectedRoom]       # Empty list if none detected — never None
    image_width_px: int
    image_height_px: int
    processing_time_ms: int
    error: str | None               # None on success
```

### 6.2 Confidence Heuristic (Phase 1)

Phase 1 has no ML confidence score. A proxy is computed from contour solidity and area regularity:

```python
def estimate_confidence(contour: np.ndarray, total_area: int) -> float:
    area = cv2.contourArea(contour)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)

    solidity = area / hull_area if hull_area > 0 else 0
    # Rooms that are more convex (closer to rectangles) get higher confidence
    # Scale to 0.4–0.85 range — Phase 1 never claims > 0.85 confidence
    return round(min(0.4 + (solidity * 0.45), 0.85), 2)
```

### 6.3 Full Pipeline Function

```python
# backend/cv/phase1_opencv.py
import time
import cv2
import numpy as np
import os
from .types import CVResult, DetectedRoom, CVPipelineError

def detect_rooms(image_path: str) -> CVResult:
    start_ms = time.time()

    # 1. Load
    image = cv2.imread(image_path)
    if image is None:
        raise CVPipelineError(f"Cannot load image: {image_path}")

    original_h, original_w = image.shape[:2]
    image_cv, scale = resize_for_cv(image)
    total_area = image_cv.shape[0] * image_cv.shape[1]

    # 2. Preprocess
    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    kernel_size = (7, 7) if image_cv.shape[1] > 3000 else (5, 5)
    blurred = cv2.GaussianBlur(gray, kernel_size, 0)

    # 3. Edges
    edges = cv2.Canny(blurred, 50, 150, apertureSize=3)

    # 4. Close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

    # 5. Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

    # 6. Filter
    min_area = total_area * float(os.getenv("CV_MIN_ROOM_AREA_RATIO", "0.005"))
    max_area = total_area * float(os.getenv("CV_MAX_ROOM_AREA_RATIO", "0.90"))
    valid = []
    for c in contours:
        area = cv2.contourArea(c)
        if not (min_area <= area <= max_area):
            continue
        x, y, w, h = cv2.boundingRect(c)
        if max(w, h) / max(min(w, h), 1) > 10:
            continue
        hull_area = cv2.contourArea(cv2.convexHull(c))
        if (area / hull_area if hull_area > 0 else 0) < 0.4:
            continue
        valid.append(c)

    # 7. Build output
    rooms = []
    for i, c in enumerate(valid):
        polygon = contour_to_polygon(c)
        polygon = scale_polygon(polygon, scale)
        if len(polygon) < 3:
            continue
        area = cv2.contourArea(c)
        x, y, w, h = cv2.boundingRect(c)
        rooms.append(DetectedRoom(
            label=f"Room {i + 1}",
            room_type="unknown",
            polygon_px=polygon,
            confidence=estimate_confidence(c, total_area),
            area_px=int(area / (scale ** 2)),  # Scale area back to original
            bbox={"x": int(x/scale), "y": int(y/scale),
                  "w": int(w/scale), "h": int(h/scale)},
        ))

    elapsed_ms = int((time.time() - start_ms) * 1000)

    return CVResult(
        phase="phase1",
        rooms=rooms,
        image_width_px=original_w,
        image_height_px=original_h,
        processing_time_ms=elapsed_ms,
        error=None,
    )
```

---

## 7. Failure Modes & Fallbacks

### 7.1 Known Failure Scenarios

| Scenario | Root cause | Expected behavior |
|---|---|---|
| No rooms detected | Low contrast, stylized plan, hand-drawn | Return empty `rooms: []`, `error: null` — not a pipeline error |
| Too many false rooms | Hatching, texture, furniture in plan | User deletes false positives via correction UI |
| Rooms merged | Doorways too wide, walls too thin | User splits via manual polygon drawing |
| Single giant room detected | Missing interior walls | User adds rooms manually |
| Pipeline crash | Corrupt image, unsupported encoding | Raise `CVPipelineError`, return `cv_status: "failed"` |

### 7.2 Exception Handling

```python
# backend/cv/types.py
class CVPipelineError(Exception):
    """Raised when the CV pipeline encounters an unrecoverable error."""
    pass
```

```python
# In the FastAPI route handler
try:
    cv_result = detect_rooms(processed_image_path)
except CVPipelineError as e:
    await update_project_cv_status(project_id, "failed", str(e))
    # Still return 201 with empty rooms — do not block the user
    return JSONResponse(status_code=201, content={
        "project_id": project_id,
        "cv_status": "failed",
        "cv_error": str(e),
        "rooms": []
    })
```

### 7.3 Partial Results

If the pipeline detects at least one valid room, it always returns what it found — it does not require a minimum room count to return results. Partial detection is always better than nothing, as the user can add missing rooms manually.

---

## 8. Performance Targets

| Metric | Target | Measured on |
|---|---|---|
| Processing time | < 5 seconds | Standard A4 floor plan at 150 DPI (~1240×1754px) |
| Processing time | < 10 seconds | Large floor plan at 300 DPI (~2480×3508px) |
| Memory usage | < 500MB peak | Single worker process |
| Concurrency | Sequential (1 at a time) | Render free tier single worker |

### Render Free Tier Considerations

The Render free tier provides 512MB RAM and a shared CPU. The pipeline must stay within these limits:

- Process one upload at a time — no threading in Phase 1
- Images > 6000px on longest side are resized before CV (Section 2.3)
- OpenCV is imported at module load, not per request, to avoid repeated import overhead
- Use `opencv-python-headless` (not `opencv-python`) — the headless build has no GUI dependencies and is ~100MB smaller

---

## 9. Test Cases

The following test cases should be implemented in `backend/tests/test_cv_phase1.py`.

### 9.1 Test Floor Plans

Store test images in `backend/tests/fixtures/floor_plans/`:

| Filename | Description | Expected rooms |
|---|---|---|
| `clean_apartment_2br.png` | Simple 2-bedroom apartment, black walls on white | 5–7 rooms |
| `clean_studio.png` | Studio with open plan | 2–3 rooms |
| `low_contrast.png` | Grey walls on light grey background | 3–5 rooms |
| `blank.png` | Solid white image | 0 rooms |
| `corrupt.png` | Corrupted/unreadable PNG | CVPipelineError |
| `very_small.png` | 100×100px image | 0 rooms or CVPipelineError |

### 9.2 Unit Tests

```python
# backend/tests/test_cv_phase1.py
import pytest
from backend.cv.phase1_opencv import detect_rooms
from backend.cv.types import CVPipelineError

FIXTURES = "backend/tests/fixtures/floor_plans"

def test_clean_apartment_detects_rooms():
    result = detect_rooms(f"{FIXTURES}/clean_apartment_2br.png")
    assert result.phase == "phase1"
    assert result.error is None
    assert len(result.rooms) >= 3

def test_each_room_has_valid_polygon():
    result = detect_rooms(f"{FIXTURES}/clean_apartment_2br.png")
    for room in result.rooms:
        assert len(room.polygon_px) >= 3
        for pt in room.polygon_px:
            assert "x" in pt and "y" in pt
            assert isinstance(pt["x"], int) and isinstance(pt["y"], int)

def test_polygon_coords_within_image_bounds():
    result = detect_rooms(f"{FIXTURES}/clean_apartment_2br.png")
    for room in result.rooms:
        for pt in room.polygon_px:
            assert 0 <= pt["x"] <= result.image_width_px
            assert 0 <= pt["y"] <= result.image_height_px

def test_blank_image_returns_empty_rooms():
    result = detect_rooms(f"{FIXTURES}/blank.png")
    assert result.rooms == []
    assert result.error is None  # Not a pipeline error

def test_corrupt_image_raises():
    with pytest.raises(CVPipelineError):
        detect_rooms(f"{FIXTURES}/corrupt.png")

def test_all_rooms_labeled_unknown_in_phase1():
    result = detect_rooms(f"{FIXTURES}/clean_apartment_2br.png")
    for room in result.rooms:
        assert room.room_type == "unknown"

def test_processing_time_within_target():
    result = detect_rooms(f"{FIXTURES}/clean_apartment_2br.png")
    assert result.processing_time_ms < 10_000  # 10 second hard limit
```

---

## 10. Phase 2 Migration Path

The Phase 1 pipeline is designed to be a drop-in replacement. Phase 2 (CubiCasa5K) must:

- Accept the same `image_path: str` argument
- Return the same `CVResult` dataclass
- Be selectable via the `CV_PHASE` environment variable (`"phase1"` | `"phase2"`)

The router that selects the pipeline:

```python
# backend/cv/__init__.py
import os
from .types import CVResult

def detect_rooms(image_path: str) -> CVResult:
    phase = os.getenv("CV_PHASE", "phase1")
    if phase == "phase2":
        from .phase2_cubicasa import detect_rooms as _detect
    else:
        from .phase1_opencv import detect_rooms as _detect
    return _detect(image_path)
```

This ensures the FastAPI routes never need to change when upgrading the CV phase.

---

*This document covers the Phase 1 OpenCV implementation only. The Phase 2 CubiCasa5K spec will be added as a separate document when Phase 2 development begins.*

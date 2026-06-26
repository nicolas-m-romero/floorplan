# backend/cv/phase1_opencv.py
import os
import time

import cv2
import numpy as np

from .types import CVResult, DetectedRoom, CVPipelineError
from .utils import resize_for_cv


def contour_to_polygon(contour: np.ndarray, epsilon_ratio: float = 0.02) -> list[dict]:
    """Approximate a contour to a simplified polygon.

    Args:
        contour: OpenCV contour array of shape (N, 1, 2).
        epsilon_ratio: Approximation accuracy as fraction of perimeter.

    Returns:
        List of {"x": int, "y": int} dicts.
    """
    perimeter = cv2.arcLength(contour, closed=True)
    epsilon = epsilon_ratio * perimeter
    approx = cv2.approxPolyDP(contour, epsilon, closed=True)
    return [{"x": int(pt[0][0]), "y": int(pt[0][1])} for pt in approx]


def scale_polygon(polygon: list[dict], scale: float) -> list[dict]:
    """Project polygon coordinates back to original image dimensions."""
    if scale == 1.0:
        return polygon
    return [{"x": int(pt["x"] / scale), "y": int(pt["y"] / scale)} for pt in polygon]


def estimate_confidence(contour: np.ndarray, total_area: int) -> float:
    """Compute a proxy confidence score from contour solidity.

    Rooms closer to convex rectangles score higher.
    Phase 1 caps at 0.85 — never claims ML-level certainty.
    """
    area = cv2.contourArea(contour)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity = area / hull_area if hull_area > 0 else 0
    return round(min(0.4 + (solidity * 0.45), 0.85), 2)


def detect_rooms(image_path: str) -> CVResult:
    """Run the Phase 1 OpenCV room detection pipeline.

    Args:
        image_path: Absolute path to a PNG file on disk.

    Returns:
        CVResult dataclass.

    Raises:
        CVPipelineError: If the image cannot be loaded or processing fails fatally.
    """
    start_ms = time.time()

    # 1. Load image
    image = cv2.imread(image_path)
    if image is None:
        raise CVPipelineError(f"Cannot load image: {image_path}")

    original_h, original_w = image.shape[:2]

    # 2. Resize if needed; track scale to project coords back later
    image_cv, scale = resize_for_cv(image)
    cv_h, cv_w = image_cv.shape[:2]
    total_area = cv_w * cv_h

    # 3. Grayscale conversion
    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)

    # 4. CLAHE — normalises contrast on faded/low-contrast plans
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # 5. Gaussian blur — kernel scales up for high-res images
    kernel_size = (7, 7) if cv_w > 3000 else (5, 5)
    blurred = cv2.GaussianBlur(gray, kernel_size, 0)

    # 6. Canny edge detection
    canny_low = int(os.getenv("CV_CANNY_LOW", "50"))
    canny_high = int(os.getenv("CV_CANNY_HIGH", "150"))
    edges = cv2.Canny(blurred, canny_low, canny_high, apertureSize=3)

    # 7. Morphological close — bridges small gaps at doorways / rendering artifacts
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, close_kernel, iterations=2)

    # 8. Optional dilation for thin-walled plans
    if os.getenv("CV_DILATE_THIN_WALLS", "false").lower() == "true":
        dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        closed = cv2.dilate(closed, dilate_kernel, iterations=1)

    # 9. Contour detection
    contours, _ = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

    # 10. Filter contours
    min_area_ratio = float(os.getenv("CV_MIN_ROOM_AREA_RATIO", "0.005"))
    max_area_ratio = float(os.getenv("CV_MAX_ROOM_AREA_RATIO", "0.90"))
    min_area = total_area * min_area_ratio
    max_area = total_area * max_area_ratio
    epsilon_ratio = float(os.getenv("CV_EPSILON_RATIO", "0.02"))

    valid_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area <= area <= max_area):
            continue

        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = max(w, h) / max(min(w, h), 1)
        if aspect_ratio > 10:
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        if solidity < 0.4:
            continue

        valid_contours.append(contour)

    # 11. Build output rooms
    rooms = []
    room_index = 1
    for contour in valid_contours:
        polygon = contour_to_polygon(contour, epsilon_ratio)
        polygon = scale_polygon(polygon, scale)
        if len(polygon) < 3:
            continue

        area = cv2.contourArea(contour)
        x, y, w, h = cv2.boundingRect(contour)

        rooms.append(DetectedRoom(
            label=f"Room {room_index}",
            room_type="unknown",
            polygon_px=polygon,
            confidence=estimate_confidence(contour, total_area),
            area_px=int(area / (scale ** 2)),
            bbox={
                "x": int(x / scale),
                "y": int(y / scale),
                "w": int(w / scale),
                "h": int(h / scale),
            },
        ))
        room_index += 1

    elapsed_ms = int((time.time() - start_ms) * 1000)

    return CVResult(
        phase="phase1",
        rooms=rooms,
        image_width_px=original_w,
        image_height_px=original_h,
        processing_time_ms=elapsed_ms,
        error=None,
    )

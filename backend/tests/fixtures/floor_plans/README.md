# Test Fixture Floor Plans

This directory holds the PNG images used by `backend/tests/test_cv_phase1.py`.
Each file must be placed here before running the CV test suite.

The images are **not committed to the repository** because they are either
generated programmatically or sourced from freely licensed floor-plan
datasets. Instructions for producing each file are below.

---

## Fixture Descriptions

### `clean_apartment_2br.png`

**What it looks like:**
A simple two-bedroom apartment floor plan. Black walls (3–5 px wide) on a
solid white background. The layout should include:
- Two bedrooms (roughly equal size, each ≥10% of the image area)
- A living/dining room
- A kitchen
- A bathroom
- An entrance/hallway

**Recommended dimensions:** 800×600 px to 1200×900 px (landscape).

**Expected detection:** 5–7 rooms. The pipeline should reliably detect at
least 3 rooms on this image.

**How to source:**
- Generate with a vector editor (Inkscape, Illustrator) — draw black
  rectangles on a white canvas, export as PNG.
- Use any CC0/public-domain floor plan illustration.
- Use the `scripts/generate_test_fixtures.py` helper (if present in repo).

---

### `clean_studio.png`

**What it looks like:**
A single studio apartment with an open plan. Black walls on white background.
Layout includes:
- One main living/sleeping area (large, ≥40% of image area)
- A bathroom (small, enclosed)
- Optionally a small kitchen alcove

**Recommended dimensions:** 600×500 px (close to square).

**Expected detection:** 2–3 rooms. The main open area may or may not resolve
as one polygon depending on wall completeness.

---

### `low_contrast.png`

**What it looks like:**
A floor plan where the walls are a medium grey (#888888) on a light grey
background (#DDDDDD). No black or white. Wall thickness 3–5 px. Layout can
be any 3–5 room apartment.

**Recommended dimensions:** 800×600 px.

**Expected detection:** 3–5 rooms. This fixture validates that CLAHE
preprocessing recovers detection performance under low-contrast conditions.

---

### `blank.png`

**What it looks like:**
A solid white image with no content.

**Recommended dimensions:** 400×400 px.

**How to generate (Python):**
```python
from PIL import Image
Image.new("RGB", (400, 400), color=(255, 255, 255)).save("blank.png")
```

**Expected detection:** 0 rooms. The pipeline must return an empty `rooms`
list and `error: None` — a blank image is valid input, not a pipeline error.

---

### `corrupt.png`

**What it looks like:**
A file with the `.png` extension but containing invalid/garbage bytes that
OpenCV cannot decode.

**How to generate (Python):**
```python
with open("corrupt.png", "wb") as f:
    f.write(b"NOTAPNG\x00\xff\xfe garbage bytes that cv2.imread cannot parse")
```

**Expected behavior:** `detect_rooms()` raises `CVPipelineError`. The file
must be unreadable by `cv2.imread()` (it returns `None`).

---

### `very_small.png`

**What it looks like:**
A tiny 100×100 px white image. Too small for meaningful room detection (walls
would be sub-pixel at real-world scale).

**How to generate (Python):**
```python
from PIL import Image
Image.new("RGB", (100, 100), color=(255, 255, 255)).save("very_small.png")
```

**Expected behavior:** 0 rooms returned (no contour passes the minimum area
filter at 0.5% of a 10,000 px² image = 50 px² minimum room size).

---

## Quick-Generate Script

Run this from the repository root to create the programmatically-generated
fixtures (all except `clean_apartment_2br.png` and `clean_studio.png`, which
require manual drawing):

```python
# python scripts/generate_simple_fixtures.py
from PIL import Image, ImageDraw
import pathlib

OUT = pathlib.Path("backend/tests/fixtures/floor_plans")
OUT.mkdir(parents=True, exist_ok=True)

# blank.png
Image.new("RGB", (400, 400), (255, 255, 255)).save(OUT / "blank.png")

# very_small.png
Image.new("RGB", (100, 100), (255, 255, 255)).save(OUT / "very_small.png")

# corrupt.png
(OUT / "corrupt.png").write_bytes(b"NOTAPNG\x00\xff garbage")

print("Simple fixtures generated.")
```

For `clean_apartment_2br.png` and `clean_studio.png`, use any freely
licensed floor plan PNG or draw one with a vector editor, then export at the
recommended dimensions above.

# FloorCraft — Backend Specification

> **Companion document to:** `docs/PRODUCT_SPEC.md`
> Version 1.0 | June 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [API Reference](#4-api-reference)
5. [Computer Vision Pipeline](#5-computer-vision-pipeline)
6. [File Storage](#6-file-storage)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Data Contracts (Shapes)](#8-data-contracts-shapes)
9. [Error Handling](#9-error-handling)
10. [Environment Variables](#10-environment-variables)
11. [Deployment](#11-deployment)

---

## 1. Overview

The FloorCraft backend is a Python FastAPI service responsible for:

- Receiving and storing uploaded floor plan files
- Running the CV pipeline to detect room geometry
- Serving and persisting project/layout data via Supabase
- Generating shareable project links
- Serving the furniture catalog

The backend is **stateless** — all persistent state lives in Supabase (PostgreSQL + Storage). The FastAPI service can be restarted or scaled without data loss. Authentication is delegated entirely to Supabase Auth; the backend validates JWTs on protected routes.

### Interaction Model

```
Browser (React)
    │
    ├── Supabase Auth (login / token issuance)
    │
    ├── FastAPI Backend (Render)
    │       ├── POST /upload          → CV pipeline → returns room polygons
    │       ├── GET/POST /projects    → CRUD for saved layouts
    │       ├── GET /catalog          → serves furniture.json
    │       └── GET /share/:token     → resolves share links
    │
    └── Supabase (direct from browser for reads after auth)
            ├── PostgreSQL            → projects, rooms, placements, share_links
            └── Storage               → floor plan images
```

---

## 2. Technology Stack

| Component | Choice | Rationale |
|---|---|---|
| Language | Python 3.11+ | CV ecosystem (OpenCV, NumPy) lives here |
| Framework | FastAPI | Async, automatic OpenAPI docs, easy file uploads |
| CV — Phase 1 | OpenCV 4.x | Classical pipeline, zero cost |
| CV — Phase 2 | CubiCasa5K (PyTorch) | Pre-trained, self-hosted, zero per-request cost |
| Database | PostgreSQL via Supabase | Free tier, managed, row-level security |
| File Storage | Supabase Storage | Free tier, S3-compatible |
| Auth | Supabase Auth (JWT) | Handles email + Google OAuth |
| PDF conversion | pdf2image + Poppler | Convert uploaded PDFs to images for CV |
| Hosting | Render (free tier) | Auto-deploy from GitHub, sufficient for low traffic |
| Dependency mgmt | `pyproject.toml` + pip | Standard, no heavy tooling required |

---

## 3. Database Schema

All tables live in Supabase PostgreSQL. Row-Level Security (RLS) is enabled on all tables. UUIDs are used as primary keys throughout.

### 3.1 Table: `users`

Managed by Supabase Auth. Not manually created — exists in the `auth` schema. Referenced by other tables via `user_id UUID` foreign keys pointing to `auth.users(id)`.

---

### 3.2 Table: `projects`

A project is the top-level container — one per uploaded floor plan.

```sql
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Floor plan file reference
  floor_plan_path TEXT,             -- Supabase Storage path, e.g. "user_id/project_id/floorplan.png"
  floor_plan_width_px  INTEGER,     -- Pixel width of the stored image
  floor_plan_height_px INTEGER,     -- Pixel height of the stored image

  -- Scale calibration (set by user post-CV)
  calibration_point_1  JSONB,       -- { x: px, y: px }
  calibration_point_2  JSONB,       -- { x: px, y: px }
  calibration_real_distance FLOAT,  -- Real-world distance in base unit (cm)
  pixels_per_cm        FLOAT,       -- Derived: distance_px / calibration_real_distance

  -- User preferences
  unit_system     TEXT NOT NULL DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric')),

  -- CV processing state
  cv_status       TEXT NOT NULL DEFAULT 'pending'
                    CHECK (cv_status IN ('pending', 'processing', 'complete', 'failed')),
  cv_phase        TEXT CHECK (cv_phase IN ('phase1', 'phase2')),
  cv_error        TEXT,             -- Error message if cv_status = 'failed'

  -- Sharing
  is_public       BOOLEAN NOT NULL DEFAULT false
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**RLS Policies:**

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Owners can read their own projects
CREATE POLICY "owner_read" ON projects
  FOR SELECT USING (auth.uid() = user_id);

-- Public projects readable by anyone (for share links)
CREATE POLICY "public_read" ON projects
  FOR SELECT USING (is_public = true);

-- Owners can insert, update, delete their own projects
CREATE POLICY "owner_write" ON projects
  FOR ALL USING (auth.uid() = user_id);
```

---

### 3.3 Table: `rooms`

Each room belongs to a project and stores the polygon boundary detected by CV (and corrected by the user).

```sql
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  label       TEXT NOT NULL DEFAULT 'Room',   -- e.g. "Living Room", "Bedroom"
  room_type   TEXT,                            -- CV-inferred type: 'bedroom' | 'living_room' | 'kitchen' | 'bathroom' | 'dining' | 'office' | 'hallway' | 'unknown'
  is_selected BOOLEAN NOT NULL DEFAULT true,  -- Whether user opted this room into decoration
  sort_order  INTEGER NOT NULL DEFAULT 0,     -- Display order in the room list

  -- Polygon in pixel coordinates (relative to floor plan image)
  -- Array of {x, y} points. Minimum 3 points. Stored as JSONB array.
  -- Example: [{"x": 100, "y": 200}, {"x": 300, "y": 200}, ...]
  polygon_px  JSONB NOT NULL DEFAULT '[]',

  -- Derived dimensions (computed from polygon + calibration, stored for quick access)
  area_cm2    FLOAT,     -- Area in square centimeters
  bbox_width_cm  FLOAT,  -- Bounding box width in cm
  bbox_height_cm FLOAT,  -- Bounding box height in cm

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**RLS Policies:**

```sql
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON rooms
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_project_read" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = rooms.project_id AND p.is_public = true
    )
  );
```

---

### 3.4 Table: `furniture_placements`

Each row is a single piece of furniture placed in a room.

```sql
CREATE TABLE furniture_placements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Catalog reference (null if custom item)
  catalog_item_id  TEXT,    -- Matches "id" field in furniture.json, e.g. "sofa_standard"

  -- Display name (may differ from catalog name if user renamed)
  label            TEXT NOT NULL,

  -- Position in pixel coordinates on the floor plan canvas
  -- Origin: top-left of the room bounding box
  position_x_px    FLOAT NOT NULL DEFAULT 0,
  position_y_px    FLOAT NOT NULL DEFAULT 0,

  -- Rotation in degrees (0, 90, 180, 270 or free angle)
  rotation_deg     FLOAT NOT NULL DEFAULT 0,

  -- Real-world dimensions in centimeters (always stored in cm; converted for display)
  width_cm         FLOAT NOT NULL,   -- X-axis dimension (depth from user's perspective)
  depth_cm         FLOAT NOT NULL,   -- Y-axis dimension (width from user's perspective)
  height_cm        FLOAT NOT NULL,   -- Z-axis dimension (used in 3D view)

  -- 3D vertical positioning (for stacked items, wall-mounted objects)
  elevation_cm     FLOAT NOT NULL DEFAULT 0,   -- Bottom of object from floor level

  -- Visual (simple color for 3D box, not photorealistic)
  color_hex        TEXT NOT NULL DEFAULT '#94A3B8',

  -- Custom item flag
  is_custom        BOOLEAN NOT NULL DEFAULT false,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER placements_updated_at
  BEFORE UPDATE ON furniture_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**RLS Policies:**

```sql
ALTER TABLE furniture_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON furniture_placements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_project_read" ON furniture_placements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = furniture_placements.project_id AND p.is_public = true
    )
  );
```

---

### 3.5 Table: `share_links`

Tracks shareable links generated for projects.

```sql
CREATE TABLE share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,          -- NULL = never expires
  is_active   BOOLEAN NOT NULL DEFAULT true
);
```

**RLS Policies:**

```sql
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON share_links
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can read active share links (needed for unauthenticated share resolution)
CREATE POLICY "public_token_read" ON share_links
  FOR SELECT USING (is_active = true);
```

---

### 3.6 Table: `custom_catalog_items`

User-defined furniture items that persist across sessions.

```sql
CREATE TABLE custom_catalog_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'custom',
  width_cm    FLOAT NOT NULL,
  depth_cm    FLOAT NOT NULL,
  height_cm   FLOAT NOT NULL,
  color_hex   TEXT NOT NULL DEFAULT '#94A3B8',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON custom_catalog_items
  FOR ALL USING (auth.uid() = user_id);
```

---

### 3.7 Entity Relationship Summary

```
auth.users
    │
    ├──< projects (user_id)
    │       │
    │       ├──< rooms (project_id)
    │       │       │
    │       │       └──< furniture_placements (room_id, project_id)
    │       │
    │       └──< share_links (project_id)
    │
    └──< custom_catalog_items (user_id)
```

---

## 4. API Reference

Base URL: `https://api.floorcraft.app` (production) | `http://localhost:8000` (local)

All protected routes require the header:
```
Authorization: Bearer <supabase_access_token>
```

Responses always return `Content-Type: application/json`. Errors follow the shape defined in [Section 9](#9-error-handling).

---

### 4.1 Health

#### `GET /health`

**Auth:** None

**Response `200`:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "cv_phase": "phase1"
}
```

---

### 4.2 Floor Plan Upload

#### `POST /upload`

Uploads a floor plan file, stores it in Supabase Storage, creates a `projects` record, and queues CV processing.

**Auth:** Required

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Floor plan image or PDF. Max 20MB. |
| `project_name` | string | No | Defaults to `"Untitled Project"` |

**Accepted MIME types:** `image/jpeg`, `image/png`, `application/pdf`

**Processing:**
1. Validate file type and size
2. If PDF: convert first page to PNG via `pdf2image` at 150 DPI
3. Store image in Supabase Storage at `{user_id}/{project_id}/floorplan.png`
4. Create `projects` record with `cv_status = 'processing'`
5. Run CV pipeline synchronously (Phase 1) or hand off to background task
6. Insert detected `rooms` records
7. Update `projects.cv_status = 'complete'`

**Response `201`:**
```json
{
  "project_id": "uuid",
  "name": "Untitled Project",
  "floor_plan_url": "https://...",
  "floor_plan_width_px": 2480,
  "floor_plan_height_px": 3508,
  "cv_status": "complete",
  "cv_phase": "phase1",
  "rooms": [
    {
      "id": "uuid",
      "label": "Living Room",
      "room_type": "living_room",
      "polygon_px": [
        {"x": 120, "y": 80},
        {"x": 520, "y": 80},
        {"x": 520, "y": 380},
        {"x": 120, "y": 380}
      ],
      "is_selected": true
    }
  ]
}
```

**Error cases:**
- `400` — unsupported file type or file too large
- `422` — CV pipeline could not detect any rooms (returns empty rooms array, not an error)
- `500` — CV pipeline crashed

---

### 4.3 Projects

#### `GET /projects`

Returns all projects belonging to the authenticated user.

**Auth:** Required

**Response `200`:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My Apartment",
      "created_at": "2025-06-01T12:00:00Z",
      "updated_at": "2025-06-10T09:30:00Z",
      "floor_plan_thumbnail_url": "https://...",
      "cv_status": "complete",
      "unit_system": "imperial",
      "room_count": 4,
      "is_public": false
    }
  ]
}
```

---

#### `GET /projects/:project_id`

Returns full project data including rooms and furniture placements.

**Auth:** Required (owner) or None (if `is_public = true`)

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "My Apartment",
  "floor_plan_url": "https://...",
  "floor_plan_width_px": 2480,
  "floor_plan_height_px": 3508,
  "unit_system": "imperial",
  "calibration": {
    "point_1": {"x": 100, "y": 200},
    "point_2": {"x": 500, "y": 200},
    "real_distance_cm": 365.76,
    "pixels_per_cm": 1.094
  },
  "cv_status": "complete",
  "cv_phase": "phase1",
  "is_public": false,
  "created_at": "2025-06-01T12:00:00Z",
  "updated_at": "2025-06-10T09:30:00Z",
  "rooms": [
    {
      "id": "uuid",
      "label": "Living Room",
      "room_type": "living_room",
      "is_selected": true,
      "sort_order": 0,
      "polygon_px": [{"x": 120, "y": 80}, "..."],
      "area_cm2": 1440000,
      "bbox_width_cm": 365.76,
      "bbox_height_cm": 304.8,
      "furniture_placements": [
        {
          "id": "uuid",
          "catalog_item_id": "sofa_standard",
          "label": "Sofa",
          "position_x_px": 200,
          "position_y_px": 150,
          "rotation_deg": 90,
          "width_cm": 228.6,
          "depth_cm": 91.44,
          "height_cm": 83.82,
          "elevation_cm": 0,
          "color_hex": "#94A3B8",
          "is_custom": false
        }
      ]
    }
  ]
}
```

---

#### `PATCH /projects/:project_id`

Updates project-level metadata (name, unit system, calibration, share visibility).

**Auth:** Required (owner only)

**Request body** (all fields optional):
```json
{
  "name": "My Apartment Layout",
  "unit_system": "metric",
  "is_public": true,
  "calibration": {
    "point_1": {"x": 100, "y": 200},
    "point_2": {"x": 500, "y": 200},
    "real_distance_cm": 365.76
  }
}
```

**Notes:**
- When `calibration` is provided, `pixels_per_cm` is computed server-side:
  ```
  distance_px = sqrt((p2.x - p1.x)² + (p2.y - p1.y)²)
  pixels_per_cm = distance_px / real_distance_cm
  ```
- All existing `furniture_placements` pixel positions remain unchanged; unit conversion is handled client-side using the calibration ratio.

**Response `200`:** Updated project object (same shape as `GET /projects/:project_id`)

---

#### `DELETE /projects/:project_id`

Deletes project, all rooms, all placements, and the floor plan image from storage.

**Auth:** Required (owner only)

**Response `204`:** No content

---

#### `POST /projects/:project_id/duplicate`

Creates a full deep copy of a project (rooms + placements, excluding share links).

**Auth:** Required (owner only)

**Response `201`:** New project object

---

### 4.4 Rooms

#### `PATCH /projects/:project_id/rooms/:room_id`

Updates a single room's polygon, label, type, or selection state.

**Auth:** Required (owner only)

**Request body** (all fields optional):
```json
{
  "label": "Master Bedroom",
  "room_type": "bedroom",
  "is_selected": true,
  "sort_order": 1,
  "polygon_px": [
    {"x": 120, "y": 80},
    {"x": 520, "y": 80},
    {"x": 520, "y": 380},
    {"x": 120, "y": 380}
  ]
}
```

**Note:** When `polygon_px` is updated and the project has a valid calibration, `area_cm2`, `bbox_width_cm`, and `bbox_height_cm` are recomputed server-side.

**Response `200`:** Updated room object

---

#### `POST /projects/:project_id/rooms`

Manually adds a room (when CV missed one).

**Auth:** Required (owner only)

**Request body:**
```json
{
  "label": "Balcony",
  "room_type": "unknown",
  "polygon_px": [
    {"x": 600, "y": 100},
    {"x": 750, "y": 100},
    {"x": 750, "y": 250},
    {"x": 600, "y": 250}
  ]
}
```

**Response `201`:** New room object

---

#### `DELETE /projects/:project_id/rooms/:room_id`

Deletes a room and all its furniture placements.

**Auth:** Required (owner only)

**Response `204`:** No content

---

### 4.5 Furniture Placements

#### `POST /projects/:project_id/rooms/:room_id/placements`

Adds a furniture item to a room.

**Auth:** Required (owner only)

**Request body:**
```json
{
  "catalog_item_id": "sofa_standard",
  "label": "Sofa",
  "position_x_px": 200,
  "position_y_px": 150,
  "rotation_deg": 0,
  "width_cm": 228.6,
  "depth_cm": 91.44,
  "height_cm": 83.82,
  "elevation_cm": 0,
  "color_hex": "#94A3B8",
  "is_custom": false
}
```

**Response `201`:** Created placement object with `id`

---

#### `PATCH /projects/:project_id/rooms/:room_id/placements/:placement_id`

Updates position, rotation, dimensions, or elevation of a placed item. Called frequently during drag operations — should be lightweight.

**Auth:** Required (owner only)

**Request body** (all fields optional):
```json
{
  "position_x_px": 220,
  "position_y_px": 160,
  "rotation_deg": 90,
  "width_cm": 228.6,
  "depth_cm": 91.44,
  "height_cm": 83.82,
  "elevation_cm": 91.44,
  "color_hex": "#64748B"
}
```

**Response `200`:** Updated placement object

---

#### `DELETE /projects/:project_id/rooms/:room_id/placements/:placement_id`

Removes a furniture item from the room.

**Auth:** Required (owner only)

**Response `204`:** No content

---

#### `PUT /projects/:project_id/rooms/:room_id/placements`

Bulk-replaces all placements for a room. Used for auto-save — sends the full current state of the canvas in one call rather than many individual PATCHes.

**Auth:** Required (owner only)

**Request body:**
```json
{
  "placements": [
    {
      "id": "uuid-existing",
      "catalog_item_id": "sofa_standard",
      "label": "Sofa",
      "position_x_px": 220,
      "position_y_px": 160,
      "rotation_deg": 90,
      "width_cm": 228.6,
      "depth_cm": 91.44,
      "height_cm": 83.82,
      "elevation_cm": 0,
      "color_hex": "#94A3B8",
      "is_custom": false
    }
  ]
}
```

**Behavior:** Deletes all existing placements for the room, inserts the provided array. Runs in a transaction.

**Response `200`:**
```json
{ "replaced": 4 }
```

---

### 4.6 Share Links

#### `POST /projects/:project_id/share`

Generates a unique share token and sets `is_public = true` on the project.

**Auth:** Required (owner only)

**Request body** (optional):
```json
{
  "expires_at": "2025-12-31T23:59:59Z"
}
```

**Response `201`:**
```json
{
  "token": "abc123xyz",
  "share_url": "https://floorcraft.app/share/abc123xyz",
  "expires_at": null
}
```

---

#### `GET /share/:token`

Resolves a share token and returns the full public project payload (same shape as `GET /projects/:project_id`).

**Auth:** None required

**Response `200`:** Full project payload

**Error cases:**
- `404` — token not found or inactive
- `410` — token expired

---

#### `DELETE /projects/:project_id/share`

Deactivates all share links for a project and sets `is_public = false`.

**Auth:** Required (owner only)

**Response `204`:** No content

---

### 4.7 Furniture Catalog

#### `GET /catalog`

Returns the full furniture catalog from `catalog/furniture.json`. No auth required. Served with aggressive caching headers (`Cache-Control: public, max-age=86400`).

**Auth:** None

**Response `200`:**
```json
{
  "version": "1.0.0",
  "categories": [
    {
      "id": "living_room",
      "label": "Living Room",
      "items": [
        {
          "id": "sofa_standard",
          "label": "Sofa",
          "default_width_cm": 228.6,
          "default_depth_cm": 91.44,
          "default_height_cm": 83.82,
          "min_width_cm": 152.4,
          "max_width_cm": 365.76,
          "color_hex": "#94A3B8",
          "tags": ["seating", "living_room"]
        }
      ]
    }
  ]
}
```

---

#### `GET /catalog/custom`

Returns all custom furniture items for the authenticated user.

**Auth:** Required

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "label": "Custom Bookshelf",
      "category": "custom",
      "width_cm": 91.44,
      "depth_cm": 30.48,
      "height_cm": 182.88,
      "color_hex": "#78716C",
      "created_at": "2025-06-05T10:00:00Z"
    }
  ]
}
```

---

#### `POST /catalog/custom`

Creates a new custom furniture item for the user.

**Auth:** Required

**Request body:**
```json
{
  "label": "Custom Bookshelf",
  "category": "custom",
  "width_cm": 91.44,
  "depth_cm": 30.48,
  "height_cm": 182.88,
  "color_hex": "#78716C"
}
```

**Response `201`:** Created item with `id`

---

#### `DELETE /catalog/custom/:item_id`

Deletes a user's custom furniture item. Does not affect existing placements that reference it.

**Auth:** Required (owner only)

**Response `204`:** No content

---

## 5. Computer Vision Pipeline

### 5.1 Pipeline Contract

The CV pipeline is invoked internally after a file upload. It receives a PNG image path and returns a structured list of detected rooms.

**Input:**
```python
def detect_rooms(image_path: str) -> CVResult:
    ...
```

**Output type `CVResult`:**
```python
@dataclass
class DetectedRoom:
    label: str                    # e.g. "Living Room"
    room_type: str                # e.g. "living_room"
    polygon_px: list[dict]        # [{"x": int, "y": int}, ...]
    confidence: float             # 0.0 – 1.0

@dataclass
class CVResult:
    phase: str                    # "phase1" | "phase2"
    rooms: list[DetectedRoom]
    image_width_px: int
    image_height_px: int
    processing_time_ms: int
    error: str | None
```

---

### 5.2 Phase 1 — Classical OpenCV Pipeline

**File:** `backend/cv/phase1_opencv.py`

**Steps:**

```
1. Load image (cv2.imread)
2. Convert to grayscale
3. Gaussian blur (kernel 5x5) to reduce noise
4. Canny edge detection (threshold1=50, threshold2=150)
5. Morphological close (kernel 3x3, iterations=2) to connect wall gaps
6. Find contours (cv2.findContours, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)
7. Filter contours:
   - Minimum area: 0.5% of total image area (removes noise)
   - Maximum area: 90% of total image area (removes the full image boundary)
8. Approximate each contour to a polygon (cv2.approxPolyDP, epsilon=0.02 * perimeter)
9. Assign room_type = "unknown" (Phase 1 cannot classify room types)
10. Return DetectedRoom list
```

**Known limitations:**
- Cannot classify room types (all return `"unknown"`)
- Struggles with rooms that share visual wall boundaries
- May detect corridors, closets, or exterior walls as rooms
- Low accuracy on color/rendered floor plans

---

### 5.3 Phase 2 — CubiCasa5K Model

**File:** `backend/cv/phase2_cubicasa.py`

**Model source:** [HuggingFace: CubiCasa5K](https://huggingface.co/cubicasa/cubicasa5k)

**Steps:**

```
1. Load model weights from local path (downloaded once at startup)
2. Preprocess image to model input size (512x512, normalized)
3. Run inference (torch.no_grad())
4. Post-process segmentation mask:
   a. Extract room-class channels from output tensor
   b. Apply argmax across channels to get per-pixel room labels
   c. Run connected components on each class to isolate individual rooms
   d. Trace contour of each component → polygon_px
   e. Map class index → room_type label
5. Filter components below minimum area threshold
6. Scale polygons back to original image dimensions
7. Return DetectedRoom list with room_type labels and confidence scores
```

**Room type class mapping (CubiCasa5K):**

| Class Index | `room_type` value |
|---|---|
| 1 | `living_room` |
| 2 | `kitchen` |
| 3 | `bedroom` |
| 4 | `bathroom` |
| 5 | `hallway` |
| 6 | `dining` |
| 7 | `office` |
| 8 | `storage` |
| 0 | `unknown` |

**Startup behavior:** Model weights are loaded once when the FastAPI app starts (`lifespan` event). This avoids per-request load time.

---

### 5.4 PDF Handling

PDFs are converted to PNG before CV processing.

```python
# backend/cv/utils.py
from pdf2image import convert_from_path

def pdf_to_png(pdf_path: str, output_path: str, dpi: int = 150) -> None:
    pages = convert_from_path(pdf_path, dpi=dpi, first_page=1, last_page=1)
    pages[0].save(output_path, "PNG")
```

Only the first page is processed. DPI of 150 produces sufficient resolution for CV without excessive file size (~2480x3508px for A4).

---

### 5.5 Polygon Format

All polygons are stored and transmitted as arrays of `{x, y}` pixel coordinate objects, where:
- `(0, 0)` is the **top-left** of the floor plan image
- `x` increases rightward
- `y` increases downward

This matches the browser canvas coordinate system (Konva.js) directly, avoiding any coordinate flipping on the frontend.

---

## 6. File Storage

### 6.1 Storage Structure (Supabase Storage Bucket: `floorplans`)

```
floorplans/                          ← Supabase Storage bucket (private)
└── {user_id}/
    └── {project_id}/
        ├── floorplan.png            ← Processed/converted floor plan image
        └── floorplan_original.pdf  ← Original upload (PDF only), kept for reference
```

All paths stored in `projects.floor_plan_path` use the relative path from the bucket root (e.g., `"abc-user-id/xyz-project-id/floorplan.png"`).

### 6.2 Access

- The bucket is **private** — not publicly accessible
- Signed URLs are generated server-side for the frontend when fetching project data
- Signed URL TTL: 1 hour (refreshed on project load)
- For public projects (share links), the backend generates a fresh signed URL on each `GET /share/:token` call

```python
# Generate a signed URL
url = supabase.storage.from_("floorplans").create_signed_url(
    path=project.floor_plan_path,
    expires_in=3600
)
```

### 6.3 Upload Size Limits

| Format | Max size |
|---|---|
| PNG / JPG | 20MB |
| PDF | 20MB |
| Processed PNG (post-conversion) | ~8MB typical at 150 DPI |

Files exceeding limits return `400` before processing begins.

### 6.4 Cleanup

When a project is deleted (`DELETE /projects/:project_id`), the backend:
1. Deletes the database records (cascade handles rooms + placements)
2. Deletes all files under `{user_id}/{project_id}/` from Supabase Storage

---

## 7. Authentication & Authorization

### 7.1 Supabase Auth

FloorCraft delegates all authentication to Supabase Auth. The backend never handles passwords or OAuth flows directly.

**Supported methods:**
- Email + password
- Google OAuth

**Token flow:**
1. Frontend authenticates via Supabase JS client
2. Supabase issues a JWT access token (15-minute expiry) + refresh token
3. Frontend sends `Authorization: Bearer <access_token>` on all API requests
4. FastAPI backend verifies the JWT signature using the Supabase JWT secret

### 7.2 JWT Verification (FastAPI)

```python
# backend/auth.py
import jwt
from fastapi import Depends, HTTPException, Header

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user(authorization: str = Header(...)) -> dict:
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload  # contains "sub" (user UUID), "email", "role"
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 7.3 Authorization Rules

All write operations (POST, PATCH, PUT, DELETE) require the authenticated user's `id` to match the resource's `user_id`. This is enforced at two levels:

- **Database level:** Supabase RLS policies (see Section 3)
- **Application level:** FastAPI route handlers verify ownership before executing queries

Double enforcement ensures security even if RLS is misconfigured.

### 7.4 Public Access

The following endpoints require no authentication:
- `GET /health`
- `GET /catalog`
- `GET /share/:token`
- `GET /projects/:project_id` (only if `is_public = true`)

---

## 8. Data Contracts (Shapes)

### 8.1 Shared Type Definitions

These types are used throughout the API and should be mirrored in the frontend TypeScript types.

#### `Point`
```typescript
interface Point {
  x: number;   // pixels
  y: number;   // pixels
}
```

#### `Calibration`
```typescript
interface Calibration {
  point_1: Point;
  point_2: Point;
  real_distance_cm: number;   // Always stored in cm regardless of unit_system
  pixels_per_cm: number;      // Derived, computed server-side
}
```

#### `Room`
```typescript
interface Room {
  id: string;
  project_id: string;
  label: string;
  room_type: RoomType;
  is_selected: boolean;
  sort_order: number;
  polygon_px: Point[];
  area_cm2: number | null;
  bbox_width_cm: number | null;
  bbox_height_cm: number | null;
  furniture_placements: FurniturePlacement[];
  created_at: string;
  updated_at: string;
}

type RoomType =
  | "living_room" | "bedroom" | "kitchen" | "bathroom"
  | "dining" | "office" | "hallway" | "storage" | "unknown";
```

#### `FurniturePlacement`
```typescript
interface FurniturePlacement {
  id: string;
  room_id: string;
  catalog_item_id: string | null;
  label: string;
  position_x_px: number;
  position_y_px: number;
  rotation_deg: number;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  elevation_cm: number;
  color_hex: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}
```

#### `CatalogItem`
```typescript
interface CatalogItem {
  id: string;
  label: string;
  default_width_cm: number;
  default_depth_cm: number;
  default_height_cm: number;
  min_width_cm: number;
  max_width_cm: number;
  color_hex: string;
  tags: string[];
}

interface CatalogCategory {
  id: string;
  label: string;
  items: CatalogItem[];
}
```

### 8.2 Unit Conversion

All dimensions are **always stored in centimeters (cm)** in the database and transmitted in cm via the API. The frontend is responsible for display conversion.

```typescript
// Conversion utilities (frontend)
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

function cmToImperial(cm: number): string {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round(totalInches % INCHES_PER_FOOT);
  return `${feet}' ${inches}"`;
}

function cmToMetric(cm: number): string {
  return cm >= 100 ? `${(cm / 100).toFixed(2)}m` : `${cm.toFixed(0)}cm`;
}
```

### 8.3 Pixel ↔ Real-World Conversion

Given a project with a valid calibration:

```typescript
// Convert pixel distance to cm
function pxToCm(px: number, pixelsPerCm: number): number {
  return px / pixelsPerCm;
}

// Convert cm to pixel distance
function cmToPx(cm: number, pixelsPerCm: number): number {
  return cm * pixelsPerCm;
}
```

This ratio is used by the frontend to:
- Display ruler overlays in real-world units
- Render furniture at correct pixel sizes from their cm dimensions
- Display room area and bounding box dimensions

### 8.4 `furniture.json` Schema

```json
{
  "version": "1.0.0",
  "categories": [
    {
      "id": "living_room",
      "label": "Living Room",
      "items": [
        {
          "id": "sofa_standard",
          "label": "Sofa",
          "default_width_cm": 228.6,
          "default_depth_cm": 91.44,
          "default_height_cm": 83.82,
          "min_width_cm": 152.4,
          "max_width_cm": 365.76,
          "color_hex": "#94A3B8",
          "tags": ["seating", "living_room"]
        },
        {
          "id": "sofa_loveseat",
          "label": "Loveseat",
          "default_width_cm": 152.4,
          "default_depth_cm": 83.82,
          "default_height_cm": 83.82,
          "min_width_cm": 121.92,
          "max_width_cm": 182.88,
          "color_hex": "#94A3B8",
          "tags": ["seating", "living_room"]
        },
        {
          "id": "coffee_table",
          "label": "Coffee Table",
          "default_width_cm": 121.92,
          "default_depth_cm": 60.96,
          "default_height_cm": 45.72,
          "min_width_cm": 60.96,
          "max_width_cm": 182.88,
          "color_hex": "#A16207",
          "tags": ["table", "living_room"]
        }
      ]
    }
  ]
}
```

---

## 9. Error Handling

### 9.1 Standard Error Response Shape

All errors return a consistent JSON body:

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "Room with id 'abc' not found or does not belong to this project.",
    "details": null
  }
}
```

### 9.2 Error Code Reference

| HTTP Status | Code | Trigger |
|---|---|---|
| `400` | `INVALID_FILE_TYPE` | Upload is not PNG, JPG, or PDF |
| `400` | `FILE_TOO_LARGE` | Upload exceeds 20MB |
| `400` | `INVALID_POLYGON` | Polygon has fewer than 3 points |
| `400` | `INVALID_CALIBRATION` | Calibration points are identical |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `401` | `TOKEN_EXPIRED` | JWT has expired |
| `403` | `FORBIDDEN` | Authenticated user does not own resource |
| `404` | `PROJECT_NOT_FOUND` | Project ID does not exist |
| `404` | `ROOM_NOT_FOUND` | Room ID does not exist |
| `404` | `PLACEMENT_NOT_FOUND` | Placement ID does not exist |
| `404` | `SHARE_NOT_FOUND` | Share token is invalid or inactive |
| `410` | `SHARE_EXPIRED` | Share token has passed its `expires_at` |
| `422` | `CV_NO_ROOMS_DETECTED` | CV ran successfully but found no rooms |
| `500` | `CV_PIPELINE_ERROR` | CV pipeline threw an unhandled exception |
| `500` | `STORAGE_ERROR` | Supabase Storage operation failed |
| `500` | `DATABASE_ERROR` | Unexpected database error |

### 9.3 CV Failure Handling

CV failures do **not** block the user. The response for a failed CV run still returns `201` with an empty `rooms` array and `cv_status: "failed"`. The frontend guides the user to draw rooms manually.

---

## 10. Environment Variables

### Backend (FastAPI — Render)

```env
# Supabase
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Service role key — never expose to frontend
SUPABASE_JWT_SECRET=your-jwt-secret     # Found in Supabase project settings

# Storage
STORAGE_BUCKET=floorplans
SIGNED_URL_EXPIRY_SECONDS=3600

# CV
CV_PHASE=phase1                         # "phase1" | "phase2"
CV_MODEL_PATH=/app/models/cubicasa5k   # Only needed if CV_PHASE=phase2
CV_MIN_ROOM_AREA_RATIO=0.005           # Minimum room as % of image area
CV_MAX_ROOM_AREA_RATIO=0.90

# File upload
MAX_UPLOAD_SIZE_MB=20
PDF_CONVERSION_DPI=150

# App
ENVIRONMENT=production                  # "development" | "production"
FRONTEND_URL=https://floorcraft.app    # For CORS
```

### Frontend (React — Vercel)

```env
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...           # Anon key — safe to expose
VITE_API_BASE_URL=https://api.floorcraft.app
VITE_APP_URL=https://floorcraft.app
```

---

## 11. Deployment

### 11.1 Backend (Render Free Tier)

**Service type:** Web Service
**Runtime:** Python 3.11
**Build command:** `pip install -r requirements.txt`
**Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

**`requirements.txt` (core):**
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-multipart>=0.0.9      # File upload support
supabase>=2.4.0              # Supabase Python client
python-jose[cryptography]    # JWT verification
opencv-python-headless>=4.9  # CV pipeline (headless = no GUI deps)
numpy>=1.26.0
pdf2image>=1.17.0            # PDF conversion
Pillow>=10.3.0
torch>=2.2.0                 # Phase 2 only — comment out for Phase 1 MVP
```

**Notes for Render free tier:**
- Render free tier spins down after 15 minutes of inactivity — first request after inactivity takes ~30 seconds to cold start
- PyTorch (`torch`) adds ~800MB to the container; for Phase 1 MVP, exclude it to stay within Render's free tier limits
- Use Render's persistent disk (if available) or download model weights at startup from Hugging Face for Phase 2

### 11.2 Frontend (Vercel Free Tier)

**Framework preset:** Vite
**Root directory:** `frontend/`
**Build command:** `npm run build`
**Output directory:** `dist/`
**Environment variables:** Set in Vercel dashboard

### 11.3 Database (Supabase Free Tier)

**Limits (as of 2025):**
- 500MB database storage
- 1GB file storage
- 50,000 monthly active users
- 2GB bandwidth

These limits are generous for an early open-source project. Migration to a paid tier would only be necessary at meaningful scale.

### 11.4 CORS Configuration

```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

*This document is a companion to `docs/PRODUCT_SPEC.md` and is intended as a complete backend reference for agentic coding tools and developers building FloorCraft.*

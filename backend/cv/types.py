# backend/cv/types.py
from dataclasses import dataclass, field


class CVPipelineError(Exception):
    """Raised when the CV pipeline encounters an unrecoverable error."""
    pass


@dataclass
class DetectedRoom:
    label: str          # Always "Room N" in Phase 1
    room_type: str      # Always "unknown" in Phase 1
    polygon_px: list    # [{"x": int, "y": int}, ...]
    confidence: float   # 0.0–1.0, area-based heuristic in Phase 1
    area_px: int        # Raw pixel area of the contour (scaled to original dims)
    bbox: dict          # {"x": int, "y": int, "w": int, "h": int}


@dataclass
class CVResult:
    phase: str              # "phase1"
    rooms: list             # List[DetectedRoom], empty list if none detected
    image_width_px: int
    image_height_px: int
    processing_time_ms: int
    error: str | None       # None on success

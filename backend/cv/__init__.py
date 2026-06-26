# backend/cv/__init__.py
import os

from .types import CVResult


def detect_rooms(image_path: str) -> CVResult:
    """Phase router: selects phase1 or phase2 based on CV_PHASE env var."""
    phase = os.getenv("CV_PHASE", "phase1")
    if phase == "phase2":
        from .phase2_cubicasa import detect_rooms as _detect
    else:
        from .phase1_opencv import detect_rooms as _detect
    return _detect(image_path)

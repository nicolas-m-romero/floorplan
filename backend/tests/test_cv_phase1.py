# backend/tests/test_cv_phase1.py
import pathlib

import pytest

from backend.cv.phase1_opencv import detect_rooms
from backend.cv.types import CVPipelineError

FIXTURES = pathlib.Path(__file__).parent / "fixtures" / "floor_plans"


def fixture(name: str) -> str:
    return str(FIXTURES / name)


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------

def test_clean_apartment_detects_rooms():
    result = detect_rooms(fixture("clean_apartment_2br.png"))
    assert result.phase == "phase1"
    assert result.error is None
    assert len(result.rooms) >= 3


def test_each_room_has_valid_polygon():
    result = detect_rooms(fixture("clean_apartment_2br.png"))
    for room in result.rooms:
        assert len(room.polygon_px) >= 3
        for pt in room.polygon_px:
            assert "x" in pt and "y" in pt
            assert isinstance(pt["x"], int) and isinstance(pt["y"], int)


def test_polygon_coords_within_image_bounds():
    result = detect_rooms(fixture("clean_apartment_2br.png"))
    for room in result.rooms:
        for pt in room.polygon_px:
            assert 0 <= pt["x"] <= result.image_width_px
            assert 0 <= pt["y"] <= result.image_height_px


def test_all_rooms_labeled_unknown_in_phase1():
    result = detect_rooms(fixture("clean_apartment_2br.png"))
    for room in result.rooms:
        assert room.room_type == "unknown"


def test_processing_time_within_target():
    result = detect_rooms(fixture("clean_apartment_2br.png"))
    assert result.processing_time_ms < 10_000  # 10-second hard limit


# ---------------------------------------------------------------------------
# Edge-case / negative tests
# ---------------------------------------------------------------------------

def test_blank_image_returns_empty_rooms():
    result = detect_rooms(fixture("blank.png"))
    assert result.rooms == []
    assert result.error is None  # Not a pipeline error — blank is valid input


def test_corrupt_image_raises():
    with pytest.raises(CVPipelineError):
        detect_rooms(fixture("corrupt.png"))


def test_studio_detects_fewer_rooms():
    result = detect_rooms(fixture("clean_studio.png"))
    assert result.phase == "phase1"
    assert result.error is None
    # Studio is an open plan — expect fewer rooms than a 2BR apartment
    assert len(result.rooms) <= 5

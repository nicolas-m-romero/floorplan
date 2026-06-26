# backend/tests/test_upload.py
import io
from unittest.mock import MagicMock, patch

import pytest


def _png_bytes() -> bytes:
    """Minimal 1x1 white PNG."""
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=="
    )


def test_upload_happy_path(client, supabase_mock):
    # Arrange: supabase inserts return a fake project row
    fake_project = {
        "id": "proj-1",
        "user_id": "user-uuid-1234",
        "name": "Test Project",
        "floor_plan_path": "user-uuid-1234/proj-1/floorplan.png",
        "floor_plan_width_px": 1,
        "floor_plan_height_px": 1,
        "cv_status": "complete",
        "cv_phase": "phase1",
        "is_public": False,
        "unit_system": "imperial",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "calibration_point_1": None,
        "calibration_point_2": None,
        "calibration_real_distance": None,
        "pixels_per_cm": None,
        "cv_error": None,
    }
    execute_mock = MagicMock(data=[fake_project], count=0)
    supabase_mock.execute.return_value = execute_mock

    png = _png_bytes()

    with patch("routes.upload.get_supabase", return_value=supabase_mock), \
         patch("cv.utils.get_image_dimensions", return_value=(1, 1)):
        resp = client.post(
            "/upload",
            files={"file": ("floor.png", io.BytesIO(png), "image/png")},
            data={"project_name": "Test Project"},
        )

    assert resp.status_code == 201
    body = resp.json()
    assert "project_id" in body
    assert body["cv_status"] == "complete"
    assert isinstance(body["rooms"], list)


def test_upload_invalid_file_type(client):
    resp = client.post(
        "/upload",
        files={"file": ("floor.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "INVALID_FILE_TYPE"


def test_upload_file_too_large(client):
    # 21 MB of zeros
    big = b"\x00" * (21 * 1024 * 1024)
    resp = client.post(
        "/upload",
        files={"file": ("floor.png", io.BytesIO(big), "image/png")},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "FILE_TOO_LARGE"

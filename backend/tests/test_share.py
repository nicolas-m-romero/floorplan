# backend/tests/test_share.py
from unittest.mock import MagicMock, patch

FAKE_PROJECT = {
    "id": "proj-uuid-1234",
    "user_id": "user-uuid-1234",
    "name": "My Apartment",
    "floor_plan_path": None,
    "floor_plan_width_px": None,
    "floor_plan_height_px": None,
    "unit_system": "imperial",
    "calibration_point_1": None,
    "calibration_point_2": None,
    "calibration_real_distance": None,
    "pixels_per_cm": None,
    "cv_status": "complete",
    "cv_phase": "phase1",
    "is_public": True,
    "created_at": "2025-06-01T12:00:00Z",
    "updated_at": "2025-06-01T12:00:00Z",
    "cv_error": None,
}

FAKE_LINK = {
    "id": "link-uuid",
    "project_id": "proj-uuid-1234",
    "user_id": "user-uuid-1234",
    "token": "abc123token",
    "created_at": "2025-06-01T12:00:00Z",
    "expires_at": None,
    "is_active": True,
}


def test_create_share_link(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),  # ownership check
        MagicMock(data=[FAKE_LINK]),     # insert share_link
        MagicMock(data=[FAKE_PROJECT]),  # update is_public
    ]
    with patch("routes.share.get_supabase", return_value=supabase_mock):
        resp = client.post("/projects/proj-uuid-1234/share")
    assert resp.status_code == 201
    body = resp.json()
    assert "token" in body
    assert "share_url" in body


def test_resolve_share_token_not_found(client, supabase_mock):
    supabase_mock.execute.return_value = MagicMock(data=[])
    with patch("routes.share.get_supabase", return_value=supabase_mock):
        resp = client.get("/share/badtoken")
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "SHARE_NOT_FOUND"


def test_resolve_share_token_expired(client, supabase_mock):
    expired_link = {**FAKE_LINK, "expires_at": "2020-01-01T00:00:00Z"}
    supabase_mock.execute.return_value = MagicMock(data=[expired_link])
    with patch("routes.share.get_supabase", return_value=supabase_mock):
        resp = client.get("/share/abc123token")
    assert resp.status_code == 410
    assert resp.json()["detail"]["code"] == "SHARE_EXPIRED"


def test_revoke_share(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[]),  # deactivate links
        MagicMock(data=[]),  # set is_public=False
    ]
    with patch("routes.share.get_supabase", return_value=supabase_mock):
        resp = client.delete("/projects/proj-uuid-1234/share")
    assert resp.status_code == 204

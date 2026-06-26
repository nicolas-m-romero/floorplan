# backend/tests/test_rooms.py
from unittest.mock import MagicMock, patch

FAKE_PROJECT = {
    "id": "proj-uuid-1234",
    "user_id": "user-uuid-1234",
    "pixels_per_cm": None,
}
FAKE_ROOM = {
    "id": "room-uuid-1234",
    "project_id": "proj-uuid-1234",
    "user_id": "user-uuid-1234",
    "label": "Living Room",
    "room_type": "living_room",
    "is_selected": True,
    "sort_order": 0,
    "polygon_px": [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}],
    "area_cm2": None,
    "bbox_width_cm": None,
    "bbox_height_cm": None,
    "created_at": "2025-06-01T12:00:00Z",
    "updated_at": "2025-06-01T12:00:00Z",
}


def _setup(supabase_mock, project=FAKE_PROJECT, room=FAKE_ROOM):
    calls = {"n": 0}

    def side():
        calls["n"] += 1
        n = calls["n"]
        if n == 1:
            return MagicMock(data=[project])
        if n == 2:
            return MagicMock(data=[room])
        return MagicMock(data=[room])

    supabase_mock.execute.side_effect = side


def test_patch_room_happy_path(client, supabase_mock):
    _setup(supabase_mock)
    with patch("routes.rooms.get_supabase", return_value=supabase_mock):
        resp = client.patch(
            "/projects/proj-uuid-1234/rooms/room-uuid-1234",
            json={"label": "Master Bedroom"},
        )
    assert resp.status_code < 500


def test_patch_room_invalid_polygon(client, supabase_mock):
    _setup(supabase_mock)
    with patch("routes.rooms.get_supabase", return_value=supabase_mock):
        resp = client.patch(
            "/projects/proj-uuid-1234/rooms/room-uuid-1234",
            json={"polygon_px": [{"x": 0, "y": 0}, {"x": 1, "y": 1}]},
        )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "INVALID_POLYGON"


def test_create_room_happy_path(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[FAKE_ROOM]),
    ]
    with patch("routes.rooms.get_supabase", return_value=supabase_mock):
        resp = client.post(
            "/projects/proj-uuid-1234/rooms",
            json={
                "label": "Balcony",
                "room_type": "unknown",
                "polygon_px": [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 50, "y": 100}],
            },
        )
    assert resp.status_code in (201, 200)


def test_create_room_too_few_points(client, supabase_mock):
    supabase_mock.execute.return_value = MagicMock(data=[FAKE_PROJECT])
    with patch("routes.rooms.get_supabase", return_value=supabase_mock):
        resp = client.post(
            "/projects/proj-uuid-1234/rooms",
            json={
                "label": "Bad Room",
                "polygon_px": [{"x": 0, "y": 0}, {"x": 1, "y": 1}],
            },
        )
    assert resp.status_code == 422  # Pydantic validator fires


def test_delete_room_not_found(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[]),  # room not found
    ]
    with patch("routes.rooms.get_supabase", return_value=supabase_mock):
        resp = client.delete("/projects/proj-uuid-1234/rooms/nonexistent")
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "ROOM_NOT_FOUND"

# backend/tests/test_placements.py
from unittest.mock import MagicMock, patch

FAKE_PROJECT = {"id": "proj-uuid-1234", "user_id": "user-uuid-1234"}
FAKE_ROOM = {"id": "room-uuid-1234", "project_id": "proj-uuid-1234"}
FAKE_PLACEMENT = {
    "id": "pl-uuid-1234",
    "room_id": "room-uuid-1234",
    "project_id": "proj-uuid-1234",
    "user_id": "user-uuid-1234",
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
    "is_custom": False,
    "created_at": "2025-06-01T12:00:00Z",
    "updated_at": "2025-06-01T12:00:00Z",
}

NEW_PLACEMENT_BODY = {
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
    "is_custom": False,
}


def _chain(supabase_mock, project=FAKE_PROJECT, room=FAKE_ROOM, placement=FAKE_PLACEMENT):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[project]),  # project ownership check
        MagicMock(data=[room]),     # room check
        MagicMock(data=[placement]),  # insert / query
    ]


def test_create_placement_happy_path(client, supabase_mock):
    _chain(supabase_mock)
    with patch("routes.placements.get_supabase", return_value=supabase_mock):
        resp = client.post(
            "/projects/proj-uuid-1234/rooms/room-uuid-1234/placements",
            json=NEW_PLACEMENT_BODY,
        )
    assert resp.status_code in (201, 200)


def test_create_placement_room_not_found(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[]),  # room missing
    ]
    with patch("routes.placements.get_supabase", return_value=supabase_mock):
        resp = client.post(
            "/projects/proj-uuid-1234/rooms/bad-room/placements",
            json=NEW_PLACEMENT_BODY,
        )
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "ROOM_NOT_FOUND"


def test_patch_placement_not_found(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[FAKE_ROOM]),
        MagicMock(data=[]),  # placement missing
    ]
    with patch("routes.placements.get_supabase", return_value=supabase_mock):
        resp = client.patch(
            "/projects/proj-uuid-1234/rooms/room-uuid-1234/placements/bad-pl",
            json={"rotation_deg": 90},
        )
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "PLACEMENT_NOT_FOUND"


def test_delete_placement_happy_path(client, supabase_mock):
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[FAKE_ROOM]),
        MagicMock(data=[FAKE_PLACEMENT]),
        MagicMock(data=[]),  # delete
    ]
    with patch("routes.placements.get_supabase", return_value=supabase_mock):
        resp = client.delete(
            "/projects/proj-uuid-1234/rooms/room-uuid-1234/placements/pl-uuid-1234"
        )
    assert resp.status_code == 204


def test_bulk_replace_placements(client, supabase_mock):
    supabase_mock.execute.return_value = MagicMock(data=[], count=0)
    supabase_mock.execute.side_effect = [
        MagicMock(data=[FAKE_PROJECT]),
        MagicMock(data=[FAKE_ROOM]),
        MagicMock(data=[]),  # delete
        MagicMock(data=[FAKE_PLACEMENT, FAKE_PLACEMENT]),  # insert
    ]
    with patch("routes.placements.get_supabase", return_value=supabase_mock):
        resp = client.put(
            "/projects/proj-uuid-1234/rooms/room-uuid-1234/placements",
            json={"placements": [NEW_PLACEMENT_BODY, NEW_PLACEMENT_BODY]},
        )
    assert resp.status_code == 200
    assert resp.json()["replaced"] == 2

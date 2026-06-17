# backend/tests/test_catalog.py
import json
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch

FAKE_CATALOG = {
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
                    "tags": ["seating", "living_room"],
                }
            ],
        }
    ],
}


def test_get_catalog(client):
    with patch("routes.catalog._load_catalog", return_value=FAKE_CATALOG):
        resp = client.get("/catalog")
    assert resp.status_code == 200
    body = resp.json()
    assert "categories" in body
    assert body["version"] == "1.0.0"
    assert resp.headers.get("cache-control") == "public, max-age=86400"


def test_get_catalog_not_found(client):
    with patch("routes.catalog._load_catalog", side_effect=FileNotFoundError):
        resp = client.get("/catalog")
    assert resp.status_code == 500


def test_create_custom_item(client, supabase_mock):
    fake_item = {
        "id": "custom-uuid",
        "user_id": "user-uuid-1234",
        "label": "My Shelf",
        "category": "custom",
        "width_cm": 91.44,
        "depth_cm": 30.0,
        "height_cm": 180.0,
        "color_hex": "#78716C",
        "created_at": "2025-06-01T00:00:00Z",
    }
    supabase_mock.execute.return_value = MagicMock(data=[fake_item])
    with patch("routes.catalog.get_supabase", return_value=supabase_mock):
        resp = client.post(
            "/catalog/custom",
            json={"label": "My Shelf", "width_cm": 91.44, "depth_cm": 30.0, "height_cm": 180.0},
        )
    assert resp.status_code == 201
    assert resp.json()["label"] == "My Shelf"


def test_delete_custom_item_not_found(client, supabase_mock):
    supabase_mock.execute.return_value = MagicMock(data=[])
    with patch("routes.catalog.get_supabase", return_value=supabase_mock):
        resp = client.delete("/catalog/custom/nonexistent")
    assert resp.status_code == 404


def test_delete_custom_item_forbidden(client, supabase_mock):
    supabase_mock.execute.return_value = MagicMock(data=[{"id": "x", "user_id": "other-user"}])
    with patch("routes.catalog.get_supabase", return_value=supabase_mock):
        resp = client.delete("/catalog/custom/x")
    assert resp.status_code == 403

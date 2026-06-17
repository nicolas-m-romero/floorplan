# backend/tests/conftest.py
"""
Shared pytest fixtures.

All Supabase and JWT calls are mocked so tests run without a live backend.
The fixture `client` returns a TestClient with:
  - auth middleware bypassed via a mock `get_current_user` dependency
  - supabase client replaced with a MagicMock
"""
import sys
import os

# Ensure the backend package root is on sys.path when running from any cwd.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

FAKE_USER = {"sub": "user-uuid-1234", "email": "test@example.com", "role": "authenticated"}
FAKE_PROJECT_ID = "proj-uuid-1234"
FAKE_ROOM_ID = "room-uuid-1234"
FAKE_PLACEMENT_ID = "pl-uuid-1234"


def _make_supabase_mock():
    """Return a MagicMock that roughly mimics supabase-py's fluent query API."""
    mock = MagicMock()

    def _chain(*args, **kwargs):
        return mock

    # Most table methods return self so callers can chain .eq().execute()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.eq.return_value = mock
    mock.order.return_value = mock
    mock.execute.return_value = MagicMock(data=[], count=0)
    mock.storage = MagicMock()
    mock.storage.from_.return_value = mock.storage
    mock.storage.upload.return_value = {}
    mock.storage.create_signed_url.return_value = {"signedURL": "https://example.com/signed"}
    mock.storage.list.return_value = []
    mock.storage.remove.return_value = {}

    return mock


@pytest.fixture()
def supabase_mock():
    return _make_supabase_mock()


@pytest.fixture()
def client(supabase_mock):
    """TestClient with auth and supabase mocked out."""
    # Import app here so env vars are already set before import-time side-effects
    os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-key")
    os.environ.setdefault("SUPABASE_JWT_SECRET", "fake-secret")

    with patch("db.supabase_client.get_supabase", return_value=supabase_mock), \
         patch("auth.get_current_user", return_value=FAKE_USER):
        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        yield TestClient(app)
        app.dependency_overrides.clear()

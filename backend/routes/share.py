# backend/routes/share.py
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from db.supabase_client import get_supabase
from routes.projects import _build_project_detail

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class ShareCreate(BaseModel):
    expires_at: Optional[str] = None  # ISO 8601 string or null


def _assert_project_ownership(supabase, project_id: str, user_id: str) -> dict:
    resp = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": f"Project '{project_id}' not found", "details": None})
    project = resp.data[0]
    if project["user_id"] != user_id:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You do not own this project", "details": None})
    return project


@router.post("/projects/{project_id}/share", status_code=201)
def create_share_link(project_id: str, body: ShareCreate = ShareCreate(), user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_project_ownership(supabase, project_id, user_id)

    insert_payload: dict = {
        "project_id": project_id,
        "user_id": user_id,
    }
    if body.expires_at:
        insert_payload["expires_at"] = body.expires_at

    resp = supabase.table("share_links").insert(insert_payload).execute()
    link = resp.data[0]

    # Mark project as public
    supabase.table("projects").update({"is_public": True}).eq("id", project_id).execute()

    token = link["token"]
    return {
        "token": token,
        "share_url": f"{FRONTEND_URL}/share/{token}",
        "expires_at": link.get("expires_at"),
    }


@router.get("/share/{token}")
def resolve_share(token: str):
    supabase = get_supabase()

    link_resp = supabase.table("share_links").select("*").eq("token", token).execute()
    if not link_resp.data:
        raise HTTPException(status_code=404, detail={"code": "SHARE_NOT_FOUND", "message": "Share token not found or inactive", "details": None})

    link = link_resp.data[0]
    if not link["is_active"]:
        raise HTTPException(status_code=404, detail={"code": "SHARE_NOT_FOUND", "message": "Share token is no longer active", "details": None})

    if link.get("expires_at"):
        expires = datetime.fromisoformat(link["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=410, detail={"code": "SHARE_EXPIRED", "message": "Share link has expired", "details": None})

    project_id = link["project_id"]
    proj_resp = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not proj_resp.data:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found", "details": None})

    return _build_project_detail(proj_resp.data[0], supabase)


@router.delete("/projects/{project_id}/share", status_code=204)
def revoke_share(project_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_project_ownership(supabase, project_id, user_id)

    # Deactivate all share links for this project
    supabase.table("share_links").update({"is_active": False}).eq("project_id", project_id).execute()

    # Mark project as private
    supabase.table("projects").update({"is_public": False}).eq("id", project_id).execute()

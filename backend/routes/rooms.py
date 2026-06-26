# backend/routes/rooms.py
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from auth import get_current_user
from db.supabase_client import get_supabase

router = APIRouter()

VALID_ROOM_TYPES = {"bedroom", "living_room", "kitchen", "bathroom", "dining", "office", "hallway", "storage", "unknown"}


class RoomPatch(BaseModel):
    label: Optional[str] = None
    room_type: Optional[str] = None
    is_selected: Optional[bool] = None
    sort_order: Optional[int] = None
    polygon_px: Optional[list[dict]] = None


class RoomCreate(BaseModel):
    label: str = "Room"
    room_type: Optional[str] = None
    polygon_px: list[dict]

    @field_validator("polygon_px")
    @classmethod
    def at_least_three_points(cls, v):
        if len(v) < 3:
            raise ValueError("polygon_px must have at least 3 points")
        return v


def _assert_project_ownership(supabase, project_id: str, user_id: str) -> dict:
    resp = supabase.table("projects").select("id, user_id, pixels_per_cm").eq("id", project_id).execute()
    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "PROJECT_NOT_FOUND", "message": f"Project '{project_id}' not found", "details": None},
        )
    project = resp.data[0]
    if project["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "You do not own this project", "details": None},
        )
    return project


def _compute_polygon_metrics(polygon_px: list[dict], pixels_per_cm: Optional[float]) -> dict:
    """Return area_cm2, bbox_width_cm, bbox_height_cm using the shoelace formula."""
    if not pixels_per_cm or len(polygon_px) < 3:
        return {"area_cm2": None, "bbox_width_cm": None, "bbox_height_cm": None}

    xs = [p["x"] for p in polygon_px]
    ys = [p["y"] for p in polygon_px]

    # Shoelace
    n = len(polygon_px)
    area_px2 = abs(sum(
        xs[i] * ys[(i + 1) % n] - xs[(i + 1) % n] * ys[i]
        for i in range(n)
    )) / 2.0

    area_cm2 = area_px2 / (pixels_per_cm ** 2)
    bbox_width_cm = (max(xs) - min(xs)) / pixels_per_cm
    bbox_height_cm = (max(ys) - min(ys)) / pixels_per_cm

    return {"area_cm2": area_cm2, "bbox_width_cm": bbox_width_cm, "bbox_height_cm": bbox_height_cm}


@router.patch("/projects/{project_id}/rooms/{room_id}")
def patch_room(project_id: str, room_id: str, body: RoomPatch, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    project = _assert_project_ownership(supabase, project_id, user_id)

    room_resp = supabase.table("rooms").select("*").eq("id", room_id).eq("project_id", project_id).execute()
    if not room_resp.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "ROOM_NOT_FOUND", "message": f"Room '{room_id}' not found", "details": None},
        )

    updates: dict = {}
    if body.label is not None:
        updates["label"] = body.label
    if body.room_type is not None:
        if body.room_type not in VALID_ROOM_TYPES:
            raise HTTPException(status_code=400, detail={"code": "INVALID_ROOM_TYPE", "message": f"room_type must be one of {VALID_ROOM_TYPES}", "details": None})
        updates["room_type"] = body.room_type
    if body.is_selected is not None:
        updates["is_selected"] = body.is_selected
    if body.sort_order is not None:
        updates["sort_order"] = body.sort_order
    if body.polygon_px is not None:
        if len(body.polygon_px) < 3:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_POLYGON", "message": "polygon_px must have at least 3 points", "details": None},
            )
        updates["polygon_px"] = body.polygon_px
        metrics = _compute_polygon_metrics(body.polygon_px, project.get("pixels_per_cm"))
        updates.update(metrics)

    if updates:
        supabase.table("rooms").update(updates).eq("id", room_id).execute()

    updated = supabase.table("rooms").select("*").eq("id", room_id).execute()
    return updated.data[0]


@router.post("/projects/{project_id}/rooms", status_code=201)
def create_room(project_id: str, body: RoomCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    project = _assert_project_ownership(supabase, project_id, user_id)

    metrics = _compute_polygon_metrics(body.polygon_px, project.get("pixels_per_cm"))

    resp = supabase.table("rooms").insert({
        "project_id": project_id,
        "user_id": user_id,
        "label": body.label,
        "room_type": body.room_type,
        "polygon_px": body.polygon_px,
        **metrics,
    }).execute()

    return resp.data[0]


@router.delete("/projects/{project_id}/rooms/{room_id}", status_code=204)
def delete_room(project_id: str, room_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_project_ownership(supabase, project_id, user_id)

    room_resp = supabase.table("rooms").select("id").eq("id", room_id).eq("project_id", project_id).execute()
    if not room_resp.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "ROOM_NOT_FOUND", "message": f"Room '{room_id}' not found", "details": None},
        )

    supabase.table("rooms").delete().eq("id", room_id).execute()

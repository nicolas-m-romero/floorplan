# backend/routes/placements.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from db.supabase_client import get_supabase

router = APIRouter()


class PlacementCreate(BaseModel):
    catalog_item_id: Optional[str] = None
    label: str
    position_x_px: float = 0
    position_y_px: float = 0
    rotation_deg: float = 0
    width_cm: float
    depth_cm: float
    height_cm: float
    elevation_cm: float = 0
    color_hex: str = "#94A3B8"
    is_custom: bool = False


class PlacementPatch(BaseModel):
    label: Optional[str] = None
    position_x_px: Optional[float] = None
    position_y_px: Optional[float] = None
    rotation_deg: Optional[float] = None
    width_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    height_cm: Optional[float] = None
    elevation_cm: Optional[float] = None
    color_hex: Optional[str] = None


class PlacementBulkItem(BaseModel):
    id: Optional[str] = None
    catalog_item_id: Optional[str] = None
    label: str
    position_x_px: float = 0
    position_y_px: float = 0
    rotation_deg: float = 0
    width_cm: float
    depth_cm: float
    height_cm: float
    elevation_cm: float = 0
    color_hex: str = "#94A3B8"
    is_custom: bool = False


class PlacementBulkReplace(BaseModel):
    placements: list[PlacementBulkItem]


def _assert_room_ownership(supabase, project_id: str, room_id: str, user_id: str) -> None:
    proj = supabase.table("projects").select("id, user_id").eq("id", project_id).execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": f"Project '{project_id}' not found", "details": None})
    if proj.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You do not own this project", "details": None})

    room = supabase.table("rooms").select("id").eq("id", room_id).eq("project_id", project_id).execute()
    if not room.data:
        raise HTTPException(status_code=404, detail={"code": "ROOM_NOT_FOUND", "message": f"Room '{room_id}' not found", "details": None})


@router.post("/projects/{project_id}/rooms/{room_id}/placements", status_code=201)
def create_placement(
    project_id: str,
    room_id: str,
    body: PlacementCreate,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_room_ownership(supabase, project_id, room_id, user_id)

    resp = supabase.table("furniture_placements").insert({
        "room_id": room_id,
        "project_id": project_id,
        "user_id": user_id,
        **body.model_dump(),
    }).execute()

    return resp.data[0]


@router.patch("/projects/{project_id}/rooms/{room_id}/placements/{placement_id}")
def patch_placement(
    project_id: str,
    room_id: str,
    placement_id: str,
    body: PlacementPatch,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_room_ownership(supabase, project_id, room_id, user_id)

    pl_resp = supabase.table("furniture_placements").select("id").eq("id", placement_id).eq("room_id", room_id).execute()
    if not pl_resp.data:
        raise HTTPException(status_code=404, detail={"code": "PLACEMENT_NOT_FOUND", "message": f"Placement '{placement_id}' not found", "details": None})

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        supabase.table("furniture_placements").update(updates).eq("id", placement_id).execute()

    updated = supabase.table("furniture_placements").select("*").eq("id", placement_id).execute()
    return updated.data[0]


@router.delete("/projects/{project_id}/rooms/{room_id}/placements/{placement_id}", status_code=204)
def delete_placement(
    project_id: str,
    room_id: str,
    placement_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_room_ownership(supabase, project_id, room_id, user_id)

    pl_resp = supabase.table("furniture_placements").select("id").eq("id", placement_id).eq("room_id", room_id).execute()
    if not pl_resp.data:
        raise HTTPException(status_code=404, detail={"code": "PLACEMENT_NOT_FOUND", "message": f"Placement '{placement_id}' not found", "details": None})

    supabase.table("furniture_placements").delete().eq("id", placement_id).execute()


@router.put("/projects/{project_id}/rooms/{room_id}/placements")
def bulk_replace_placements(
    project_id: str,
    room_id: str,
    body: PlacementBulkReplace,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = user["sub"]
    _assert_room_ownership(supabase, project_id, room_id, user_id)

    # Delete all existing placements for this room
    supabase.table("furniture_placements").delete().eq("room_id", room_id).execute()

    # Insert the new set
    if body.placements:
        rows = [
            {
                "room_id": room_id,
                "project_id": project_id,
                "user_id": user_id,
                "catalog_item_id": pl.catalog_item_id,
                "label": pl.label,
                "position_x_px": pl.position_x_px,
                "position_y_px": pl.position_y_px,
                "rotation_deg": pl.rotation_deg,
                "width_cm": pl.width_cm,
                "depth_cm": pl.depth_cm,
                "height_cm": pl.height_cm,
                "elevation_cm": pl.elevation_cm,
                "color_hex": pl.color_hex,
                "is_custom": pl.is_custom,
            }
            for pl in body.placements
        ]
        supabase.table("furniture_placements").insert(rows).execute()

    return {"replaced": len(body.placements)}

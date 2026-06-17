# backend/routes/projects.py
import math
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import get_current_user
from db.supabase_client import get_supabase

router = APIRouter()

STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "floorplans")
SIGNED_URL_EXPIRY = int(os.getenv("SIGNED_URL_EXPIRY_SECONDS", "3600"))


# ── Pydantic models ──────────────────────────────────────────────────────────

class CalibrationInput(BaseModel):
    point_1: dict
    point_2: dict
    real_distance_cm: float


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    unit_system: Optional[str] = None
    is_public: Optional[bool] = None
    calibration: Optional[CalibrationInput] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _signed_url(supabase, path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    try:
        result = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(path, SIGNED_URL_EXPIRY)
        return result.get("signedURL")
    except Exception:
        return None


def _build_project_detail(project: dict, supabase) -> dict:
    """Fetch rooms + placements and attach them to the project dict."""
    project_id = project["id"]
    floor_plan_url = _signed_url(supabase, project.get("floor_plan_path"))

    rooms_resp = (
        supabase.table("rooms")
        .select("*")
        .eq("project_id", project_id)
        .order("sort_order")
        .execute()
    )
    rooms = rooms_resp.data or []

    for room in rooms:
        placements_resp = (
            supabase.table("furniture_placements")
            .select("*")
            .eq("room_id", room["id"])
            .execute()
        )
        room["furniture_placements"] = placements_resp.data or []

    calibration = None
    if project.get("calibration_point_1"):
        calibration = {
            "point_1": project["calibration_point_1"],
            "point_2": project["calibration_point_2"],
            "real_distance_cm": project["calibration_real_distance"],
            "pixels_per_cm": project["pixels_per_cm"],
        }

    return {
        "id": project["id"],
        "name": project["name"],
        "floor_plan_url": floor_plan_url,
        "floor_plan_width_px": project.get("floor_plan_width_px"),
        "floor_plan_height_px": project.get("floor_plan_height_px"),
        "unit_system": project["unit_system"],
        "calibration": calibration,
        "cv_status": project["cv_status"],
        "cv_phase": project.get("cv_phase"),
        "is_public": project["is_public"],
        "created_at": project["created_at"],
        "updated_at": project["updated_at"],
        "rooms": rooms,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/projects")
def list_projects(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    resp = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    projects = resp.data or []

    result = []
    for p in projects:
        # Count rooms
        room_count_resp = (
            supabase.table("rooms")
            .select("id", count="exact")
            .eq("project_id", p["id"])
            .execute()
        )
        room_count = room_count_resp.count or 0

        result.append({
            "id": p["id"],
            "name": p["name"],
            "created_at": p["created_at"],
            "updated_at": p["updated_at"],
            "floor_plan_thumbnail_url": _signed_url(supabase, p.get("floor_plan_path")),
            "cv_status": p["cv_status"],
            "unit_system": p["unit_system"],
            "room_count": room_count,
            "is_public": p["is_public"],
        })

    return {"projects": result}


@router.get("/projects/{project_id}")
def get_project(project_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    resp = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "PROJECT_NOT_FOUND", "message": f"Project '{project_id}' not found", "details": None},
        )
    project = resp.data[0]

    if project["user_id"] != user_id and not project["is_public"]:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "You do not own this project", "details": None},
        )

    return _build_project_detail(project, supabase)


@router.patch("/projects/{project_id}")
def patch_project(project_id: str, body: ProjectPatch, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    resp = supabase.table("projects").select("*").eq("id", project_id).execute()
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

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.unit_system is not None:
        if body.unit_system not in ("imperial", "metric"):
            raise HTTPException(status_code=400, detail={"code": "INVALID_UNIT_SYSTEM", "message": "unit_system must be 'imperial' or 'metric'", "details": None})
        updates["unit_system"] = body.unit_system
    if body.is_public is not None:
        updates["is_public"] = body.is_public
    if body.calibration is not None:
        cal = body.calibration
        p1, p2 = cal.point_1, cal.point_2
        if p1 == p2:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_CALIBRATION", "message": "Calibration points must be distinct", "details": None},
            )
        dist_px = math.sqrt((p2["x"] - p1["x"]) ** 2 + (p2["y"] - p1["y"]) ** 2)
        pixels_per_cm = dist_px / cal.real_distance_cm
        updates["calibration_point_1"] = p1
        updates["calibration_point_2"] = p2
        updates["calibration_real_distance"] = cal.real_distance_cm
        updates["pixels_per_cm"] = pixels_per_cm

    if updates:
        supabase.table("projects").update(updates).eq("id", project_id).execute()

    updated_resp = supabase.table("projects").select("*").eq("id", project_id).execute()
    return _build_project_detail(updated_resp.data[0], supabase)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    resp = supabase.table("projects").select("id, user_id, floor_plan_path").eq("id", project_id).execute()
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

    # Delete storage objects under {user_id}/{project_id}/
    storage_prefix = f"{user_id}/{project_id}/"
    try:
        files = supabase.storage.from_(STORAGE_BUCKET).list(f"{user_id}/{project_id}")
        if files:
            paths = [f"{storage_prefix}{f['name']}" for f in files]
            supabase.storage.from_(STORAGE_BUCKET).remove(paths)
    except Exception:
        pass  # non-fatal; cascading DB delete is the important part

    supabase.table("projects").delete().eq("id", project_id).execute()


@router.post("/projects/{project_id}/duplicate", status_code=201)
def duplicate_project(project_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    resp = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "PROJECT_NOT_FOUND", "message": f"Project '{project_id}' not found", "details": None},
        )
    src = resp.data[0]

    if src["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "You do not own this project", "details": None},
        )

    new_project_id = str(uuid.uuid4())
    new_project = {
        "id": new_project_id,
        "user_id": user_id,
        "name": f"{src['name']} (Copy)",
        "floor_plan_path": src.get("floor_plan_path"),
        "floor_plan_width_px": src.get("floor_plan_width_px"),
        "floor_plan_height_px": src.get("floor_plan_height_px"),
        "calibration_point_1": src.get("calibration_point_1"),
        "calibration_point_2": src.get("calibration_point_2"),
        "calibration_real_distance": src.get("calibration_real_distance"),
        "pixels_per_cm": src.get("pixels_per_cm"),
        "unit_system": src["unit_system"],
        "cv_status": src["cv_status"],
        "cv_phase": src.get("cv_phase"),
        "is_public": False,
    }
    supabase.table("projects").insert(new_project).execute()

    # Deep-copy rooms + placements
    rooms_resp = supabase.table("rooms").select("*").eq("project_id", project_id).execute()
    for room in rooms_resp.data or []:
        new_room_id = str(uuid.uuid4())
        supabase.table("rooms").insert({
            "id": new_room_id,
            "project_id": new_project_id,
            "user_id": user_id,
            "label": room["label"],
            "room_type": room.get("room_type"),
            "is_selected": room["is_selected"],
            "sort_order": room["sort_order"],
            "polygon_px": room["polygon_px"],
            "area_cm2": room.get("area_cm2"),
            "bbox_width_cm": room.get("bbox_width_cm"),
            "bbox_height_cm": room.get("bbox_height_cm"),
        }).execute()

        placements_resp = supabase.table("furniture_placements").select("*").eq("room_id", room["id"]).execute()
        for pl in placements_resp.data or []:
            supabase.table("furniture_placements").insert({
                "room_id": new_room_id,
                "project_id": new_project_id,
                "user_id": user_id,
                "catalog_item_id": pl.get("catalog_item_id"),
                "label": pl["label"],
                "position_x_px": pl["position_x_px"],
                "position_y_px": pl["position_y_px"],
                "rotation_deg": pl["rotation_deg"],
                "width_cm": pl["width_cm"],
                "depth_cm": pl["depth_cm"],
                "height_cm": pl["height_cm"],
                "elevation_cm": pl["elevation_cm"],
                "color_hex": pl["color_hex"],
                "is_custom": pl["is_custom"],
            }).execute()

    new_resp = supabase.table("projects").select("*").eq("id", new_project_id).execute()
    return JSONResponse(status_code=201, content=_build_project_detail(new_resp.data[0], supabase))

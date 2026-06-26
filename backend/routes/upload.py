# backend/routes/upload.py
import os
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from auth import get_current_user
from db.supabase_client import get_supabase

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", "20")) * 1024 * 1024
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "floorplans")
SIGNED_URL_EXPIRY = int(os.getenv("SIGNED_URL_EXPIRY_SECONDS", "3600"))
PDF_DPI = int(os.getenv("PDF_CONVERSION_DPI", "150"))


@router.post("/upload", status_code=201)
async def upload_floor_plan(
    file: UploadFile = File(...),
    project_name: str = Form("Untitled Project"),
    user: dict = Depends(get_current_user),
):
    user_id: str = user["sub"]
    supabase = get_supabase()

    # ── Validate file type ──────────────────────────────────────────────────
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE_TYPE", "message": "Accepted types: image/jpeg, image/png, application/pdf", "details": None},
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"code": "FILE_TOO_LARGE", "message": f"File exceeds {os.getenv('MAX_UPLOAD_SIZE_MB', '20')}MB limit", "details": None},
        )

    project_id = str(uuid.uuid4())

    # ── PDF → PNG conversion ────────────────────────────────────────────────
    with tempfile.TemporaryDirectory() as tmpdir:
        original_suffix = ".pdf" if file.content_type == "application/pdf" else Path(file.filename or "upload").suffix or ".png"
        tmp_input = os.path.join(tmpdir, f"input{original_suffix}")
        tmp_png = os.path.join(tmpdir, "floorplan.png")

        with open(tmp_input, "wb") as fh:
            fh.write(raw_bytes)

        if file.content_type == "application/pdf":
            from cv.utils import pdf_to_png
            pdf_to_png(tmp_input, tmp_png, dpi=PDF_DPI)

            # Store original PDF alongside the converted PNG
            pdf_storage_path = f"{user_id}/{project_id}/floorplan_original.pdf"
            try:
                supabase.storage.from_(STORAGE_BUCKET).upload(pdf_storage_path, raw_bytes, {"content-type": "application/pdf"})
            except Exception:
                pass  # non-fatal; original kept only for reference
        else:
            tmp_png = tmp_input  # already a PNG/JPG — use as-is

        # ── Read image dimensions ───────────────────────────────────────────
        from cv.utils import get_image_dimensions
        try:
            width_px, height_px = get_image_dimensions(tmp_png)
        except Exception:
            width_px, height_px = None, None

        # ── Upload processed PNG to Supabase Storage ────────────────────────
        png_storage_path = f"{user_id}/{project_id}/floorplan.png"
        with open(tmp_png, "rb") as fh:
            png_bytes = fh.read()

        try:
            supabase.storage.from_(STORAGE_BUCKET).upload(png_storage_path, png_bytes, {"content-type": "image/png"})
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail={"code": "STORAGE_ERROR", "message": str(exc), "details": None},
            )

    # ── Create projects record ──────────────────────────────────────────────
    try:
        project_row = (
            supabase.table("projects")
            .insert({
                "id": project_id,
                "user_id": user_id,
                "name": project_name,
                "floor_plan_path": png_storage_path,
                "floor_plan_width_px": width_px,
                "floor_plan_height_px": height_px,
                "cv_status": "processing",
                "cv_phase": os.getenv("CV_PHASE", "phase1"),
            })
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": "DATABASE_ERROR", "message": str(exc), "details": None},
        )

    # ── CV Pipeline ─────────────────────────────────────────────────────────
    # TODO: wire in detect_rooms once the CV agent delivers the implementation.
    #   from cv import detect_rooms
    #   result = detect_rooms(tmp_png)
    #   rooms_data = [dataclasses.asdict(r) for r in result.rooms]
    #
    # For now, return an empty rooms array so the rest of the API is testable.
    rooms_data: list[dict] = []
    cv_phase = os.getenv("CV_PHASE", "phase1")

    # ── Persist rooms (none yet; loop runs on real CV output) ───────────────
    inserted_rooms: list[dict] = []
    for room in rooms_data:
        try:
            row = (
                supabase.table("rooms")
                .insert({
                    "project_id": project_id,
                    "user_id": user_id,
                    "label": room.get("label", "Room"),
                    "room_type": room.get("room_type"),
                    "polygon_px": room.get("polygon_px", []),
                    "is_selected": True,
                })
                .execute()
                .data[0]
            )
            inserted_rooms.append(row)
        except Exception:
            pass

    # ── Update cv_status = 'complete' ───────────────────────────────────────
    try:
        supabase.table("projects").update({"cv_status": "complete", "cv_phase": cv_phase}).eq("id", project_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": "DATABASE_ERROR", "message": str(exc), "details": None},
        )

    # ── Generate signed URL ──────────────────────────────────────────────────
    try:
        signed = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(png_storage_path, SIGNED_URL_EXPIRY)
        floor_plan_url = signed["signedURL"]
    except Exception:
        floor_plan_url = None

    return JSONResponse(
        status_code=201,
        content={
            "project_id": project_id,
            "name": project_name,
            "floor_plan_url": floor_plan_url,
            "floor_plan_width_px": width_px,
            "floor_plan_height_px": height_px,
            "cv_status": "complete",
            "cv_phase": cv_phase,
            "rooms": [
                {
                    "id": r.get("id"),
                    "label": r.get("label"),
                    "room_type": r.get("room_type"),
                    "polygon_px": r.get("polygon_px", []),
                    "is_selected": r.get("is_selected", True),
                }
                for r in inserted_rooms
            ],
        },
    )

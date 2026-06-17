# backend/routes/catalog.py
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from auth import get_current_user
from db.supabase_client import get_supabase

router = APIRouter()

# Resolve catalog path relative to this file so it works from any cwd.
_CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "catalog" / "furniture.json"


def _load_catalog() -> dict:
    with open(_CATALOG_PATH, encoding="utf-8") as fh:
        return json.load(fh)


class CustomItemCreate(BaseModel):
    label: str
    category: str = "custom"
    width_cm: float
    depth_cm: float
    height_cm: float
    color_hex: str = "#94A3B8"


@router.get("/catalog")
def get_catalog(response: Response):
    response.headers["Cache-Control"] = "public, max-age=86400"
    try:
        return _load_catalog()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail={"code": "CATALOG_NOT_FOUND", "message": "furniture.json not found on server", "details": None})


@router.get("/catalog/custom")
def list_custom_items(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    resp = (
        supabase.table("custom_catalog_items")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"items": resp.data or []}


@router.post("/catalog/custom", status_code=201)
def create_custom_item(body: CustomItemCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    resp = supabase.table("custom_catalog_items").insert({
        "user_id": user_id,
        **body.model_dump(),
    }).execute()
    return resp.data[0]


@router.delete("/catalog/custom/{item_id}", status_code=204)
def delete_custom_item(item_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    resp = supabase.table("custom_catalog_items").select("id, user_id").eq("id", item_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail={"code": "ITEM_NOT_FOUND", "message": f"Custom item '{item_id}' not found", "details": None})
    if resp.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You do not own this item", "details": None})

    supabase.table("custom_catalog_items").delete().eq("id", item_id).execute()

# backend/main.py
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # Load .env before anything else reads env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import catalog, placements, projects, rooms, share, upload

APP_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Phase 2 only: load CubiCasa5K model weights here to avoid per-request load.
    # For Phase 1 there is nothing to warm up.
    yield


app = FastAPI(
    title="Floorplan API",
    version=APP_VERSION,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(upload.router)
app.include_router(projects.router)
app.include_router(rooms.router)
app.include_router(placements.router)
app.include_router(catalog.router)
app.include_router(share.router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": APP_VERSION,
        "cv_phase": os.getenv("CV_PHASE", "phase1"),
    }

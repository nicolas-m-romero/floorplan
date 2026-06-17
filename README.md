# Floorplan

> A free, open-source 2D/3D floor plan room layout tool for renters and small-space dwellers.

Upload a floor plan. Detect your rooms. Place furniture. See how it fits — in 2D and 3D.

---

## Repository Structure

```
floorplan/
├── frontend/               # React + Vite application
├── backend/                # Python FastAPI service + CV pipeline
├── catalog/
│   └── furniture.json      # Community-maintained furniture catalog
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── BACKEND_SPEC.md
│   ├── FRONTEND_SPEC.md
│   ├── DESIGN_SYSTEM.md
│   └── CV_PIPELINE_SPEC.md
├── .github/
│   ├── workflows/
│   │   ├── frontend.yml    # Vercel preview deploys
│   │   └── backend.yml     # Render deploy hook
│   └── ISSUE_TEMPLATE/
├── CONTRIBUTING.md
└── README.md               # This file
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Konva.js (2D), Three.js (3D) |
| Backend | Python 3.11, FastAPI |
| CV Pipeline | OpenCV 4.x (Phase 1), CubiCasa5K (Phase 2) |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Auth | Supabase Auth |
| Frontend hosting | Vercel (free tier) |
| Backend hosting | Render (free tier) |

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- pip
- A Supabase project (free tier — [supabase.com](https://supabase.com))
- Poppler (for PDF conversion)

Install Poppler:

```bash
# macOS
brew install poppler

# Ubuntu / Debian
sudo apt-get install poppler-utils

# Windows
# Download from https://github.com/oschwartz10612/poppler-windows/releases
# Add bin/ folder to PATH
```

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/floorplan.git
cd floorplan
```

---

### 2. Supabase Setup

#### 2a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Anon Key** (Settings → API)
3. Note your **Service Role Key** (Settings → API — keep this secret)
4. Note your **JWT Secret** (Settings → API → JWT Settings)

#### 2b. Run the Database Schema

In the Supabase dashboard, open the SQL Editor and run the contents of `backend/db/schema.sql`:

```bash
# Or copy-paste the file contents into the Supabase SQL editor
cat backend/db/schema.sql
```

This creates all five tables (`projects`, `rooms`, `furniture_placements`, `share_links`, `custom_catalog_items`) with Row Level Security policies.

#### 2c. Create the Storage Bucket

In the Supabase dashboard:
1. Go to Storage
2. Create a new bucket named `floorplans`
3. Set it to **Private** (not public)

---

### 3. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt
```

#### Backend Environment Variables

Create `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret

# Storage
STORAGE_BUCKET=floorplans
SIGNED_URL_EXPIRY_SECONDS=3600

# CV Pipeline
CV_PHASE=phase1
CV_MIN_ROOM_AREA_RATIO=0.005
CV_MAX_ROOM_AREA_RATIO=0.90

# File upload
MAX_UPLOAD_SIZE_MB=20
PDF_CONVERSION_DPI=150

# App
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

#### Run the Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

---

### 4. Frontend Setup

```bash
cd frontend
npm install
```

#### Frontend Environment Variables

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_URL=http://localhost:5173
```

#### Run the Frontend

```bash
cd frontend
npm run dev
```

App available at `http://localhost:5173`

---

### 5. Verify the Setup

With both backend and frontend running:

1. Open `http://localhost:5173`
2. Register a new account via email
3. Upload a floor plan image (PNG or JPG)
4. Confirm CV processing completes and rooms are detected
5. Place a furniture item from the catalog
6. Toggle between 2D and 3D views

---

## Running Tests

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

To run only the CV pipeline tests:

```bash
pytest tests/test_cv_phase1.py -v
```

### Frontend Tests

```bash
cd frontend
npm run test          # Unit tests (Vitest)
npm run test:e2e      # End-to-end tests (Playwright) — requires both servers running
```

---

## Deployment

### Frontend → Vercel

1. Install the [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. From the `frontend/` directory: `vercel`
3. Follow the prompts to link to your Vercel account
4. Set environment variables in the Vercel dashboard (Project → Settings → Environment Variables):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL         ← Your Render backend URL
VITE_APP_URL              ← Your Vercel deployment URL
```

Subsequent deploys happen automatically on push to `main`.

---

### Backend → Render

1. Go to [render.com](https://render.com) and create a new **Web Service**
2. Connect your GitHub repository
3. Configure the service:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Runtime | Python 3.11 |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance type | Free |

4. Add environment variables in Render (Environment tab) — all variables from the backend `.env` above, with `ENVIRONMENT=production` and `FRONTEND_URL` set to your Vercel URL.

> **Note on cold starts:** Render's free tier spins down after 15 minutes of inactivity. The first request after inactivity takes ~30 seconds. This is acceptable for an open-source tool at low traffic.

---

### Supabase Production Checklist

Before going live, verify the following in the Supabase dashboard:

- [ ] Row Level Security is **enabled** on all five tables
- [ ] All RLS policies are in place (run `backend/db/schema.sql` in full)
- [ ] The `floorplans` storage bucket is set to **Private**
- [ ] Email confirmation is enabled (Auth → Email Templates)
- [ ] Google OAuth is configured if using Google sign-in (Auth → Providers)

---

## Environment Variable Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — never expose publicly |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for token verification |
| `STORAGE_BUCKET` | Yes | Supabase Storage bucket name (`floorplans`) |
| `SIGNED_URL_EXPIRY_SECONDS` | No | Default: `3600` |
| `CV_PHASE` | No | `phase1` (default) or `phase2` |
| `CV_MIN_ROOM_AREA_RATIO` | No | Default: `0.005` |
| `CV_MAX_ROOM_AREA_RATIO` | No | Default: `0.90` |
| `MAX_UPLOAD_SIZE_MB` | No | Default: `20` |
| `PDF_CONVERSION_DPI` | No | Default: `150` |
| `ENVIRONMENT` | No | `development` or `production` |
| `FRONTEND_URL` | Yes | For CORS — your frontend origin |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon key — safe to expose in the browser |
| `VITE_API_BASE_URL` | Yes | Backend URL (`http://localhost:8000` locally) |
| `VITE_APP_URL` | Yes | Frontend URL (used for share link generation) |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on adding furniture items, improving the CV pipeline, and submitting pull requests.

The furniture catalog (`catalog/furniture.json`) is a great first contribution — all dimensions are in centimeters and follow the schema documented in `docs/BACKEND_SPEC.md` (Section 8.4).

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Acknowledgments

- [CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k) — open-source floor plan dataset used in Phase 2 CV
- [OpenCV](https://opencv.org/) — CV pipeline foundation
- [Three.js](https://threejs.org/) — 3D visualization
- [Konva.js](https://konvajs.org/) — 2D canvas editor
- [Supabase](https://supabase.com) — database, auth, and storage

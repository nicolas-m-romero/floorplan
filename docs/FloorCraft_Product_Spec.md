# FloorCraft — Product Specification

> **2D/3D Floor Plan Room Decorator**
> Version 1.0 | June 2025 | Open Source (MIT)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Features](#2-core-features)
3. [User Accounts & Data](#3-user-accounts--data)
4. [Export & Sharing](#4-export--sharing)
5. [Technical Architecture](#5-technical-architecture)
6. [User Experience Flow](#6-user-experience-flow)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Out of Scope (v1.0)](#8-out-of-scope-v10)
9. [Open Source Strategy](#9-open-source-strategy)
10. [Future Considerations](#10-future-considerations)

---

## 1. Product Overview

FloorCraft is a free, open-source web application that allows users to upload a floor plan image or PDF and interactively plan room decorations in both 2D and 3D. The core goal is to help renters and apartment dwellers understand how furniture occupies their limited space before making purchasing or moving decisions.

The application is **not** a high-fidelity interior design tool. Its primary value is **spatial awareness** — giving users a dimensionally accurate reference for how furniture items fill a room — rather than photorealistic visualization.

### 1.1 Problem Statement

Renters in apartments and small spaces often struggle to know whether furniture will fit their space, how it will affect circulation, and how to optimize limited square footage. Existing tools are either too complex, require subscriptions, or assume professional knowledge. FloorCraft solves this with a fast, free, upload-and-place workflow.

### 1.2 Target User

| Attribute | Detail |
|---|---|
| Primary user | Renters in apartments and small spaces |
| Use case | Planning furniture layout before or after moving |
| Technical level | Non-technical — expects intuitive, guided UX |
| Secondary use | Existing residents freshening up their space |

### 1.3 Design Philosophy

- **Free forever** — no paywalls, no API costs per user action
- **Open source** — fully public codebase, community-contributable
- **Dimension-first** — spatial accuracy over visual polish
- **Correct-friendly** — CV detection is a starting point; users refine it
- **Desktop-primary** — full editing on desktop; mobile is view/review only

---

## 2. Core Features

### 2.1 Floor Plan Upload & Processing

The entry point of the application. Users upload their floor plan and the CV pipeline extracts room geometry.

| Item | Detail |
|---|---|
| Accepted formats | PDF, JPG, PNG |
| Upload method | Drag-and-drop or file picker |
| Processing | Server-side Python CV pipeline |
| Output | Detected room polygons + room type labels |
| Scale calibration | Required post-upload step: user clicks two points and enters the real-world distance between them |

### 2.2 Computer Vision Pipeline (Phased)

The CV pipeline uses a cost-free, progressively improving approach. Each phase improves accuracy without introducing per-request API costs.

#### Phase 1 — Classical OpenCV (MVP)

- Canny edge detection to identify wall lines
- Contour detection to find enclosed regions
- Flood fill to isolate individual rooms
- Hough Line Transform for straight wall segment extraction
- Works well on clean printed/PDF floor plans

#### Phase 2 — CubiCasa5K Pre-trained Model

- Open-source model trained on 5,000 floor plans
- Detects rooms, walls, doors, and windows
- Hosted on Hugging Face — zero inference cost when self-hosted
- Significantly improves accuracy on standard real estate floor plans

#### Phase 3 — Fine-tuned YOLOv8 (Stretch Goal)

- Fine-tune on CubiCasa5K + HouseExpo datasets
- Train for free on Google Colab
- Best accuracy across varied floor plan styles

#### Accuracy Expectations by Phase

| Floor Plan Type | Phase 1 (OpenCV) | Phase 2 (CubiCasa5K) |
|---|---|---|
| Clean PDF / print | Good | Very Good |
| Real estate render | Poor | Moderate |
| Hand-drawn | Very Poor | Poor |

> **Note:** The user correction workflow (Section 2.3) is designed to compensate for imperfect detection. 70%+ accuracy is acceptable at launch.

### 2.3 Room Selection & Correction UI

After processing, users are presented with a checklist of all detected rooms. They may opt into only the rooms they wish to decorate. Room boundary polygons are overlaid on the original floor plan image and are fully editable.

- Drag polygon corner points to adjust detected room boundaries
- Rename room labels (e.g., rename "Room" to "Master Bedroom")
- Add rooms manually if detection missed one
- Delete false-positive rooms

### 2.4 2D Room Editor

The primary editing surface. Each selected room is shown as a top-down 2D canvas aligned with the uploaded floor plan. Users drag furniture from the catalog or create custom pieces.

#### Snapping & Measurement Aids

- Snap to grid
- Snap to walls
- Collision detection — furniture pieces cannot overlap
- Dimension labels shown on each furniture item in the canvas
- Ruler/measurement overlay on canvas edges
- Unit toggle — Imperial (ft/in) or Metric (cm/m) switchable at any time

#### Furniture Interaction

- Drag from catalog sidebar onto canvas
- Rotate in 90-degree increments (or free rotation)
- Resize by dragging handles (respects real-world min/max dimensions)
- Click to select — shows dimension panel for manual numeric entry
- Delete selected item with keyboard shortcut or toolbar button

### 2.5 3D Viewer

A secondary view that extrudes the 2D room into a 3D space. Furniture items are represented as dimensionally accurate colored boxes — not photorealistic models. The goal is spatial awareness, not aesthetics.

| Capability | Detail |
|---|---|
| Primary interaction | Orbit, pan, zoom (view only) |
| Height editing | Users can adjust object height in 3D (for stacked items, shelving, wall-mounted objects) |
| Sync | 2D edits reflect instantly in 3D; height edits in 3D sync back |
| Rendering | Three.js — box geometry with labeled faces |
| Room shell | Walls, floor, and ceiling extruded from 2D room polygon |

Height editing in 3D is essential for items such as: multi-tier shelving units, stacked washer/dryers, wall-mounted TVs, bunk beds, and loft beds.

### 2.6 Furniture Catalog

A built-in library of common furniture items with real-world default dimensions. Users drag items from the catalog into the room. All dimensions are editable after placement.

| Category | Example Items |
|---|---|
| Living Room | Sofa, loveseat, coffee table, TV stand, armchair, bookshelf |
| Bedroom | Twin/Full/Queen/King bed, dresser, nightstand, wardrobe |
| Dining | Dining table (2/4/6 seat), dining chairs, bar stools, buffet |
| Office | Desk, office chair, filing cabinet, shelving unit |
| Kitchen | Refrigerator, dishwasher, microwave stand, kitchen island |
| Outdoor / Balcony | Patio table, outdoor chairs, lounger, planter boxes |

**Custom items:** Users can create a custom rectangle/box by entering a name, width, depth, and height. Custom items are saved to the session and user account.

The furniture catalog is stored as a static JSON file in the repository, making it easy for the community to contribute new items and categories.

---

## 3. User Accounts & Data

### 3.1 Authentication

- Email/password registration and login
- Google OAuth recommended for low-friction signup
- Implemented via Supabase Auth (free tier)

### 3.2 Saved Layouts

- Users can save multiple named layout projects
- Each project stores: floor plan image, detected rooms, furniture placements, and unit preference
- Layouts load instantly on return visit
- Users can duplicate or delete saved projects

### 3.3 Data Storage

| Data Type | Storage Approach |
|---|---|
| Floor plan images | Supabase Storage (free tier object storage) |
| Layout data | PostgreSQL via Supabase (free tier) |
| User accounts | Supabase Auth |
| Furniture catalog | Static JSON file in repo — no database needed |

---

## 4. Export & Sharing

### 4.1 Share via Link

- Each saved layout gets a unique shareable URL
- Shared view is read-only — recipients cannot edit
- No account required to view a shared link
- Links can be toggled public/private by the owner

### 4.2 Export as PDF

- Exports the 2D layout of selected rooms
- Includes furniture dimension labels
- Scale bar included on export
- Option to export one page per room or all rooms on a single page

### 4.3 Mobile View

The application is desktop-primary for editing. On mobile, users can view saved layouts and shared links in a read-only mode. The 2D and 3D views are accessible on mobile but editing tools are hidden. This allows users to reference their layout while physically standing in the space.

---

## 5. Technical Architecture

### 5.1 Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Vite | Fast dev, large ecosystem, component-based |
| 2D Canvas | Konva.js | Mature drag-and-drop canvas library for React |
| 3D Viewer | Three.js | Industry standard; box geometry is simple to implement |
| CV Backend | Python + OpenCV / CubiCasa5K | Free, self-hosted, no per-request cost |
| API Layer | FastAPI | Lightweight, async, easy file upload handling |
| Auth & DB | Supabase | Generous free tier — Postgres + Auth + Storage |
| Frontend Hosting | Vercel | Free tier, instant deploys from GitHub |
| Backend Hosting | Render | Free tier suitable for low-traffic Python services |
| PDF Export | pdf-lib | Client-side PDF generation, no server cost |

### 5.2 Repository Structure

```
floorcraft/
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Upload/         # Floor plan upload & CV result review
│   │   │   ├── Editor2D/       # Konva.js canvas editor
│   │   │   ├── Viewer3D/       # Three.js 3D viewer
│   │   │   ├── Catalog/        # Furniture catalog sidebar
│   │   │   └── Export/         # PDF export & share link UI
│   │   ├── hooks/
│   │   ├── store/              # Global state (Zustand recommended)
│   │   └── utils/
│   └── public/
├── backend/                # Python FastAPI service
│   ├── cv/
│   │   ├── phase1_opencv.py    # Classical CV pipeline
│   │   ├── phase2_cubicasa.py  # CubiCasa5K inference
│   │   └── utils.py
│   ├── routes/
│   │   ├── upload.py           # Floor plan upload endpoint
│   │   └── export.py
│   └── main.py
├── catalog/
│   └── furniture.json          # Community-maintained furniture catalog
├── docs/
│   └── PRODUCT_SPEC.md         # This document
├── CONTRIBUTING.md
└── README.md                   # Setup guide for free-tier deployment
```

### 5.3 System Flow

1. User uploads floor plan (PDF/JPG/PNG) via React frontend
2. Frontend sends file to FastAPI backend
3. Python CV pipeline processes image and returns room polygons as GeoJSON
4. Frontend renders polygons overlaid on the original floor plan image
5. User reviews detected rooms, corrects polygons, and completes scale calibration
6. User selects rooms to decorate and enters the 2D editor
7. Furniture is dragged from the catalog sidebar onto the Konva.js canvas
8. Three.js 3D view syncs with 2D placements in real time
9. Layout is saved to Supabase on demand or auto-saved
10. User exports PDF or shares via unique link

### 5.4 Scale Calibration

After CV processing, the user must complete a one-time scale calibration step per floor plan:

- User clicks two points on the floor plan image (e.g., a wall they know the length of)
- User enters the real-world distance between those two points
- App computes a pixels-per-unit ratio applied to all room and furniture dimensions
- Calibration can be redone at any time from project settings

### 5.5 State Management

Zustand is recommended for global state. Key stores:

- `projectStore` — current floor plan, room polygons, scale calibration
- `editorStore` — active room, furniture placements, selected item, unit preference
- `uiStore` — active view (2D/3D), sidebar state, loading states

---

## 6. User Experience Flow

### 6.1 Onboarding (New User)

1. Landing page with product explainer and sample layout screenshot
2. Sign up with email or Google
3. Immediate prompt to upload first floor plan — no setup wizard

### 6.2 Core Editing Flow

1. Upload floor plan → CV processing (spinner with status message)
2. Review detected rooms → correct polygons if needed → confirm room list
3. Complete scale calibration → confirmed with live dimension preview
4. Select rooms to decorate → enter 2D editor
5. Browse catalog sidebar → drag furniture onto canvas
6. Toggle to 3D view to check height/stacking → adjust heights as needed
7. Save project → share link or export PDF

### 6.3 Return User Flow

1. Login → dashboard of saved projects (card grid with thumbnail previews)
2. Open project → immediately back in 2D editor at last state
3. Continue editing, share, or export

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| CV processing time | Under 10 seconds for a standard floor plan |
| 2D canvas performance | 60fps with up to 50 furniture items |
| 3D viewer performance | Smooth orbit with up to 50 box objects |
| Mobile view load time | Under 3 seconds on 4G |
| Uptime | Best-effort on free hosting tiers |
| Accessibility | Keyboard-navigable editor, WCAG AA color contrast |
| Browser support | Chrome, Firefox, Safari, Edge — latest 2 versions |

---

## 8. Out of Scope (v1.0)

- Photorealistic 3D furniture models
- Color, material, or texture customization
- AI-generated layout suggestions
- Integration with live furniture retailer catalogs (e.g., IKEA API)
- Multi-user real-time collaboration
- Native mobile app
- CAD/DXF file import
- Hand-drawn floor plan support
- Monetization or premium tier

---

## 9. Open Source Strategy

FloorCraft will be fully open source under the **MIT License**.

| Item | Approach |
|---|---|
| License | MIT — permissive, community-friendly |
| Repository | GitHub — monorepo with `/frontend` and `/backend` |
| Furniture catalog | `catalog/furniture.json` — easily community-expandable |
| CV model weights | Hosted on Hugging Face (free), linked from repo README |
| Contributions | `CONTRIBUTING.md` with local setup guide and issue templates |
| Deployment guide | `README.md` covers full Vercel + Render + Supabase free-tier setup |

---

## 10. Future Considerations

- Community-contributed furniture catalog expansions
- Improved CV accuracy via community-contributed floor plan dataset
- Retailer integrations — link catalog items to purchase pages
- Room templates — pre-populated starter layouts for common apartment sizes
- Multi-room view — see all rooms of a full floor plan simultaneously
- Freemium tier — optional paid features (advanced export, more storage) to sustain hosting costs

---

*This document was produced from a product discovery conversation and is intended as context for agentic coding tools and development planning.*

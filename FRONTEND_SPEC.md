# Floorplan — Frontend Specification

> **Companion document to:** `docs/PRODUCT_SPEC.md`, `docs/BACKEND_SPEC.md`, `docs/DESIGN_SYSTEM.md`
> Version 1.0 | June 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Routing](#4-routing)
5. [State Management (Zustand)](#5-state-management-zustand)
6. [Component Architecture](#6-component-architecture)
7. [2D Editor (Konva.js)](#7-2d-editor-konvajs)
8. [3D Viewer (Three.js)](#8-3d-viewer-threejs)
9. [2D ↔ 3D Sync](#9-2d--3d-sync)
10. [API Integration](#10-api-integration)
11. [Authentication Flow](#11-authentication-flow)
12. [Performance Constraints](#12-performance-constraints)

---

## 1. Overview

The frontend is a React + Vite single-page application. It has two distinct shells:

- **Marketing shell** — the landing page (`/`). Static content, Three.js hero, no auth required.
- **App shell** — everything inside the editor (`/dashboard`, `/editor/:projectId`). Requires authentication. Persistent top bar + sidebar layout.

These two shells share a design token system and component library but have completely separate layouts and navigation. They should not share a root layout component.

---

## 2. Tech Stack

| Concern | Library | Version | Notes |
|---|---|---|---|
| Framework | React | 18.x | Functional components, hooks only |
| Build tool | Vite | 5.x | Fast dev server, ESM builds |
| Routing | React Router | 6.x | File-based via `createBrowserRouter` |
| State | Zustand | 4.x | One store per domain (see Section 5) |
| 2D canvas | Konva.js + react-konva | 9.x | Stage/Layer/Group pattern |
| 3D viewer | Three.js | 0.165.x | Raw Three.js, no wrapper library |
| Auth | @supabase/supabase-js | 2.x | Auth + direct DB reads |
| HTTP client | Native `fetch` | — | Thin wrapper in `src/api/` |
| Styling | CSS custom properties | — | Token-based, no CSS-in-JS |
| Icons | lucide-react | 0.383.0 | Stroke 1.5, no filled variants |
| PDF export | pdf-lib | 1.x | Client-side, no server round-trip |
| Animation | Native CSS + IntersectionObserver | — | No animation library |

**What is deliberately excluded:**
- No Tailwind CSS — design tokens via CSS custom properties per `DESIGN_SYSTEM.md`
- No Redux / React Query — Zustand + native fetch is sufficient
- No component library (shadcn, MUI, etc.) — all components are bespoke per the design system
- No Next.js — pure SPA, no server-side rendering needed

---

## 3. Project Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
├── public/
│   └── favicon.ico
│
└── src/
    ├── main.tsx                    # React root, router setup
    ├── router.tsx                  # createBrowserRouter definition
    │
    ├── styles/
    │   ├── tokens.css              # All CSS custom properties
    │   ├── reset.css               # Minimal reset
    │   ├── base.css                # html, body, root font
    │   └── utilities.css           # .grid, .section, .eyebrow, [data-reveal]
    │
    ├── lib/
    │   ├── supabase.ts             # Supabase client singleton
    │   ├── tokens.ts               # Design tokens mirrored in JS (for Three.js)
    │   └── units.ts                # cm ↔ imperial/metric conversions, px ↔ cm
    │
    ├── api/
    │   ├── client.ts               # Base fetch wrapper with auth headers
    │   ├── projects.ts             # Project CRUD
    │   ├── rooms.ts                # Room CRUD
    │   ├── placements.ts           # Furniture placement CRUD
    │   ├── catalog.ts              # Catalog fetch
    │   └── share.ts                # Share link creation/resolution
    │
    ├── stores/
    │   ├── authStore.ts            # Auth state
    │   ├── projectStore.ts         # Active project + calibration
    │   ├── editorStore.ts          # Active room, placements, selected item
    │   ├── catalogStore.ts         # Furniture catalog cache
    │   └── uiStore.ts              # View mode, sidebar state, loading
    │
    ├── hooks/
    │   ├── useAuth.ts              # Auth state + helpers
    │   ├── useProject.ts           # Load/save project
    │   ├── useEditor.ts            # Editor actions (place, move, delete)
    │   ├── useCalibration.ts       # Calibration point selection logic
    │   ├── useAutoSave.ts          # Debounced auto-save
    │   └── useReveal.ts            # IntersectionObserver for scroll reveals
    │
    ├── components/
    │   ├── ui/                     # Primitive, reusable components
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Divider.tsx
    │   │   ├── Eyebrow.tsx
    │   │   └── Modal.tsx
    │   │
    │   ├── layout/
    │   │   ├── MarketingNav.tsx    # Landing page nav
    │   │   ├── AppTopBar.tsx       # Editor top bar
    │   │   ├── AppSidebar.tsx      # Editor sidebar shell
    │   │   └── Footer.tsx
    │   │
    │   ├── hero/
    │   │   ├── Hero.tsx            # Hero section shell
    │   │   ├── HeroCanvas.tsx      # Three.js canvas for 3D model
    │   │   └── HeroScrollSync.ts   # Scroll → rotation logic
    │   │
    │   ├── upload/
    │   │   ├── UploadZone.tsx      # Drag-and-drop upload area
    │   │   ├── ProcessingState.tsx # CV processing spinner/status
    │   │   └── CalibrationTool.tsx # Two-point calibration UI
    │   │
    │   ├── rooms/
    │   │   ├── RoomChecklist.tsx   # Post-CV room selection list
    │   │   ├── RoomPolygonEditor.tsx # Polygon correction overlay
    │   │   └── RoomCard.tsx        # Room summary card on dashboard
    │   │
    │   ├── editor/
    │   │   ├── EditorShell.tsx     # 2D/3D toggle + canvas container
    │   │   ├── Editor2D.tsx        # Konva.js 2D canvas
    │   │   ├── Editor3D.tsx        # Three.js 3D viewer
    │   │   ├── FurnitureItem2D.tsx # Single item on 2D canvas
    │   │   ├── FurnitureItem3D.tsx # Single item in 3D scene
    │   │   ├── DimensionLabel.tsx  # Overlay label on canvas item
    │   │   ├── RulerOverlay.tsx    # Canvas ruler along edges
    │   │   └── SnapIndicator.tsx   # Snap-to-wall visual flash
    │   │
    │   ├── catalog/
    │   │   ├── CatalogSidebar.tsx  # Catalog panel in editor
    │   │   ├── CatalogCategory.tsx # Expandable category section
    │   │   ├── CatalogItem.tsx     # Draggable catalog item chip
    │   │   └── CustomItemForm.tsx  # Form to create a custom item
    │   │
    │   ├── properties/
    │   │   ├── PropertiesPanel.tsx # Right panel when item selected
    │   │   ├── DimensionInput.tsx  # Numeric input with unit display
    │   │   └── ColorPicker.tsx     # Simple hex color swatches
    │   │
    │   └── export/
    │       ├── ExportModal.tsx     # Export options modal
    │       ├── ShareModal.tsx      # Share link modal
    │       └── pdfExport.ts        # pdf-lib export logic
    │
    └── pages/
        ├── Landing.tsx             # Marketing landing page
        ├── Login.tsx               # Auth page
        ├── Dashboard.tsx           # Project grid
        └── Editor.tsx              # Full editor page
```

---

## 4. Routing

```typescript
// src/router.tsx
import { createBrowserRouter, redirect } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Auth guard loader
async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw redirect('/login');
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/dashboard',
    loader: requireAuth,
    element: <Dashboard />,
  },
  {
    path: '/editor/:projectId',
    loader: requireAuth,
    element: <Editor />,
  },
  {
    path: '/share/:token',
    element: <SharedView />,   // Read-only, no auth
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
```

### Route Behavior

| Route | Auth | Shell | Description |
|---|---|---|---|
| `/` | None | Marketing | Landing page with hero |
| `/login` | None | Minimal | Email/Google auth |
| `/dashboard` | Required | App | Project grid |
| `/editor/:projectId` | Required | App | Full 2D/3D editor |
| `/share/:token` | None | Read-only app | Shared layout view |
| `*` | None | Minimal | 404 |

---

## 5. State Management (Zustand)

All stores live in `src/stores/`. Each store is a named Zustand store with typed state and actions. Stores do not call the API directly — that is the responsibility of hooks (see Section 6.5).

### 5.1 `authStore`

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

### 5.2 `projectStore`

Holds the active project's full data including rooms and their polygon boundaries.

```typescript
// src/stores/projectStore.ts
interface Calibration {
  point1: { x: number; y: number };
  point2: { x: number; y: number };
  realDistanceCm: number;
  pixelsPerCm: number;
}

interface Room {
  id: string;
  label: string;
  roomType: string;
  isSelected: boolean;
  sortOrder: number;
  polygonPx: Array<{ x: number; y: number }>;
  areaCm2: number | null;
  bboxWidthCm: number | null;
  bboxHeightCm: number | null;
}

interface Project {
  id: string;
  name: string;
  floorPlanUrl: string;
  floorPlanWidthPx: number;
  floorPlanHeightPx: number;
  unitSystem: 'imperial' | 'metric';
  calibration: Calibration | null;
  cvStatus: 'pending' | 'processing' | 'complete' | 'failed';
  isPublic: boolean;
  rooms: Room[];
}

interface ProjectState {
  project: Project | null;
  activeRoomId: string | null;

  setProject: (project: Project) => void;
  setActiveRoom: (roomId: string) => void;
  updateRoom: (roomId: string, patch: Partial<Room>) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setCalibration: (calibration: Calibration) => void;
  setUnitSystem: (system: 'imperial' | 'metric') => void;
  reset: () => void;
}
```

### 5.3 `editorStore`

Holds the furniture placement state for the active room. This is the hot-path store — updated on every drag event.

```typescript
// src/stores/editorStore.ts
interface Placement {
  id: string;
  catalogItemId: string | null;
  label: string;
  positionXPx: number;
  positionYPx: number;
  rotationDeg: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  elevationCm: number;
  colorHex: string;
  isCustom: boolean;
}

interface EditorState {
  placements: Placement[];            // All placements for the active room
  selectedId: string | null;         // ID of the currently selected placement
  isDragging: boolean;
  isColliding: boolean;              // True during a collision rejection

  setPlacements: (placements: Placement[]) => void;
  addPlacement: (placement: Placement) => void;
  updatePlacement: (id: string, patch: Partial<Placement>) => void;
  removePlacement: (id: string) => void;
  setSelected: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setColliding: (isColliding: boolean) => void;
  clearRoom: () => void;
}
```

### 5.4 `catalogStore`

Cached furniture catalog. Fetched once on app load, never re-fetched.

```typescript
// src/stores/catalogStore.ts
interface CatalogItem {
  id: string;
  label: string;
  defaultWidthCm: number;
  defaultDepthCm: number;
  defaultHeightCm: number;
  minWidthCm: number;
  maxWidthCm: number;
  colorHex: string;
  tags: string[];
}

interface CatalogCategory {
  id: string;
  label: string;
  items: CatalogItem[];
}

interface CatalogState {
  categories: CatalogCategory[];
  customItems: CatalogItem[];        // User's custom items
  isLoaded: boolean;
  setCategories: (categories: CatalogCategory[]) => void;
  setCustomItems: (items: CatalogItem[]) => void;
  addCustomItem: (item: CatalogItem) => void;
  removeCustomItem: (id: string) => void;
}
```

### 5.5 `uiStore`

Global UI state — does not hold domain data.

```typescript
// src/stores/uiStore.ts
interface UIState {
  viewMode: '2d' | '3d';
  sidebarTab: 'catalog' | 'rooms' | 'properties';
  isExportModalOpen: boolean;
  isShareModalOpen: boolean;
  isSaving: boolean;
  saveError: string | null;

  setViewMode: (mode: '2d' | '3d') => void;
  setSidebarTab: (tab: UIState['sidebarTab']) => void;
  setExportModalOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
}
```

---

## 6. Component Architecture

### 6.1 Design Rules

- All components are **functional components with hooks**. No class components.
- Components receive typed props only — no prop drilling beyond 2 levels; use stores for deep state.
- Components in `src/components/ui/` are **pure presentational** — no store access, no API calls.
- Components in `src/components/editor/`, `src/components/catalog/`, etc. may access stores directly.
- Pages (`src/pages/`) orchestrate layout and call hooks to load initial data.

### 6.2 Page: `Editor.tsx`

The editor page is the most complex. Its responsibility:

```
Editor (page)
├── Loads project data on mount (useProject hook)
├── Loads catalog on mount (catalogStore)
├── Sets up auto-save (useAutoSave hook)
│
└── AppTopBar
    ├── Project name (editable inline)
    ├── Unit system toggle
    ├── Save button (with save state indicator)
    ├── Share button → ShareModal
    └── Export button → ExportModal

└── AppSidebar (left, 300px)
    ├── Tab: Catalog → CatalogSidebar
    ├── Tab: Rooms → RoomChecklist
    └── Tab: Properties → PropertiesPanel (visible when item selected)

└── EditorShell (main canvas area)
    ├── 2D/3D toggle button (top-right of canvas)
    ├── Editor2D (visible when viewMode = '2d')
    └── Editor3D (visible when viewMode = '3d')
```

### 6.3 Component: `EditorShell.tsx`

```typescript
// src/components/editor/EditorShell.tsx
export function EditorShell() {
  const viewMode = useUIStore(s => s.viewMode);

  return (
    <div className="editor-shell">
      <ViewToggle />
      {/* Both canvases are mounted; only one is visible.
          This preserves Three.js scene state during toggling. */}
      <div style={{ display: viewMode === '2d' ? 'block' : 'none' }}>
        <Editor2D />
      </div>
      <div style={{ display: viewMode === '3d' ? 'block' : 'none' }}>
        <Editor3D />
      </div>
    </div>
  );
}
```

**Critical:** Both canvases are mounted simultaneously, only toggled via `display`. This preserves the Three.js renderer and Konva Stage between view switches. Do not unmount and remount them on toggle.

### 6.4 Component: `UploadZone.tsx`

Handles file selection, validation, upload, and the transition to the calibration step.

```
UploadZone
├── State: idle | dragging-over | uploading | processing | calibrating | done
├── Accepts: PDF, JPG, PNG via drag-drop or file picker
├── Validates: file type, file size (< 20MB) client-side before upload
├── On upload success: renders CalibrationTool overlay on the floor plan image
└── On calibration complete: navigates to /editor/:projectId
```

### 6.5 Hooks Pattern

Hooks are the bridge between stores and the API layer:

```typescript
// src/hooks/useProject.ts
export function useProject(projectId: string) {
  const setProject = useProjectStore(s => s.setProject);
  const setSaving = useUIStore(s => s.setSaving);

  // Load project on mount
  useEffect(() => {
    api.projects.getById(projectId).then(setProject);
  }, [projectId]);

  // Expose save action
  const save = useCallback(async () => {
    setSaving(true);
    const placements = useEditorStore.getState().placements;
    const activeRoomId = useProjectStore.getState().activeRoomId;
    await api.placements.bulkReplace(projectId, activeRoomId, placements);
    setSaving(false);
  }, [projectId]);

  return { save };
}
```

---

## 7. 2D Editor (Konva.js)

### 7.1 Canvas Structure

```
Stage (full editor area)
└── Layer: floor-plan-image
    └── KonvaImage (the uploaded floor plan, scaled to fit)

└── Layer: room-boundary
    └── Line (closed polygon, room boundary outline)
        └── Drawn at full floor plan scale

└── Layer: furniture
    └── Group (one per placement)
        ├── Rect (the furniture footprint)
        ├── Text (item label)
        └── Text (dimension label: "228 × 91 cm")

└── Layer: ui-overlays
    ├── Line[] (snap indicator lines — visible briefly on snap)
    ├── Rect[] (ruler tick marks)
    └── Text[] (ruler unit labels)
```

### 7.2 Scale Model

The floor plan image is rendered at a scale to fit the canvas container. All pixel positions in the Konva stage are at **display scale**, not the original floor plan image pixel scale.

```typescript
// src/lib/units.ts

/**
 * Converts a pixel position in the original floor plan image
 * to a pixel position on the Konva display canvas.
 */
export function imagePxToCanvasPx(
  imagePx: number,
  displayScale: number
): number {
  return imagePx * displayScale;
}

/**
 * Converts a real-world dimension in cm to pixels on the Konva canvas.
 * pixelsPerCm is at original image resolution.
 * displayScale is the ratio of canvas display size to original image size.
 */
export function cmToCanvasPx(
  cm: number,
  pixelsPerCm: number,
  displayScale: number
): number {
  return cm * pixelsPerCm * displayScale;
}
```

The `displayScale` is computed on Stage mount and on window resize:

```typescript
const displayScale = Math.min(
  containerWidth / project.floorPlanWidthPx,
  containerHeight / project.floorPlanHeightPx
);
```

### 7.3 Furniture Drag & Drop from Catalog

Dragging a catalog item onto the canvas uses HTML5 drag-and-drop, not Konva dragging:

```
1. User mousedowns on a CatalogItem (sets dragData on dataTransfer)
2. User drags over the Konva container div
3. On drop: get canvas-relative coordinates from the drop event
4. Convert drop position from canvas px to image px
5. Dispatch addPlacement action to editorStore
6. The new Konva Group appears immediately via store update
```

```typescript
// On the canvas container div
function handleDrop(e: React.DragEvent) {
  const catalogItemId = e.dataTransfer.getData('catalogItemId');
  const item = getCatalogItem(catalogItemId);
  const rect = e.currentTarget.getBoundingClientRect();

  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;

  // Convert to image pixel space for storage
  const imagePx = {
    x: canvasX / displayScale,
    y: canvasY / displayScale,
  };

  editorStore.getState().addPlacement({
    id: crypto.randomUUID(),
    catalogItemId,
    label: item.label,
    positionXPx: imagePx.x,
    positionYPx: imagePx.y,
    rotationDeg: 0,
    widthCm: item.defaultWidthCm,
    depthCm: item.defaultDepthCm,
    heightCm: item.defaultHeightCm,
    elevationCm: 0,
    colorHex: item.colorHex,
    isCustom: false,
  });
}
```

### 7.4 Snap to Wall

On every drag move, check if the dragged item's edges are within a snap threshold of the room polygon walls:

```typescript
const SNAP_THRESHOLD_PX = 10; // In display pixels

function getSnapPosition(
  itemRect: { x: number; y: number; w: number; h: number },
  roomPolygon: Array<{ x: number; y: number }>,
  displayScale: number
): { x: number; y: number } | null {
  // Check each edge of the item rect against each wall segment of the polygon
  // If any edge is within SNAP_THRESHOLD_PX, snap to that wall
  // Return adjusted position, or null if no snap
}
```

When a snap occurs:
1. Adjust the item position to the snapped value
2. Flash the `SnapIndicator` for 150ms
3. Play a subtle tick sound (optional, respects OS mute)

### 7.5 Collision Detection

On every position update, check if the new bounding rect overlaps with any other furniture item's bounding rect:

```typescript
function hasCollision(
  movingItem: Placement,
  allPlacements: Placement[],
  pixelsPerCm: number,
  displayScale: number
): boolean {
  const movingRect = getItemRect(movingItem, pixelsPerCm, displayScale);

  return allPlacements
    .filter(p => p.id !== movingItem.id)
    .some(other => {
      const otherRect = getItemRect(other, pixelsPerCm, displayScale);
      return rectsOverlap(movingRect, otherRect);
    });
}
```

On collision:
1. Block the position update — snap back to last valid position
2. Set `editorStore.isColliding = true`
3. Trigger CSS shake animation on the Konva Group via React state
4. Reset `isColliding` after 120ms

### 7.6 Rotation

Selected items rotate on `R` keydown (90° increments). Free rotation via a rotation handle is a stretch goal.

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'r' || e.key === 'R') {
      const id = editorStore.getState().selectedId;
      if (!id) return;
      const item = editorStore.getState().placements.find(p => p.id === id);
      if (!item) return;
      editorStore.getState().updatePlacement(id, {
        rotationDeg: (item.rotationDeg + 90) % 360,
      });
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const id = editorStore.getState().selectedId;
      if (id) editorStore.getState().removePlacement(id);
    }
  }
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 8. 3D Viewer (Three.js)

### 8.1 Scene Setup

```typescript
// src/components/editor/Editor3D.tsx (setup logic)

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(containerWidth, containerHeight);
renderer.shadowMap.enabled = true;

// Camera initial position: isometric-ish view of the room
camera.position.set(5, 8, 8);
camera.lookAt(0, 0, 0);

// Orbit controls (mouse drag to orbit, scroll to zoom)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;     // Pan disabled — keep focus on the room
controls.minDistance = 2;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below the floor

// Lighting
const ambientLight = new THREE.AmbientLight(0x161616, 0.5);
const keyLight = new THREE.DirectionalLight(0xF0EDE8, 1.2);
keyLight.position.set(5, 10, 5);
keyLight.castShadow = true;
const rimLight = new THREE.PointLight(0x4A7FD4, 0.8, 20);
rimLight.position.set(-5, 5, -5);

scene.add(ambientLight, keyLight, rimLight);
```

### 8.2 Room Shell Construction

The room shell (floor, walls, ceiling outline) is built from the room polygon stored in the project store. All measurements are converted from pixels to meters for Three.js (1 unit = 1 meter).

```typescript
function buildRoomShell(
  polygonPx: Array<{ x: number; y: number }>,
  pixelsPerCm: number,
  roomHeightCm: number = 243.84  // 8ft default ceiling height
): THREE.Group {
  const group = new THREE.Group();

  // Convert polygon from image px to meters
  const polygonM = polygonPx.map(pt => ({
    x: (pt.x / pixelsPerCm) / 100,
    y: (pt.y / pixelsPerCm) / 100,
  }));

  const roomHeightM = roomHeightCm / 100;

  // Floor — extruded polygon shape
  const shape = new THREE.Shape(
    polygonM.map(pt => new THREE.Vector2(pt.x, pt.y))
  );
  const floorGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  const floor = new THREE.Mesh(floorGeometry, materials.floor);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Walls — one box per polygon edge
  for (let i = 0; i < polygonM.length; i++) {
    const a = polygonM[i];
    const b = polygonM[(i + 1) % polygonM.length];
    const wallLength = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    const wallAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    const wallGeo = new THREE.BoxGeometry(wallLength, roomHeightM, 0.15);
    const wall = new THREE.Mesh(wallGeo, materials.walls);
    wall.position.set(midX, roomHeightM / 2, midY);
    wall.rotation.y = -wallAngle;
    group.add(wall);
  }

  return group;
}
```

### 8.3 Furniture Box Construction

Each placement is rendered as a labeled `BoxGeometry`. CSS2DObject handles the label.

```typescript
function buildFurnitureBox(placement: Placement): THREE.Group {
  const group = new THREE.Group();
  const { widthCm, depthCm, heightCm, elevationCm, colorHex } = placement;

  const w = widthCm / 100;
  const d = depthCm / 100;
  const h = heightCm / 100;
  const elev = elevationCm / 100;

  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2 + elev;
  mesh.castShadow = true;

  // Wireframe edge highlight
  const edges = new THREE.EdgesGeometry(geo);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x404040 });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.y = mesh.position.y;

  // CSS2D label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'dimension-label';
  labelDiv.textContent = placement.label;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, h + elev + 0.1, 0);

  group.add(mesh, wireframe, label);

  // Position in room (convert from image px to meters)
  const pixelsPerCm = useProjectStore.getState().project!.calibration!.pixelsPerCm;
  group.position.x = (placement.positionXPx / pixelsPerCm) / 100;
  group.position.z = (placement.positionYPx / pixelsPerCm) / 100;
  group.rotation.y = -(placement.rotationDeg * Math.PI) / 180;

  return group;
}
```

### 8.4 Height Editing in 3D

When the user selects a furniture item in 3D and drags it vertically, only `elevationCm` is updated (not position). This is the primary edit that requires 3D — stacked objects, wall-mounted TVs, shelving.

```typescript
// Vertical drag on selected object
function onVerticalDrag(deltaY: number, itemId: string) {
  const item = editorStore.getState().placements.find(p => p.id === itemId);
  if (!item) return;

  const newElevation = Math.max(0, item.elevationCm + deltaY * 10); // deltaY in scene units
  editorStore.getState().updatePlacement(itemId, { elevationCm: newElevation });
  // Sync immediately triggers re-render of both 2D label and 3D box position
}
```

---

## 9. 2D ↔ 3D Sync

The two views stay in sync via the **`editorStore` as the single source of truth**. Neither canvas holds its own state — they both read from and write to the store.

### 9.1 Sync Direction Rules

| Action | Origin | Effect |
|---|---|---|
| Drag furniture | 2D canvas | Updates `positionXPx`, `positionYPx` in store → 3D re-renders |
| Rotate furniture | 2D canvas (R key) | Updates `rotationDeg` in store → 3D re-renders |
| Resize furniture | Properties panel | Updates `widthCm`, `depthCm` in store → both re-render |
| Adjust height | 3D viewer drag | Updates `elevationCm` in store → 2D label updates |
| Adjust height | Properties panel | Updates `elevationCm` in store → 3D box lifts |
| Select item | Either view | Sets `selectedId` in store → both highlight the same item |
| Delete item | Either view | Removes from store → disappears in both |

### 9.2 Re-render Strategy

Both canvases subscribe to `editorStore.placements` via Zustand selectors. When the store updates, React re-renders the relevant Konva Groups or Three.js meshes.

```typescript
// In Editor2D.tsx — subscribe to only what this canvas needs
const placements = useEditorStore(s => s.placements);
const selectedId = useEditorStore(s => s.selectedId);

// In Editor3D.tsx — same subscription, different rendering
const placements = useEditorStore(s => s.placements);
const selectedId = useEditorStore(s => s.selectedId);
```

Three.js does not use React's render cycle for its animation loop. Instead, when the store updates, a ref flag is set and the next animation frame picks up the change:

```typescript
// In Editor3D.tsx
const needsUpdateRef = useRef(false);

useEffect(() => {
  // Whenever placements change, flag for Three.js update
  needsUpdateRef.current = true;
}, [placements]);

// In the Three.js animation loop
function animate() {
  requestAnimationFrame(animate);
  if (needsUpdateRef.current) {
    syncPlacementsToScene(placements, scene);
    needsUpdateRef.current = false;
  }
  controls.update();
  renderer.render(scene, camera);
}
```

### 9.3 Sync for Selected State

When an item is selected in 2D (click on a Konva Group), or in 3D (raycasting on click), both canvases visually highlight it:

- **2D:** Selected Rect gets a `stroke: '--color-accent'` border, handles appear
- **3D:** Selected mesh material gets `emissive: new THREE.Color(0x1E3A5F)`
- **Properties panel:** Opens automatically in sidebar showing selected item's dimensions

```typescript
// 3D click → select via raycasting
function onCanvasClick(event: MouseEvent) {
  const mouse = new THREE.Vector2(
    (event.clientX / canvas.clientWidth) * 2 - 1,
    -(event.clientY / canvas.clientHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(furnitureMeshes, true);
  if (hits.length > 0) {
    const hitId = hits[0].object.userData.placementId;
    editorStore.getState().setSelected(hitId);
    uiStore.getState().setSidebarTab('properties');
  } else {
    editorStore.getState().setSelected(null);
  }
}
```

---

## 10. API Integration

### 10.1 Base Client

```typescript
// src/api/client.ts
import { supabase } from '../lib/supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new APIError(res.status, err?.error?.code, err?.error?.message);
  }

  return res.json();
}

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}
```

### 10.2 Auto-Save

The editor auto-saves the current room's placements 2 seconds after the last change, using a debounced effect:

```typescript
// src/hooks/useAutoSave.ts
export function useAutoSave(projectId: string, roomId: string) {
  const placements = useEditorStore(s => s.placements);
  const setSaving = useUIStore(s => s.setSaving);
  const setSaveError = useUIStore(s => s.setSaveError);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setSaving(true);
        await api.placements.bulkReplace(projectId, roomId, placements);
        setSaveError(null);
      } catch (e) {
        setSaveError('Save failed. Changes may be lost.');
      } finally {
        setSaving(false);
      }
    }, 2000);  // 2 second debounce

    return () => clearTimeout(timer);
  }, [placements, projectId, roomId]);
}
```

---

## 11. Authentication Flow

```
App loads
    │
    ▼
main.tsx: supabase.auth.onAuthStateChange → setSession in authStore
    │
    ├── Session exists → render route normally
    │
    └── No session + protected route → router loader calls redirect('/login')

Login page
    ├── Email/password → supabase.auth.signInWithPassword
    └── Google → supabase.auth.signInWithOAuth({ provider: 'google' })

Both methods trigger onAuthStateChange → authStore updates → UI reflects logged-in state

Logout
    └── supabase.auth.signOut → authStore.setSession(null) → redirect('/')
```

Token refresh is handled automatically by the Supabase JS client. The API client always reads the current session before each request, so it picks up refreshed tokens transparently.

---

## 12. Performance Constraints

### 12.1 Konva 2D Canvas

- Maximum 50 furniture items rendered simultaneously without performance degradation
- Each item is a Konva `Group` with 1 `Rect` + 2 `Text` nodes (3 nodes per item = 150 nodes max at 50 items)
- Layer separation (floor plan image on its own layer) prevents full re-render on drag
- Use `listening={false}` on static elements (floor plan image, room polygon outline) so they don't consume hit-test cycles

### 12.2 Three.js 3D Viewer

- Maximum 50 furniture box meshes in the scene
- Room shell uses shared material instances (not one material per wall)
- CSS2DRenderer for labels runs on a separate DOM overlay — does not affect WebGL performance
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — cap at 2x DPR
- Dispose of geometries and materials when items are removed from the scene to prevent memory leaks:

```typescript
function removeFromScene(group: THREE.Group) {
  group.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  scene.remove(group);
}
```

### 12.3 Bundle Size Targets

| Chunk | Target gzipped size |
|---|---|
| React + Router | < 50KB |
| Three.js | < 180KB |
| Konva + react-konva | < 60KB |
| App code | < 100KB |
| Total initial JS | < 420KB |

Three.js tree-shaking: import only the classes used, not the full bundle:

```typescript
// ✅ Correct
import { Scene, PerspectiveCamera, WebGLRenderer, BoxGeometry } from 'three';

// ❌ Wrong — imports everything
import * as THREE from 'three';
```

---

*This document is a companion to `docs/PRODUCT_SPEC.md`, `docs/BACKEND_SPEC.md`, and `docs/DESIGN_SYSTEM.md`.*

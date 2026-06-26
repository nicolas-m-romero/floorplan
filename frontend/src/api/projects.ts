// frontend/src/api/projects.ts
import { apiRequest, apiUpload, DEV_MOCK } from './client';
import type { Project } from '../stores/projectStore';

// ── Response shape adapters ─────────────────────────────────────────────────
// The API uses snake_case; we map to the camelCase Project type used by stores.

interface ApiCalibration {
  point_1: { x: number; y: number };
  point_2: { x: number; y: number };
  real_distance_cm: number;
  pixels_per_cm: number;
}

interface ApiRoom {
  id: string;
  label: string;
  room_type: string;
  is_selected: boolean;
  sort_order: number;
  polygon_px: Array<{ x: number; y: number }>;
  area_cm2: number | null;
  bbox_width_cm: number | null;
  bbox_height_cm: number | null;
}

interface ApiProject {
  id: string;
  name: string;
  floor_plan_url: string;
  floor_plan_width_px: number;
  floor_plan_height_px: number;
  unit_system: 'imperial' | 'metric';
  calibration: ApiCalibration | null;
  cv_status: 'pending' | 'processing' | 'complete' | 'failed';
  is_public: boolean;
  rooms: ApiRoom[];
}

interface ApiProjectSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  floor_plan_thumbnail_url: string;
  cv_status: string;
  unit_system: 'imperial' | 'metric';
  room_count: number;
  is_public: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string;
  cvStatus: string;
  unitSystem: 'imperial' | 'metric';
  roomCount: number;
  isPublic: boolean;
}

function mapProject(api: ApiProject): Project {
  return {
    id: api.id,
    name: api.name,
    floorPlanUrl: api.floor_plan_url,
    floorPlanWidthPx: api.floor_plan_width_px,
    floorPlanHeightPx: api.floor_plan_height_px,
    unitSystem: api.unit_system,
    calibration: api.calibration
      ? {
          point1: api.calibration.point_1,
          point2: api.calibration.point_2,
          realDistanceCm: api.calibration.real_distance_cm,
          pixelsPerCm: api.calibration.pixels_per_cm,
        }
      : null,
    cvStatus: api.cv_status,
    isPublic: api.is_public,
    rooms: api.rooms.map((r) => ({
      id: r.id,
      label: r.label,
      roomType: r.room_type,
      isSelected: r.is_selected,
      sortOrder: r.sort_order,
      polygonPx: r.polygon_px,
      areaCm2: r.area_cm2,
      bboxWidthCm: r.bbox_width_cm,
      bboxHeightCm: r.bbox_height_cm,
    })),
  };
}

// ── Mock fixtures ────────────────────────────────────────────────────────────

const MOCK_PROJECT: Project = {
  id: 'mock-project-1',
  name: 'Demo Apartment',
  floorPlanUrl: '',
  floorPlanWidthPx: 1200,
  floorPlanHeightPx: 900,
  unitSystem: 'imperial',
  calibration: {
    point1: { x: 100, y: 100 },
    point2: { x: 500, y: 100 },
    realDistanceCm: 365.76,
    pixelsPerCm: 1.094,
  },
  cvStatus: 'complete',
  isPublic: false,
  rooms: [
    {
      id: 'mock-room-1',
      label: 'Living Room',
      roomType: 'living_room',
      isSelected: true,
      sortOrder: 0,
      polygonPx: [
        { x: 50, y: 50 },
        { x: 550, y: 50 },
        { x: 550, y: 450 },
        { x: 50, y: 450 },
      ],
      areaCm2: 1440000,
      bboxWidthCm: 365.76,
      bboxHeightCm: 304.8,
    },
  ],
};

const MOCK_SUMMARIES: ProjectSummary[] = [
  {
    id: 'mock-project-1',
    name: 'Demo Apartment',
    createdAt: '2025-06-01T12:00:00Z',
    updatedAt: '2025-06-10T09:30:00Z',
    thumbnailUrl: '',
    cvStatus: 'complete',
    unitSystem: 'imperial',
    roomCount: 1,
    isPublic: false,
  },
];

// ── API functions ─────────────────────────────────────────────────────────────

export const projects = {
  /** List all projects for the authenticated user */
  list: async (): Promise<ProjectSummary[]> => {
    if (DEV_MOCK) return MOCK_SUMMARIES;

    const res = await apiRequest<{ projects: ApiProjectSummary[] }>('/projects');
    return res.projects.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      thumbnailUrl: p.floor_plan_thumbnail_url,
      cvStatus: p.cv_status,
      unitSystem: p.unit_system,
      roomCount: p.room_count,
      isPublic: p.is_public,
    }));
  },

  /** Get full project with rooms and placements */
  getById: async (projectId: string): Promise<Project> => {
    if (DEV_MOCK) return MOCK_PROJECT;
    const res = await apiRequest<ApiProject>(`/projects/${projectId}`);
    return mapProject(res);
  },

  /** Update project metadata (name, unit system, calibration, visibility) */
  update: async (
    projectId: string,
    patch: {
      name?: string;
      unitSystem?: 'imperial' | 'metric';
      isPublic?: boolean;
      calibration?: {
        point1: { x: number; y: number };
        point2: { x: number; y: number };
        realDistanceCm: number;
      };
    },
  ): Promise<Project> => {
    if (DEV_MOCK) return { ...MOCK_PROJECT, ...patch } as Project;

    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.unitSystem !== undefined) body.unit_system = patch.unitSystem;
    if (patch.isPublic !== undefined) body.is_public = patch.isPublic;
    if (patch.calibration) {
      body.calibration = {
        point_1: patch.calibration.point1,
        point_2: patch.calibration.point2,
        real_distance_cm: patch.calibration.realDistanceCm,
      };
    }

    const res = await apiRequest<ApiProject>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return mapProject(res);
  },

  /** Delete a project */
  delete: async (projectId: string): Promise<void> => {
    if (DEV_MOCK) return;
    await apiRequest<void>(`/projects/${projectId}`, { method: 'DELETE' });
  },

  /** Duplicate a project */
  duplicate: async (projectId: string): Promise<Project> => {
    if (DEV_MOCK) return { ...MOCK_PROJECT, id: crypto.randomUUID(), name: 'Demo Apartment (copy)' };
    const res = await apiRequest<ApiProject>(`/projects/${projectId}/duplicate`, {
      method: 'POST',
    });
    return mapProject(res);
  },

  /** Upload a floor plan file and create a new project */
  upload: async (
    file: File,
    projectName?: string,
  ): Promise<{
    projectId: string;
    name: string;
    floorPlanUrl: string;
    floorPlanWidthPx: number;
    floorPlanHeightPx: number;
    cvStatus: string;
    rooms: Array<{
      id: string;
      label: string;
      roomType: string;
      polygonPx: Array<{ x: number; y: number }>;
      isSelected: boolean;
    }>;
  }> => {
    if (DEV_MOCK) {
      return {
        projectId: crypto.randomUUID(),
        name: projectName ?? 'Untitled Project',
        floorPlanUrl: URL.createObjectURL(file),
        floorPlanWidthPx: 1200,
        floorPlanHeightPx: 900,
        cvStatus: 'complete',
        rooms: MOCK_PROJECT.rooms.map((r) => ({
          id: r.id,
          label: r.label,
          roomType: r.roomType,
          polygonPx: r.polygonPx,
          isSelected: r.isSelected,
        })),
      };
    }

    const form = new FormData();
    form.append('file', file);
    if (projectName) form.append('project_name', projectName);

    const res = await apiUpload<{
      project_id: string;
      name: string;
      floor_plan_url: string;
      floor_plan_width_px: number;
      floor_plan_height_px: number;
      cv_status: string;
      rooms: Array<{
        id: string;
        label: string;
        room_type: string;
        polygon_px: Array<{ x: number; y: number }>;
        is_selected: boolean;
      }>;
    }>('/upload', form);

    return {
      projectId: res.project_id,
      name: res.name,
      floorPlanUrl: res.floor_plan_url,
      floorPlanWidthPx: res.floor_plan_width_px,
      floorPlanHeightPx: res.floor_plan_height_px,
      cvStatus: res.cv_status,
      rooms: res.rooms.map((r) => ({
        id: r.id,
        label: r.label,
        roomType: r.room_type,
        polygonPx: r.polygon_px,
        isSelected: r.is_selected,
      })),
    };
  },
};

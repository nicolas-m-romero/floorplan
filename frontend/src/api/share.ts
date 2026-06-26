// frontend/src/api/share.ts
import { apiRequest, DEV_MOCK } from './client';
import type { Project } from '../stores/projectStore';

interface ShareResponse {
  token: string;
  share_url: string;
  expires_at: string | null;
}

export interface ShareLink {
  token: string;
  shareUrl: string;
  expiresAt: string | null;
}

export const share = {
  create: async (
    projectId: string,
    expiresAt?: string,
  ): Promise<ShareLink> => {
    if (DEV_MOCK) {
      const token = `mock-${projectId.slice(0, 8)}`;
      return {
        token,
        shareUrl: `${window.location.origin}/share/${token}`,
        expiresAt: expiresAt ?? null,
      };
    }

    const body: Record<string, unknown> = {};
    if (expiresAt) body.expires_at = expiresAt;

    const res = await apiRequest<ShareResponse>(`/projects/${projectId}/share`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      token: res.token,
      shareUrl: res.share_url,
      expiresAt: res.expires_at,
    };
  },

  revoke: async (projectId: string): Promise<void> => {
    if (DEV_MOCK) return;
    await apiRequest<void>(`/projects/${projectId}/share`, { method: 'DELETE' });
  },

  resolve: async (token: string): Promise<Project> => {
    const res = await apiRequest<{
      id: string;
      name: string;
      floor_plan_url: string;
      floor_plan_width_px: number;
      floor_plan_height_px: number;
      unit_system: 'imperial' | 'metric';
      calibration: {
        point_1: { x: number; y: number };
        point_2: { x: number; y: number };
        real_distance_cm: number;
        pixels_per_cm: number;
      } | null;
      cv_status: 'pending' | 'processing' | 'complete' | 'failed';
      is_public: boolean;
      rooms: Array<{
        id: string;
        label: string;
        room_type: string;
        is_selected: boolean;
        sort_order: number;
        polygon_px: Array<{ x: number; y: number }>;
        area_cm2: number | null;
        bbox_width_cm: number | null;
        bbox_height_cm: number | null;
      }>;
    }>(`/share/${token}`);

    return {
      id: res.id,
      name: res.name,
      floorPlanUrl: res.floor_plan_url,
      floorPlanWidthPx: res.floor_plan_width_px,
      floorPlanHeightPx: res.floor_plan_height_px,
      unitSystem: res.unit_system,
      calibration: res.calibration
        ? {
            point1: res.calibration.point_1,
            point2: res.calibration.point_2,
            realDistanceCm: res.calibration.real_distance_cm,
            pixelsPerCm: res.calibration.pixels_per_cm,
          }
        : null,
      cvStatus: res.cv_status,
      isPublic: res.is_public,
      rooms: res.rooms.map((r) => ({
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
  },
};

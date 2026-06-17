// frontend/src/api/placements.ts
import { apiRequest, DEV_MOCK } from './client';
import type { Placement } from '../stores/editorStore';

interface ApiPlacement {
  id: string;
  catalog_item_id: string | null;
  label: string;
  position_x_px: number;
  position_y_px: number;
  rotation_deg: number;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  elevation_cm: number;
  color_hex: string;
  is_custom: boolean;
}

function mapPlacement(api: ApiPlacement): Placement {
  return {
    id: api.id,
    catalogItemId: api.catalog_item_id,
    label: api.label,
    positionXPx: api.position_x_px,
    positionYPx: api.position_y_px,
    rotationDeg: api.rotation_deg,
    widthCm: api.width_cm,
    depthCm: api.depth_cm,
    heightCm: api.height_cm,
    elevationCm: api.elevation_cm,
    colorHex: api.color_hex,
    isCustom: api.is_custom,
  };
}

function toApiBody(p: Omit<Placement, 'id'> & { id?: string }): Record<string, unknown> {
  return {
    catalog_item_id: p.catalogItemId,
    label: p.label,
    position_x_px: p.positionXPx,
    position_y_px: p.positionYPx,
    rotation_deg: p.rotationDeg,
    width_cm: p.widthCm,
    depth_cm: p.depthCm,
    height_cm: p.heightCm,
    elevation_cm: p.elevationCm,
    color_hex: p.colorHex,
    is_custom: p.isCustom,
  };
}

export const placements = {
  create: async (
    projectId: string,
    roomId: string,
    placement: Omit<Placement, 'id'>,
  ): Promise<Placement> => {
    if (DEV_MOCK) {
      return { id: crypto.randomUUID(), ...placement };
    }

    const res = await apiRequest<ApiPlacement>(
      `/projects/${projectId}/rooms/${roomId}/placements`,
      { method: 'POST', body: JSON.stringify(toApiBody(placement)) },
    );
    return mapPlacement(res);
  },

  update: async (
    projectId: string,
    roomId: string,
    placementId: string,
    patch: Partial<Omit<Placement, 'id'>>,
  ): Promise<Placement> => {
    if (DEV_MOCK) {
      return { id: placementId, ...patch } as Placement;
    }

    const body: Record<string, unknown> = {};
    if (patch.positionXPx !== undefined) body.position_x_px = patch.positionXPx;
    if (patch.positionYPx !== undefined) body.position_y_px = patch.positionYPx;
    if (patch.rotationDeg !== undefined) body.rotation_deg = patch.rotationDeg;
    if (patch.widthCm !== undefined) body.width_cm = patch.widthCm;
    if (patch.depthCm !== undefined) body.depth_cm = patch.depthCm;
    if (patch.heightCm !== undefined) body.height_cm = patch.heightCm;
    if (patch.elevationCm !== undefined) body.elevation_cm = patch.elevationCm;
    if (patch.colorHex !== undefined) body.color_hex = patch.colorHex;

    const res = await apiRequest<ApiPlacement>(
      `/projects/${projectId}/rooms/${roomId}/placements/${placementId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
    return mapPlacement(res);
  },

  delete: async (
    projectId: string,
    roomId: string,
    placementId: string,
  ): Promise<void> => {
    if (DEV_MOCK) return;
    await apiRequest<void>(
      `/projects/${projectId}/rooms/${roomId}/placements/${placementId}`,
      { method: 'DELETE' },
    );
  },

  /** Bulk-replace all placements for a room (used by auto-save) */
  bulkReplace: async (
    projectId: string,
    roomId: string,
    allPlacements: Placement[],
  ): Promise<{ replaced: number }> => {
    if (DEV_MOCK) return { replaced: allPlacements.length };

    return apiRequest<{ replaced: number }>(
      `/projects/${projectId}/rooms/${roomId}/placements`,
      {
        method: 'PUT',
        body: JSON.stringify({
          placements: allPlacements.map((p) => ({ id: p.id, ...toApiBody(p) })),
        }),
      },
    );
  },
};

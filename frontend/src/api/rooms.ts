// frontend/src/api/rooms.ts
import { apiRequest, DEV_MOCK } from './client';
import type { Room } from '../stores/projectStore';

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

function mapRoom(api: ApiRoom): Room {
  return {
    id: api.id,
    label: api.label,
    roomType: api.room_type,
    isSelected: api.is_selected,
    sortOrder: api.sort_order,
    polygonPx: api.polygon_px,
    areaCm2: api.area_cm2,
    bboxWidthCm: api.bbox_width_cm,
    bboxHeightCm: api.bbox_height_cm,
  };
}

export const rooms = {
  update: async (
    projectId: string,
    roomId: string,
    patch: {
      label?: string;
      roomType?: string;
      isSelected?: boolean;
      sortOrder?: number;
      polygonPx?: Array<{ x: number; y: number }>;
    },
  ): Promise<Room> => {
    if (DEV_MOCK) {
      return {
        id: roomId,
        label: patch.label ?? 'Room',
        roomType: patch.roomType ?? 'unknown',
        isSelected: patch.isSelected ?? true,
        sortOrder: patch.sortOrder ?? 0,
        polygonPx: patch.polygonPx ?? [],
        areaCm2: null,
        bboxWidthCm: null,
        bboxHeightCm: null,
      };
    }

    const body: Record<string, unknown> = {};
    if (patch.label !== undefined) body.label = patch.label;
    if (patch.roomType !== undefined) body.room_type = patch.roomType;
    if (patch.isSelected !== undefined) body.is_selected = patch.isSelected;
    if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;
    if (patch.polygonPx !== undefined) body.polygon_px = patch.polygonPx;

    const res = await apiRequest<ApiRoom>(
      `/projects/${projectId}/rooms/${roomId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
    return mapRoom(res);
  },

  create: async (
    projectId: string,
    data: {
      label: string;
      roomType: string;
      polygonPx: Array<{ x: number; y: number }>;
    },
  ): Promise<Room> => {
    if (DEV_MOCK) {
      return {
        id: crypto.randomUUID(),
        label: data.label,
        roomType: data.roomType,
        isSelected: true,
        sortOrder: 0,
        polygonPx: data.polygonPx,
        areaCm2: null,
        bboxWidthCm: null,
        bboxHeightCm: null,
      };
    }

    const res = await apiRequest<ApiRoom>(`/projects/${projectId}/rooms`, {
      method: 'POST',
      body: JSON.stringify({
        label: data.label,
        room_type: data.roomType,
        polygon_px: data.polygonPx,
      }),
    });
    return mapRoom(res);
  },

  delete: async (projectId: string, roomId: string): Promise<void> => {
    if (DEV_MOCK) return;
    await apiRequest<void>(`/projects/${projectId}/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },
};

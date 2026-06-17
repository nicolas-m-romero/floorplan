// frontend/src/api/catalog.ts
import { apiRequest, DEV_MOCK } from './client';
import type { CatalogCategory, CatalogItem } from '../stores/catalogStore';

interface ApiCatalogItem {
  id: string;
  label: string;
  default_width_cm: number;
  default_depth_cm: number;
  default_height_cm: number;
  min_width_cm: number;
  max_width_cm: number;
  color_hex: string;
  tags: string[];
}

interface ApiCatalogCategory {
  id: string;
  label: string;
  items: ApiCatalogItem[];
}

function mapItem(api: ApiCatalogItem): CatalogItem {
  return {
    id: api.id,
    label: api.label,
    defaultWidthCm: api.default_width_cm,
    defaultDepthCm: api.default_depth_cm,
    defaultHeightCm: api.default_height_cm,
    minWidthCm: api.min_width_cm,
    maxWidthCm: api.max_width_cm,
    colorHex: api.color_hex,
    tags: api.tags,
  };
}

// ── Mock fixtures ────────────────────────────────────────────────────────────

const MOCK_CATEGORIES: CatalogCategory[] = [
  {
    id: 'living_room',
    label: 'Living Room',
    items: [
      { id: 'sofa_standard', label: 'Sofa', defaultWidthCm: 228.6, defaultDepthCm: 91.44, defaultHeightCm: 83.82, minWidthCm: 152.4, maxWidthCm: 365.76, colorHex: '#94A3B8', tags: ['seating', 'living_room'] },
      { id: 'sofa_loveseat', label: 'Loveseat', defaultWidthCm: 152.4, defaultDepthCm: 83.82, defaultHeightCm: 83.82, minWidthCm: 121.92, maxWidthCm: 182.88, colorHex: '#94A3B8', tags: ['seating', 'living_room'] },
      { id: 'coffee_table', label: 'Coffee Table', defaultWidthCm: 121.92, defaultDepthCm: 60.96, defaultHeightCm: 45.72, minWidthCm: 60.96, maxWidthCm: 182.88, colorHex: '#A16207', tags: ['table', 'living_room'] },
      { id: 'tv_stand', label: 'TV Stand', defaultWidthCm: 152.4, defaultDepthCm: 45.72, defaultHeightCm: 60.96, minWidthCm: 91.44, maxWidthCm: 243.84, colorHex: '#44403C', tags: ['storage', 'living_room'] },
      { id: 'armchair', label: 'Armchair', defaultWidthCm: 91.44, defaultDepthCm: 91.44, defaultHeightCm: 83.82, minWidthCm: 76.2, maxWidthCm: 106.68, colorHex: '#78716C', tags: ['seating', 'living_room'] },
    ],
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    items: [
      { id: 'bed_queen', label: 'Queen Bed', defaultWidthCm: 152.4, defaultDepthCm: 203.2, defaultHeightCm: 91.44, minWidthCm: 152.4, maxWidthCm: 152.4, colorHex: '#6B7280', tags: ['bed', 'bedroom'] },
      { id: 'bed_king', label: 'King Bed', defaultWidthCm: 193.04, defaultDepthCm: 203.2, defaultHeightCm: 91.44, minWidthCm: 193.04, maxWidthCm: 193.04, colorHex: '#6B7280', tags: ['bed', 'bedroom'] },
      { id: 'dresser', label: 'Dresser', defaultWidthCm: 121.92, defaultDepthCm: 45.72, defaultHeightCm: 83.82, minWidthCm: 60.96, maxWidthCm: 182.88, colorHex: '#A16207', tags: ['storage', 'bedroom'] },
      { id: 'nightstand', label: 'Nightstand', defaultWidthCm: 45.72, defaultDepthCm: 45.72, defaultHeightCm: 60.96, minWidthCm: 30.48, maxWidthCm: 60.96, colorHex: '#A16207', tags: ['table', 'bedroom'] },
      { id: 'wardrobe', label: 'Wardrobe', defaultWidthCm: 182.88, defaultDepthCm: 60.96, defaultHeightCm: 213.36, minWidthCm: 91.44, maxWidthCm: 304.8, colorHex: '#44403C', tags: ['storage', 'bedroom'] },
    ],
  },
  {
    id: 'dining',
    label: 'Dining',
    items: [
      { id: 'dining_table_4', label: 'Dining Table (4)', defaultWidthCm: 121.92, defaultDepthCm: 91.44, defaultHeightCm: 76.2, minWidthCm: 91.44, maxWidthCm: 152.4, colorHex: '#A16207', tags: ['table', 'dining'] },
      { id: 'dining_table_6', label: 'Dining Table (6)', defaultWidthCm: 182.88, defaultDepthCm: 91.44, defaultHeightCm: 76.2, minWidthCm: 152.4, maxWidthCm: 243.84, colorHex: '#A16207', tags: ['table', 'dining'] },
      { id: 'dining_chair', label: 'Dining Chair', defaultWidthCm: 45.72, defaultDepthCm: 50.8, defaultHeightCm: 91.44, minWidthCm: 38.1, maxWidthCm: 55.88, colorHex: '#78716C', tags: ['seating', 'dining'] },
    ],
  },
  {
    id: 'office',
    label: 'Office',
    items: [
      { id: 'desk_standard', label: 'Desk', defaultWidthCm: 152.4, defaultDepthCm: 76.2, defaultHeightCm: 76.2, minWidthCm: 91.44, maxWidthCm: 213.36, colorHex: '#44403C', tags: ['desk', 'office'] },
      { id: 'office_chair', label: 'Office Chair', defaultWidthCm: 60.96, defaultDepthCm: 60.96, defaultHeightCm: 121.92, minWidthCm: 45.72, maxWidthCm: 76.2, colorHex: '#1C1C1C', tags: ['seating', 'office'] },
      { id: 'bookshelf', label: 'Bookshelf', defaultWidthCm: 91.44, defaultDepthCm: 30.48, defaultHeightCm: 182.88, minWidthCm: 60.96, maxWidthCm: 182.88, colorHex: '#A16207', tags: ['storage', 'office'] },
    ],
  },
];

// ── API functions ─────────────────────────────────────────────────────────────

export const catalog = {
  getAll: async (): Promise<CatalogCategory[]> => {
    if (DEV_MOCK) return MOCK_CATEGORIES;

    const res = await apiRequest<{ version: string; categories: ApiCatalogCategory[] }>('/catalog');
    return res.categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      items: cat.items.map(mapItem),
    }));
  },

  getCustom: async (): Promise<CatalogItem[]> => {
    if (DEV_MOCK) return [];

    const res = await apiRequest<{ items: (ApiCatalogItem & { category: string; created_at: string })[] }>(
      '/catalog/custom',
    );
    return res.items.map(mapItem);
  },

  createCustom: async (
    data: Pick<CatalogItem, 'label' | 'defaultWidthCm' | 'defaultDepthCm' | 'defaultHeightCm' | 'colorHex'> & { category?: string },
  ): Promise<CatalogItem> => {
    if (DEV_MOCK) {
      return {
        id: crypto.randomUUID(),
        label: data.label,
        defaultWidthCm: data.defaultWidthCm,
        defaultDepthCm: data.defaultDepthCm,
        defaultHeightCm: data.defaultHeightCm,
        minWidthCm: 0,
        maxWidthCm: 1000,
        colorHex: data.colorHex,
        tags: ['custom'],
      };
    }

    const res = await apiRequest<ApiCatalogItem>('/catalog/custom', {
      method: 'POST',
      body: JSON.stringify({
        label: data.label,
        category: data.category ?? 'custom',
        width_cm: data.defaultWidthCm,
        depth_cm: data.defaultDepthCm,
        height_cm: data.defaultHeightCm,
        color_hex: data.colorHex,
      }),
    });
    return mapItem(res);
  },

  deleteCustom: async (itemId: string): Promise<void> => {
    if (DEV_MOCK) return;
    await apiRequest<void>(`/catalog/custom/${itemId}`, { method: 'DELETE' });
  },
};

// frontend/src/stores/catalogStore.ts
import { create } from 'zustand';

export interface CatalogItem {
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

export interface CatalogCategory {
  id: string;
  label: string;
  items: CatalogItem[];
}

interface CatalogState {
  categories: CatalogCategory[];
  customItems: CatalogItem[];
  isLoaded: boolean;

  setCategories: (categories: CatalogCategory[]) => void;
  setCustomItems: (items: CatalogItem[]) => void;
  addCustomItem: (item: CatalogItem) => void;
  removeCustomItem: (id: string) => void;

  /** Find a catalog item by id across all categories and custom items */
  getItem: (id: string) => CatalogItem | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  categories: [],
  customItems: [],
  isLoaded: false,

  setCategories: (categories) => set({ categories, isLoaded: true }),

  setCustomItems: (customItems) => set({ customItems }),

  addCustomItem: (item) =>
    set((state) => ({ customItems: [...state.customItems, item] })),

  removeCustomItem: (id) =>
    set((state) => ({
      customItems: state.customItems.filter((i) => i.id !== id),
    })),

  getItem: (id) => {
    const { categories, customItems } = get();
    for (const cat of categories) {
      const found = cat.items.find((i) => i.id === id);
      if (found) return found;
    }
    return customItems.find((i) => i.id === id);
  },
}));

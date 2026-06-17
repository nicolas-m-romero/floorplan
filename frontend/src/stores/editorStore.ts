// frontend/src/stores/editorStore.ts
import { create } from 'zustand';

export interface Placement {
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
  placements: Placement[];
  selectedId: string | null;
  isDragging: boolean;
  isColliding: boolean;

  setPlacements: (placements: Placement[]) => void;
  addPlacement: (placement: Placement) => void;
  updatePlacement: (id: string, patch: Partial<Placement>) => void;
  removePlacement: (id: string) => void;
  setSelected: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setColliding: (isColliding: boolean) => void;
  clearRoom: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  placements: [],
  selectedId: null,
  isDragging: false,
  isColliding: false,

  setPlacements: (placements) => set({ placements }),

  addPlacement: (placement) =>
    set((state) => ({ placements: [...state.placements, placement] })),

  updatePlacement: (id, patch) =>
    set((state) => ({
      placements: state.placements.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    })),

  removePlacement: (id) =>
    set((state) => ({
      placements: state.placements.filter((p) => p.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setSelected: (id) => set({ selectedId: id }),

  setDragging: (isDragging) => set({ isDragging }),

  setColliding: (isColliding) => set({ isColliding }),

  clearRoom: () => set({ placements: [], selectedId: null }),
}));

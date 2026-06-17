// frontend/src/stores/uiStore.ts
import { create } from 'zustand';

type SidebarTab = 'catalog' | 'rooms' | 'properties';

interface UIState {
  viewMode: '2d' | '3d';
  sidebarTab: SidebarTab;
  isExportModalOpen: boolean;
  isShareModalOpen: boolean;
  isSaving: boolean;
  saveError: string | null;

  setViewMode: (mode: '2d' | '3d') => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setExportModalOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: '2d',
  sidebarTab: 'catalog',
  isExportModalOpen: false,
  isShareModalOpen: false,
  isSaving: false,
  saveError: null,

  setViewMode: (viewMode) => set({ viewMode }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
  setSaving: (isSaving) => set({ isSaving }),
  setSaveError: (saveError) => set({ saveError }),
}));

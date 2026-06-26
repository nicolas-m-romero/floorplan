// frontend/src/stores/projectStore.ts
import { create } from 'zustand';

export interface Calibration {
  point1: { x: number; y: number };
  point2: { x: number; y: number };
  realDistanceCm: number;
  pixelsPerCm: number;
}

export interface Room {
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

export interface Project {
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

const initialState = {
  project: null,
  activeRoomId: null,
};

export const useProjectStore = create<ProjectState>((set) => ({
  ...initialState,

  setProject: (project) =>
    set({
      project,
      activeRoomId: project.rooms[0]?.id ?? null,
    }),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  updateRoom: (roomId, patch) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          rooms: state.project.rooms.map((r) =>
            r.id === roomId ? { ...r, ...patch } : r,
          ),
        },
      };
    }),

  addRoom: (room) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          rooms: [...state.project.rooms, room],
        },
      };
    }),

  removeRoom: (roomId) =>
    set((state) => {
      if (!state.project) return state;
      const rooms = state.project.rooms.filter((r) => r.id !== roomId);
      return {
        project: { ...state.project, rooms },
        activeRoomId:
          state.activeRoomId === roomId ? (rooms[0]?.id ?? null) : state.activeRoomId,
      };
    }),

  setCalibration: (calibration) =>
    set((state) => {
      if (!state.project) return state;
      return { project: { ...state.project, calibration } };
    }),

  setUnitSystem: (unitSystem) =>
    set((state) => {
      if (!state.project) return state;
      return { project: { ...state.project, unitSystem } };
    }),

  reset: () => set(initialState),
}));

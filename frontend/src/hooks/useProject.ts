// frontend/src/hooks/useProject.ts
import { useEffect, useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { projects as projectsApi } from '../api/projects';
import { placements as placementsApi } from '../api/placements';

export function useProject(projectId: string) {
  const setProject = useProjectStore((s) => s.setProject);
  const project = useProjectStore((s) => s.project);
  const activeRoomId = useProjectStore((s) => s.activeRoomId);
  const setPlacements = useEditorStore((s) => s.setPlacements);
  const setSaving = useUIStore((s) => s.setSaving);
  const setSaveError = useUIStore((s) => s.setSaveError);

  // Load project on mount
  useEffect(() => {
    let cancelled = false;

    projectsApi.getById(projectId).then((p) => {
      if (cancelled) return;
      setProject(p);

      // Load placements for the first selected room
      const firstRoom = p.rooms.find((r) => r.isSelected) ?? p.rooms[0];
      if (firstRoom) {
        // Placements are embedded in the project response
        // (mapped from furniture_placements in the API response)
        // For now we start with an empty canvas; placements load via
        // the room selection flow or are already in the project object
        // if the API embeds them. We use the store as the source of truth.
        setPlacements([]);
      }
    });

    return () => { cancelled = true; };
  }, [projectId, setProject, setPlacements]);

  const save = useCallback(async () => {
    if (!project || !activeRoomId) return;
    try {
      setSaving(true);
      const currentPlacements = useEditorStore.getState().placements;
      await placementsApi.bulkReplace(project.id, activeRoomId, currentPlacements);
      setSaveError(null);
    } catch {
      setSaveError('Save failed. Changes may be lost.');
    } finally {
      setSaving(false);
    }
  }, [project, activeRoomId, setSaving, setSaveError]);

  return { project, activeRoomId, save };
}

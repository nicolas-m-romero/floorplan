// frontend/src/hooks/useAutoSave.ts
import { useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { placements as placementsApi } from '../api/placements';

export function useAutoSave(projectId: string, roomId: string | null) {
  const placementList = useEditorStore((s) => s.placements);
  const setSaving = useUIStore((s) => s.setSaving);
  const setSaveError = useUIStore((s) => s.setSaveError);

  useEffect(() => {
    if (!roomId) return;

    const timer = setTimeout(async () => {
      try {
        setSaving(true);
        await placementsApi.bulkReplace(projectId, roomId, placementList);
        setSaveError(null);
      } catch {
        setSaveError('Save failed. Changes may be lost.');
      } finally {
        setSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [placementList, projectId, roomId, setSaving, setSaveError]);
}

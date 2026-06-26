// frontend/src/hooks/useEditor.ts
import { useCallback } from 'react';
import { useEditorStore, type Placement } from '../stores/editorStore';
import { useCatalogStore } from '../stores/catalogStore';

export function useEditor() {
  const {
    placements,
    selectedId,
    isDragging,
    isColliding,
    addPlacement,
    updatePlacement,
    removePlacement,
    setSelected,
    setDragging,
    setColliding,
  } = useEditorStore();
  const getItem = useCatalogStore((s) => s.getItem);

  const placeFromCatalog = useCallback(
    (catalogItemId: string, positionXPx: number, positionYPx: number) => {
      const item = getItem(catalogItemId);
      if (!item) return;

      const placement: Placement = {
        id: crypto.randomUUID(),
        catalogItemId,
        label: item.label,
        positionXPx,
        positionYPx,
        rotationDeg: 0,
        widthCm: item.defaultWidthCm,
        depthCm: item.defaultDepthCm,
        heightCm: item.defaultHeightCm,
        elevationCm: 0,
        colorHex: item.colorHex,
        isCustom: false,
      };

      addPlacement(placement);
      setSelected(placement.id);
      return placement;
    },
    [getItem, addPlacement, setSelected],
  );

  const rotateSelected = useCallback(() => {
    if (!selectedId) return;
    const item = useEditorStore.getState().placements.find((p) => p.id === selectedId);
    if (!item) return;
    updatePlacement(selectedId, { rotationDeg: (item.rotationDeg + 90) % 360 });
  }, [selectedId, updatePlacement]);

  const deleteSelected = useCallback(() => {
    if (selectedId) removePlacement(selectedId);
  }, [selectedId, removePlacement]);

  return {
    placements,
    selectedId,
    isDragging,
    isColliding,
    placeFromCatalog,
    updatePlacement,
    removePlacement,
    rotateSelected,
    deleteSelected,
    setSelected,
    setDragging,
    setColliding,
  };
}

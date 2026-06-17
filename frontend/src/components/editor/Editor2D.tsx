// frontend/src/components/editor/Editor2D.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KImage, Line, Group, Rect, Text } from 'react-konva';
import { useEditorStore, type Placement } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { computeDisplayScale, cmToCanvasPx, imagePxToCanvasPx, canvasPxToImagePx } from '../../lib/units';
import './Editor2D.css';

const SNAP_THRESHOLD_PX = 10;

interface Rect2D { x: number; y: number; w: number; h: number }

function getItemRect(p: Placement, pixelsPerCm: number, displayScale: number): Rect2D {
  const w = cmToCanvasPx(p.widthCm, pixelsPerCm, displayScale);
  const h = cmToCanvasPx(p.depthCm, pixelsPerCm, displayScale);
  return {
    x: imagePxToCanvasPx(p.positionXPx, displayScale) - w / 2,
    y: imagePxToCanvasPx(p.positionYPx, displayScale) - h / 2,
    w,
    h,
  };
}

function rectsOverlap(a: Rect2D, b: Rect2D): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hasCollision(
  moving: Placement,
  all: Placement[],
  pixelsPerCm: number,
  displayScale: number,
): boolean {
  const rect = getItemRect(moving, pixelsPerCm, displayScale);
  return all.filter((p) => p.id !== moving.id).some((other) =>
    rectsOverlap(rect, getItemRect(other, pixelsPerCm, displayScale)),
  );
}

export function Editor2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const project = useProjectStore((s) => s.project);
  const activeRoomId = useProjectStore((s) => s.activeRoomId);
  const { placements, selectedId, setSelected, addPlacement, updatePlacement, setDragging, setColliding } =
    useEditorStore();
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);

  // Dragging state: track last valid position per item
  const lastValidPos = useRef<Record<string, { x: number; y: number }>>({});
  const [shakingId, setShakingId] = useState<string | null>(null);

  const activeRoom = project?.rooms.find((r) => r.id === activeRoomId);
  const pixelsPerCm = project?.calibration?.pixelsPerCm ?? 1;
  const floorPlanUrl = project?.floorPlanUrl ?? '';

  // Load floor plan image
  const [floorPlanImage, setFloorPlanImage] = useState<HTMLImageElement | undefined>(undefined);
  useEffect(() => {
    if (!floorPlanUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setFloorPlanImage(img);
    img.src = floorPlanUrl;
  }, [floorPlanUrl]);

  // Compute display scale
  const displayScale =
    project && size.w && size.h
      ? computeDisplayScale(size.w, size.h, project.floorPlanWidthPx, project.floorPlanHeightPx)
      : 1;

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts: R = rotate, Delete/Backspace = remove
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'r' || e.key === 'R') {
        const id = useEditorStore.getState().selectedId;
        if (!id) return;
        const item = useEditorStore.getState().placements.find((p) => p.id === id);
        if (!item) return;
        updatePlacement(id, { rotationDeg: (item.rotationDeg + 90) % 360 });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = useEditorStore.getState().selectedId;
        if (id) useEditorStore.getState().removePlacement(id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [updatePlacement]);

  // HTML5 drag-drop from catalog
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const catalogItemId = e.dataTransfer.getData('catalogItemId');
    if (!catalogItemId) return;

    const item = useCatalogStore.getState().getItem(catalogItemId);
    if (!item) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const newPlacement: Placement = {
      id: crypto.randomUUID(),
      catalogItemId,
      label: item.label,
      positionXPx: canvasPxToImagePx(canvasX, displayScale),
      positionYPx: canvasPxToImagePx(canvasY, displayScale),
      rotationDeg: 0,
      widthCm: item.defaultWidthCm,
      depthCm: item.defaultDepthCm,
      heightCm: item.defaultHeightCm,
      elevationCm: 0,
      colorHex: item.colorHex,
      isCustom: false,
    };

    addPlacement(newPlacement);
    setSelected(newPlacement.id);
    setSidebarTab('properties');
  }

  function handleDragStart(id: string, pos: { x: number; y: number }) {
    lastValidPos.current[id] = pos;
    setDragging(true);
    setSelected(id);
    setSidebarTab('properties');
  }

  function handleDragMove(id: string, canvasX: number, canvasY: number, item: Placement) {
    const newPosImage = {
      x: canvasPxToImagePx(canvasX + cmToCanvasPx(item.widthCm, pixelsPerCm, displayScale) / 2, displayScale),
      y: canvasPxToImagePx(canvasY + cmToCanvasPx(item.depthCm, pixelsPerCm, displayScale) / 2, displayScale),
    };

    const updated = { ...item, positionXPx: newPosImage.x, positionYPx: newPosImage.y };

    if (hasCollision(updated, placements, pixelsPerCm, displayScale)) {
      // Reject: shake and revert
      if (lastValidPos.current[id]) {
        updatePlacement(id, { positionXPx: lastValidPos.current[id].x, positionYPx: lastValidPos.current[id].y });
      }
      setColliding(true);
      setShakingId(id);
      setTimeout(() => { setColliding(false); setShakingId(null); }, 120);
      return;
    }

    lastValidPos.current[id] = newPosImage;
    updatePlacement(id, { positionXPx: newPosImage.x, positionYPx: newPosImage.y });
  }

  function handleDragEnd() {
    setDragging(false);
  }

  return (
    <div
      ref={containerRef}
      className="editor-2d"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Stage
        width={size.w}
        height={size.h}
        onClick={(e) => {
          if (e.target === e.target.getStage()) setSelected(null);
        }}
      >
        {/* Floor plan image layer */}
        <Layer listening={false}>
          {floorPlanImage && (
            <KImage
              image={floorPlanImage}
              width={project!.floorPlanWidthPx * displayScale}
              height={project!.floorPlanHeightPx * displayScale}
              x={0}
              y={0}
              listening={false}
            />
          )}
        </Layer>

        {/* Room boundary layer */}
        <Layer listening={false}>
          {activeRoom && activeRoom.polygonPx.length > 2 && (
            <Line
              points={activeRoom.polygonPx.flatMap((pt) => [
                imagePxToCanvasPx(pt.x, displayScale),
                imagePxToCanvasPx(pt.y, displayScale),
              ])}
              closed
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          )}
        </Layer>

        {/* Furniture layer */}
        <Layer>
          {placements.map((p) => {
            const w = cmToCanvasPx(p.widthCm, pixelsPerCm, displayScale);
            const h = cmToCanvasPx(p.depthCm, pixelsPerCm, displayScale);
            const cx = imagePxToCanvasPx(p.positionXPx, displayScale);
            const cy = imagePxToCanvasPx(p.positionYPx, displayScale);
            const isSelected = p.id === selectedId;
            const isShaking = p.id === shakingId;

            return (
              <Group
                key={p.id}
                x={cx}
                y={cy}
                offsetX={0}
                offsetY={0}
                rotation={p.rotationDeg}
                draggable
                onDragStart={(e) =>
                  handleDragStart(p.id, {
                    x: canvasPxToImagePx(e.target.x(), displayScale),
                    y: canvasPxToImagePx(e.target.y(), displayScale),
                  })
                }
                onDragMove={(e) => handleDragMove(p.id, e.target.x() - w / 2, e.target.y() - h / 2, p)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelected(p.id);
                  setSidebarTab('properties');
                }}
                opacity={isShaking ? 0.5 : 1}
              >
                <Rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  fill={p.colorHex}
                  opacity={0.85}
                  stroke={isSelected ? 'var(--color-accent)' : 'rgba(64,64,64,0.6)'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <Text
                  x={-w / 2 + 4}
                  y={-h / 2 + 4}
                  width={w - 8}
                  text={p.label}
                  fontSize={Math.max(9, Math.min(12, w / 8))}
                  fill="#F0EDE8"
                  fontFamily="JetBrains Mono, monospace"
                  listening={false}
                  wrap="none"
                  ellipsis
                />
                <Text
                  x={-w / 2 + 4}
                  y={h / 2 - 16}
                  width={w - 8}
                  text={`${Math.round(p.widthCm)}×${Math.round(p.depthCm)}`}
                  fontSize={9}
                  fill="rgba(240,237,232,0.6)"
                  fontFamily="JetBrains Mono, monospace"
                  listening={false}
                  wrap="none"
                  ellipsis
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

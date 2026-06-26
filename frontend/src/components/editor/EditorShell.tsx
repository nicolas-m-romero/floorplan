// frontend/src/components/editor/EditorShell.tsx
import React from 'react';
import { Box, Square } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { Editor2D } from './Editor2D';
import { Editor3D } from './Editor3D';
import './EditorShell.css';

export function EditorShell() {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <div className="editor-shell">
      {/* View toggle */}
      <div className="editor-shell__toggle" role="group" aria-label="View mode">
        <button
          className={`editor-shell__toggle-btn ${viewMode === '2d' ? 'editor-shell__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('2d')}
          aria-pressed={viewMode === '2d'}
        >
          <Square size={14} strokeWidth={1.5} />
          2D
        </button>
        <button
          className={`editor-shell__toggle-btn ${viewMode === '3d' ? 'editor-shell__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('3d')}
          aria-pressed={viewMode === '3d'}
        >
          <Box size={14} strokeWidth={1.5} />
          3D
        </button>
      </div>

      {/*
        Both canvases are mounted simultaneously, only toggled via display.
        This preserves the Three.js renderer and Konva Stage between view switches.
      */}
      <div className="editor-shell__canvas" style={{ display: viewMode === '2d' ? 'block' : 'none' }}>
        <Editor2D />
      </div>
      <div className="editor-shell__canvas" style={{ display: viewMode === '3d' ? 'block' : 'none' }}>
        <Editor3D />
      </div>
    </div>
  );
}

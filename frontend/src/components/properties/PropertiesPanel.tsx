// frontend/src/components/properties/PropertiesPanel.tsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import { Button } from '../ui/Button';
import { cmToDisplay } from '../../lib/units';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const { placements, selectedId, updatePlacement, removePlacement, setSelected } =
    useEditorStore();
  const project = useProjectStore((s) => s.project);
  const unitSystem = project?.unitSystem ?? 'imperial';

  const selected = selectedId ? placements.find((p) => p.id === selectedId) : null;

  if (!selected) {
    return (
      <div className="properties-panel properties-panel--empty">
        <p className="properties-panel__hint">Select a furniture item to edit its properties.</p>
      </div>
    );
  }

  function updateDim(field: 'widthCm' | 'depthCm' | 'heightCm' | 'elevationCm', value: string) {
    const num = parseFloat(value);
    if (!selectedId || isNaN(num) || num < 0) return;
    updatePlacement(selectedId, { [field]: num });
  }

  return (
    <div className="properties-panel">
      <div className="properties-panel__header">
        <h3 className="properties-panel__name">{selected.label}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { removePlacement(selected.id); setSelected(null); }}
          aria-label="Remove item"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="properties-panel__section">
        <p className="properties-panel__section-title">Dimensions</p>

        <DimensionRow
          label="Width"
          valueCm={selected.widthCm}
          unitSystem={unitSystem}
          onChange={(v) => updateDim('widthCm', v)}
        />
        <DimensionRow
          label="Depth"
          valueCm={selected.depthCm}
          unitSystem={unitSystem}
          onChange={(v) => updateDim('depthCm', v)}
        />
        <DimensionRow
          label="Height"
          valueCm={selected.heightCm}
          unitSystem={unitSystem}
          onChange={(v) => updateDim('heightCm', v)}
        />
        <DimensionRow
          label="Elevation"
          valueCm={selected.elevationCm}
          unitSystem={unitSystem}
          onChange={(v) => updateDim('elevationCm', v)}
        />
      </div>

      <div className="properties-panel__section">
        <p className="properties-panel__section-title">Rotation</p>
        <div className="properties-panel__row">
          <span className="properties-panel__row-label">Angle</span>
          <span className="properties-panel__mono">{selected.rotationDeg}°</span>
        </div>
        <p className="properties-panel__hint">Press R to rotate 90°</p>
      </div>

      <div className="properties-panel__section">
        <p className="properties-panel__section-title">Color</p>
        <div className="properties-panel__row">
          <span
            className="properties-panel__swatch"
            style={{ background: selected.colorHex }}
          />
          <input
            type="color"
            value={selected.colorHex}
            onChange={(e) => updatePlacement(selected.id, { colorHex: e.target.value })}
            className="properties-panel__color-input"
            aria-label="Item color"
          />
          <span className="properties-panel__mono">{selected.colorHex}</span>
        </div>
      </div>
    </div>
  );
}

function DimensionRow({
  label,
  valueCm,
  unitSystem,
  onChange,
}: {
  label: string;
  valueCm: number;
  unitSystem: 'imperial' | 'metric';
  onChange: (v: string) => void;
}) {
  return (
    <div className="properties-panel__row">
      <span className="properties-panel__row-label">{label}</span>
      <span className="properties-panel__display">{cmToDisplay(valueCm, unitSystem)}</span>
      <input
        type="number"
        className="properties-panel__dim-input"
        value={valueCm.toFixed(1)}
        step="0.5"
        min="1"
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} in cm`}
        title={`${label} (cm)`}
      />
      <span className="properties-panel__unit">cm</span>
    </div>
  );
}

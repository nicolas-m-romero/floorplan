// frontend/src/components/upload/CalibrationTool.tsx
import React, { useState, useRef } from 'react';
import { useCalibration } from '../../hooks/useCalibration';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { projects as projectsApi } from '../../api/projects';
import './CalibrationTool.css';

interface CalibrationToolProps {
  projectId: string;
  floorPlanUrl: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function CalibrationTool({
  projectId,
  floorPlanUrl,
  onComplete,
  onSkip,
}: CalibrationToolProps) {
  const { step, point1, point2, start, onCanvasClick, confirm } = useCalibration();
  const [distanceInput, setDistanceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function getRelativePoint(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.naturalWidth / rect.width;
    const scaleY = e.currentTarget.naturalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleImgClick(e: React.MouseEvent<HTMLImageElement>) {
    if (step !== 'point1' && step !== 'point2') return;
    onCanvasClick(getRelativePoint(e));
  }

  async function handleConfirm() {
    const cm = parseFloat(distanceInput);
    if (!cm || cm <= 0) return;
    confirm(cm);
    setIsSaving(true);

    try {
      if (point1 && point2) {
        await projectsApi.update(projectId, {
          calibration: { point1, point2, realDistanceCm: cm },
        });
      }
    } catch { /* non-fatal */ }

    setIsSaving(false);
    onComplete();
  }

  // Display scale for dot rendering
  function getDisplayPoint(pt: { x: number; y: number } | null) {
    if (!pt || !imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = rect.width / imgRef.current.naturalWidth;
    const scaleY = rect.height / imgRef.current.naturalHeight;
    return { x: pt.x * scaleX, y: pt.y * scaleY };
  }

  const dp1 = getDisplayPoint(point1);
  const dp2 = getDisplayPoint(point2);

  return (
    <div className="calibration-tool">
      <div className="calibration-tool__header">
        <h2 className="calibration-tool__title">Calibrate Scale</h2>
        <p className="calibration-tool__desc">
          {step === 'idle' && 'Click "Start" to mark a known distance on your floor plan.'}
          {step === 'point1' && 'Click on the first point of a known distance.'}
          {step === 'point2' && 'Click on the second point.'}
          {step === 'distance' && 'Enter the real-world distance between those two points.'}
          {step === 'done' && 'Calibration saved.'}
        </p>

        {step === 'idle' && (
          <div className="calibration-tool__actions">
            <Button variant="primary" onClick={start}>Start calibration</Button>
            <Button variant="ghost" onClick={onSkip}>Skip for now</Button>
          </div>
        )}
      </div>

      <div className="calibration-tool__canvas-wrap">
        <img
          ref={imgRef}
          src={floorPlanUrl}
          alt="Floor plan"
          className={`calibration-tool__img ${step === 'point1' || step === 'point2' ? 'calibration-tool__img--active' : ''}`}
          onClick={handleImgClick}
          draggable={false}
        />

        {dp1 && (
          <div
            className="calibration-tool__dot calibration-tool__dot--1"
            style={{ left: dp1.x, top: dp1.y }}
          />
        )}
        {dp2 && (
          <div
            className="calibration-tool__dot calibration-tool__dot--2"
            style={{ left: dp2.x, top: dp2.y }}
          />
        )}
        {dp1 && dp2 && (
          <svg className="calibration-tool__line" aria-hidden="true">
            <line
              x1={dp1.x}
              y1={dp1.y}
              x2={dp2.x}
              y2={dp2.y}
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </svg>
        )}
      </div>

      {step === 'distance' && (
        <div className="calibration-tool__distance-form">
          <Input
            label="Real-world distance (cm)"
            type="number"
            min="1"
            step="0.1"
            value={distanceInput}
            onChange={(e) => setDistanceInput(e.target.value)}
            placeholder="e.g. 365.76"
            mono
          />
          <div className="calibration-tool__actions">
            <Button variant="primary" onClick={handleConfirm} isLoading={isSaving}>
              Confirm calibration
            </Button>
            <Button variant="ghost" onClick={onSkip}>Skip</Button>
          </div>
        </div>
      )}
    </div>
  );
}

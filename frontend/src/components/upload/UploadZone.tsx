// frontend/src/components/upload/UploadZone.tsx
import React, { useRef, useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { projects as projectsApi } from '../../api/projects';
import { Button } from '../ui/Button';
import { CalibrationTool } from './CalibrationTool';
import './UploadZone.css';

type UploadState =
  | 'idle'
  | 'dragging'
  | 'uploading'
  | 'processing'
  | 'calibrating'
  | 'done'
  | 'error';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE_MB = 20;

interface UploadZoneProps {
  onComplete: (projectId: string) => void;
  onCancel?: () => void;
}

export function UploadZone({ onComplete, onCancel }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<{
    projectId: string;
    floorPlanUrl: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only PNG, JPG, and PDF files are supported.';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  async function processFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      return;
    }

    setState('uploading');
    setProgress('Uploading floor plan…');
    setError(null);

    try {
      setState('processing');
      setProgress('Detecting rooms…');

      const result = await projectsApi.upload(file);

      setUploadResult({
        projectId: result.projectId,
        floorPlanUrl: result.floorPlanUrl,
      });
      setState('calibrating');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setState('error');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  if (state === 'calibrating' && uploadResult) {
    return (
      <CalibrationTool
        projectId={uploadResult.projectId}
        floorPlanUrl={uploadResult.floorPlanUrl}
        onComplete={() => onComplete(uploadResult.projectId)}
        onSkip={() => onComplete(uploadResult.projectId)}
      />
    );
  }

  return (
    <div className="upload-zone-wrapper">
      <div
        className={`upload-zone ${state === 'dragging' ? 'upload-zone--dragging' : ''} ${state === 'error' ? 'upload-zone--error' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setState('dragging'); }}
        onDragLeave={() => setState('idle')}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onClick={() => state === 'idle' && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload floor plan"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          className="upload-zone__input"
          onChange={handleFileInput}
          aria-hidden="true"
          tabIndex={-1}
        />

        {state === 'idle' || state === 'dragging' ? (
          <>
            <Upload
              size={32}
              strokeWidth={1}
              color={state === 'dragging' ? 'var(--color-accent)' : 'var(--color-text-muted)'}
            />
            <p className="upload-zone__title">
              {state === 'dragging' ? 'Drop to upload' : 'Drag & drop your floor plan'}
            </p>
            <p className="upload-zone__subtitle">PNG, JPG, or PDF — max {MAX_SIZE_MB}MB</p>
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              Browse files
            </Button>
          </>
        ) : state === 'uploading' || state === 'processing' ? (
          <>
            <div className="upload-zone__spinner" />
            <p className="upload-zone__title">{progress}</p>
            <p className="upload-zone__subtitle">This may take a moment.</p>
          </>
        ) : state === 'error' ? (
          <>
            <AlertCircle size={32} strokeWidth={1} color="var(--color-error)" />
            <p className="upload-zone__title upload-zone__title--error">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => setState('idle')}>
              Try again
            </Button>
          </>
        ) : null}
      </div>

      {onCancel && (
        <button className="upload-zone__cancel" onClick={onCancel} aria-label="Cancel upload">
          <X size={14} strokeWidth={1.5} />
          Cancel
        </button>
      )}
    </div>
  );
}

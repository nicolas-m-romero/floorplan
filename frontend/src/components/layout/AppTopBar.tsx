// frontend/src/components/layout/AppTopBar.tsx
import React, { useState } from 'react';
import { Save, Share2, Download, Check, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../ui/Button';
import './AppTopBar.css';

interface AppTopBarProps {
  onSave?: () => void;
}

export function AppTopBar({ onSave }: AppTopBarProps) {
  const project = useProjectStore((s) => s.project);
  const { isSaving, saveError, setShareModalOpen, setExportModalOpen } = useUIStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const setProject = useProjectStore((s) => s.setProject);

  function startEditName() {
    setNameValue(project?.name ?? '');
    setIsEditingName(true);
  }

  function commitName(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !nameValue.trim()) { setIsEditingName(false); return; }
    setProject({ ...project, name: nameValue.trim() });
    setIsEditingName(false);
  }

  return (
    <header className="app-topbar">
      <a href="/dashboard" className="app-topbar__logo" aria-label="Back to dashboard">
        FC
      </a>

      <div className="app-topbar__project">
        {isEditingName ? (
          <form onSubmit={commitName} className="app-topbar__name-form">
            <input
              className="app-topbar__name-input"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              autoFocus
              aria-label="Project name"
            />
          </form>
        ) : (
          <button
            className="app-topbar__name"
            onClick={startEditName}
            title="Click to rename"
          >
            {project?.name ?? 'Loading…'}
          </button>
        )}
      </div>

      <div className="app-topbar__actions">
        {saveError ? (
          <span className="app-topbar__save-error">
            <AlertCircle size={12} strokeWidth={1.5} />
            {saveError}
          </span>
        ) : isSaving ? (
          <span className="app-topbar__saving">Saving…</span>
        ) : (
          <span className="app-topbar__saved">
            <Check size={12} strokeWidth={1.5} />
            Saved
          </span>
        )}

        <Button variant="ghost" size="sm" onClick={onSave} isLoading={isSaving}>
          <Save size={14} strokeWidth={1.5} />
          Save
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setShareModalOpen(true)}>
          <Share2 size={14} strokeWidth={1.5} />
          Share
        </Button>

        <Button variant="secondary" size="sm" onClick={() => setExportModalOpen(true)}>
          <Download size={14} strokeWidth={1.5} />
          Export
        </Button>
      </div>
    </header>
  );
}

// frontend/src/pages/Editor.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useAutoSave } from '../hooks/useAutoSave';
import { useCatalogStore } from '../stores/catalogStore';
import { catalog as catalogApi } from '../api/catalog';
import { AppTopBar } from '../components/layout/AppTopBar';
import { AppSidebar } from '../components/layout/AppSidebar';
import { EditorShell } from '../components/editor/EditorShell';
import './Editor.css';

export function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  if (!projectId) {
    navigate('/dashboard');
    return null;
  }

  return <EditorInner projectId={projectId} />;
}

function EditorInner({ projectId }: { projectId: string }) {
  const { project, activeRoomId, save } = useProject(projectId);
  const { setCategories, setCustomItems, isLoaded } = useCatalogStore();

  // Load catalog once
  useEffect(() => {
    if (isLoaded) return;
    Promise.all([catalogApi.getAll(), catalogApi.getCustom()]).then(
      ([cats, custom]) => {
        setCategories(cats);
        setCustomItems(custom);
      },
    );
  }, [isLoaded, setCategories, setCustomItems]);

  // Auto-save
  useAutoSave(projectId, activeRoomId);

  if (!project) {
    return (
      <div className="editor-loading">
        <div className="editor-loading__spinner" />
        <p>Loading project…</p>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <AppTopBar onSave={save} />
      <div className="editor-body">
        <AppSidebar />
        <EditorShell />
      </div>
    </div>
  );
}

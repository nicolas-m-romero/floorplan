// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, LogOut } from 'lucide-react';
import { projects as projectsApi, type ProjectSummary } from '../api/projects';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UploadZone } from '../components/upload/UploadZone';
import './Dashboard.css';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjectList(list);
      setIsLoading(false);
    });
  }, []);

  const handleUploadComplete = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="dashboard">
      {/* Top bar */}
      <header className="dashboard-topbar">
        <span className="dashboard-logo">FC</span>
        <span className="dashboard-topbar__title">FloorCraft</span>
        <div className="dashboard-topbar__actions">
          <span className="dashboard-topbar__user">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut size={14} strokeWidth={1.5} />
            Sign out
          </Button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-heading">Your Projects</h1>
            <p className="dashboard-subheading">
              {projectList.length} project{projectList.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowUpload(true)}>
            <Plus size={14} strokeWidth={1.5} />
            New project
          </Button>
        </div>

        {showUpload && (
          <div className="dashboard-upload-zone">
            <UploadZone
              onComplete={handleUploadComplete}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="dashboard-loading">
            <span className="dashboard-loading__spinner" />
          </div>
        ) : projectList.length === 0 && !showUpload ? (
          <div className="dashboard-empty">
            <FolderOpen size={48} strokeWidth={1} color="var(--color-text-muted)" />
            <p className="dashboard-empty__text">No projects yet.</p>
            <Button variant="primary" onClick={() => setShowUpload(true)}>
              Upload a floor plan
            </Button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {projectList.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => navigate(`/editor/${p.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
}: {
  project: ProjectSummary;
  onClick: () => void;
}) {
  return (
    <button className="project-card" onClick={onClick} aria-label={`Open ${project.name}`}>
      <div className="project-card__thumb">
        {project.thumbnailUrl ? (
          <img src={project.thumbnailUrl} alt="" className="project-card__img" />
        ) : (
          <div className="project-card__thumb-placeholder" />
        )}
      </div>
      <div className="project-card__body">
        <span className="project-card__name">{project.name}</span>
        <div className="project-card__meta">
          <Badge variant={project.cvStatus === 'complete' ? 'success' : 'muted'}>
            {project.cvStatus}
          </Badge>
          <span className="project-card__rooms">
            {project.roomCount} room{project.roomCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </button>
  );
}

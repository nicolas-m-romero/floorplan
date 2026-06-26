// frontend/src/components/layout/AppSidebar.tsx
import React from 'react';
import { Layers, List, Settings } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { CatalogSidebar } from '../catalog/CatalogSidebar';
import { RoomChecklist } from '../rooms/RoomChecklist';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import './AppSidebar.css';

export function AppSidebar() {
  const { sidebarTab, setSidebarTab } = useUIStore();

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar__tabs" aria-label="Sidebar tabs">
        <button
          className={`app-sidebar__tab ${sidebarTab === 'catalog' ? 'app-sidebar__tab--active' : ''}`}
          onClick={() => setSidebarTab('catalog')}
          title="Catalog"
          aria-pressed={sidebarTab === 'catalog'}
        >
          <Layers size={16} strokeWidth={1.5} />
          <span>Catalog</span>
        </button>
        <button
          className={`app-sidebar__tab ${sidebarTab === 'rooms' ? 'app-sidebar__tab--active' : ''}`}
          onClick={() => setSidebarTab('rooms')}
          title="Rooms"
          aria-pressed={sidebarTab === 'rooms'}
        >
          <List size={16} strokeWidth={1.5} />
          <span>Rooms</span>
        </button>
        <button
          className={`app-sidebar__tab ${sidebarTab === 'properties' ? 'app-sidebar__tab--active' : ''}`}
          onClick={() => setSidebarTab('properties')}
          title="Properties"
          aria-pressed={sidebarTab === 'properties'}
        >
          <Settings size={16} strokeWidth={1.5} />
          <span>Properties</span>
        </button>
      </nav>

      <div className="app-sidebar__panel">
        {sidebarTab === 'catalog' && <CatalogSidebar />}
        {sidebarTab === 'rooms' && <RoomChecklist />}
        {sidebarTab === 'properties' && <PropertiesPanel />}
      </div>
    </aside>
  );
}

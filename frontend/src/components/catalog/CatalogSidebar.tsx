// frontend/src/components/catalog/CatalogSidebar.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCatalogStore, type CatalogCategory, type CatalogItem } from '../../stores/catalogStore';
import './CatalogSidebar.css';

export function CatalogSidebar() {
  const { categories, customItems, isLoaded } = useCatalogStore();
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['living_room']));

  if (!isLoaded) {
    return (
      <div className="catalog-sidebar catalog-sidebar--loading">
        <div className="catalog-sidebar__spinner" />
      </div>
    );
  }

  const query = search.toLowerCase().trim();

  function toggleCategory(id: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const customCategory: CatalogCategory | null =
    customItems.length > 0
      ? { id: 'custom', label: 'My Items', items: customItems }
      : null;

  const allCategories = customCategory
    ? [customCategory, ...categories]
    : categories;

  const filtered = query
    ? allCategories.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) =>
            i.label.toLowerCase().includes(query) ||
            i.tags.some((t) => t.includes(query)),
        ),
      })).filter((cat) => cat.items.length > 0)
    : allCategories;

  return (
    <div className="catalog-sidebar">
      <div className="catalog-sidebar__search-wrap">
        <input
          className="catalog-sidebar__search"
          type="search"
          placeholder="Search furniture…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search catalog"
        />
      </div>

      <div className="catalog-sidebar__categories">
        {filtered.map((cat) => (
          <CatalogCategorySection
            key={cat.id}
            category={cat}
            isOpen={!!query || openCategories.has(cat.id)}
            onToggle={() => toggleCategory(cat.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CatalogCategorySection({
  category,
  isOpen,
  onToggle,
}: {
  category: CatalogCategory;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="catalog-category">
      <button className="catalog-category__header" onClick={onToggle}>
        <span className="catalog-category__label">{category.label}</span>
        <span className="catalog-category__count">{category.items.length}</span>
        {isOpen ? (
          <ChevronDown size={12} strokeWidth={1.5} />
        ) : (
          <ChevronRight size={12} strokeWidth={1.5} />
        )}
      </button>

      {isOpen && (
        <div className="catalog-category__items">
          {category.items.map((item) => (
            <CatalogItemChip key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogItemChip({ item }: { item: CatalogItem }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('catalogItemId', item.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div
      className="catalog-item"
      draggable
      onDragStart={handleDragStart}
      role="button"
      tabIndex={0}
      title={`${item.label} — ${item.defaultWidthCm}×${item.defaultDepthCm}cm`}
    >
      <span
        className="catalog-item__swatch"
        style={{ background: item.colorHex }}
        aria-hidden="true"
      />
      <span className="catalog-item__name">{item.label}</span>
      <span className="catalog-item__dims">
        {Math.round(item.defaultWidthCm)}×{Math.round(item.defaultDepthCm)}
      </span>
    </div>
  );
}

-- backend/db/schema.sql
-- Run this in the Supabase SQL Editor to create all tables, triggers, and RLS policies.

-- ─────────────────────────────────────────────
-- Shared trigger function: auto-update updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────
-- Table: projects
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  floor_plan_path          TEXT,
  floor_plan_width_px      INTEGER,
  floor_plan_height_px     INTEGER,

  calibration_point_1      JSONB,
  calibration_point_2      JSONB,
  calibration_real_distance FLOAT,
  pixels_per_cm            FLOAT,

  unit_system              TEXT NOT NULL DEFAULT 'imperial'
                             CHECK (unit_system IN ('imperial', 'metric')),

  cv_status                TEXT NOT NULL DEFAULT 'pending'
                             CHECK (cv_status IN ('pending', 'processing', 'complete', 'failed')),
  cv_phase                 TEXT CHECK (cv_phase IN ('phase1', 'phase2')),
  cv_error                 TEXT,

  is_public                BOOLEAN NOT NULL DEFAULT false
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "public_read" ON projects
  FOR SELECT USING (is_public = true);

CREATE POLICY "owner_write" ON projects
  FOR ALL USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- Table: rooms
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  label           TEXT NOT NULL DEFAULT 'Room',
  room_type       TEXT,
  is_selected     BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,

  polygon_px      JSONB NOT NULL DEFAULT '[]',

  area_cm2        FLOAT,
  bbox_width_cm   FLOAT,
  bbox_height_cm  FLOAT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON rooms
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_project_read" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = rooms.project_id AND p.is_public = true
    )
  );


-- ─────────────────────────────────────────────
-- Table: furniture_placements
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS furniture_placements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  catalog_item_id  TEXT,
  label            TEXT NOT NULL,

  position_x_px    FLOAT NOT NULL DEFAULT 0,
  position_y_px    FLOAT NOT NULL DEFAULT 0,
  rotation_deg     FLOAT NOT NULL DEFAULT 0,

  width_cm         FLOAT NOT NULL,
  depth_cm         FLOAT NOT NULL,
  height_cm        FLOAT NOT NULL,
  elevation_cm     FLOAT NOT NULL DEFAULT 0,

  color_hex        TEXT NOT NULL DEFAULT '#94A3B8',
  is_custom        BOOLEAN NOT NULL DEFAULT false,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER placements_updated_at
  BEFORE UPDATE ON furniture_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE furniture_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON furniture_placements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_project_read" ON furniture_placements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = furniture_placements.project_id AND p.is_public = true
    )
  );


-- ─────────────────────────────────────────────
-- Table: share_links
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON share_links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_token_read" ON share_links
  FOR SELECT USING (is_active = true);


-- ─────────────────────────────────────────────
-- Table: custom_catalog_items
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_catalog_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'custom',
  width_cm    FLOAT NOT NULL,
  depth_cm    FLOAT NOT NULL,
  height_cm   FLOAT NOT NULL,
  color_hex   TEXT NOT NULL DEFAULT '#94A3B8',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON custom_catalog_items
  FOR ALL USING (auth.uid() = user_id);

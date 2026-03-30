-- ============================================================
-- Project Management Tables
-- ============================================================

-- projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_name      text NOT NULL,
  status            text NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning', 'in_progress', 'paused', 'completed', 'cancelled')),
  start_date        date,
  target_end_date   date,
  actual_end_date   date,
  total_budget      numeric,
  spent_so_far      numeric NOT NULL DEFAULT 0,
  contractor_name   text,
  contractor_phone  text,
  contractor_notes  text,
  google_drive_url  text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on projects
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- project_tasks table
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_name       text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_to     text,
  start_date      date,
  end_date        date,
  estimated_cost  numeric,
  actual_cost     numeric,
  sort_order      integer NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- project_photos table
CREATE TABLE IF NOT EXISTS public.project_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  photo_url   text NOT NULL,
  caption     text,
  phase       text NOT NULL DEFAULT 'during'
              CHECK (phase IN ('before', 'during', 'after')),
  taken_at    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- project_updates table
CREATE TABLE IF NOT EXISTS public.project_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content      text NOT NULL,
  update_type  text NOT NULL DEFAULT 'note'
               CHECK (update_type IN ('progress', 'issue', 'milestone', 'note')),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON public.projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_sort_order ON public.project_tasks(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON public.project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON public.project_updates(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- projects
CREATE POLICY "auth_read_projects" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_projects" ON public.projects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_projects" ON public.projects
  FOR DELETE TO authenticated USING (true);

-- project_tasks
CREATE POLICY "auth_read_project_tasks" ON public.project_tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_project_tasks" ON public.project_tasks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_project_tasks" ON public.project_tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_project_tasks" ON public.project_tasks
  FOR DELETE TO authenticated USING (true);

-- project_photos
CREATE POLICY "auth_read_project_photos" ON public.project_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_project_photos" ON public.project_photos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_project_photos" ON public.project_photos
  FOR DELETE TO authenticated USING (true);

-- project_updates
CREATE POLICY "auth_read_project_updates" ON public.project_updates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_project_updates" ON public.project_updates
  FOR INSERT TO authenticated WITH CHECK (true);

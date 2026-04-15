-- ============================================================
-- JNH OPS PLATFORM — INITIAL SCHEMA
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  department  TEXT,
  job_title   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INITIATIVES
-- ============================================================
CREATE TABLE public.initiatives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'planning'
               CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_date   DATE,
  target_date  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_initiatives_owner ON public.initiatives(owner_id);
CREATE INDEX idx_initiatives_status ON public.initiatives(status);

-- ============================================================
-- DAILY UPDATES (Standups)
-- ============================================================
CREATE TABLE public.daily_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  update_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  did_today     TEXT NOT NULL,
  blockers      TEXT,
  plan_tomorrow TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, update_date)
);

CREATE INDEX idx_daily_updates_user ON public.daily_updates(user_id);
CREATE INDEX idx_daily_updates_date ON public.daily_updates(update_date);

-- ============================================================
-- SHM TECHNICAL TASKS
-- ============================================================
CREATE TABLE public.shm_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shm_tasks_assignee ON public.shm_tasks(assignee_id);
CREATE INDEX idx_shm_tasks_status ON public.shm_tasks(status);
CREATE INDEX idx_shm_tasks_initiative ON public.shm_tasks(initiative_id);

-- ============================================================
-- SHM OUTREACH PIPELINE
-- ============================================================
CREATE TABLE public.shm_outreach (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name      TEXT NOT NULL,
  company           TEXT NOT NULL,
  contact_email     TEXT,
  stage             TEXT NOT NULL DEFAULT 'identified'
                    CHECK (stage IN (
                      'identified', 'contacted', 'responded', 'meeting_scheduled',
                      'proposal_sent', 'negotiating', 'won', 'lost'
                    )),
  notes             TEXT,
  last_contact_date DATE,
  owner_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shm_outreach_owner ON public.shm_outreach(owner_id);
CREATE INDEX idx_shm_outreach_stage ON public.shm_outreach(stage);

-- ============================================================
-- AI SUMMARIES STORAGE
-- ============================================================
CREATE TABLE public.ai_summaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_type  TEXT NOT NULL CHECK (summary_type IN ('weekly_standup', 'outreach_draft')),
  reference_id  UUID,
  week_start    DATE,
  content       TEXT NOT NULL,
  generated_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_summaries_type ON public.ai_summaries(summary_type);
CREATE INDEX idx_ai_summaries_week ON public.ai_summaries(week_start);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_daily_updates_updated_at
  BEFORE UPDATE ON public.daily_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_shm_tasks_updated_at
  BEFORE UPDATE ON public.shm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_shm_outreach_updated_at
  BEFORE UPDATE ON public.shm_outreach
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shm_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_select"       ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- INITIATIVES policies
CREATE POLICY "initiatives_select"       ON public.initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "initiatives_insert_admin" ON public.initiatives FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "initiatives_update_admin" ON public.initiatives FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "initiatives_delete_admin" ON public.initiatives FOR DELETE TO authenticated USING (public.is_admin());

-- DAILY UPDATES policies
CREATE POLICY "daily_updates_select"     ON public.daily_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_updates_insert_own" ON public.daily_updates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_updates_update_own" ON public.daily_updates FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_updates_delete_own" ON public.daily_updates FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "daily_updates_admin"      ON public.daily_updates FOR ALL   TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SHM TASKS policies
CREATE POLICY "shm_tasks_select"     ON public.shm_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "shm_tasks_insert_own" ON public.shm_tasks FOR INSERT TO authenticated WITH CHECK (assignee_id = auth.uid());
CREATE POLICY "shm_tasks_update_own" ON public.shm_tasks FOR UPDATE TO authenticated USING (assignee_id = auth.uid()) WITH CHECK (assignee_id = auth.uid());
CREATE POLICY "shm_tasks_delete_own" ON public.shm_tasks FOR DELETE TO authenticated USING (assignee_id = auth.uid());
CREATE POLICY "shm_tasks_admin"      ON public.shm_tasks FOR ALL   TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SHM OUTREACH policies
CREATE POLICY "shm_outreach_select"     ON public.shm_outreach FOR SELECT TO authenticated USING (true);
CREATE POLICY "shm_outreach_insert_own" ON public.shm_outreach FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shm_outreach_update_own" ON public.shm_outreach FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shm_outreach_delete_own" ON public.shm_outreach FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "shm_outreach_admin"      ON public.shm_outreach FOR ALL   TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- AI SUMMARIES policies
CREATE POLICY "ai_summaries_select"     ON public.ai_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_summaries_insert_own" ON public.ai_summaries FOR INSERT TO authenticated WITH CHECK (generated_by = auth.uid());
CREATE POLICY "ai_summaries_admin"      ON public.ai_summaries FOR ALL   TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- FIRST ADMIN SETUP (run manually after creating your account)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================

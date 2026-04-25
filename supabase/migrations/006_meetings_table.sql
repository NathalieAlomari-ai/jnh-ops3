-- Migration 006: Meetings table

CREATE TABLE public.meetings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  date        DATE        NOT NULL,
  time        TIME        NOT NULL,
  notes       TEXT,
  attendees   JSONB       NOT NULL DEFAULT '[]',
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_created_by ON public.meetings(created_by);
CREATE INDEX idx_meetings_date       ON public.meetings(date);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all meetings
CREATE POLICY "meetings_select"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can create a meeting (created_by must be their own id)
CREATE POLICY "meetings_insert_own"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Creator or admin can delete
CREATE POLICY "meetings_delete_own"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "meetings_admin"
  ON public.meetings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

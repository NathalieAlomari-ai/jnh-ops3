-- ============================================================
-- JNH OPS PLATFORM — MIGRATION 010: MISC IMPROVEMENTS
-- Adds meetings.end_time and creates documents table
-- Run AFTER 009_pipeline_enhanced.sql in Supabase SQL Editor
-- ============================================================

-- ── 1. Add end_time to meetings ───────────────────────────────────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT NULL;

-- ── 2. Documents table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  description TEXT        DEFAULT NULL,
  category    TEXT        NOT NULL DEFAULT 'Reference',
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('Report', 'Meeting Notes', 'Template', 'Reference', 'Other'));

CREATE INDEX IF NOT EXISTS idx_documents_created_by
  ON public.documents (created_by);

CREATE INDEX IF NOT EXISTS idx_documents_created_at
  ON public.documents (created_at DESC);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all documents
DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert their own documents
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own; admins can delete any
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── VERIFICATION ──────────────────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'meetings' AND column_name = 'end_time';
--
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'documents';

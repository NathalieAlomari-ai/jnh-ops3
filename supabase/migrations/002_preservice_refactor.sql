-- ============================================================
-- JNH OPS PLATFORM — MIGRATION 002: PRE-SERVICE / SERVICE / PRODUCT PIVOT
-- Run this AFTER 001_initial_schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. PRE-SERVICE: Refactor shm_outreach stages
-- ============================================================

-- Remap any existing rows to new stages before changing the constraint
UPDATE public.shm_outreach SET stage = 'as_is_study'              WHERE stage IN ('identified', 'contacted');
UPDATE public.shm_outreach SET stage = 'gap_analysis'             WHERE stage IN ('responded', 'meeting_scheduled');
UPDATE public.shm_outreach SET stage = 'solution_scope'           WHERE stage IN ('proposal_sent', 'negotiating');
UPDATE public.shm_outreach SET stage = 'technical_financial_offer' WHERE stage IN ('won', 'lost');

-- Drop old CHECK constraint and add new one
ALTER TABLE public.shm_outreach DROP CONSTRAINT IF EXISTS shm_outreach_stage_check;
ALTER TABLE public.shm_outreach
  ADD CONSTRAINT shm_outreach_stage_check
  CHECK (stage IN ('as_is_study', 'gap_analysis', 'solution_scope', 'technical_financial_offer'));

-- Update default
ALTER TABLE public.shm_outreach ALTER COLUMN stage SET DEFAULT 'as_is_study';

-- ============================================================
-- 2. SERVICE: Add AI layer columns to initiatives
-- ============================================================

ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS layer_see    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS layer_know   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS layer_decide BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 3. PRODUCT: Create templates table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'general',
  layer_see    BOOLEAN NOT NULL DEFAULT false,
  layer_know   BOOLEAN NOT NULL DEFAULT false,
  layer_decide BOOLEAN NOT NULL DEFAULT false,
  config       JSONB DEFAULT '{}',
  created_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);

-- Reuse existing updated_at trigger function
CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: all authenticated read, admin-only write
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select"       ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_insert_admin" ON public.templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "templates_update_admin" ON public.templates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "templates_delete_admin" ON public.templates FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- JNH OPS PLATFORM — MIGRATION 004: PIPELINE CLOSED/WON STAGE
-- Run this AFTER 003_weekly_summary_extend.sql in Supabase SQL Editor
-- ============================================================
-- Adds 'closed_won' as a valid pipeline stage so the Kanban board
-- has a proper terminal column separate from 'technical_financial_offer'.
-- ============================================================

-- ── 1. Drop the existing CHECK constraint ─────────────────────
ALTER TABLE public.shm_outreach
  DROP CONSTRAINT IF EXISTS shm_outreach_stage_check;

-- ── 2. Re-add with the new 'closed_won' value ─────────────────
ALTER TABLE public.shm_outreach
  ADD CONSTRAINT shm_outreach_stage_check
  CHECK (stage IN (
    'as_is_study',
    'gap_analysis',
    'solution_scope',
    'technical_financial_offer',
    'closed_won'
  ));

-- ── VERIFICATION (run manually) ───────────────────────────────
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conrelid = 'public.shm_outreach'::regclass
--    AND contype = 'c';

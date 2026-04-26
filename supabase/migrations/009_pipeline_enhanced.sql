-- ============================================================
-- JNH OPS PLATFORM — MIGRATION 009: PIPELINE ENHANCED FIELDS
-- Run AFTER 008_meetings_summary.sql in Supabase SQL Editor
-- ============================================================
-- Adds deal value, priority, follow-up date, status, and
-- initiative link to the shm_outreach pipeline table.
-- ============================================================

-- ── 1. New columns ───────────────────────────────────────────
ALTER TABLE public.shm_outreach
  ADD COLUMN IF NOT EXISTS deal_value            DECIMAL(12,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority              TEXT           DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_followup_date    DATE           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_status           TEXT           DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS linked_initiative_id  UUID           REFERENCES public.initiatives(id) ON DELETE SET NULL;

-- ── 2. Add CHECK constraints ─────────────────────────────────
ALTER TABLE public.shm_outreach
  ADD CONSTRAINT shm_outreach_priority_check
    CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE public.shm_outreach
  ADD CONSTRAINT shm_outreach_deal_status_check
    CHECK (deal_status IN ('active', 'stalled', 'won', 'lost'));

-- ── 3. Index for initiative lookups ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_shm_outreach_linked_initiative
  ON public.shm_outreach (linked_initiative_id)
  WHERE linked_initiative_id IS NOT NULL;

-- ── VERIFICATION ─────────────────────────────────────────────
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'shm_outreach'
--  ORDER BY ordinal_position;

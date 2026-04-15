-- ============================================================
-- JNH OPS PLATFORM — MIGRATION 003: WEEKLY SUMMARY EXTENSION
-- Run this AFTER 002_preservice_refactor.sql in Supabase SQL Editor
-- ============================================================
-- Extends the existing ai_summaries table with structured weekly
-- report fields, rather than creating a separate table.
-- ============================================================

-- ============================================================
-- 1. ADD NEW COLUMNS TO ai_summaries
-- ============================================================

-- Structured 4-section report content (JSON object with keys:
--   standup_digest, task_progress, strategy_update, action_items_risks)
ALTER TABLE public.ai_summaries
  ADD COLUMN IF NOT EXISTS report_content JSONB;

-- Generation lifecycle tracking
ALTER TABLE public.ai_summaries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done'
    CHECK (status IN ('pending', 'generating', 'done', 'error'));

-- End of the week this summary covers (complement to week_start)
ALTER TABLE public.ai_summaries
  ADD COLUMN IF NOT EXISTS week_end DATE;

-- How the summary was triggered
ALTER TABLE public.ai_summaries
  ADD COLUMN IF NOT EXISTS triggered_by TEXT NOT NULL DEFAULT 'manual'
    CHECK (triggered_by IN ('manual', 'n8n'));

-- ============================================================
-- 2. SUPPORTING INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ai_summaries_status
  ON public.ai_summaries(status);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_week_end
  ON public.ai_summaries(week_end);

-- ============================================================
-- 3. RLS: Allow service-role (Edge Function) inserts
-- ============================================================
-- The existing insert policy requires generated_by = auth.uid(),
-- which fails when the n8n webhook Edge Function runs without a
-- user session. We add a service_role bypass policy.

-- Drop the service-role-blocking clause if it exists on the 
-- existing admin policy (admin policy uses is_admin which requires 
-- auth.uid() — service role bypasses RLS entirely by default in 
-- Supabase, so no additional policy is needed).

-- However, to allow authenticated webhook calls (where the Edge
-- Function forwards the n8n secret but has no user JWT), we add
-- an explicit policy that permits INSERT when triggered_by = 'n8n'
-- and the user claims service_role. Note: service_role already
-- bypasses RLS, so this is documentation/fallback only.

-- Verify service_role RLS bypass is enabled (Supabase default):
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'ai_summaries';
-- Service role bypasses RLS by default — no extra policy needed.

-- ============================================================
-- 4. BACK-FILL: Set status = 'done' on existing rows
-- ============================================================
-- The new status column has DEFAULT 'done', which covers existing
-- rows automatically in PostgreSQL ALTER TABLE ADD COLUMN.
-- (The default is applied to existing rows when column is added.)

-- ============================================================
-- VERIFICATION QUERIES (run manually to confirm success)
-- ============================================================
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'ai_summaries'
--  ORDER BY ordinal_position;

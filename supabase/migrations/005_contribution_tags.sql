-- Migration 005: Add contribution_tags to tasks and standups
-- Tags: Ideas | Outreach | Meetings | Entities | Applications | Partnerships | Deliverables

ALTER TABLE shm_tasks
  ADD COLUMN IF NOT EXISTS contribution_tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE daily_updates
  ADD COLUMN IF NOT EXISTS contribution_tags text[] NOT NULL DEFAULT '{}';

-- Optional index for filtering by tag (GIN index on arrays)
CREATE INDEX IF NOT EXISTS idx_shm_tasks_contribution_tags
  ON shm_tasks USING GIN (contribution_tags);

CREATE INDEX IF NOT EXISTS idx_daily_updates_contribution_tags
  ON daily_updates USING GIN (contribution_tags);

-- Migration: Overhaul notes, interviews, and pomodoro schema
-- Date: 2026-10-02

-- 1. Drop dead table
DROP TABLE IF EXISTS ai_usage_events;

-- 2. Note Folders
CREATE TABLE IF NOT EXISTS note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'fa-folder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_folders' AND policyname = 'Users can manage their own note folders'
  ) THEN
    CREATE POLICY "Users can manage their own note folders"
      ON note_folders
      FOR ALL
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- 3. Upgrade notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 4. Upgrade interview_items
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'middle';
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Backend';
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS mastery_score INT NOT NULL DEFAULT 0;
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMPTZ;
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE interview_items ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;

-- 5. Upgrade pomodoro_sessions
ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';
ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS target_id UUID;

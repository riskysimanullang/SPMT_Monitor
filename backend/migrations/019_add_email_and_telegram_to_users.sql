-- ============================================================
-- Migration 019: Add email and telegram_id to users table
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='email') THEN
    ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='telegram_id') THEN
    ALTER TABLE users ADD COLUMN telegram_id VARCHAR(50);
  END IF;
END $$;

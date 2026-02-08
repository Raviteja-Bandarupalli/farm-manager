-- Fix: Add missing 'farmId' column to transactions table
-- Run this in Supabase SQL Editor if you get "Could not find the 'farmId' column of 'transactions'"

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'farmId'
    ) THEN
        ALTER TABLE transactions ADD COLUMN "farmId" TEXT;
    END IF;
END $$;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'farmId';

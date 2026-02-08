-- Fix: Add missing 'farmId' column to transactions table with Foreign Key
-- Run this in Supabase SQL Editor if you get "Failed to save bulk purchase" or "Schema Mismatch"

-- 1. Add column if it doesn't exist
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

-- 2. Add Foreign Key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'transactions'
        AND constraint_name = 'transactions_farmId_fkey'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT "transactions_farmId_fkey"
        FOREIGN KEY ("farmId") REFERENCES farms(id);
    END IF;
END $$;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'farmId';

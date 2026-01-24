-- Fix: Add missing 'code' column to inventory table
-- Run this in Supabase SQL Editor if you get "column inventory.code does not exist"

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'code'
    ) THEN
        ALTER TABLE inventory ADD COLUMN code TEXT;
        
        -- Update existing rows with a default code (cast id to text explicitly)
        UPDATE inventory 
        SET code = 'ITEM-' || id::TEXT
        WHERE code IS NULL;
        
        -- Make it NOT NULL after setting defaults
        ALTER TABLE inventory ALTER COLUMN code SET NOT NULL;
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
AND column_name = 'code';

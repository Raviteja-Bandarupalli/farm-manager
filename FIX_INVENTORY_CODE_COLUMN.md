# Fix "column inventory.code does not exist" Error

## Problem

The error shows:
```
column inventory.code does not exist
hint: Perhaps you meant to reference the column "inventory.cost".
```

**Cause:** The `inventory` table in Supabase is missing the `code` column that the app expects.

---

## ✅ Solution: Add the Missing Column

### Option 1: Run SQL to Add Column (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and run this SQL:

```sql
-- Add missing 'code' column to inventory table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'code'
    ) THEN
        ALTER TABLE inventory ADD COLUMN code TEXT;
        
        -- Update existing rows with a default code (cast id to text)
        UPDATE inventory 
        SET code = 'ITEM-' || id::TEXT
        WHERE code IS NULL;
        
        -- Make it NOT NULL after setting defaults
        ALTER TABLE inventory ALTER COLUMN code SET NOT NULL;
    END IF;
END $$;
```

3. Verify: **Table Editor** → `inventory` → Should now show `code` column

### Option 2: Recreate Table (If No Data to Preserve)

If you don't have important data in the `inventory` table:

1. **Supabase SQL Editor** → Run:
```sql
-- Drop and recreate with correct schema
DROP TABLE IF EXISTS inventory CASCADE;

CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  "openingStock" DECIMAL(10,2) NOT NULL,
  "openingValue" DECIMAL(10,2) NOT NULL,
  "currentStock" DECIMAL(10,2) NOT NULL,
  "averageCost" DECIMAL(10,2) NOT NULL,
  "reorderLevel" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
```

---

## 🔍 Verify Fix

1. **Supabase** → **Table Editor** → `inventory`
2. Check columns: Should include `code` (TEXT, NOT NULL)
3. **Refresh your app** → Inventory page should load without errors

---

## 📋 Expected Columns in `inventory` Table

After fix, the table should have:
- `id` (TEXT, PRIMARY KEY)
- `code` (TEXT, NOT NULL) ← **This was missing**
- `name` (TEXT, NOT NULL)
- `category` (TEXT, NOT NULL)
- `unit` (TEXT, NOT NULL)
- `openingStock` (DECIMAL)
- `openingValue` (DECIMAL)
- `currentStock` (DECIMAL)
- `averageCost` (DECIMAL)
- `reorderLevel` (DECIMAL)
- `createdAt` (TIMESTAMP)

---

## ✅ After Fixing

1. Refresh the Inventory page
2. The "Failed to load inventory data" error should disappear
3. You should see "0 Items in inventory" (or your items if any exist)
4. You can add new items normally

The SQL script is also saved in `scripts/fix-inventory-code-column.sql` for easy reference.

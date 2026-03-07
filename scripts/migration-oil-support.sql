-- Migration: Add Oil support to feed_logs and initialize OIL in inventory

-- 1. Add oil_liters column to feed_logs table
ALTER TABLE feed_logs ADD COLUMN IF NOT EXISTS "oilLiters" NUMERIC DEFAULT 0;

-- 2. Ensure all existing rows have 0 for oilLiters
UPDATE feed_logs SET "oilLiters" = 0 WHERE "oilLiters" IS NULL;

-- 3. The 'OIL' ingredient should be added to the inventory.
-- The application handles initialization of core items, but you can run this to be sure:
-- Note: Replace 'your-farm-id' with actual farm IDs if you want to do it manually.
-- INSERT INTO inventory (id, "farmId", code, name, category, unit, "openingStock", "openingValue", "currentStock", "averageCost", "reorderLevel", "createdAt")
-- SELECT 'item-OIL-' || id || '-' || extract(epoch from now()), id, 'OIL', 'Oil', 'feed-raw', 'liters', 0, 0, 0, 0, 100, now()
-- FROM farms
-- WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE code = 'OIL' AND "farmId" = farms.id);

-- Create feed_logs table
CREATE TABLE IF NOT EXISTS feed_logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  "farmId" TEXT NOT NULL REFERENCES farms(id),
  "totalWeight" DECIMAL(10,2) NOT NULL,
  "maizeKg" DECIMAL(10,2) NOT NULL,
  "soyaKg" DECIMAL(10,2) NOT NULL,
  "brokenRiceKg" DECIMAL(10,2) NOT NULL,
  "suppl5Kg" DECIMAL(10,2) NOT NULL,
  "totalCost" DECIMAL(10,2) NOT NULL,
  distribution JSONB NOT NULL, -- {houseId: kg}
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_feed_logs_farm_date ON feed_logs("farmId", date);

-- Disable RLS
ALTER TABLE feed_logs DISABLE ROW LEVEL SECURITY;

-- Add comment to track migration
COMMENT ON TABLE feed_logs IS 'Professional feed mixing and distribution logs for B.N.Rao Poultry Farms';

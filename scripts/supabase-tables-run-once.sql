-- FarmManager: Supabase tables — RUN ONCE in Supabase SQL Editor
-- Fix: Mobile add log → Laptop blank (localStorage per-device). All data lives in Supabase so 5 managers share live.
-- See MOBILE_LAPTOP_SYNC.md for full setup and test steps.

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  "buyerId" TEXT NOT NULL,
  birds INTEGER NOT NULL,
  "avgWeightKg" DECIMAL(10,2) NOT NULL,
  "liveWeightKg" DECIMAL(10,2) NOT NULL,
  "ratePerKg" DECIMAL(10,2) NOT NULL,
  "totalValue" DECIMAL(10,2) NOT NULL,
  "invoiceNumber" TEXT,
  remarks TEXT,
  "financeTransactionId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
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

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  "supplierId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  "unitRate" DECIMAL(10,2) NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "invoiceNumber" TEXT,
  "financeTransactionId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;

-- Issues
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  "batchId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  "costPerUnit" DECIMAL(10,2) NOT NULL,
  "totalCost" DECIMAL(10,2) NOT NULL,
  purpose TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE issues DISABLE ROW LEVEL SECURITY;

-- Transactions (Finance)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT NOT NULL,
  "farmId" TEXT REFERENCES farms(id),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Daily Logs (shared across mobile + laptop)
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "houseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "sectionMortality" JSONB,
  date DATE NOT NULL,
  "openingBirds" INTEGER NOT NULL,
  mortality INTEGER NOT NULL,
  "closingBirds" INTEGER NOT NULL,
  "feedTypeId" TEXT,
  "cumulativeMortality" INTEGER NOT NULL,
  "cumulativeFeed" DECIMAL(10,2) NOT NULL,
  "cumulativeMortalityPercent" DECIMAL(5,2) NOT NULL,
  "cumulativeFCR" DECIMAL(5,2) NOT NULL,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  remarks TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE daily_logs DISABLE ROW LEVEL SECURITY;

-- Master data
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE farms DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY,
  "farmId" TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'maintenance', 'inactive')),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE houses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feed', 'medicine', 'equipment', 'other')),
  contact TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  address TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS feed_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('starter', 'grower', 'finisher')),
  protein DECIMAL(5,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE feed_types DISABLE ROW LEVEL SECURITY;

-- Batches, workers, weekly feeds, batch sections
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  "houseId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "placementDate" DATE NOT NULL,
  "initialBirds" INTEGER NOT NULL,
  breed TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'closed')),
  "targetFCR" DECIMAL(5,2) NOT NULL,
  "mortalityThreshold" DECIMAL(5,2) NOT NULL,
  "workerIds" TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS weekly_feeds (
  id TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "houseId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "weekEnd" DATE NOT NULL,
  "totalFeedKg" DECIMAL(10,2) NOT NULL,
  "averageWeightKg" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE weekly_feeds DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS batch_sections (
  id TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "workerId" TEXT,
  "initialBirds" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE batch_sections DISABLE ROW LEVEL SECURITY;

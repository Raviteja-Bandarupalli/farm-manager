# Quick Supabase Setup Guide

## Step 1: Create Tables in Supabase

Go to your Supabase dashboard → SQL Editor and run these commands:

### Sales Table
\`\`\`sql
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

-- Disable RLS or create permissive policy
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
-- OR if RLS is enabled:
-- CREATE POLICY "Allow all" ON sales FOR ALL USING (true) WITH CHECK (true);
\`\`\`

### Inventory Table
\`\`\`sql
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
\`\`\`

### Purchases Table
\`\`\`sql
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
\`\`\`

### Daily Logs Table
\`\`\`sql
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
\`\`\`

### Transactions Table (Finance)
\`\`\`sql
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
\`\`\`

### Issues Table
\`\`\`sql
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
\`\`\`

### Master Data: Farms, Houses, Suppliers, Buyers, Feed Types
\`\`\`sql
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL,
  capacity INTEGER NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE farms DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY, "farmId" TEXT NOT NULL, name TEXT NOT NULL,
  capacity INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('active', 'maintenance', 'inactive')),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE houses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feed', 'medicine', 'equipment', 'other')),
  contact TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS buyers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL,
  address TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS feed_types (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('starter', 'grower', 'finisher')),
  protein DECIMAL(5,2) NOT NULL, price DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE feed_types DISABLE ROW LEVEL SECURITY;
\`\`\`

### Batches, Workers, Weekly Feeds, Batch Sections
\`\`\`sql
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY, "houseId" TEXT NOT NULL, name TEXT NOT NULL,
  "placementDate" DATE NOT NULL, "initialBirds" INTEGER NOT NULL, breed TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'closed')),
  "targetFCR" DECIMAL(5,2) NOT NULL, "mortalityThreshold" DECIMAL(5,2) NOT NULL,
  "workerIds" TEXT[] DEFAULT '{}', "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, location TEXT,
  active BOOLEAN DEFAULT true, "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS weekly_feeds (
  id TEXT PRIMARY KEY, "batchId" TEXT NOT NULL, "houseId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL, "weekEnd" DATE NOT NULL,
  "totalFeedKg" DECIMAL(10,2) NOT NULL, "averageWeightKg" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE weekly_feeds DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS batch_sections (
  id TEXT PRIMARY KEY, "batchId" TEXT NOT NULL, name TEXT NOT NULL,
  "workerId" TEXT, "initialBirds" INTEGER NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE batch_sections DISABLE ROW LEVEL SECURITY;

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
  distribution JSONB NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
ALTER TABLE feed_logs DISABLE ROW LEVEL SECURITY;
\`\`\`

## Step 2: Verify Tables

After creating tables, verify they exist:
1. Go to Supabase Dashboard → Table Editor
2. You should see: `sales`, `inventory`, `purchases`, `daily_logs`, `transactions`, `issues`, `farms`, `houses`, `suppliers`, `buyers`, `feed_types`, `batches`, `workers`, `weekly_feeds`, `batch_sections`

## Step 3: Test the Application

1. Open browser console (F12)
2. Navigate to Sales page
3. Try adding a sale
4. Check console for any errors
5. Verify data appears in Supabase Table Editor

## Troubleshooting

### "8 issues" / multiple fetch errors in console
- The app fetches from 8 context sources (transactions, batches, daily_logs, workers, weekly_feeds, batch_sections, master data, inventory).
- If you see warnings like `[FarmManager] Fetch failed: transactions...` or `Error fetching ... from Supabase`, one or more tables are missing.
- **Fix:** Run **all** CREATE TABLE blocks above in the Supabase SQL Editor (including `transactions`, `issues`, `farms`, `houses`, etc.), then disable RLS on each.

### "Table does not exist" error
- Make sure you ran the CREATE TABLE commands
- Check table names match exactly (case-sensitive)

### "Permission denied" error
- Disable RLS: `ALTER TABLE sales DISABLE ROW LEVEL SECURITY;`
- Or create permissive policy

### Data not showing after insert
- Check browser console for errors
- Verify the insert succeeded in Supabase logs
- Refresh the page to trigger fetchSales()

### Column name errors
- PostgreSQL requires quoted identifiers for camelCase
- Make sure column names in SQL match the code exactly

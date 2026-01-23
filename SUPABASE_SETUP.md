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

## Step 2: Verify Tables

After creating tables, verify they exist:
1. Go to Supabase Dashboard → Table Editor
2. You should see: `sales`, `inventory`, `purchases`, `daily_logs`

## Step 3: Test the Application

1. Open browser console (F12)
2. Navigate to Sales page
3. Try adding a sale
4. Check console for any errors
5. Verify data appears in Supabase Table Editor

## Troubleshooting

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

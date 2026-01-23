# Supabase Migration Guide

## Tables Required in Supabase

### 1. `sales` table
```sql
CREATE TABLE sales (
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

-- Disable RLS for this table
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- Or create a policy that allows all operations
CREATE POLICY "Allow all operations on sales" ON sales FOR ALL USING (true) WITH CHECK (true);
```

### 2. `inventory` table
```sql
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  openingStock DECIMAL(10,2) NOT NULL,
  openingValue DECIMAL(10,2) NOT NULL,
  currentStock DECIMAL(10,2) NOT NULL,
  averageCost DECIMAL(10,2) NOT NULL,
  reorderLevel DECIMAL(10,2) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### 3. `purchases` table
```sql
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  supplierId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unitRate DECIMAL(10,2) NOT NULL,
  totalAmount DECIMAL(10,2) NOT NULL,
  invoiceNumber TEXT,
  financeTransactionId TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### 4. `issues` table (for inventory consumption)
```sql
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  batchId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  costPerUnit DECIMAL(10,2) NOT NULL,
  totalCost DECIMAL(10,2) NOT NULL,
  purpose TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### 5. `daily_logs` table
```sql
CREATE TABLE daily_logs (
  id TEXT PRIMARY KEY,
  batchId TEXT NOT NULL,
  houseId TEXT NOT NULL,
  sectionId TEXT,
  sectionMortality JSONB,
  date DATE NOT NULL,
  openingBirds INTEGER NOT NULL,
  mortality INTEGER NOT NULL,
  closingBirds INTEGER NOT NULL,
  feedTypeId TEXT,
  cumulativeMortality INTEGER NOT NULL,
  cumulativeFeed DECIMAL(10,2) NOT NULL,
  cumulativeMortalityPercent DECIMAL(5,2) NOT NULL,
  cumulativeFCR DECIMAL(5,2) NOT NULL,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  remarks TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Migration Status

✅ **Sales Page** - Migrated to Supabase
✅ **Inventory Page** - Migrated to Supabase (Items, Purchases)
⏳ **Daily Logs Page** - In Progress
⏳ **Dashboard Metrics** - Needs update to use Supabase

## Notes

- All tables should have RLS (Row Level Security) disabled for now
- ID fields use TEXT type (matching localStorage string IDs)
- All monetary values use DECIMAL(10,2)
- Dates use DATE type
- Timestamps use TIMESTAMP with DEFAULT NOW()

## Testing

After creating tables, test by:
1. Adding a sale (e.g., "Chinna" buyer) → Should appear in Supabase `sales` table
2. Adding inventory item → Should appear in `inventory` table
3. Adding purchase → Should appear in `purchases` table and update inventory stock
4. Adding daily log → Should appear in `daily_logs` table

// Quick test script to verify Supabase connection and table structure
// Run this in browser console: import { supabase } from '@/lib/supabase'; then test functions

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('sales').select('count').limit(1)
    if (error) {
      console.error('❌ Supabase connection error:', error)
      return false
    }
    console.log('✅ Supabase connected successfully')
    return true
  } catch (err) {
    console.error('❌ Connection test failed:', err)
    return false
  }
}

export async function checkSalesTable() {
  try {
    const { data, error } = await supabase.from('sales').select('*').limit(1)
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.error('❌ Sales table does not exist. Please create it in Supabase.')
        console.log('Required SQL:')
        console.log(`
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
);`)
        return false
      }
      throw error
    }
    console.log('✅ Sales table exists and is accessible')
    console.log('Sample data:', data)
    return true
  } catch (err) {
    console.error('❌ Table check failed:', err)
    return false
  }
}

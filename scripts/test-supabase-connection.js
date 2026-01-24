/**
 * Quick Supabase Connection Test
 * 
 * Run this in your browser console (F12) on your app page to verify Supabase is working.
 * 
 * Usage:
 * 1. Open your app (localhost:3000 or production URL)
 * 2. Press F12 → Console tab
 * 3. Copy-paste this entire script and press Enter
 */

(async () => {
  console.log('🧪 Testing Supabase Connection...\n')
  
  // Check env vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || window.location.origin.includes('localhost') 
    ? 'Check .env.local' 
    : 'Check Vercel env vars'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  
  console.log('Environment Variables:')
  console.log(`  URL: ${url}`)
  console.log(`  Key: ${key}\n`)
  
  // Test tables (if we can access supabase client)
  try {
    // Try to import supabase (this might not work in browser console, but worth trying)
    console.log('📋 Testing Table Access...\n')
    
    const tables = [
      'sales', 'inventory', 'purchases', 'issues', 'transactions',
      'daily_logs', 'farms', 'houses', 'suppliers', 'buyers',
      'feed_types', 'batches', 'workers', 'weekly_feeds', 'batch_sections'
    ]
    
    console.log('Expected tables:')
    tables.forEach(t => console.log(`  - ${t}`))
    console.log('\n💡 To test actual connection:')
    console.log('  1. Go to Daily Logs page')
    console.log('  2. Add a log')
    console.log('  3. Check Supabase Table Editor → daily_logs table')
    console.log('  4. If row appears, connection is working! ✅')
    
  } catch (e) {
    console.error('❌ Error:', e.message)
    console.log('\n💡 This script needs to run in the app context.')
    console.log('   Try: Open Daily Logs page → Add a log → Check Supabase')
  }
  
  console.log('\n✅ Test complete. Check browser Network tab for Supabase requests.')
})()

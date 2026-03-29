import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - database features will be disabled')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-if-missing.supabase.co',
  supabaseAnonKey || 'placeholder-if-missing'
)

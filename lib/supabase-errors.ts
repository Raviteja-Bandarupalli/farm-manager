/**
 * Centralised Supabase fetch error logging.
 * Use when a context fails to load data from a table (e.g. table missing, RLS).
 */

export function logFetchError(table: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  const hint =
    /does not exist|relation.*not found|PGRST/i.test(msg)
      ? ` Table "${table}" may be missing. Create it in Supabase (see SUPABASE_SETUP.md).`
      : ""
  console.warn(`[FarmManager] Fetch failed: ${table}.${hint} Error: ${msg}`)
}

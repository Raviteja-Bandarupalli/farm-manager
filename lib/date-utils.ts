/**
 * Timezone-safe date utilities
 * All functions return dates in local timezone, never UTC
 */

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Get first day of current month as YYYY-MM-DD
 */
export function getFirstDayOfMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}-01`
}

/**
 * Get last day of current month as YYYY-MM-DD
 */
export function getLastDayOfMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

/**
 * Get first day of current year as YYYY-MM-DD
 */
export function getFirstDayOfYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  return `${year}-01-01`
}

/**
 * Get last day of current year as YYYY-MM-DD
 */
export function getLastDayOfYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  return `${year}-12-31`
}

/**
 * Format date string to Indian format (DD-MM-YYYY)
 */
export function formatIndianDate(dateString: string): string {
  if (!dateString) return ""
  const date = new Date(dateString + "T00:00:00") // Add time to avoid timezone shift
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

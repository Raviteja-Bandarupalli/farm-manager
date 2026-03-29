import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * Fixes timezone bug where toISOString() returns UTC date
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatIndianDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatIndianNumber(num: number): string {
  return num.toLocaleString("en-IN")
}

export function formatBatchDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleDateString("en-IN", { month: "short" })
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function buildBatchName(houseName: string, placementDate: string): string {
  if (!houseName || !placementDate) return ""
  const formatted = formatBatchDate(placementDate)
  return `${houseName} – ${formatted}`
}

/**
 * Returns a sortable date key YYYY-MM-DD from various date inputs
 */
export function toDateKey(dateStr: string): number {
  if (!dateStr) return 0
  try {
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-")
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const d = new Date(dateStr + "T00:00:00Z")
        return isNaN(d.getTime()) ? 0 : d.getTime()
      } else {
        // DD-MM-YYYY
        const [dd, mm, yyyy] = parts
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`)
        return isNaN(d.getTime()) ? 0 : d.getTime()
      }
    }
    const fallback = new Date(dateStr)
    return isNaN(fallback.getTime()) ? 0 : fallback.getTime()
  } catch (e) {
    console.error("Error parsing date:", dateStr, e)
    return 0
  }
}

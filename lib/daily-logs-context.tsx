"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"
import { useAuth } from "./auth-context"
import { useBatch } from "./batch-context"
import { useWeeklyFeed } from "./weekly-feed-context"

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

export interface DailyLog {
  id: string
  batchId: string
  houseId: string
  sectionId?: string
  sectionMortality?: Record<string, number>
  date: string
  openingBirds: number
  mortality: number
  closingBirds: number
  feedTypeId: string
  cumulativeMortality: number
  cumulativeFeed: number
  cumulativeMortalityPercent: number
  cumulativeFCR: number
  temperature?: number
  humidity?: number
  remarks: string
  createdAt: string
}

interface DailyLogsContextType {
  dailyLogs: DailyLog[]
  loading: boolean
  refetch: () => Promise<void>
  addDailyLog: (
    log: Omit<
      DailyLog,
      | "id"
      | "createdAt"
      | "openingBirds"
      | "closingBirds"
      | "cumulativeMortality"
      | "cumulativeFeed"
      | "cumulativeMortalityPercent"
      | "cumulativeFCR"
    >,
  ) => Promise<DailyLog>
  updateDailyLog: (id: string, log: Partial<DailyLog>) => Promise<void>
  deleteDailyLog: (id: string) => Promise<void>
  getLogsByBatch: (batchId: string) => DailyLog[]
  getLogsByHouse: (houseId: string) => DailyLog[]
  getLastLogForBatch: (batchId: string, beforeDate?: string) => DailyLog | undefined
}

const DailyLogsContext = createContext<DailyLogsContextType | undefined>(undefined)

function recalculateBatchLogs(
  batchId: string,
  allLogs: DailyLog[],
  batches: { id: string; initialBirds: number }[],
  weeklyFeeds: { batchId: string; weekEnd: string; totalFeedKg: number }[],
): DailyLog[] {
  const batch = batches.find((b) => b.id === batchId)
  const initialBirds = batch?.initialBirds ?? 0

  // Get all logs for this batch
  const batchLogs = allLogs.filter((l) => l.batchId === batchId)

  // Sort them by date, then by createdAt to maintain a stable order
  const sortedLogs = [...batchLogs].sort((a, b) => {
    const dateDiff = toDateKey(a.date) - toDateKey(b.date)
    if (dateDiff !== 0) return dateDiff
    return (a.createdAt || "").localeCompare(b.createdAt || "")
  })

  const out: DailyLog[] = []
  let runningCumulativeMortality = 0

  for (let i = 0; i < sortedLogs.length; i++) {
    const cur = sortedLogs[i]
    // If multiple logs exist for the same day, opening birds for subsequent logs
    // should be the closing birds of the previous log (even on the same day)
    const openingBirds = i === 0 ? initialBirds : out[i - 1].closingBirds
    const closingBirds = openingBirds - (cur.mortality || 0)

    runningCumulativeMortality += (cur.mortality || 0)

    const curDateKey = toDateKey(cur.date)
    const cumulativeFeed = weeklyFeeds
      .filter((f) => f.batchId === batchId && toDateKey(f.weekEnd) <= curDateKey)
      .reduce((s, f) => s + f.totalFeedKg, 0)

    const cumulativeMortalityPercent = initialBirds > 0 ? (runningCumulativeMortality / initialBirds) * 100 : 0

    out.push({
      ...cur,
      openingBirds,
      closingBirds,
      cumulativeMortality: runningCumulativeMortality,
      cumulativeFeed,
      cumulativeMortalityPercent,
      cumulativeFCR: cur.cumulativeFCR || 0,
    })
  }
  return out
}

export function DailyLogsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { batches } = useBatch()
  const { weeklyFeeds } = useWeeklyFeed()
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("daily_logs").select("*")
      if (error) throw error
      const list = (data as DailyLog[]) || []
      list.forEach((l) => {
        if (l.sectionMortality && typeof l.sectionMortality === "string") {
          try {
            (l as any).sectionMortality = JSON.parse(l.sectionMortality as any)
          } catch (_) {}
        }
      })
      // Sort by date descending
      list.sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
      setDailyLogs(list)
    } catch (e) {
      logFetchError("daily_logs", e)
      setDailyLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const addDailyLog = async (
    log: Omit<
      DailyLog,
      | "id"
      | "createdAt"
      | "openingBirds"
      | "closingBirds"
      | "cumulativeMortality"
      | "cumulativeFeed"
      | "cumulativeMortalityPercent"
      | "cumulativeFCR"
    >,
  ): Promise<DailyLog> => {
    // Generate a unique ID and createdAt
    const logId = Date.now().toString() + Math.random().toString(36).slice(2, 9)
    const createdAt = new Date().toISOString()
    
    // Create a temporary log object for recalculation (placeholders for derived fields)
    const tempLog: DailyLog = {
      ...log,
      id: logId,
      createdAt,
      openingBirds: 0,
      closingBirds: 0,
      cumulativeMortality: 0,
      cumulativeFeed: 0,
      cumulativeMortalityPercent: 0,
      cumulativeFCR: 0,
    }
    
    // Recalculate ALL logs for this batch including the new one
    const allLogs = [...dailyLogs, tempLog]
    const recalc = recalculateBatchLogs(
      log.batchId,
      allLogs,
      batches.map((b) => ({ id: b.id, initialBirds: b.initialBirds })),
      weeklyFeeds.map((f) => ({ batchId: f.batchId, weekEnd: f.weekEnd, totalFeedKg: f.totalFeedKg })),
    )

    const calculatedNewLog = recalc.find(l => l.id === logId)
    if (!calculatedNewLog) throw new Error("Failed to calculate values for new log")

    console.log("[DailyLogs] Inserting new log with calculated values:", logId, log.date)

    const insertPayload = {
      ...calculatedNewLog,
      sectionMortality: calculatedNewLog.sectionMortality ? JSON.stringify(calculatedNewLog.sectionMortality) : null,
    }

    const { error: insertError } = await supabase.from("daily_logs").insert(insertPayload)
    if (insertError) {
      console.error("[DailyLogs] Insert error:", insertError)
      throw insertError
    }

    console.log(`[DailyLogs] Updating other ${recalc.length - 1} logs for batch ${log.batchId}`)

    // Update OTHER logs for this batch that might have changed due to the insertion
    for (const r of recalc) {
      if (r.id === logId) continue // already inserted

      const updateRow = {
        ...r,
        sectionMortality: r.sectionMortality && typeof r.sectionMortality === 'object'
          ? JSON.stringify(r.sectionMortality)
          : r.sectionMortality
      }
      const { error: updateError } = await supabase.from("daily_logs").update(updateRow).eq("id", r.id)
      if (updateError) {
        console.error(`[DailyLogs] Failed to update log ${r.id}:`, updateError)
      }
    }

    await fetchLogs()
    const saved = recalc.find((l) => l.id === logId)
    if (!saved) throw new Error("Failed to retrieve saved log after recalculation")
    return saved
  }

  const updateDailyLog = async (id: string, updates: Partial<DailyLog>) => {
    if (user?.role !== "owner") throw new Error("Only owners can edit daily logs")
    const prev = dailyLogs.find((l) => l.id === id)
    if (!prev) return
    const updated = { ...prev, ...updates }
    const other = dailyLogs.filter((l) => l.id !== id)
    const allLogs = [...other, updated]
    const recalc = recalculateBatchLogs(
      updated.batchId,
      allLogs,
      batches.map((b) => ({ id: b.id, initialBirds: b.initialBirds })),
      weeklyFeeds.map((f) => ({ batchId: f.batchId, weekEnd: f.weekEnd, totalFeedKg: f.totalFeedKg })),
    )

    // Update ALL logs in the batch to ensure the chain is correct
    for (const r of recalc) {
      const row = {
        ...r,
        sectionMortality: r.sectionMortality && typeof r.sectionMortality === 'object'
          ? JSON.stringify(r.sectionMortality)
          : r.sectionMortality
      }
      const { error } = await supabase.from("daily_logs").update(row).eq("id", r.id)
      if (error) throw error
    }

    await fetchLogs()
  }

  const deleteDailyLog = async (id: string) => {
    if (user?.role !== "owner") throw new Error("Only owners can delete daily logs")
    const log = dailyLogs.find((l) => l.id === id)
    if (!log) return
    const { error } = await supabase.from("daily_logs").delete().eq("id", id)
    if (error) throw error
    const remaining = dailyLogs.filter((l) => l.id !== id)
    const recalc = recalculateBatchLogs(
      log.batchId,
      remaining,
      batches.map((b) => ({ id: b.id, initialBirds: b.initialBirds })),
      weeklyFeeds.map((f) => ({ batchId: f.batchId, weekEnd: f.weekEnd, totalFeedKg: f.totalFeedKg })),
    )
    for (const r of recalc) {
      const row = {
        ...r,
        sectionMortality: r.sectionMortality && typeof r.sectionMortality === 'object'
          ? JSON.stringify(r.sectionMortality)
          : r.sectionMortality
      }
      await supabase.from("daily_logs").update(row).eq("id", r.id)
    }
    await fetchLogs()
  }

  const getLogsByBatch = (batchId: string) =>
    dailyLogs.filter((l) => l.batchId === batchId).sort((a, b) => toDateKey(a.date) - toDateKey(b.date))
  const getLogsByHouse = (houseId: string) =>
    dailyLogs.filter((l) => l.houseId === houseId).sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
  const getLastLogForBatch = (batchId: string, beforeDate?: string) => {
    const beforeDateKey = beforeDate ? toDateKey(beforeDate) : Number.MAX_SAFE_INTEGER
    const filtered = dailyLogs
      .filter((l) => l.batchId === batchId)
      .filter((l) => toDateKey(l.date) < beforeDateKey)
      .sort((a, b) => {
        const d = toDateKey(b.date) - toDateKey(a.date)
        if (d !== 0) return d
        return b.createdAt.localeCompare(a.createdAt)
      })
    return filtered[0]
  }

  return (
    <DailyLogsContext.Provider
      value={{
        dailyLogs,
        loading,
        refetch: fetchLogs,
        addDailyLog,
        updateDailyLog,
        deleteDailyLog,
        getLogsByBatch,
        getLogsByHouse,
        getLastLogForBatch,
      }}
    >
      {children}
    </DailyLogsContext.Provider>
  )
}

export function useDailyLogs() {
  const ctx = useContext(DailyLogsContext)
  if (ctx === undefined) throw new Error("useDailyLogs must be used within a DailyLogsProvider")
  return ctx
}

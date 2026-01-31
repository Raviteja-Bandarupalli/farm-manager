"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"
import { useAuth } from "./auth-context"
import { useBatch } from "./batch-context"
import { useWeeklyFeed } from "./weekly-feed-context"

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

  // Get all logs for this batch and sort them by date
  // Using a Map to ensure only one log per date (last one wins if duplicates exist)
  const logsByDate = new Map<string, DailyLog>()
  allLogs
    .filter((l) => l.batchId === batchId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach(l => logsByDate.set(l.date, l))

  const sortedLogs = Array.from(logsByDate.values()).sort((a, b) => a.date.localeCompare(b.date))

  const out: DailyLog[] = []
  let runningCumulativeMortality = 0

  for (let i = 0; i < sortedLogs.length; i++) {
    const cur = sortedLogs[i]
    const openingBirds = i === 0 ? initialBirds : out[i - 1].closingBirds
    const closingBirds = openingBirds - cur.mortality

    runningCumulativeMortality += cur.mortality

    const cumulativeFeed = weeklyFeeds
      .filter((f) => f.batchId === batchId && f.weekEnd <= cur.date)
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
      const { data, error } = await supabase.from("daily_logs").select("*").order("date", { ascending: false })
      if (error) throw error
      const list = (data as DailyLog[]) || []
      list.forEach((l) => {
        if (l.sectionMortality && typeof l.sectionMortality === "string") {
          try {
            (l as any).sectionMortality = JSON.parse(l.sectionMortality as any)
          } catch (_) {}
        }
      })
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
    const existing = dailyLogs.find((l) => l.batchId === log.batchId && l.date === log.date)
    if (existing) throw new Error(`A daily log already exists for this batch on ${log.date}. Only one entry per day is allowed.`)
    
    // Generate a unique ID
    const logId = Date.now().toString() + Math.random().toString(36).slice(2, 9)
    
    const insertPayload = {
      ...log,
      id: logId,
      sectionMortality: log.sectionMortality ? JSON.stringify(log.sectionMortality) : null,
      createdAt: new Date().toISOString(),
    }
    
    console.log("[DailyLogs] Inserting new log:", logId, log.date)

    const { error: insertError } = await supabase.from("daily_logs").insert(insertPayload)
    if (insertError) {
      console.error("[DailyLogs] Insert error:", insertError)
      throw insertError
    }

    // Now run batch-wide recalculation and update all logs for that batch
    // Ensure newLog has sectionMortality as object for consistency with dailyLogs state
    const newLog = {
      ...log,
      id: logId,
      createdAt: insertPayload.createdAt
    } as DailyLog
    
    const allLogs = [...dailyLogs, newLog]
    const recalc = recalculateBatchLogs(
      log.batchId,
      allLogs,
      batches.map((b) => ({ id: b.id, initialBirds: b.initialBirds })),
      weeklyFeeds.map((f) => ({ batchId: f.batchId, weekEnd: f.weekEnd, totalFeedKg: f.totalFeedKg })),
    )

    console.log(`[DailyLogs] Updating ${recalc.length} logs for batch ${log.batchId}`)

    // Update ALL logs for this batch to ensure the chain is perfect
    for (const r of recalc) {
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
    dailyLogs.filter((l) => l.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date))
  const getLogsByHouse = (houseId: string) =>
    dailyLogs.filter((l) => l.houseId === houseId).sort((a, b) => b.date.localeCompare(a.date))
  const getLastLogForBatch = (batchId: string, beforeDate?: string) => {
    const filtered = dailyLogs
      .filter((l) => l.batchId === batchId)
      .filter((l) => !beforeDate || l.date < beforeDate)
      .sort((a, b) => {
        const d = b.date.localeCompare(a.date)
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

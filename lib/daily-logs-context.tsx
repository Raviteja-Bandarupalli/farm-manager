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
  const batchLogs = allLogs
    .filter((l) => l.batchId === batchId)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      if (d !== 0) return d
      return a.createdAt.localeCompare(b.createdAt)
    })
  const out: DailyLog[] = []
  for (let i = 0; i < batchLogs.length; i++) {
    const cur = batchLogs[i]
    const openingBirds = i === 0 ? initialBirds : out[i - 1].closingBirds
    const closingBirds = openingBirds - cur.mortality
    const cumulativeMortality = i === 0 ? cur.mortality : out[i - 1].cumulativeMortality + cur.mortality
    const cumulativeFeed = weeklyFeeds
      .filter((f) => f.batchId === batchId && f.weekEnd <= cur.date)
      .reduce((s, f) => s + f.totalFeedKg, 0)
    const cumulativeMortalityPercent = initialBirds > 0 ? (cumulativeMortality / initialBirds) * 100 : 0
    out.push({
      ...cur,
      id: cur.id, // Explicitly preserve id
      openingBirds,
      closingBirds,
      cumulativeMortality,
      cumulativeFeed,
      cumulativeMortalityPercent,
      cumulativeFCR: 0,
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
    
    const newLog = {
      ...log,
      id: logId,
      createdAt: new Date().toISOString(),
    } as DailyLog
    
    console.log("[DailyLogs] Creating new log with ID:", logId)
    
    const allLogs = [...dailyLogs, newLog]
    const recalc = recalculateBatchLogs(
      log.batchId,
      allLogs,
      batches.map((b) => ({ id: b.id, initialBirds: b.initialBirds })),
      weeklyFeeds.map((f) => ({ batchId: f.batchId, weekEnd: f.weekEnd, totalFeedKg: f.totalFeedKg })),
    )
    const saved = recalc.find((l) => l.id === logId)
    if (!saved) throw new Error("Failed to recalculate daily log")
    if (!saved.id) throw new Error("Daily log ID is missing after recalculation")
    
    const finalId = saved.id || logId
    if (!finalId) {
      throw new Error("Daily log ID is missing - cannot save")
    }
    console.log("[DailyLogs] Saving log with ID:", finalId, "Row keys:", Object.keys(saved))
    
    // Ensure id is explicitly included and not null - use logId as ultimate fallback
    const safeId = finalId || logId || `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    if (!safeId) {
      throw new Error("Failed to generate daily log ID")
    }
    
    // Build row object with ID as first property to ensure it's never lost
    const row: any = {
      id: String(safeId), // Explicitly convert to string
      batchId: String(saved.batchId),
      houseId: String(saved.houseId),
      sectionId: saved.sectionId ? String(saved.sectionId) : null,
      sectionMortality: saved.sectionMortality ? JSON.stringify(saved.sectionMortality) : null,
      date: String(saved.date),
      openingBirds: Number(saved.openingBirds),
      mortality: Number(saved.mortality),
      closingBirds: Number(saved.closingBirds),
      feedTypeId: saved.feedTypeId ? String(saved.feedTypeId) : null,
      cumulativeMortality: Number(saved.cumulativeMortality),
      cumulativeFeed: Number(saved.cumulativeFeed),
      cumulativeMortalityPercent: Number(saved.cumulativeMortalityPercent),
      cumulativeFCR: Number(saved.cumulativeFCR),
      temperature: saved.temperature ? Number(saved.temperature) : null,
      humidity: saved.humidity ? Number(saved.humidity) : null,
      remarks: saved.remarks ? String(saved.remarks) : null,
      createdAt: String(saved.createdAt),
    }
    // Final safety check: ensure ID is present and not null
    if (!row.id || row.id === null || row.id === undefined) {
      console.error("[DailyLogs] CRITICAL: ID is missing from row!", row)
      throw new Error("Daily log ID is missing - cannot save. Generated ID was: " + logId)
    }
    
    // CRITICAL: Double-check ID is set before insert
    if (!row.id) {
      // Last resort: generate new ID right before insert
      row.id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      console.warn("[DailyLogs] ID was missing, generated new one:", row.id)
    }
    
    console.log("[DailyLogs] Inserting row with ID:", row.id, "Type:", typeof row.id, "Length:", row.id?.length)
    console.log("[DailyLogs] Row preview:", { id: row.id, batchId: row.batchId, date: row.date, mortality: row.mortality })
    console.log("[DailyLogs] Full row object keys:", Object.keys(row))
    console.log("[DailyLogs] Row.id value:", row.id, "Is null?", row.id === null, "Is undefined?", row.id === undefined)
    
    // Create a fresh object to ensure ID is not lost
    const insertPayload = {
      id: String(row.id), // Force string conversion
      batchId: String(row.batchId),
      houseId: String(row.houseId),
      sectionId: row.sectionId ? String(row.sectionId) : null,
      sectionMortality: row.sectionMortality,
      date: String(row.date),
      openingBirds: Number(row.openingBirds),
      mortality: Number(row.mortality),
      closingBirds: Number(row.closingBirds),
      feedTypeId: row.feedTypeId ? String(row.feedTypeId) : null,
      cumulativeMortality: Number(row.cumulativeMortality),
      cumulativeFeed: Number(row.cumulativeFeed),
      cumulativeMortalityPercent: Number(row.cumulativeMortalityPercent),
      cumulativeFCR: Number(row.cumulativeFCR),
      temperature: row.temperature ? Number(row.temperature) : null,
      humidity: row.humidity ? Number(row.humidity) : null,
      remarks: row.remarks ? String(row.remarks) : null,
      createdAt: String(row.createdAt),
    }
    
    // Final check on insert payload
    if (!insertPayload.id || insertPayload.id === 'null' || insertPayload.id === 'undefined') {
      insertPayload.id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      console.warn("[DailyLogs] Insert payload ID was invalid, regenerated:", insertPayload.id)
    }
    
    console.log("[DailyLogs] Insert payload ID:", insertPayload.id)
    
    const { data, error } = await supabase.from("daily_logs").insert(insertPayload).select()
    if (error) {
      console.error("[DailyLogs] Insert error:", error)
      console.error("[DailyLogs] Insert payload that failed:", JSON.stringify(insertPayload, null, 2))
      console.error("[DailyLogs] Original row:", JSON.stringify(row, null, 2))
      throw error
    }
    console.log("[DailyLogs] Successfully inserted:", data)

    // Recalculate and update ALL logs for this batch to ensure the chain is perfect
    for (const r of recalc) {
      const row = { ...r, sectionMortality: r.sectionMortality ? JSON.stringify(r.sectionMortality) : null }
      await supabase.from("daily_logs").update(row).eq("id", r.id)
    }

    await fetchLogs()
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
      const row = { ...r, sectionMortality: r.sectionMortality ? JSON.stringify(r.sectionMortality) : null }
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
      const row = { ...r, sectionMortality: r.sectionMortality ? JSON.stringify(r.sectionMortality) : null }
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

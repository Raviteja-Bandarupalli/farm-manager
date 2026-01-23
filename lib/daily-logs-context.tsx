"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"

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
  ) => DailyLog
  updateDailyLog: (id: string, log: Partial<DailyLog>) => void
  deleteDailyLog: (id: string) => void
  getLogsByBatch: (batchId: string) => DailyLog[]
  getLogsByHouse: (houseId: string) => DailyLog[]
  getLastLogForBatch: (batchId: string, beforeDate?: string) => DailyLog | undefined
}

const DailyLogsContext = createContext<DailyLogsContextType | undefined>(undefined)

export function DailyLogsProvider({ children }: { children: React.ReactNode }) {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const { user } = useAuth()

  const recalculateBatchLogs = (batchId: string, allLogs: DailyLog[]) => {
    const batches = JSON.parse(localStorage.getItem("poultry_batches") || "[]")
    const batch = batches.find((b: any) => b.id === batchId)
    const initialBirds = batch?.initialBirds || 0

    const weeklyFeeds = JSON.parse(localStorage.getItem("poultry_weekly_feeds") || "[]")

    const batchLogs = allLogs
      .filter((l) => l.batchId === batchId)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.createdAt.localeCompare(b.createdAt)
      })

    const recalculatedLogs: DailyLog[] = []

    for (let index = 0; index < batchLogs.length; index++) {
      const currentLog = batchLogs[index]

      const openingBirds = index === 0 ? initialBirds : recalculatedLogs[index - 1].closingBirds
      const closingBirds = openingBirds - currentLog.mortality

      const cumulativeMortality =
        index === 0 ? currentLog.mortality : recalculatedLogs[index - 1].cumulativeMortality + currentLog.mortality

      const cumulativeFeed = weeklyFeeds
        .filter((f: any) => f.batchId === batchId)
        .filter((f: any) => f.weekEnd <= currentLog.date)
        .reduce((sum: number, f: any) => sum + f.totalFeedKg, 0)

      const cumulativeMortalityPercent = initialBirds > 0 ? (cumulativeMortality / initialBirds) * 100 : 0
      const cumulativeFCR = 0 // cumulativeFCR calculation removed as averageWeight is no longer available

      recalculatedLogs.push({
        ...currentLog,
        openingBirds,
        closingBirds,
        cumulativeMortality,
        cumulativeFeed,
        cumulativeMortalityPercent,
        cumulativeFCR,
      })
    }

    return recalculatedLogs
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedLogs = localStorage.getItem("poultry_daily_logs")
        if (storedLogs) {
          const logs = JSON.parse(storedLogs)
          if (Array.isArray(logs)) setDailyLogs(logs)
        }
      } catch (error) {
        console.error("[v0] Failed to load daily logs:", error)
        setDailyLogs([])
      }
    }
  }, []) // Empty dependency - run once on mount

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "poultry_daily_logs" && e.newValue) {
        console.log("[v0] Daily logs updated from another session")
        setDailyLogs(JSON.parse(e.newValue))
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const addDailyLog = (
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
  ) => {
    const existingLog = dailyLogs.find((l) => l.batchId === log.batchId && l.date === log.date)
    if (existingLog) {
      throw new Error(
        `A daily log already exists for this batch on ${log.date}. Only one entry per day is allowed. Please edit the existing entry instead.`,
      )
    }

    const newLog: DailyLog = {
      ...log,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      openingBirds: 0,
      closingBirds: 0,
      cumulativeMortality: 0,
      cumulativeFeed: 0,
      cumulativeMortalityPercent: 0,
      cumulativeFCR: 0,
    }

    // Calculate the return value before updating state
    const allLogs = [...dailyLogs, newLog]
    const recalculatedLogs = recalculateBatchLogs(newLog.batchId, allLogs)
    const otherBatchLogs = allLogs.filter((l) => l.batchId !== newLog.batchId)
    const finalLogs = [...otherBatchLogs, ...recalculatedLogs]
    const savedLog = recalculatedLogs.find((l) => l.id === newLog.id)!

    setDailyLogs(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_daily_logs", JSON.stringify(finalLogs))
      }
      return finalLogs
    })

    return savedLog
  }

  const updateDailyLog = (id: string, updates: Partial<DailyLog>) => {
    if (user?.role !== "owner") {
      throw new Error("Only owners can edit daily logs")
    }

    setDailyLogs((prevLogs) => {
      const logToUpdate = prevLogs.find((l) => l.id === id)
      if (!logToUpdate) return prevLogs

      const updatedLog = {
        ...logToUpdate,
        ...updates,
        id: logToUpdate.id,
        createdAt: logToUpdate.createdAt,
      }

      const otherLogs = prevLogs.filter((l) => l.id !== id)
      const allLogs = [...otherLogs, updatedLog]
      const recalculatedLogs = recalculateBatchLogs(updatedLog.batchId, allLogs)
      const otherBatchLogs = allLogs.filter((l) => l.batchId !== updatedLog.batchId)
      const finalLogs = [...otherBatchLogs, ...recalculatedLogs]

      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_daily_logs", JSON.stringify(finalLogs))
      }
      return finalLogs
    })
  }

  const deleteDailyLog = (id: string) => {
    if (user?.role !== "owner") {
      throw new Error("Only owners can delete daily logs")
    }

    setDailyLogs((prevLogs) => {
      const logToDelete = prevLogs.find((l) => l.id === id)
      if (!logToDelete) return prevLogs

      const updatedLogs = prevLogs.filter((l) => l.id !== id)
      const recalculatedLogs = recalculateBatchLogs(logToDelete.batchId, updatedLogs)
      const otherBatchLogs = updatedLogs.filter((l) => l.batchId !== logToDelete.batchId)
      const finalLogs = [...otherBatchLogs, ...recalculatedLogs]

      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_daily_logs", JSON.stringify(finalLogs))
      }
      return finalLogs
    })
  }

  const getLogsByBatch = (batchId: string) => {
    return dailyLogs.filter((log) => log.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date))
  }

  const getLogsByHouse = (houseId: string) => {
    return dailyLogs.filter((log) => log.houseId === houseId).sort((a, b) => b.date.localeCompare(a.date))
  }

  const getLastLogForBatch = (batchId: string, beforeDate?: string) => {
    const batchLogs = dailyLogs
      .filter((log) => log.batchId === batchId)
      .filter((log) => !beforeDate || log.date < beforeDate)
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        return b.createdAt.localeCompare(a.createdAt)
      })

    return batchLogs[0]
  }

  return (
    <DailyLogsContext.Provider
      value={{
        dailyLogs,
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
  const context = useContext(DailyLogsContext)
  if (context === undefined) {
    throw new Error("useDailyLogs must be used within a DailyLogsProvider")
  }
  return context
}

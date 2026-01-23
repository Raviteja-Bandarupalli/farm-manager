"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface WeeklyFeedLog {
  id: string
  batchId: string
  houseId: string
  weekStart: string // ISO date
  weekEnd: string // ISO date
  totalFeedKg: number
  averageWeightKg: number // <-- New field for weekly weight recording
  createdAt: string
}

interface WeeklyFeedContextType {
  weeklyFeeds: WeeklyFeedLog[]
  addWeeklyFeed: (feed: Omit<WeeklyFeedLog, "id" | "createdAt">) => void
  updateWeeklyFeed: (id: string, feed: Partial<WeeklyFeedLog>) => void
  deleteWeeklyFeed: (id: string) => void
  getFeedsByBatch: (batchId: string) => WeeklyFeedLog[]
  getTotalFeedForBatch: (batchId: string, upToDate?: string) => number
  getLatestWeightForBatch: (batchId: string, upToDate?: string) => number // <-- New function to retrieve most recent weight
}

const WeeklyFeedContext = createContext<WeeklyFeedContextType | undefined>(undefined)

export function WeeklyFeedProvider({ children }: { children: React.ReactNode }) {
  const [weeklyFeeds, setWeeklyFeeds] = useState<WeeklyFeedLog[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("poultry_weekly_feeds")
    if (stored) {
      setWeeklyFeeds(JSON.parse(stored))
    }
  }, [])

  const addWeeklyFeed = (feed: Omit<WeeklyFeedLog, "id" | "createdAt">) => {
    const newFeed: WeeklyFeedLog = {
      ...feed,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    const updated = [...weeklyFeeds, newFeed]
    setWeeklyFeeds(updated)
    localStorage.setItem("poultry_weekly_feeds", JSON.stringify(updated))
  }

  const updateWeeklyFeed = (id: string, updates: Partial<WeeklyFeedLog>) => {
    const updated = weeklyFeeds.map((f) => (f.id === id ? { ...f, ...updates } : f))
    setWeeklyFeeds(updated)
    localStorage.setItem("poultry_weekly_feeds", JSON.stringify(updated))
  }

  const deleteWeeklyFeed = (id: string) => {
    const updated = weeklyFeeds.filter((f) => f.id !== id)
    setWeeklyFeeds(updated)
    localStorage.setItem("poultry_weekly_feeds", JSON.stringify(updated))
  }

  const getFeedsByBatch = (batchId: string) => {
    return weeklyFeeds.filter((f) => f.batchId === batchId).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  }

  const getTotalFeedForBatch = (batchId: string, upToDate?: string) => {
    return weeklyFeeds
      .filter((f) => f.batchId === batchId)
      .filter((f) => !upToDate || f.weekEnd <= upToDate)
      .reduce((sum, f) => sum + f.totalFeedKg, 0)
  }

  const getLatestWeightForBatch = (batchId: string, upToDate?: string): number => {
    const feedsForBatch = weeklyFeeds
      .filter((f) => f.batchId === batchId)
      .filter((f) => !upToDate || f.weekEnd <= upToDate)
      .sort((a, b) => b.weekEnd.localeCompare(a.weekEnd))

    return feedsForBatch[0]?.averageWeightKg || 0
  }

  return (
    <WeeklyFeedContext.Provider
      value={{
        weeklyFeeds,
        addWeeklyFeed,
        updateWeeklyFeed,
        deleteWeeklyFeed,
        getFeedsByBatch,
        getTotalFeedForBatch,
        getLatestWeightForBatch,
      }}
    >
      {children}
    </WeeklyFeedContext.Provider>
  )
}

export function useWeeklyFeed() {
  const context = useContext(WeeklyFeedContext)
  if (context === undefined) {
    throw new Error("useWeeklyFeed must be used within a WeeklyFeedProvider")
  }
  return context
}

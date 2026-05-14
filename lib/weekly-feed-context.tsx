"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"
import { toDateKey } from "./daily-logs-context"

export interface WeeklyFeedLog {
  id: string
  batchId: string
  houseId: string
  weekStart: string
  weekEnd: string
  totalFeedKg: number
  averageWeightKg: number
  createdAt: string
}

interface WeeklyFeedContextType {
  weeklyFeeds: WeeklyFeedLog[]
  loading: boolean
  refetch: () => Promise<void>
  addWeeklyFeed: (feed: Omit<WeeklyFeedLog, "id" | "createdAt">) => Promise<void>
  updateWeeklyFeed: (id: string, feed: Partial<WeeklyFeedLog>) => Promise<void>
  deleteWeeklyFeed: (id: string) => Promise<void>
  getFeedsByBatch: (batchId: string) => WeeklyFeedLog[]
  getTotalFeedForBatch: (batchId: string, upToDate?: string) => number
  getLatestWeightForBatch: (batchId: string, upToDate?: string) => number
}

const WeeklyFeedContext = createContext<WeeklyFeedContextType | undefined>(undefined)

export function WeeklyFeedProvider({ children }: { children: React.ReactNode }) {
  const [weeklyFeeds, setWeeklyFeeds] = useState<WeeklyFeedLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFeeds = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("weekly_feeds").select("*").order("weekStart")
      if (error) throw error
      setWeeklyFeeds((data as WeeklyFeedLog[]) || [])
    } catch (e) {
      logFetchError("weekly_feeds", e)
      setWeeklyFeeds([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeeds()
  }, [fetchFeeds])

  const addWeeklyFeed = async (feed: Omit<WeeklyFeedLog, "id" | "createdAt">) => {
    const row = { id: Date.now().toString(), ...feed, createdAt: new Date().toISOString() }
    const { error } = await supabase.from("weekly_feeds").insert(row)
    if (error) throw error
    await fetchFeeds()
  }

  const updateWeeklyFeed = async (id: string, feed: Partial<WeeklyFeedLog>) => {
    const { error } = await supabase.from("weekly_feeds").update(feed).eq("id", id)
    if (error) throw error
    await fetchFeeds()
  }

  const deleteWeeklyFeed = async (id: string) => {
    const { error } = await supabase.from("weekly_feeds").delete().eq("id", id)
    if (error) throw error
    await fetchFeeds()
  }

  const getFeedsByBatch = (batchId: string) =>
    weeklyFeeds.filter((f) => f.batchId === batchId).sort((a, b) => toDateKey(a.weekStart) - toDateKey(b.weekStart))

  const getTotalFeedForBatch = (batchId: string, upToDate?: string) => {
    const upToDateKey = upToDate ? toDateKey(upToDate) : Number.MAX_SAFE_INTEGER
    return weeklyFeeds
      .filter((f) => f.batchId === batchId)
      .filter((f) => toDateKey(f.weekEnd) <= upToDateKey)
      .reduce((sum, f) => sum + f.totalFeedKg, 0)
  }

  const getLatestWeightForBatch = (batchId: string, upToDate?: string) => {
    const upToDateKey = upToDate ? toDateKey(upToDate) : Number.MAX_SAFE_INTEGER
    const feeds = weeklyFeeds
      .filter((f) => f.batchId === batchId)
      .filter((f) => toDateKey(f.weekEnd) <= upToDateKey)
      .sort((a, b) => toDateKey(b.weekEnd) - toDateKey(a.weekEnd))
    return feeds[0]?.averageWeightKg ?? 0
  }

  return (
    <WeeklyFeedContext.Provider
      value={{
        weeklyFeeds,
        loading,
        refetch: fetchFeeds,
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
  const ctx = useContext(WeeklyFeedContext)
  if (ctx === undefined) throw new Error("useWeeklyFeed must be used within a WeeklyFeedProvider")
  return ctx
}

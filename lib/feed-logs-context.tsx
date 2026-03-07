"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"
import { useInventory } from "./inventory-context"
import { useMasterData } from "./master-data-context"

export interface FeedLog {
  id: string
  date: string
  farmId: string
  totalWeight: number
  maizeKg: number
  soyaKg: number
  brokenRiceKg: number
  suppl5Kg: number
  oilLiters: number
  totalCost: number
  distribution: Record<string, number> // {houseId: kg}
  createdAt: string
}

interface FeedLogsContextType {
  feedLogs: FeedLog[]
  loading: boolean
  refetch: () => Promise<void>
  addFeedLog: (
    log: Omit<FeedLog, "id" | "createdAt" | "totalCost">
  ) => Promise<void>
  deleteFeedLog: (id: string) => Promise<void>
  getFeedByHouse: (houseId: string, dateLimit?: string) => number
}

const FeedLogsContext = createContext<FeedLogsContextType | undefined>(undefined)

export function FeedLogsProvider({ children }: { children: React.ReactNode }) {
  const { items, getItemByCodeAndFarm, refetch: refetchInventory } = useInventory()
  const { farms } = useMasterData()
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFeedLogs = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("feed_logs").select("*").order("date", { ascending: false })
      if (error) throw error
      setFeedLogs((data as FeedLog[]) || [])
    } catch (e) {
      logFetchError("feed_logs", e)
      setFeedLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeedLogs()
  }, [fetchFeedLogs])

  const addFeedLog = async (log: Omit<FeedLog, "id" | "createdAt" | "totalCost">) => {
    // 1. Calculate Costs based on Inventory Average Cost
    const ingredients = [
      { code: "MAIZE", qty: log.maizeKg },
      { code: "SOYA", qty: log.soyaKg },
      { code: "BROKENRICE", qty: log.brokenRiceKg },
      { code: "SUPPL-5", qty: log.suppl5Kg },
      { code: "OIL", qty: log.oilLiters },
    ]

    let totalCost = 0
    const deductions = []

    for (const ing of ingredients) {
      if (ing.qty > 0) {
        const item = getItemByCodeAndFarm(ing.code, log.farmId)
        if (!item) throw new Error(`Stock record for ${ing.code} not found at this farm. Please initialize inventory first.`)

        const cost = ing.qty * (item.averageCost || 0)
        totalCost += cost
        deductions.push({
          item,
          qty: ing.qty,
          costPerUnit: item.averageCost,
          totalCost: cost
        })
      }
    }

    const logId = `fl-${Date.now()}`
    const newLog: any = {
      id: logId,
      ...log,
      totalCost,
      createdAt: new Date().toISOString()
    }

    // 2. Persist Feed Log
    const { error: logError } = await supabase.from("feed_logs").insert(newLog)
    if (logError) throw logError

    // 3. Deduct Inventory & Record Issues
    for (const d of deductions) {
      // Record Issue
      await supabase.from("issues").insert({
        id: `issue-${logId}-${d.item.code}`,
        date: log.date,
        batchId: "MIX-BATCH", // Bulk mixing doesn't have a single house batch yet
        itemId: d.item.id,
        quantity: d.qty,
        costPerUnit: d.costPerUnit,
        totalCost: d.totalCost,
        purpose: `Daily Feed Mix - Farm: ${farms.find(f => f.id === log.farmId)?.name}`,
        createdAt: new Date().toISOString()
      })

      // Update Stock
      await supabase.from("inventory").update({
        currentStock: Math.max(0, Number(d.item.currentStock) - Number(d.qty))
      }).eq("id", d.item.id)
    }

    await refetchInventory()
    await fetchFeedLogs()
  }

  const deleteFeedLog = async (id: string) => {
    const log = feedLogs.find(l => l.id === id)
    if (!log) return

    // 1. Restore Inventory
    const ingredients = [
      { code: "MAIZE", qty: log.maizeKg },
      { code: "SOYA", qty: log.soyaKg },
      { code: "BROKENRICE", qty: log.brokenRiceKg },
      { code: "SUPPL-5", qty: log.suppl5Kg },
      { code: "OIL", qty: log.oilLiters },
    ]

    for (const ing of ingredients) {
      if (ing.qty > 0) {
        const item = getItemByCodeAndFarm(ing.code, log.farmId)
        if (item) {
          // Delete Issue
          await supabase.from("issues").delete().eq("id", `issue-${id}-${ing.code}`)

          // Restore Stock
          await supabase.from("inventory").update({
            currentStock: Number(item.currentStock) + Number(ing.qty)
          }).eq("id", item.id)
        }
      }
    }

    // 2. Delete Feed Log
    const { error } = await supabase.from("feed_logs").delete().eq("id", id)
    if (error) throw error

    await refetchInventory()
    await fetchFeedLogs()
  }

  const getFeedByHouse = (houseId: string, dateLimit?: string) => {
    return feedLogs
      .filter(l => (!dateLimit || l.date <= dateLimit) && l.distribution && l.distribution[houseId])
      .reduce((sum, l) => sum + Number(l.distribution[houseId] || 0), 0)
  }

  return (
    <FeedLogsContext.Provider
      value={{
        feedLogs,
        loading,
        refetch: fetchFeedLogs,
        addFeedLog,
        deleteFeedLog,
        getFeedByHouse,
      }}
    >
      {children}
    </FeedLogsContext.Provider>
  )
}

export function useFeedLogs() {
  const ctx = useContext(FeedLogsContext)
  if (ctx === undefined) throw new Error("useFeedLogs must be used within a FeedLogsProvider")
  return ctx
}

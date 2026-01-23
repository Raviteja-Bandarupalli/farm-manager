"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface BatchCost {
  id: string
  batchId: string
  chickCost: number
  feedCost: number
  medicineCost: number
  litterCost: number
  labourCost: number
  utilitiesCost: number
  otherCost: number
  totalCost: number
  birdsSold: number
  liveWeightSold: number
  costPerBird: number
  costPerKg: number
  createdAt: string
  updatedAt: string
}

export interface OtherCostEntry {
  id: string
  batchId: string
  date: string
  category: "labour" | "utilities" | "other"
  description: string
  amount: number
  createdAt: string
}

interface BatchCostingContextType {
  batchCosts: BatchCost[]
  otherCosts: OtherCostEntry[]
  addOtherCost: (cost: Omit<OtherCostEntry, "id" | "createdAt">) => void
  updateBatchCost: (batchId: string, updates: Partial<BatchCost>) => void
  calculateBatchCost: (batchId: string) => BatchCost
  getBatchCost: (batchId: string) => BatchCost | undefined
  getOtherCostsByBatch: (batchId: string) => OtherCostEntry[]
  getAllBatchCosts: () => BatchCost[]
}

const BatchCostingContext = createContext<BatchCostingContextType | undefined>(undefined)

export function BatchCostingProvider({ children }: { children: React.ReactNode }) {
  const [batchCosts, setBatchCosts] = useState<BatchCost[]>([])
  const [otherCosts, setOtherCosts] = useState<OtherCostEntry[]>([])

  useEffect(() => {
    const storedBatchCosts = localStorage.getItem("poultry_batch_costs")
    const storedOtherCosts = localStorage.getItem("poultry_other_costs")
    if (storedBatchCosts) setBatchCosts(JSON.parse(storedBatchCosts))
    if (storedOtherCosts) setOtherCosts(JSON.parse(storedOtherCosts))
  }, [])

  const addOtherCost = (cost: Omit<OtherCostEntry, "id" | "createdAt">) => {
    const newCost: OtherCostEntry = {
      ...cost,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updatedCosts = [...otherCosts, newCost]
    setOtherCosts(updatedCosts)
    localStorage.setItem("poultry_other_costs", JSON.stringify(updatedCosts))

    // Recalculate batch cost
    calculateBatchCost(cost.batchId)
  }

  const calculateBatchCost = (batchId: string): BatchCost => {
    // Get all issues for this batch from inventory
    const issues = JSON.parse(localStorage.getItem("poultry_issues") || "[]").filter((i: any) => i.batchId === batchId)
    const items = JSON.parse(localStorage.getItem("poultry_inventory_items") || "[]")

    // Calculate costs by category
    let feedCost = 0
    let medicineCost = 0
    let litterCost = 0

    issues.forEach((issue: any) => {
      const item = items.find((i: any) => i.id === issue.itemId)
      if (item) {
        if (item.category === "feed-raw" || item.category === "feed-finished") {
          feedCost += issue.totalCost
        } else if (item.category === "medicine" || item.category === "vaccine") {
          medicineCost += issue.totalCost
        } else if (item.category === "litter") {
          litterCost += issue.totalCost
        }
      }
    })

    // Get other costs
    const batchOtherCosts = otherCosts.filter((c) => c.batchId === batchId)
    const labourCost = batchOtherCosts.filter((c) => c.category === "labour").reduce((sum, c) => sum + c.amount, 0)
    const utilitiesCost = batchOtherCosts
      .filter((c) => c.category === "utilities")
      .reduce((sum, c) => sum + c.amount, 0)
    const otherCost = batchOtherCosts.filter((c) => c.category === "other").reduce((sum, c) => sum + c.amount, 0)

    // Get chick cost from batch (assuming it's stored or entered separately)
    const batches = JSON.parse(localStorage.getItem("poultry_batches") || "[]")
    const batch = batches.find((b: any) => b.id === batchId)
    const chickCost = batch?.chickCost || 0

    const totalCost = chickCost + feedCost + medicineCost + litterCost + labourCost + utilitiesCost + otherCost

    // Calculate birds sold and weight from daily logs or sales records
    // For now, we'll use the latest closing birds from daily logs
    const dailyLogs = JSON.parse(localStorage.getItem("poultry_daily_logs") || "[]").filter(
      (l: any) => l.batchId === batchId,
    )
    const lastLog = dailyLogs.sort((a: any, b: any) => b.date.localeCompare(a.date))[0]
    const birdsSold = lastLog?.closingBirds || 0
    const liveWeightSold = birdsSold * (lastLog?.averageWeight || 0)

    const costPerBird = birdsSold > 0 ? totalCost / birdsSold : 0
    const costPerKg = liveWeightSold > 0 ? totalCost / liveWeightSold : 0

    const batchCost: BatchCost = {
      id: batchId,
      batchId,
      chickCost,
      feedCost,
      medicineCost,
      litterCost,
      labourCost,
      utilitiesCost,
      otherCost,
      totalCost,
      birdsSold,
      liveWeightSold,
      costPerBird,
      costPerKg,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Update or add batch cost
    const existingIndex = batchCosts.findIndex((bc) => bc.batchId === batchId)
    let updatedBatchCosts
    if (existingIndex >= 0) {
      updatedBatchCosts = [...batchCosts]
      updatedBatchCosts[existingIndex] = batchCost
    } else {
      updatedBatchCosts = [...batchCosts, batchCost]
    }

    setBatchCosts(updatedBatchCosts)
    localStorage.setItem("poultry_batch_costs", JSON.stringify(updatedBatchCosts))

    return batchCost
  }

  const updateBatchCost = (batchId: string, updates: Partial<BatchCost>) => {
    const existingCost = batchCosts.find((bc) => bc.batchId === batchId)
    if (existingCost) {
      const updatedCost = { ...existingCost, ...updates, updatedAt: new Date().toISOString() }
      const updatedBatchCosts = batchCosts.map((bc) => (bc.batchId === batchId ? updatedCost : bc))
      setBatchCosts(updatedBatchCosts)
      localStorage.setItem("poultry_batch_costs", JSON.stringify(updatedBatchCosts))
    }
  }

  const getBatchCost = (batchId: string) => {
    return batchCosts.find((bc) => bc.batchId === batchId)
  }

  const getOtherCostsByBatch = (batchId: string) => {
    return otherCosts.filter((c) => c.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date))
  }

  const getAllBatchCosts = () => {
    return batchCosts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  return (
    <BatchCostingContext.Provider
      value={{
        batchCosts,
        otherCosts,
        addOtherCost,
        updateBatchCost,
        calculateBatchCost,
        getBatchCost,
        getOtherCostsByBatch,
        getAllBatchCosts,
      }}
    >
      {children}
    </BatchCostingContext.Provider>
  )
}

export function useBatchCosting() {
  const context = useContext(BatchCostingContext)
  if (context === undefined) {
    throw new Error("useBatchCosting must be used within a BatchCostingProvider")
  }
  return context
}

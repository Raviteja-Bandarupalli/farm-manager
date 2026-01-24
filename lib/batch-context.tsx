"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"

export interface Batch {
  id: string
  houseId: string
  name: string
  batchNumber?: string
  placementDate: string
  initialBirds: number
  breed: string
  status: "active" | "completed" | "closed"
  targetFCR: number
  mortalityThreshold: number
  workerIds: string[]
  createdAt: string
}

interface BatchContextType {
  batches: Batch[]
  loading: boolean
  refetch: () => Promise<void>
  addBatch: (batch: Omit<Batch, "id" | "createdAt">) => Promise<Batch>
  updateBatch: (id: string, batch: Partial<Batch>) => Promise<void>
  deleteBatch: (id: string) => Promise<void>
  getActiveBatchByHouse: (houseId: string) => Batch | undefined
  getBatchesByHouse: (houseId: string) => Batch[]
}

const BatchContext = createContext<BatchContextType | undefined>(undefined)

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("batches").select("*").order("placementDate", { ascending: false })
      if (error) throw error
      const list = (data as Batch[]) || []
      setBatches(
        list.map((b: any) => ({
          ...b,
          workerIds: b.workerIds || [],
          name: b.name || b.batchNumber || b.id,
          batchNumber: b.batchNumber ?? b.name ?? b.id,
        }))
      )
    } catch (e) {
      logFetchError("batches", e)
      setBatches([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const addBatch = async (batch: Omit<Batch, "id" | "createdAt">): Promise<Batch> => {
    const row = {
      id: Date.now().toString(),
      ...batch,
      status: batch.status || "active", // Ensure status defaults to "active"
      workerIds: batch.workerIds || [],
      createdAt: new Date().toISOString(),
    }
    const { data, error } = await supabase.from("batches").insert(row).select().single()
    if (error) throw error
    await fetchBatches()
    return data as Batch
  }

  const updateBatch = async (id: string, batch: Partial<Batch>) => {
    const { error } = await supabase.from("batches").update(batch).eq("id", id)
    if (error) throw error
    await fetchBatches()
  }

  const deleteBatch = async (id: string) => {
    const { error } = await supabase.from("batches").delete().eq("id", id)
    if (error) throw error
    await fetchBatches()
  }

  const getActiveBatchByHouse = (houseId: string) =>
    batches.find((b) => b.houseId === houseId && b.status === "active")
  const getBatchesByHouse = (houseId: string) =>
    batches.filter((b) => b.houseId === houseId).sort((a, b) => b.placementDate.localeCompare(a.placementDate))

  return (
    <BatchContext.Provider
      value={{
        batches,
        loading,
        refetch: fetchBatches,
        addBatch,
        updateBatch,
        deleteBatch,
        getActiveBatchByHouse,
        getBatchesByHouse,
      }}
    >
      {children}
    </BatchContext.Provider>
  )
}

export function useBatch() {
  const ctx = useContext(BatchContext)
  if (ctx === undefined) throw new Error("useBatch must be used within a BatchProvider")
  return ctx
}

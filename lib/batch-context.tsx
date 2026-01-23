"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface Batch {
  id: string
  houseId: string
  name: string // e.g. "Station Shed – 13-Jan-2026"
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
  addBatch: (batch: Omit<Batch, "id" | "createdAt">) => void
  updateBatch: (id: string, batch: Partial<Batch>) => void
  deleteBatch: (id: string) => void
  getActiveBatchByHouse: (houseId: string) => Batch | undefined
  getBatchesByHouse: (houseId: string) => Batch[]
}

const BatchContext = createContext<BatchContextType | undefined>(undefined)

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedBatches = localStorage.getItem("poultry_batches")
        if (storedBatches) {
          const parsedBatches = JSON.parse(storedBatches).map((batch: any) => {
            if (!batch.name && batch.batchNumber) {
              return { ...batch, name: batch.batchNumber }
            }
            return batch
          })
          if (Array.isArray(parsedBatches)) setBatches(parsedBatches)
        }
      } catch (error) {
        console.error("Error loading batches from localStorage:", error)
      }
    }
  }, [])

  const addBatch = (batch: Omit<Batch, "id" | "createdAt">) => {
    setBatches((prevBatches) => {
      const newBatch: Batch = {
        ...batch,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        workerIds: [], // Initialize workerIds as an empty array
      }
      const updatedBatches = [...prevBatches, newBatch]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_batches", JSON.stringify(updatedBatches))
      }
      return updatedBatches
    })
  }

  const updateBatch = (id: string, batch: Partial<Batch>) => {
    setBatches((prevBatches) => {
      const updatedBatches = prevBatches.map((b) => (b.id === id ? { ...b, ...batch } : b))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_batches", JSON.stringify(updatedBatches))
      }
      return updatedBatches
    })
  }

  const deleteBatch = (id: string) => {
    setBatches((prevBatches) => {
      const updatedBatches = prevBatches.filter((b) => b.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_batches", JSON.stringify(updatedBatches))
      }
      return updatedBatches
    })
  }

  const getActiveBatchByHouse = (houseId: string) => {
    return batches.find((b) => b.houseId === houseId && b.status === "active")
  }

  const getBatchesByHouse = (houseId: string) => {
    return batches.filter((b) => b.houseId === houseId).sort((a, b) => b.placementDate.localeCompare(a.placementDate))
  }

  return (
    <BatchContext.Provider
      value={{
        batches,
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
  const context = useContext(BatchContext)
  if (context === undefined) {
    throw new Error("useBatch must be used within a BatchProvider")
  }
  return context
}

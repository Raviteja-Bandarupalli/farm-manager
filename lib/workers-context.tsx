"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"

export interface Worker {
  id: string
  name: string
  phone?: string
  location?: string
  active: boolean
  createdAt: string
}

interface WorkersContextType {
  workers: Worker[]
  loading: boolean
  refetch: () => Promise<void>
  addWorker: (worker: Omit<Worker, "id" | "createdAt">) => Promise<void>
  updateWorker: (id: string, worker: Partial<Worker>) => Promise<void>
  deleteWorker: (id: string) => Promise<void>
  getActiveWorkers: () => Worker[]
  getWorkersByIds: (ids: string[]) => Worker[]
  getWorkerById: (id: string) => Worker | undefined
}

const WorkersContext = createContext<WorkersContextType | undefined>(undefined)

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("workers").select("*")
      if (error) throw error
      setWorkers((data as Worker[]) || [])
    } catch (e) {
      logFetchError("workers", e)
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  const addWorker = async (worker: Omit<Worker, "id" | "createdAt">) => {
    const row = { id: Date.now().toString(), ...worker, createdAt: new Date().toISOString() }
    const { error } = await supabase.from("workers").insert(row)
    if (error) throw error
    await fetchWorkers()
  }

  const updateWorker = async (id: string, worker: Partial<Worker>) => {
    const { error } = await supabase.from("workers").update(worker).eq("id", id)
    if (error) throw error
    await fetchWorkers()
  }

  const deleteWorker = async (id: string) => {
    const { error } = await supabase.from("workers").update({ active: false }).eq("id", id)
    if (error) throw error
    await fetchWorkers()
  }

  const getActiveWorkers = () => workers.filter((w) => w.active)
  const getWorkersByIds = (ids: string[]) => workers.filter((w) => ids.includes(w.id))
  const getWorkerById = (id: string) => workers.find((w) => w.id === id)

  return (
    <WorkersContext.Provider
      value={{
        workers,
        loading,
        refetch: fetchWorkers,
        addWorker,
        updateWorker,
        deleteWorker,
        getActiveWorkers,
        getWorkersByIds,
        getWorkerById,
      }}
    >
      {children}
    </WorkersContext.Provider>
  )
}

export function useWorkers() {
  const ctx = useContext(WorkersContext)
  if (ctx === undefined) throw new Error("useWorkers must be used within a WorkersProvider")
  return ctx
}

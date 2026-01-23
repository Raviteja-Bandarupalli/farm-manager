"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

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
  addWorker: (worker: Omit<Worker, "id" | "createdAt">) => void
  updateWorker: (id: string, worker: Partial<Worker>) => void
  deleteWorker: (id: string) => void
  getActiveWorkers: () => Worker[]
  getWorkersByIds: (ids: string[]) => Worker[]
  getWorkerById: (id: string) => Worker | undefined
}

const WorkersContext = createContext<WorkersContextType | undefined>(undefined)

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedWorkers = localStorage.getItem("poultry_workers")
        if (storedWorkers) {
          const parsed = JSON.parse(storedWorkers)
          if (Array.isArray(parsed)) setWorkers(parsed)
        }
      } catch (error) {
        console.error("Error loading workers from localStorage:", error)
      }
    }
  }, [])

  const addWorker = (worker: Omit<Worker, "id" | "createdAt">) => {
    setWorkers((prevWorkers) => {
      const newWorker: Worker = {
        ...worker,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      const updatedWorkers = [...prevWorkers, newWorker]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_workers", JSON.stringify(updatedWorkers))
      }
      return updatedWorkers
    })
  }

  const updateWorker = (id: string, worker: Partial<Worker>) => {
    setWorkers((prevWorkers) => {
      const updatedWorkers = prevWorkers.map((w) => (w.id === id ? { ...w, ...worker } : w))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_workers", JSON.stringify(updatedWorkers))
      }
      return updatedWorkers
    })
  }

  const deleteWorker = (id: string) => {
    setWorkers((prevWorkers) => {
      const updatedWorkers = prevWorkers.map((w) => (w.id === id ? { ...w, active: false } : w))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_workers", JSON.stringify(updatedWorkers))
      }
      return updatedWorkers
    })
  }

  const getActiveWorkers = () => {
    return workers.filter((w) => w.active)
  }

  const getWorkersByIds = (ids: string[]) => {
    return workers.filter((w) => ids.includes(w.id))
  }

  const getWorkerById = (id: string) => {
    return workers.find((w) => w.id === id)
  }

  return (
    <WorkersContext.Provider
      value={{
        workers,
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
  const context = useContext(WorkersContext)
  if (context === undefined) {
    throw new Error("useWorkers must be used within a WorkersProvider")
  }
  return context
}

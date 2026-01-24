"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"

export interface BatchSection {
  id: string
  batchId: string
  name: string
  workerId?: string
  initialBirds: number
  createdAt: string
}

interface BatchSectionsContextType {
  sections: BatchSection[]
  loading: boolean
  refetch: () => Promise<void>
  getSectionsByBatch: (batchId: string) => BatchSection[]
  addSection: (section: Omit<BatchSection, "id" | "createdAt">) => Promise<BatchSection>
  updateSection: (id: string, section: Partial<BatchSection>) => Promise<void>
  deleteSection: (id: string) => Promise<void>
  deleteSectionsByBatch: (batchId: string) => Promise<void>
}

const BatchSectionsContext = createContext<BatchSectionsContextType | undefined>(undefined)

export function BatchSectionsProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<BatchSection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("batch_sections").select("*")
      if (error) throw error
      setSections((data as BatchSection[]) || [])
    } catch (e) {
      logFetchError("batch_sections", e)
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  const getSectionsByBatch = (batchId: string) => sections.filter((s) => s.batchId === batchId)

  const addSection = async (section: Omit<BatchSection, "id" | "createdAt">): Promise<BatchSection> => {
    const row = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
      ...section,
      createdAt: new Date().toISOString(),
    }
    const { data, error } = await supabase.from("batch_sections").insert(row).select().single()
    if (error) throw error
    await fetchSections()
    return data as BatchSection
  }

  const updateSection = async (id: string, section: Partial<BatchSection>) => {
    const { error } = await supabase.from("batch_sections").update(section).eq("id", id)
    if (error) throw error
    await fetchSections()
  }

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("batch_sections").delete().eq("id", id)
    if (error) throw error
    await fetchSections()
  }

  const deleteSectionsByBatch = async (batchId: string) => {
    const { error } = await supabase.from("batch_sections").delete().eq("batchId", batchId)
    if (error) throw error
    await fetchSections()
  }

  return (
    <BatchSectionsContext.Provider
      value={{
        sections,
        loading,
        refetch: fetchSections,
        getSectionsByBatch,
        addSection,
        updateSection,
        deleteSection,
        deleteSectionsByBatch,
      }}
    >
      {children}
    </BatchSectionsContext.Provider>
  )
}

export function useBatchSections() {
  const ctx = useContext(BatchSectionsContext)
  if (ctx === undefined) throw new Error("useBatchSections must be used within a BatchSectionsProvider")
  return ctx
}

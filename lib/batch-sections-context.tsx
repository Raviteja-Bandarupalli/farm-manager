"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface BatchSection {
  id: string
  batchId: string
  name: string // e.g. "Durga side", "Surayya side"
  workerId?: string // link to Worker (optional for now)
  initialBirds: number
  createdAt: string
}

interface BatchSectionsContextType {
  sections: BatchSection[]
  getSectionsByBatch: (batchId: string) => BatchSection[]
  addSection: (section: Omit<BatchSection, "id" | "createdAt">) => BatchSection
  updateSection: (id: string, section: Partial<BatchSection>) => void
  deleteSection: (id: string) => void
  deleteSectionsByBatch: (batchId: string) => void
}

const BatchSectionsContext = createContext<BatchSectionsContextType | undefined>(undefined)

export function BatchSectionsProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<BatchSection[]>([])

  useEffect(() => {
    const storedSections = localStorage.getItem("poultry_batch_sections")
    console.log("[v0] BatchSectionsProvider - Loading sections from localStorage")
    console.log("[v0] Raw localStorage value:", storedSections)
    if (storedSections) {
      const parsed = JSON.parse(storedSections)
      console.log("[v0] Parsed sections:", parsed)
      console.log("[v0] Number of sections loaded:", parsed.length)
      setSections(parsed)
    } else {
      console.log("[v0] No sections found in localStorage")
    }
  }, [])

  const getSectionsByBatch = (batchId: string) => {
    const filtered = sections.filter((s) => s.batchId === batchId)
    console.log(`[v0] getSectionsByBatch(${batchId}):`, filtered)
    return filtered
  }

  const addSection = (section: Omit<BatchSection, "id" | "createdAt">) => {
    const newSection: BatchSection = {
      ...section,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    }
    // Read current sections from localStorage to ensure we have the latest state
    const currentSections = JSON.parse(localStorage.getItem("poultry_batch_sections") || "[]")
    const updatedSections = [...currentSections, newSection]
    console.log("[v0] Adding section:", newSection)
    console.log("[v0] Current sections count:", currentSections.length)
    console.log("[v0] Total sections after add:", updatedSections.length)
    setSections(updatedSections)
    localStorage.setItem("poultry_batch_sections", JSON.stringify(updatedSections))
    return newSection
  }

  const updateSection = (id: string, section: Partial<BatchSection>) => {
    const updatedSections = sections.map((s) => (s.id === id ? { ...s, ...section } : s))
    setSections(updatedSections)
    localStorage.setItem("poultry_batch_sections", JSON.stringify(updatedSections))
  }

  const deleteSection = (id: string) => {
    const updatedSections = sections.filter((s) => s.id !== id)
    setSections(updatedSections)
    localStorage.setItem("poultry_batch_sections", JSON.stringify(updatedSections))
  }

  const deleteSectionsByBatch = (batchId: string) => {
    // Read current sections from localStorage to ensure we have the latest state
    const currentSections = JSON.parse(localStorage.getItem("poultry_batch_sections") || "[]")
    const updatedSections = currentSections.filter((s: BatchSection) => s.batchId !== batchId)
    console.log(`[v0] Deleting sections for batch ${batchId}`)
    console.log(`[v0] Sections before delete:`, currentSections.length)
    console.log(`[v0] Sections after delete:`, updatedSections.length)
    setSections(updatedSections)
    localStorage.setItem("poultry_batch_sections", JSON.stringify(updatedSections))
  }

  return (
    <BatchSectionsContext.Provider
      value={{
        sections,
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
  const context = useContext(BatchSectionsContext)
  if (context === undefined) {
    throw new Error("useBatchSections must be used within a BatchSectionsProvider")
  }
  return context
}

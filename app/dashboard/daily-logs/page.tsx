"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { useBatch } from "@/lib/batch-context"
import { useAuth } from "@/lib/auth-context"
import { useWorkers } from "@/lib/workers-context"
import { useBatchSections } from "@/lib/batch-sections-context"
import { useWeeklyFeed } from "@/lib/weekly-feed-context"
import { useDailyLogs, type DailyLog } from "@/lib/daily-logs-context"
import { formatIndianDate, toDateKey } from "@/lib/utils"
import { getTodayDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Filter, TrendingUp, Edit, Calendar, FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { filterVisibleFarms, filterVisibleHouses } from "@/lib/permissions"

interface MortalityBySection {
  [sectionId: string]: number
}

export default function DailyLogsPage() {
  const { houses: allHouses, farms: allFarms, feedTypes } = useMasterData()
  const { batches, getActiveBatchByHouse } = useBatch()
  const { user } = useAuth()
  const { getWorkersByIds, getWorkerById } = useWorkers()
  const { getSectionsByBatch, sections } = useBatchSections()
  const { weeklyFeeds, addWeeklyFeed, deleteWeeklyFeed, getFeedsByBatch } = useWeeklyFeed()
  const { dailyLogs, loading, addDailyLog, updateDailyLog, deleteDailyLog, getLastLogForBatch } = useDailyLogs()
  
  // Check for fetch errors on mount
  useEffect(() => {
    if (!loading && dailyLogs.length === 0) {
      // Check browser console for fetch errors
      console.warn("[DailyLogs] No logs loaded. Check browser console for Supabase errors.")
      console.warn("[DailyLogs] Verify:")
      console.warn("  1. Supabase env vars are set in Vercel")
      console.warn("  2. daily_logs table exists in Supabase")
      console.warn("  3. RLS is disabled: ALTER TABLE daily_logs DISABLE ROW LEVEL SECURITY;")
    }
  }, [loading, dailyLogs.length])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isWeeklyFeedDialogOpen, setIsWeeklyFeedDialogOpen] = useState(false)
  const [filterHouse, setFilterHouse] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [lastSavedLog, setLastSavedLog] = useState<any>(null)
  const [editingLog, setEditingLog] = useState<string | null>(null)
  const [editBatchId, setEditBatchId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    houseId: "",
    date: getTodayDate(),
    mortality: "",
    feedTypeId: "",
    temperature: "",
    humidity: "",
    remarks: "",
  })

  const [weeklyFeedForm, setWeeklyFeedForm] = useState({
    houseId: "",
    weekStart: "",
    weekEnd: "",
    totalFeedKg: "",
    averageWeightKg: "", // Added average weight to weekly feed form
  })

  const [mortalityBySection, setMortalityBySection] = useState<Record<string, number>>({})

  const [errors, setErrors] = useState<Record<string, string>>({})

  const farms = filterVisibleFarms(user, allFarms)
  const houses = filterVisibleHouses(user, allHouses, allFarms)
  const activeHouses = houses.filter((house) => !!getActiveBatchByHouse(house.id))

  const selectedBatch =
    editingLog && editBatchId
      ? batches.find((b) => b.id === editBatchId) || null
      : formData.houseId
        ? getActiveBatchByHouse(formData.houseId)
        : null

  const batchSections = selectedBatch ? getSectionsByBatch(selectedBatch.id) : []

  const selectedBatchId = selectedBatch?.id

  useEffect(() => {
    if (selectedBatchId) {
      console.log("[DailyLogs] Selected batch ID:", selectedBatchId)
      const sections = getSectionsByBatch(selectedBatchId)
      console.log("[DailyLogs] Retrieved sections for batch:", sections)
      console.log("[DailyLogs] Number of sections:", sections.length)
      sections.forEach((section, idx) => {
        console.log(`[DailyLogs] Section ${idx + 1}:`, {
          id: section.id,
          name: section.name,
          workerId: section.workerId,
          initialBirds: section.initialBirds,
          batchId: section.batchId,
        })
      })
    }
  }, [selectedBatchId, getSectionsByBatch])

  useEffect(() => {
    if (editingLog) return // do not reset when editing

    if (!selectedBatchId) {
      setMortalityBySection({})
      return
    }

    const sections = getSectionsByBatch(selectedBatchId)
    if (sections.length > 0) {
      const initialMortality: Record<string, number> = {}
      sections.forEach((section) => {
        initialMortality[section.id] = 0
      })
      setMortalityBySection(initialMortality)
    } else {
      setMortalityBySection({})
    }
  }, [selectedBatchId, getSectionsByBatch, editingLog]) // Added editingLog as dependency

  const yesterdayLog = selectedBatch ? getLastLogForBatch(selectedBatch.id, formData.date) : null
  const openingBirds = yesterdayLog ? yesterdayLog.closingBirds : selectedBatch?.initialBirds || 0
  const batchWorkers = selectedBatch?.workerIds ? getWorkersByIds(selectedBatch.workerIds) : []

  const totalMortality = Object.values(mortalityBySection).reduce((sum, value) => sum + (value || 0), 0)
  
  // Use section mortality if sections exist, otherwise use formData.mortality
  const finalMortality = batchSections.length > 0 
    ? totalMortality 
    : Number.parseInt(formData.mortality || "0", 10) || 0

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (finalMortality < 0) newErrors.mortality = "Cannot be negative"

    if (finalMortality > openingBirds) {
      newErrors.mortality = "Total mortality cannot exceed opening birds"
    }
    
    if (batchSections.length === 0 && !formData.mortality) {
      newErrors.mortality = "Mortality is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedBatch = formData.houseId ? getActiveBatchByHouse(formData.houseId) : null
    if (!selectedBatch) {
      alert("Please select a house with an active batch.")
      return
    }
    if (!validateForm()) return
    const hasSections = batchSections.length > 0
    const sectionMortalityData = hasSections ? mortalityBySection : undefined
    try {
      if (editingLog) {
        await updateDailyLog(editingLog, {
          houseId: formData.houseId,
          date: formData.date,
          mortality: finalMortality,
          sectionMortality: sectionMortalityData,
          feedTypeId: formData.feedTypeId,
          temperature: formData.temperature ? Number.parseFloat(formData.temperature) : undefined,
          humidity: formData.humidity ? Number.parseFloat(formData.humidity) : undefined,
          remarks: formData.remarks,
        })
        setEditingLog(null)
      } else {
        const saved = await addDailyLog({
          batchId: selectedBatch.id,
          houseId: formData.houseId,
          date: formData.date,
          mortality: finalMortality,
          sectionMortality: sectionMortalityData,
          feedTypeId: formData.feedTypeId,
          temperature: formData.temperature ? Number.parseFloat(formData.temperature) : undefined,
          humidity: formData.humidity ? Number.parseFloat(formData.humidity) : undefined,
          remarks: formData.remarks,
        })
        setLastSavedLog({ ...saved, batch: selectedBatch })
      }
      setFormData({
        houseId: "",
        date: getTodayDate(),
        mortality: "",
        feedTypeId: "",
        temperature: "",
        humidity: "",
        remarks: "",
      })
      setMortalityBySection({})
      setIsDialogOpen(false)
    } catch (err) {
      console.error("Error saving daily log:", err)
      alert(err instanceof Error ? err.message : "Failed to save daily log")
    }
  }

  const handleWeeklyFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedBatch = weeklyFeedForm.houseId ? getActiveBatchByHouse(weeklyFeedForm.houseId) : null
    if (!selectedBatch) {
      alert("No active batch found for this house.")
      return
    }
    const totalFeedKg = Number.parseFloat(weeklyFeedForm.totalFeedKg)
    const averageWeightKg = Number.parseFloat(weeklyFeedForm.averageWeightKg)
    if (totalFeedKg <= 0) {
      alert("Feed amount must be greater than 0")
      return
    }
    if (averageWeightKg <= 0) {
      alert("Average weight must be greater than 0")
      return
    }
    try {
      await addWeeklyFeed({
        batchId: selectedBatch.id,
        houseId: weeklyFeedForm.houseId,
        weekStart: weeklyFeedForm.weekStart,
        weekEnd: weeklyFeedForm.weekEnd,
        totalFeedKg,
        averageWeightKg,
      })
      setWeeklyFeedForm({
        houseId: "",
        weekStart: "",
        weekEnd: "",
        totalFeedKg: "",
        averageWeightKg: "",
      })
      setIsWeeklyFeedDialogOpen(false)
    } catch (err) {
      console.error("Error adding weekly feed:", err)
      alert(err instanceof Error ? err.message : "Failed to add weekly feed.")
    }
  }

  const handleEdit = (log: DailyLog) => {
    console.log("[v0] Edit clicked for log:", log)
    console.log("[v0] Log sectionMortality:", log.sectionMortality)

    const batch = batches.find((b) => b.id === log.batchId)
    setEditBatchId(log.batchId)
    setEditingLog(log.id)
    setFormData({
      houseId: log.houseId,
      date: log.date,
      mortality: log.mortality.toString(),
      feedTypeId: log.feedTypeId || "",
      temperature: log.temperature?.toString() || "",
      humidity: log.humidity?.toString() || "",
      remarks: log.remarks || "",
    })

    const sections = getSectionsByBatch(log.batchId)
    console.log("[v0] Batch sections:", sections)

    if (log.sectionMortality && Object.keys(log.sectionMortality).length > 0) {
      // Use stored section mortality values (exact values user entered)
      console.log("[v0] Using stored sectionMortality:", log.sectionMortality)
      setMortalityBySection(log.sectionMortality)
    } else if (sections.length > 0) {
      // Fallback: distribute total mortality proportionally for old logs
      console.log("[v0] No sectionMortality found, distributing proportionally")
      const totalBirds = sections.reduce((sum, s) => sum + s.initialBirds, 0)
      const distributed: Record<string, number> = {}
      sections.forEach((section) => {
        const proportion = section.initialBirds / totalBirds
        distributed[section.id] = Math.round(log.mortality * proportion)
      })
      console.log("[v0] Distributed mortality:", distributed)
      setMortalityBySection(distributed)
    } else {
      console.log("[v0] No sections for this batch")
      setMortalityBySection({})
    }

    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return
    try {
      await deleteDailyLog(id)
    } catch (err) {
      console.error("Error deleting daily log:", err)
      alert("Failed to delete daily log.")
    }
  }

  const getHouseName = (houseId: string) => {
    return allHouses.find((h) => h.id === houseId)?.name || "Unknown House"
  }

  const getFarmName = (houseId: string) => {
    const house = allHouses.find((h) => h.id === houseId)
    if (!house) return "Unknown Farm"
    return allFarms.find((f) => f.id === house.farmId)?.name || "Unknown Farm"
  }

  const getFeedTypeName = (feedTypeId: string) => {
    return feedTypes.find((f) => f.id === feedTypeId)?.name || "Unknown Feed"
  }

  const filteredLogs = filterHouse === "all" ? dailyLogs : dailyLogs.filter((log) => log.houseId === filterHouse)
  const accessibleLogs = filteredLogs.filter((log) => {
    // Apply date range filter
    const logTime = toDateKey(log.date)
    if (startDate && logTime < toDateKey(startDate)) return false
    if (endDate && logTime > toDateKey(endDate)) return false

    // If houseId is missing, show it (as "Unknown House")
    if (!log.houseId) return true
    const house = allHouses.find((h) => h.id === log.houseId)
    // If house not found in master data, show it
    if (!house) return true
    // If it's an owner, they see everything
    if (user?.role === "owner") return true
    // Otherwise check farm access
    return farms.some((f) => f.id === house.farmId)
  })
  const sortedLogs = [...accessibleLogs].sort((a, b) => toDateKey(b.date) - toDateKey(a.date))

  // Calculate summary metrics for the current view
  const summaryMetrics = {
    totalMortality: sortedLogs.reduce((sum, log) => sum + log.mortality, 0),
    latestClosingBirds: sortedLogs.length > 0 ? sortedLogs[0].closingBirds : 0,
    latestCumMortalityPercent: sortedLogs.length > 0 ? sortedLogs[0].cumulativeMortalityPercent : 0,
    daysLogged: sortedLogs.length,
    avgMortalityPerDay: sortedLogs.length > 0
      ? sortedLogs.reduce((sum, log) => sum + log.mortality, 0) / sortedLogs.length
      : 0
  }

  const downloadPDF = () => {
    if (sortedLogs.length === 0) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header: B.N.Rao Poultry Farms
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("B.N.Rao Poultry Farms", pageWidth / 2, 20, { align: "center" })

    // Sub-header
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text("Daily Production & Mortality Report", pageWidth / 2, 28, { align: "center" })

    // Top-right Date Range
    const dateRangeText = startDate && endDate
      ? `Date: ${formatIndianDate(startDate)} to ${formatIndianDate(endDate)}`
      : `Date: ${formatIndianDate(getTodayDate())}`
    doc.setFontSize(10)
    doc.text(dateRangeText, pageWidth - 15, 10, { align: "right" })

    // Summary Section (Executive Summary Box)
    const summaryY = 35
    const summaryHeight = 35
    doc.setFillColor(245, 245, 245) // Light grey
    doc.rect(15, summaryY, pageWidth - 30, summaryHeight, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("EXECUTIVE SUMMARY", 20, summaryY + 8)

    doc.setFontSize(10)
    // Left Column
    doc.setFont("helvetica", "bold")
    doc.text("Total Mortality:", 20, summaryY + 18)
    doc.setFont("helvetica", "normal")
    doc.text(`${summaryMetrics.totalMortality}`, 65, summaryY + 18)

    doc.setFont("helvetica", "bold")
    doc.text("Cum. Mort %:", 20, summaryY + 28)
    if (summaryMetrics.latestCumMortalityPercent > 5) {
      doc.setTextColor(255, 0, 0)
    }
    doc.setFont("helvetica", "normal")
    doc.text(`${summaryMetrics.latestCumMortalityPercent.toFixed(2)}%`, 65, summaryY + 28)
    doc.setTextColor(0, 0, 0) // Reset

    // Right Column
    const rightColX = pageWidth / 2 + 5
    const rightValueX = rightColX + 45

    doc.setFont("helvetica", "bold")
    doc.text("Closing Birds:", rightColX, summaryY + 18)
    doc.setFont("helvetica", "normal")
    doc.text(`${summaryMetrics.latestClosingBirds.toLocaleString("en-IN")}`, rightValueX, summaryY + 18)

    doc.setFont("helvetica", "bold")
    doc.text("Avg. Mort/Day:", rightColX, summaryY + 28)
    doc.setFont("helvetica", "normal")
    doc.text(`${summaryMetrics.avgMortalityPerDay.toFixed(1)}`, rightValueX, summaryY + 28)

    // Data Table
    const tableHeaders = [["Date", "Farm/House", "Mortality", "Cum. Mort %", "Feed Type", "Closing"]]
    const tableRows = sortedLogs.map(log => [
      formatIndianDate(log.date),
      `${getFarmName(log.houseId)} / ${getHouseName(log.houseId)}`,
      log.mortality,
      `${log.cumulativeMortalityPercent.toFixed(2)}%`,
      getFeedTypeName(log.feedTypeId),
      log.closingBirds.toLocaleString("en-IN")
    ])

    autoTable(doc, {
      startY: summaryY + summaryHeight + 10,
      head: tableHeaders,
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      }
    })

    const reportDate = new Date().toISOString().split("T")[0]
    doc.save(`BNRao_Farms_Report_${reportDate}.pdf`)
  }

  const startAddNewLog = () => {
    setEditingLog(null)
    setEditBatchId(null)
    setFormData({
      houseId: "",
      date: getTodayDate(),
      mortality: "",
      feedTypeId: "",
      temperature: "",
      humidity: "",
      remarks: "",
    })
    setMortalityBySection({})
    setLastSavedLog(null)
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Daily Logs</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Track daily metrics for your flocks</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPDF} variant="outline" size="sm" className="h-8 text-xs font-bold" disabled={sortedLogs.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>
          {user && user.role === "owner" && (
            <Dialog open={isWeeklyFeedDialogOpen} onOpenChange={setIsWeeklyFeedDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Weekly Feed
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Weekly Feed Entry</DialogTitle>
                  <DialogDescription>Enter the total feed used for a week</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleWeeklyFeedSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">House *</label>
                    <Select
                      value={weeklyFeedForm.houseId}
                      onValueChange={(value) => setWeeklyFeedForm({ ...weeklyFeedForm, houseId: value })}
                      required
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select a house" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeHouses.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No houses with active batches
                          </SelectItem>
                        ) : (
                          activeHouses.map((house) => (
                            <SelectItem key={house.id} value={house.id}>
                              {house.name} - {getFarmName(house.id)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Week Start Date *</label>
                      <Input
                        type="date"
                        className="h-12"
                        value={weeklyFeedForm.weekStart}
                        onChange={(e) => setWeeklyFeedForm({ ...weeklyFeedForm, weekStart: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Week End Date *</label>
                      <Input
                        type="date"
                        className="h-12"
                        value={weeklyFeedForm.weekEnd}
                        onChange={(e) => setWeeklyFeedForm({ ...weeklyFeedForm, weekEnd: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Feed Used This Week (kg) *</label>
                    <Input
                      type="number"
                      className="h-12"
                      step="0.1"
                      min="0"
                      value={weeklyFeedForm.totalFeedKg}
                      onChange={(e) => setWeeklyFeedForm({ ...weeklyFeedForm, totalFeedKg: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Total feed consumed in kg"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the total feed consumed by all birds during this week
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Average Body Weight This Week (kg) *</label>
                    <Input
                      type="number"
                      className="h-12"
                      step="0.01"
                      min="0"
                      value={weeklyFeedForm.averageWeightKg}
                      onChange={(e) => setWeeklyFeedForm({ ...weeklyFeedForm, averageWeightKg: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Average weight in kg"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Weigh 50-100 sample birds and enter the average</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsWeeklyFeedDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Weekly Feed</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {user && (user.role === "owner" || user.role === "manager") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={startAddNewLog} size="sm" className="h-8 text-xs font-bold">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Daily Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Debug info - can be removed later */}
                {selectedBatch && batchSections.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Debug: Found {batchSections.length} section(s) for batch {selectedBatch.id}
                  </div>
                )}
                <DialogHeader>
                  <DialogTitle>{editingLog ? "Edit Daily Log" : "Add New Daily Log"}</DialogTitle>
                  <DialogDescription>Enter the daily metrics for the selected house and batch</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">House *</label>
                    <Select
                      value={formData.houseId}
                      onValueChange={(value) => {
                        setFormData({ ...formData, houseId: value })
                        if (!editingLog) {
                          const batch = getActiveBatchByHouse(value)
                          if (batch) setMortalityBySection({})
                        }
                      }}
                      required
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select a house" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeHouses.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No houses with active batches
                          </SelectItem>
                        ) : (
                          activeHouses.map((house) => (
                            <SelectItem key={house.id} value={house.id}>
                              {house.name} - {getFarmName(house.id)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date *</label>
                    <Input
                      type="date"
                      className="h-12"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Selected: {formatIndianDate(formData.date)}</p>
                  </div>

                  {selectedBatch && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <p className="font-semibold text-blue-900">
                          Logging for: {houses.find((h) => h.id === selectedBatch.houseId)?.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          Opening Birds: {openingBirds.toLocaleString("en-IN")} | Target FCR: {selectedBatch.targetFCR}{" "}
                          | Mortality Threshold: {selectedBatch.mortalityThreshold}%
                        </p>
                        {batchWorkers.length > 0 && (
                          <p className="text-sm text-blue-700 mt-1">
                            Workers: {batchWorkers.map((w) => w.name).join(", ")}
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {batchSections.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Mortality by Worker Section ({batchSections.length} section{batchSections.length !== 1 ? "s" : ""})</CardTitle>
                        <CardDescription>Enter mortality for each worker's section</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {batchSections.length === 0 && (
                          <p className="text-sm text-muted-foreground">No sections found for this batch.</p>
                        )}
                        {batchSections.map((section, index) => {
                          const worker = getWorkerById(section.workerId)
                          const mortalityValue =
                            mortalityBySection[section.id] !== undefined && mortalityBySection[section.id] !== null
                              ? String(mortalityBySection[section.id])
                              : ""

                          return (
                            <div key={section.id} className="space-y-2">
                              <label className="text-sm font-medium">
                                Section {index + 1} - {section.initialBirds.toLocaleString("en-IN")} birds
                              </label>
                              {worker && <p className="text-xs text-muted-foreground">Worker: {worker.name}</p>}
                              <Input
                                type="number"
                                className="h-12"
                                min="0"
                                step="1"
                                value={mortalityValue}
                                onChange={(e) => {
                                  const val = e.target.value
                                  const numVal = val === "" ? 0 : Number.parseInt(val, 10)
                                  console.log(`[v0] Section ${section.id} mortality changed to:`, numVal)
                                  setMortalityBySection((prev) => {
                                    const updated = { ...prev, [section.id]: numVal }
                                    console.log("[v0] Updated mortalityBySection state:", updated)
                                    return updated
                                  })
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="Enter mortality count"
                                required
                              />
                            </div>
                          )
                        })}

                        <div className="pt-4 border-t">
                          <label className="text-sm font-medium">Total Mortality (all sections)</label>
                          <Input
                            type="number"
                            className="h-12 mt-2 bg-muted"
                            value={totalMortality}
                            readOnly
                            disabled
                          />
                          {errors.mortality && <p className="text-sm text-red-600 mt-1">{errors.mortality}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Show single mortality input when no sections OR when batch not found */}
                  {batchSections.length === 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mortality (birds) *</label>
                      <Input
                        type="number"
                        className="h-12"
                        value={formData.mortality}
                        onChange={(e) => {
                          const val = e.target.value
                          console.log("[DailyLogs] Mortality input changed:", val)
                          setFormData({ ...formData, mortality: val })
                          setErrors({ ...errors, mortality: "" })
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        required
                        min="0"
                        step="1"
                        placeholder="Enter number of dead birds"
                      />
                      <p className="text-xs text-muted-foreground">
                        Count all dead birds in the shed since yesterday morning.
                      </p>
                      {!selectedBatch && formData.houseId && (
                        <p className="text-xs text-yellow-600">
                          ⚠️ No active batch found for this house. Please select a house with an active batch.
                        </p>
                      )}
                      {errors.mortality && <p className="text-sm text-red-600">{errors.mortality}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Feed Type *</label>
                    <Select
                      value={formData.feedTypeId}
                      onValueChange={(value) => setFormData({ ...formData, feedTypeId: value })}
                      required
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select feed type" />
                      </SelectTrigger>
                      <SelectContent>
                        {feedTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Used for record keeping only</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Temperature (°C)</label>
                      <Input
                        type="number"
                        className="h-12"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Humidity (%)</label>
                      <Input
                        type="number"
                        className="h-12"
                        step="1"
                        value={formData.humidity}
                        onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks</label>
                    <Textarea
                      className="min-h-[80px]"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Any observations, medication given, issues, etc."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingLog ? "Update Log" : "Save Log"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Total Mortality</p>
          <p className="text-lg font-black text-red-600 leading-tight tracking-tight">
            {summaryMetrics.totalMortality.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Closing Birds</p>
          <p className="text-lg font-black text-slate-900 leading-tight tracking-tight">
            {summaryMetrics.latestClosingBirds.toLocaleString("en-IN")}
          </p>
        </div>

        <div className={`bg-white p-2.5 rounded-lg border shadow-sm ${summaryMetrics.latestCumMortalityPercent > 5 ? 'border-red-500 bg-red-50/30' : 'border-slate-200/60'}`}>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Cum. Mort. %</p>
          <p className={`text-lg font-black leading-tight tracking-tight ${summaryMetrics.latestCumMortalityPercent > 5 ? 'text-red-600' : 'text-orange-600'}`}>
            {summaryMetrics.latestCumMortalityPercent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Days Logged</p>
          <p className="text-lg font-black text-slate-900 leading-tight tracking-tight">
            {summaryMetrics.daysLogged}
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Avg. Mort/Day</p>
          <p className="text-lg font-black text-slate-900 leading-tight tracking-tight">
            {summaryMetrics.avgMortalityPerDay.toFixed(1)}
          </p>
        </div>
      </div>

      {weeklyFeeds.length > 0 && (
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Weekly Feed Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-8 bg-slate-50/50">
                    <TableHead className="text-[10px] h-8">House</TableHead>
                    <TableHead className="text-[10px] h-8">Week Start</TableHead>
                    <TableHead className="text-[10px] h-8">Week End</TableHead>
                    <TableHead className="text-[10px] h-8 text-right">Total Feed (kg)</TableHead>
                    <TableHead className="text-[10px] h-8 text-right">Avg Weight (kg)</TableHead>
                    {user?.role === "owner" && <TableHead className="text-center text-[10px] h-8">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyFeeds
                    .filter((feed) => {
                      const house = allHouses.find((h) => h.id === feed.houseId)
                      if (!house) return false
                      return farms.some((f) => f.id === house.farmId)
                    })
                    .sort((a, b) => b.weekEnd.localeCompare(a.weekEnd))
                    .map((feed) => (
                      <TableRow key={feed.id} className="h-9">
                        <TableCell className="text-[11px] py-1">{getHouseName(feed.houseId)}</TableCell>
                        <TableCell className="text-[11px] py-1">{formatIndianDate(feed.weekStart)}</TableCell>
                        <TableCell className="text-[11px] py-1">{formatIndianDate(feed.weekEnd)}</TableCell>
                        <TableCell className="text-[11px] py-1 font-semibold text-right">{(feed.totalFeedKg || 0).toFixed(1)} kg</TableCell>
                        <TableCell className="text-[11px] py-1 font-semibold text-right">{(feed.averageWeightKg || 0).toFixed(2)} kg</TableCell>
                        {user?.role === "owner" && (
                          <TableCell className="text-center py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                if (confirm("Delete this weekly feed entry?")) {
                                  deleteWeeklyFeed(feed.id)
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="py-1.5 px-3 flex flex-row items-center justify-between space-y-0 border-b bg-slate-50/80">
          <div className="flex flex-col">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Daily Logs History</CardTitle>
            <CardDescription className="text-[9px] font-medium text-slate-400 hidden sm:block">View recorded daily metrics</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-slate-400" />
            <div className="flex items-center gap-1 bg-white border rounded-md px-1.5 h-7">
              <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
              <input
                type="date"
                className="text-[10px] border-none focus:ring-0 p-0 w-24 bg-transparent outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">To:</span>
              <input
                type="date"
                className="text-[10px] border-none focus:ring-0 p-0 w-24 bg-transparent outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-[9px] font-bold text-red-500 uppercase ml-1 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <Select value={filterHouse} onValueChange={setFilterHouse}>
              <SelectTrigger className="h-7 w-[110px] text-[11px] font-medium bg-white">
                <SelectValue placeholder="All Houses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Houses</SelectItem>
                {activeHouses.map((house) => (
                  <SelectItem key={house.id} value={house.id} className="text-[10px]">
                    {house.name} - {getFarmName(house.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-slate-50/50 h-9">
                  <TableHead className="w-[15%] font-bold text-slate-700 text-[11px] align-middle uppercase tracking-tighter">Date</TableHead>
                  <TableHead className="w-[20%] font-bold text-slate-700 text-xs text-center align-middle">Farm/House</TableHead>
                  <TableHead className="w-[10%] font-bold text-slate-700 text-xs align-middle">Mortality</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-700 text-xs align-middle">Cum. Mort %</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-700 text-xs align-middle">Feed Type</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-700 text-xs align-middle">Closing</TableHead>
                  <TableHead className="w-[10%] font-bold text-slate-700 text-xs text-center align-middle">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No daily logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50 transition-colors h-11">
                      <TableCell className="whitespace-nowrap align-middle py-0 text-xs">
                        {formatIndianDate(log.date)}
                      </TableCell>
                      <TableCell className="align-middle py-0">
                        <div className="flex flex-col items-center justify-center text-center leading-none">
                          <div className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">
                            {getFarmName(log.houseId)}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {getHouseName(log.houseId)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-0 text-xs font-medium">
                        {log.mortality}
                      </TableCell>
                      <TableCell className="align-middle py-0">
                        <span className={`text-xs font-semibold ${log.cumulativeMortalityPercent > 5 ? 'text-red-600' : 'text-slate-600'}`}>
                          {log.cumulativeMortalityPercent.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="align-middle py-0 text-[11px] text-slate-600 truncate">
                        {getFeedTypeName(log.feedTypeId)}
                      </TableCell>
                      <TableCell className="align-middle py-0 text-xs font-bold text-slate-900">
                        {log.closingBirds.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="align-middle py-0">
                        <div className="flex items-center justify-center gap-1.5">
                          {user?.role === "owner" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEdit(log)}
                                title="Edit Log"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleDelete(log.id)}
                                title="Delete Log"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

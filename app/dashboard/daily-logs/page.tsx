"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { useBatch } from "@/lib/batch-context"
import { useAuth } from "@/lib/auth-context"
import { useWorkers } from "@/lib/workers-context"
import { useBatchSections } from "@/lib/batch-sections-context"
import { useWeeklyFeed } from "@/lib/weekly-feed-context"
import { useDailyLogs, type DailyLog, toDateKey } from "@/lib/daily-logs-context"
import { formatIndianDate } from "@/lib/utils"
import { getTodayDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Filter, TrendingUp, Edit, Calendar } from "lucide-react"
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
    : Number.parseInt(formData.mortality || "0")

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
    const house = allHouses.find((h) => h.id === log.houseId)
    if (!house) return false
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Daily Logs</h1>
          <p className="text-muted-foreground mt-1">Track daily activities and metrics for your broiler flocks</p>
        </div>
        <div className="flex gap-2">
          {user && user.role === "owner" && (
            <Dialog open={isWeeklyFeedDialogOpen} onOpenChange={setIsWeeklyFeedDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Weekly Feed Entry
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
                        {houses.map((house) => {
                          const activeBatch = getActiveBatchByHouse(house.id)
                          return (
                            <SelectItem key={house.id} value={house.id} disabled={!activeBatch}>
                              {house.name} - {getFarmName(house.id)} {!activeBatch && "(No active batch)"}
                            </SelectItem>
                          )
                        })}
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
                <Button onClick={startAddNewLog}>
                  <Plus className="h-4 w-4 mr-2" />
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
                        {houses.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No houses available - Please create houses in Master Data
                          </SelectItem>
                        ) : (
                          houses.map((house) => {
                            const activeBatch = getActiveBatchByHouse(house.id)
                            return (
                              <SelectItem key={house.id} value={house.id} disabled={!activeBatch}>
                                {house.name} - {getFarmName(house.id)} {!activeBatch && "(No active batch)"}
                              </SelectItem>
                            )
                          })
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

      {weeklyFeeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Feed Entries</CardTitle>
            <CardDescription>Feed consumption records by week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>House</TableHead>
                    <TableHead>Week Start</TableHead>
                    <TableHead>Week End</TableHead>
                    <TableHead>Total Feed (kg)</TableHead>
                    <TableHead>Avg Weight (kg)</TableHead>
                    {user?.role === "owner" && <TableHead className="text-center">Actions</TableHead>}
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
                      <TableRow key={feed.id}>
                        <TableCell>{getHouseName(feed.houseId)}</TableCell>
                        <TableCell>{formatIndianDate(feed.weekStart)}</TableCell>
                        <TableCell>{formatIndianDate(feed.weekEnd)}</TableCell>
                        <TableCell className="font-semibold">{(feed.totalFeedKg || 0).toFixed(1)} kg</TableCell>
                        <TableCell className="font-semibold">{(feed.averageWeightKg || 0).toFixed(2)} kg</TableCell>
                        {user?.role === "owner" && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this weekly feed entry?")) {
                                  deleteWeeklyFeed(feed.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by House</label>
            <Select value={filterHouse} onValueChange={setFilterHouse}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Houses</SelectItem>
                {houses.map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    {house.name} - {getFarmName(house.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Logs History</CardTitle>
          <CardDescription>View all recorded daily logs for your batches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-slate-50/50 h-14">
                  <TableHead className="w-[15%] font-bold text-slate-700 align-middle">Date</TableHead>
                  <TableHead className="w-[20%] font-bold text-slate-700 text-center align-middle">Farm/House</TableHead>
                  <TableHead className="w-[10%] font-bold text-slate-700 align-middle">Mortality</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-700 align-middle">Cum. Mort %</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-700 align-middle">Feed Type</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-700 align-middle">Closing</TableHead>
                  <TableHead className="w-[10%] font-bold text-slate-700 text-center align-middle">Actions</TableHead>
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
                    <TableRow key={log.id} className="hover:bg-slate-50 transition-colors h-20">
                      <TableCell className="whitespace-nowrap align-middle py-0">
                        {formatIndianDate(log.date)}
                      </TableCell>
                      <TableCell className="align-middle py-0">
                        <div className="flex flex-col items-center justify-center text-center leading-tight">
                          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight mb-0.5">
                            {getFarmName(log.houseId)}
                          </div>
                          <div className="text-sm font-medium text-slate-500">
                            {getHouseName(log.houseId)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-0 font-medium">
                        {log.mortality}
                      </TableCell>
                      <TableCell className="align-middle py-0">
                        <span className={`text-sm font-semibold ${log.cumulativeMortalityPercent > 5 ? 'text-red-600' : 'text-slate-600'}`}>
                          {log.cumulativeMortalityPercent.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="align-middle py-0 text-sm text-slate-600 truncate">
                        {getFeedTypeName(log.feedTypeId)}
                      </TableCell>
                      <TableCell className="align-middle py-0 font-bold text-slate-900">
                        {log.closingBirds.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="align-middle py-0">
                        <div className="flex items-center justify-center gap-2">
                          {user?.role === "owner" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(log)}
                                title="Edit Log"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(log.id)}
                                title="Delete Log"
                              >
                                <Trash2 className="h-4 w-4" />
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

          {sortedLogs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 px-2">
                Batch Summary (Filtered)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Mortality</p>
                  <p className="text-xl font-bold text-red-600">
                    {summaryMetrics.totalMortality.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Birds lost so far</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Closing Birds</p>
                  <p className="text-xl font-bold text-slate-900">
                    {summaryMetrics.latestClosingBirds.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Current population</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Cum. Mortality %</p>
                  <p className="text-xl font-bold text-orange-600">
                    {summaryMetrics.latestCumMortalityPercent.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Of initial batch size</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Days Logged</p>
                  <p className="text-xl font-bold text-slate-900">
                    {summaryMetrics.daysLogged}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Total entries recorded</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Avg. Mortality/Day</p>
                  <p className="text-xl font-bold text-slate-900">
                    {summaryMetrics.avgMortalityPerDay.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Birds per day average</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

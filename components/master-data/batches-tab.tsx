"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useBatch } from "@/lib/batch-context"
import { useMasterData } from "@/lib/master-data-context"
import { useWorkers } from "@/lib/workers-context"
import { useBatchSections } from "@/lib/batch-sections-context" // Added batch sections import
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2, Calendar, Activity, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { buildBatchName } from "@/lib/utils"

export function BatchesTab() {
  const { batches, addBatch, updateBatch, deleteBatch } = useBatch()
  const { houses, farms } = useMasterData()
  const { getActiveWorkers, getWorkerById } = useWorkers()
  const { addSection, getSectionsByBatch, deleteSection, deleteSectionsByBatch } = useBatchSections() // Added batch sections hooks
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showSectionSetup, setShowSectionSetup] = useState(false)
  const [sections, setSections] = useState<Array<{ workerId: string; initialBirds: string; name: string }>>([])

  const [formData, setFormData] = useState({
    houseId: "",
    name: "", // Auto-generated, read-only
    placementDate: "",
    initialBirds: "",
    breed: "",
    status: "active" as "active" | "completed" | "closed",
    targetFCR: "1.8",
    mortalityThreshold: "5",
    workerIds: [] as string[],
  })

  useEffect(() => {
    if (formData.houseId && formData.placementDate) {
      const house = houses.find((h) => h.id === formData.houseId)
      if (house) {
        const generatedName = buildBatchName(house.name, formData.placementDate)
        setFormData((prev) => ({ ...prev, name: generatedName }))
      }
    }
  }, [formData.houseId, formData.placementDate, houses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (sections.length > 0) {
      const totalSectionBirds = sections.reduce((sum, s) => sum + Number.parseInt(s.initialBirds || "0"), 0)
      const totalBatchBirds = Number.parseInt(formData.initialBirds)

      if (totalSectionBirds !== totalBatchBirds) {
        alert(`Section bird allocation (${totalSectionBirds}) must equal total birds (${totalBatchBirds})`)
        return
      }
    }

    try {
      if (editingId) {
        await updateBatch(editingId, {
          ...formData,
          status: formData.status || "active", // Ensure status is set
          initialBirds: Number.parseInt(formData.initialBirds),
          targetFCR: Number.parseFloat(formData.targetFCR),
          mortalityThreshold: Number.parseFloat(formData.mortalityThreshold),
        })

        await deleteSectionsByBatch(editingId)
        console.log("[BatchesTab] Editing batch, adding sections:", sections.length)
        for (const section of sections) {
          console.log(`[BatchesTab] Adding section:`, section.name, "Worker:", section.workerId, "Birds:", section.initialBirds)
          await addSection({
            batchId: editingId,
            name: section.name,
            workerId: section.workerId,
            initialBirds: Number.parseInt(section.initialBirds),
          })
        }
      } else {
        const newBatch = await addBatch({
          ...formData,
          status: formData.status || "active", // Ensure status is explicitly set
          initialBirds: Number.parseInt(formData.initialBirds),
          targetFCR: Number.parseFloat(formData.targetFCR),
          mortalityThreshold: Number.parseFloat(formData.mortalityThreshold),
        })

        console.log("[BatchesTab] Created batch with status:", newBatch.status)
        console.log("[BatchesTab] Creating new batch, adding sections:", sections.length)
        for (const section of sections) {
          console.log(`[BatchesTab] Adding section:`, section.name, "Worker:", section.workerId, "Birds:", section.initialBirds)
          await addSection({
            batchId: newBatch.id,
            name: section.name,
            workerId: section.workerId,
            initialBirds: Number.parseInt(section.initialBirds),
          })
        }
      }
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving batch:", error)
      alert(error instanceof Error ? error.message : "Failed to save batch. Please try again.")
    }
  }

  const resetForm = () => {
    setFormData({
      houseId: "",
      name: "",
      placementDate: "",
      initialBirds: "",
      breed: "",
      status: "active",
      targetFCR: "1.8",
      mortalityThreshold: "5",
      workerIds: [],
    })
    setEditingId(null)
    setShowSectionSetup(false) // Reset section setup
    setSections([]) // Clear sections
  }

  const handleEdit = (batch: any) => {
    setEditingId(batch.id)
    setFormData({
      houseId: batch.houseId,
      name: batch.name,
      placementDate: batch.placementDate,
      initialBirds: batch.initialBirds.toString(),
      breed: batch.breed,
      status: batch.status,
      targetFCR: batch.targetFCR.toString(),
      mortalityThreshold: batch.mortalityThreshold.toString(),
      workerIds: batch.workerIds || [],
    })

    const existingSections = getSectionsByBatch(batch.id)
    if (existingSections.length > 0) {
      setShowSectionSetup(true)
      setSections(
        existingSections.map((s) => ({
          workerId: s.workerId || "",
          initialBirds: s.initialBirds.toString(),
          name: s.name,
        })),
      )
    }

    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this batch? This will affect all related daily logs.")) {
      deleteBatch(id)
    }
  }

  const getHouseName = (houseId: string) => {
    return houses.find((h) => h.id === houseId)?.name || "Unknown"
  }

  const getFarmName = (houseId: string) => {
    const house = houses.find((h) => h.id === houseId)
    if (!house) return "Unknown"
    return farms.find((f) => f.id === house.farmId)?.name || "Unknown"
  }

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      active: "default",
      completed: "secondary",
      closed: "destructive",
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  const addSectionRow = () => {
    setSections([...sections, { workerId: "", initialBirds: "", name: "" }])
  }

  const updateSectionRow = (index: number, field: string, value: string) => {
    const updated = [...sections]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-generate section name based on worker
    if (field === "workerId" && value) {
      const worker = getWorkerById(value)
      if (worker) {
        updated[index].name = `${worker.name} Section`
      }
    }

    setSections(updated)
  }

  const removeSectionRow = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
  }

  const activeWorkers = getActiveWorkers()

  const toggleWorkerSelection = (workerId: string) => {
    setFormData((prev) => ({
      ...prev,
      workerIds: prev.workerIds.includes(workerId)
        ? prev.workerIds.filter((id) => id !== workerId)
        : [...prev.workerIds, workerId],
    }))
  }

  const totalSectionBirds = sections.reduce((sum, s) => sum + Number.parseInt(s.initialBirds || "0"), 0)
  const remainingBirds = Number.parseInt(formData.initialBirds || "0") - totalSectionBirds

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Batches</h2>
          <p className="text-[10px] text-muted-foreground">Manage broiler batches and track flock placements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-[11px]" onClick={resetForm}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Batch" : "Add New Batch"}</DialogTitle>
              <DialogDescription>
                Create a new batch for tracking broiler flock from placement to harvest
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">House</label>
                  <Select
                    value={formData.houseId}
                    onValueChange={(value) => setFormData({ ...formData, houseId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a house" />
                    </SelectTrigger>
                    <SelectContent>
                      {houses.map((house) => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.name} - {getFarmName(house.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Placement Date</label>
                  <Input
                    type="date"
                    value={formData.placementDate}
                    onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Name (Auto-generated)</label>
                <Input
                  value={formData.name}
                  readOnly
                  placeholder="Select house and placement date to generate name"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Batch name is automatically generated from house name and placement date
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Birds</label>
                  <Input
                    type="number"
                    value={formData.initialBirds}
                    onChange={(e) => setFormData({ ...formData, initialBirds: e.target.value })}
                    placeholder="e.g., 10000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Breed</label>
                  <Input
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="e.g., Cobb 500, Ross 308"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target FCR</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.targetFCR}
                    onChange={(e) => setFormData({ ...formData, targetFCR: e.target.value })}
                    placeholder="e.g., 1.8"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mortality Threshold (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.mortalityThreshold}
                  onChange={(e) => setFormData({ ...formData, mortalityThreshold: e.target.value })}
                  placeholder="e.g., 5"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Workers (Optional)</label>
                <p className="text-xs text-muted-foreground mb-2">Select workers responsible for this batch</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {activeWorkers.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-2">
                      No active workers available. Add workers in the Workers tab first.
                    </p>
                  ) : (
                    activeWorkers.map((worker) => (
                      <label key={worker.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.workerIds.includes(worker.id)}
                          onChange={() => toggleWorkerSelection(worker.id)}
                          className="h-4 w-4"
                        />
                        <span>{worker.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Divide Birds by Worker (Optional)</label>
                    <p className="text-xs text-muted-foreground">
                      Split the {formData.initialBirds || "0"} birds into sections managed by different workers
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSectionSetup(!showSectionSetup)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    {showSectionSetup ? "Hide" : "Setup"} Sections
                  </Button>
                </div>

                {showSectionSetup && (
                  <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                    {sections.map((section, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Section name (e.g., 'Durga Side')"
                            value={section.name}
                            onChange={(e) => updateSectionRow(index, "name", e.target.value)}
                            required={sections.length > 0}
                          />
                        </div>
                        <div className="w-40 space-y-2">
                          <Select
                            value={section.workerId}
                            onValueChange={(value) => updateSectionRow(index, "workerId", value)}
                            required={sections.length > 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Worker" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeWorkers.map((worker) => (
                                <SelectItem key={worker.id} value={worker.id}>
                                  {worker.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-2">
                          <Input
                            type="number"
                            placeholder="Birds"
                            value={section.initialBirds}
                            onChange={(e) => updateSectionRow(index, "initialBirds", e.target.value)}
                            required={sections.length > 0}
                            min="0"
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeSectionRow(index)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button type="button" variant="outline" size="sm" onClick={addSectionRow}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Section
                      </Button>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Allocated:</span>{" "}
                        <span
                          className={`font-semibold ${remainingBirds === 0 ? "text-green-600" : "text-orange-600"}`}
                        >
                          {totalSectionBirds} / {formData.initialBirds || 0}
                        </span>
                        {remainingBirds !== 0 && (
                          <span className="text-xs text-orange-600 ml-2">
                            ({remainingBirds > 0 ? `${remainingBirds} remaining` : `${Math.abs(remainingBirds)} over`})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"} Batch
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {batches.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center">
            <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No batches created yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Batch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <Card key={batch.id} className="shadow-sm">
              <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold">{batch.name}</CardTitle>
                    <CardDescription className="text-[10px]">
                      {getHouseName(batch.houseId)} • {getFarmName(batch.houseId)}
                    </CardDescription>
                  </div>
                  <div className="scale-75 origin-top-right">
                    {getStatusBadge(batch.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-muted-foreground uppercase text-[9px] font-bold">Placed:</span>
                    <span className="font-bold">{new Date(batch.placementDate).toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground uppercase font-bold text-[8px]">Birds</p>
                      <p className="font-bold text-xs">{batch.initialBirds.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-bold text-[8px]">Breed</p>
                      <p className="font-medium text-xs">{batch.breed}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground uppercase font-bold text-[8px]">T. FCR</p>
                      <p className="font-bold text-xs">{batch.targetFCR}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-bold text-[8px]">Mort. %</p>
                      <p className="font-bold text-xs">{batch.mortalityThreshold}%</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-[10px] bg-transparent"
                      onClick={() => handleEdit(batch)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-[10px] bg-transparent"
                      onClick={() => handleDelete(batch.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

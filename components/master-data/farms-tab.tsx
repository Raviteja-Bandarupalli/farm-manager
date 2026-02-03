"use client"

import type React from "react"

import { useState } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function FarmsTab() {
  const { farms, addFarm, updateFarm, deleteFarm } = useMasterData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", location: "", capacity: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateFarm(editingId, { ...formData, capacity: Number.parseInt(formData.capacity) })
    } else {
      addFarm({ ...formData, capacity: Number.parseInt(formData.capacity) })
    }
    setFormData({ name: "", location: "", capacity: "" })
    setEditingId(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (farm: any) => {
    setEditingId(farm.id)
    setFormData({ name: farm.name, location: farm.location, capacity: farm.capacity.toString() })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this farm?")) {
      deleteFarm(id)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => {
                setEditingId(null)
                setFormData({ name: "", location: "", capacity: "" })
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Farm
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Farm" : "Add New Farm"}</DialogTitle>
              <DialogDescription>Enter the farm details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Farm Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Capacity (birds)</label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"} Farm
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {farms.length === 0 ? (
          <Card className="col-span-full shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">No farms added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Farm
              </Button>
            </CardContent>
          </Card>
        ) : (
          farms.map((farm) => (
            <Card key={farm.id} className="shadow-sm">
              <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold">{farm.name}</CardTitle>
                <CardDescription className="text-[10px]">{farm.location}</CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-3">Capacity: {farm.capacity.toLocaleString()} birds</p>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleEdit(farm)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={() => handleDelete(farm.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

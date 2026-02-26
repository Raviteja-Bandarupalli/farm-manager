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
  const { farms, houses, addFarm, updateFarm, deleteFarm } = useMasterData()
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

  const handleDelete = async (id: string) => {
    const farmHouses = houses.filter((h) => h.farmId === id)
    if (farmHouses.length > 0) {
      alert(
        `Cannot delete farm "${farms.find((f) => f.id === id)?.name}" because it has ${
          farmHouses.length
        } houses associated with it.\n\nPlease delete the houses first if you really want to remove this farm.`,
      )
      return
    }

    if (confirm("Are you sure you want to delete this farm? This will remove the farm permanently if it has no other dependencies.")) {
      try {
        await deleteFarm(id)
      } catch (err) {
        console.error("Failed to delete farm:", err)
        alert(
          "Unable to delete farm. It likely has other associated records like financial transactions or inventory. In such cases, deletion is blocked to preserve data integrity.",
        )
      }
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null)
                setFormData({ name: "", location: "", capacity: "" })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {farms.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No farms added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Farm
              </Button>
            </CardContent>
          </Card>
        ) : (
          farms.map((farm) => (
            <Card key={farm.id}>
              <CardHeader>
                <CardTitle>{farm.name}</CardTitle>
                <CardDescription>{farm.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Capacity: {farm.capacity.toLocaleString()} birds</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(farm)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(farm.id)}>
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

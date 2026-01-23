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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function HousesTab() {
  const { houses, farms, addHouse, updateHouse, deleteHouse } = useMasterData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ farmId: "", name: "", capacity: "", status: "active" as const })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateHouse(editingId, { ...formData, capacity: Number.parseInt(formData.capacity) })
    } else {
      addHouse({ ...formData, capacity: Number.parseInt(formData.capacity) })
    }
    setFormData({ farmId: "", name: "", capacity: "", status: "active" })
    setEditingId(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (house: any) => {
    setEditingId(house.id)
    setFormData({ farmId: house.farmId, name: house.name, capacity: house.capacity.toString(), status: house.status })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this house?")) {
      deleteHouse(id)
    }
  }

  const getFarmName = (farmId: string) => {
    return farms.find((f) => f.id === farmId)?.name || "Unknown Farm"
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null)
                setFormData({ farmId: "", name: "", capacity: "", status: "active" })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add House
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit House" : "Add New House"}</DialogTitle>
              <DialogDescription>Enter the house details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Farm</label>
                <Select
                  value={formData.farmId}
                  onValueChange={(value) => setFormData({ ...formData, farmId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a farm" />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">House Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"} House
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {houses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No houses added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First House
              </Button>
            </CardContent>
          </Card>
        ) : (
          houses.map((house) => (
            <Card key={house.id}>
              <CardHeader>
                <CardTitle>{house.name}</CardTitle>
                <CardDescription>{getFarmName(house.farmId)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Capacity: {house.capacity.toLocaleString()} birds</p>
                <p className="text-sm mb-4">
                  Status:{" "}
                  <span
                    className={`font-medium ${house.status === "active" ? "text-green-600" : house.status === "maintenance" ? "text-yellow-600" : "text-gray-600"}`}
                  >
                    {house.status}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(house)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(house.id)}>
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

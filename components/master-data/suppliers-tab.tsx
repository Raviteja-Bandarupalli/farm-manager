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

export function SuppliersTab() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useMasterData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", type: "feed" as const, contact: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateSupplier(editingId, formData)
    } else {
      addSupplier(formData)
    }
    setFormData({ name: "", type: "feed", contact: "" })
    setEditingId(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (supplier: any) => {
    setEditingId(supplier.id)
    setFormData({ name: supplier.name, type: supplier.type, contact: supplier.contact })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      deleteSupplier(id)
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
                setFormData({ name: "", type: "feed", contact: "" })
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
              <DialogDescription>Enter the supplier details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feed">Feed</SelectItem>
                    <SelectItem value="medicine">Medicine</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Number</label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"} Supplier
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.length === 0 ? (
          <Card className="col-span-full shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">No suppliers added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Supplier
              </Button>
            </CardContent>
          </Card>
        ) : (
          suppliers.map((supplier) => (
            <Card key={supplier.id} className="shadow-sm">
              <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold">{supplier.name}</CardTitle>
                <CardDescription className="text-[10px] capitalize">{supplier.type}</CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-3">{supplier.contact}</p>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleEdit(supplier)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={() => handleDelete(supplier.id)}>
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

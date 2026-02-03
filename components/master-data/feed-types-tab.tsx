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

export function FeedTypesTab() {
  const { feedTypes, addFeedType, updateFeedType, deleteFeedType } = useMasterData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", category: "starter" as const, protein: "", price: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateFeedType(editingId, {
        ...formData,
        protein: Number.parseFloat(formData.protein),
        price: Number.parseFloat(formData.price),
      })
    } else {
      addFeedType({
        ...formData,
        protein: Number.parseFloat(formData.protein),
        price: Number.parseFloat(formData.price),
      })
    }
    setFormData({ name: "", category: "starter", protein: "", price: "" })
    setEditingId(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (feedType: any) => {
    setEditingId(feedType.id)
    setFormData({
      name: feedType.name,
      category: feedType.category,
      protein: feedType.protein.toString(),
      price: feedType.price.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this feed type?")) {
      deleteFeedType(id)
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
                setFormData({ name: "", category: "starter", protein: "", price: "" })
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Feed Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Feed Type" : "Add New Feed Type"}</DialogTitle>
              <DialogDescription>Enter the feed type details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Feed Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="grower">Grower</SelectItem>
                    <SelectItem value="finisher">Finisher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Protein (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.protein}
                  onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price per kg (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"} Feed Type
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {feedTypes.length === 0 ? (
          <Card className="col-span-full shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">No feed types added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Feed Type
              </Button>
            </CardContent>
          </Card>
        ) : (
          feedTypes.map((feedType) => (
            <Card key={feedType.id} className="shadow-sm">
              <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold">{feedType.name}</CardTitle>
                <CardDescription className="text-[10px] capitalize">{feedType.category}</CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Protein: {feedType.protein}%</p>
                <p className="text-xs text-muted-foreground mb-3">Price: ₹{feedType.price}/kg</p>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleEdit(feedType)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={() => handleDelete(feedType.id)}>
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

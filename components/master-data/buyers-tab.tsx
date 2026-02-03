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
import { Textarea } from "@/components/ui/textarea"

export function BuyersTab() {
  const { buyers, addBuyer, updateBuyer, deleteBuyer } = useMasterData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", contact: "", address: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateBuyer(editingId, formData)
    } else {
      addBuyer(formData)
    }
    setFormData({ name: "", contact: "", address: "" })
    setEditingId(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (buyer: any) => {
    setEditingId(buyer.id)
    setFormData({ name: buyer.name, contact: buyer.contact, address: buyer.address })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this buyer?")) {
      deleteBuyer(id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-8 text-xs font-bold"
              onClick={() => {
                setEditingId(null)
                setFormData({ name: "", contact: "", address: "" })
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Buyer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Buyer" : "Add New Buyer"}</DialogTitle>
              <DialogDescription>Enter the buyer details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buyer Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Number</label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"} Buyer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {buyers.length === 0 ? (
          <Card className="col-span-full shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No buyers added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Buyer
              </Button>
            </CardContent>
          </Card>
        ) : (
          buyers.map((buyer) => (
            <Card key={buyer.id} className="shadow-sm">
              <CardHeader className="py-2.5 px-4 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold">{buyer.name}</CardTitle>
                <CardDescription className="text-xs">{buyer.contact}</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-2 min-h-[2.5rem]">{buyer.address}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold flex-1" onClick={() => handleEdit(buyer)}>
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs font-bold flex-1" onClick={() => handleDelete(buyer.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
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

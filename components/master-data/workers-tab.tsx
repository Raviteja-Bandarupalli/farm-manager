"use client"

import type React from "react"
import { useState } from "react"
import { useWorkers } from "@/lib/workers-context"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Edit, UserX, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export function WorkersTab() {
  const { workers, addWorker, updateWorker, deleteWorker } = useWorkers()
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    active: true,
  })

  const isOwner = user?.role === "owner"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateWorker(editingId, formData)
    } else {
      addWorker(formData)
    }
    resetForm()
    setIsDialogOpen(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      location: "",
      active: true,
    })
    setEditingId(null)
  }

  const handleEdit = (worker: any) => {
    setEditingId(worker.id)
    setFormData({
      name: worker.name,
      phone: worker.phone || "",
      location: worker.location || "",
      active: worker.active,
    })
    setIsDialogOpen(true)
  }

  const handleDeactivate = (id: string) => {
    if (confirm("Are you sure you want to deactivate this worker?")) {
      deleteWorker(id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Workers</h2>
          <p className="text-sm text-muted-foreground">Manage farm workers and assign them to batches</p>
        </div>
        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Worker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Worker" : "Add New Worker"}</DialogTitle>
                <DialogDescription>Enter worker details to add them to your farm team</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Durga"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 9876543210"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Vemavaram"
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Update" : "Add"} Worker
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {workers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No workers added yet</p>
            {isOwner && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Worker
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => (
            <Card key={worker.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{worker.name}</CardTitle>
                    {worker.location && <CardDescription>{worker.location}</CardDescription>}
                  </div>
                  <Badge variant={worker.active ? "default" : "secondary"}>
                    {worker.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {worker.phone && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{worker.phone}</p>
                    </div>
                  )}
                  {isOwner && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => handleEdit(worker)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {worker.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={() => handleDeactivate(worker.id)}
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

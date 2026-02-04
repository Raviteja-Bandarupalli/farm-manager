"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useMasterData } from "@/lib/master-data-context"
import { useBatch } from "@/lib/batch-context"
import { useAuth } from "@/lib/auth-context"
import { useFinance } from "@/lib/finance-context"
import { useInventory, type InventoryItem, type PurchaseEntry, type IssueEntry } from "@/lib/inventory-context"
import { toDateKey } from "@/lib/daily-logs-context"
import { formatIndianDate } from "@/lib/utils"
import { getTodayDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Package, ShoppingCart, TrendingDown, TrendingUp, AlertTriangle, Edit, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const CATEGORIES = [
  { value: "feed-raw", label: "Feed Raw Material" },
  { value: "feed-finished", label: "Finished Feed" },
  { value: "medicine", label: "Medicine" },
  { value: "vaccine", label: "Vaccine" },
  { value: "litter", label: "Litter" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
]

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const [activeTabState, setActiveTabState] = useState("items")
  
  useEffect(() => {
    const tab = searchParams.get("tab") || "items"
    setActiveTabState(tab)
  }, [searchParams])
  
  const activeTab = activeTabState
  
  const { suppliers, houses, farms } = useMasterData()
  const { batches } = useBatch()
  const { user } = useAuth()
  const { addTransaction, updateTransaction, deleteTransaction } = useFinance()
  const {
    items,
    purchases,
    issues,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addPurchase,
    updatePurchase,
    deletePurchase,
    linkPurchaseToFinance,
    addIssue,
    getItemById,
    getPurchaseById,
    getIssuesByItem,
    getLowStockItems,
  } = useInventory()

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null)

  const [itemForm, setItemForm] = useState({
    code: "",
    name: "",
    category: "feed-finished" as any,
    unit: "",
    openingStock: "",
    openingValue: "",
    reorderLevel: "",
  })

  const [purchaseForm, setPurchaseForm] = useState({
    date: getTodayDate(),
    supplierId: "",
    itemId: "",
    quantity: "",
    unitRate: "",
    invoiceNumber: "",
  })

  const [issueForm, setIssueForm] = useState({
    date: getTodayDate(),
    batchId: "",
    itemId: "",
    quantity: "",
    purpose: "",
  })

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItemId) {
        await updateItem(editingItemId, {
          code: itemForm.code,
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          reorderLevel: Number.parseFloat(itemForm.reorderLevel),
        })
      } else {
        await addItem({
          code: itemForm.code,
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          openingStock: Number.parseFloat(itemForm.openingStock),
          openingValue: Number.parseFloat(itemForm.openingValue),
          reorderLevel: Number.parseFloat(itemForm.reorderLevel),
        })
      }
      resetItemForm()
      setIsItemDialogOpen(false)
    } catch (err) {
      console.error("Error saving item:", err)
      alert(err instanceof Error ? err.message : "Failed to save item.")
    }
  }

  const resetItemForm = () => {
    setItemForm({
      code: "",
      name: "",
      category: "feed-finished",
      unit: "",
      openingStock: "",
      openingValue: "",
      reorderLevel: "",
    })
    setEditingItemId(null)
  }

  const handleEdit = (item: any) => {
    setEditingItemId(item.id)
    setItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      openingStock: item.openingStock.toString(),
      openingValue: item.openingValue.toString(),
      reorderLevel: item.reorderLevel.toString(),
    })
    setIsItemDialogOpen(true)
  }

  const handleDelete = async (item: InventoryItem) => {
    // Check if item has stock
    const hasStock = item.currentStock > 0
    const itemName = `${item.code} - ${item.name}`
    
    let confirmMessage = `Delete ${itemName}? This will remove it from inventory.`
    if (hasStock) {
      confirmMessage = `${itemName} has stock (${(() => {
        const stock = typeof item.currentStock === 'number' ? item.currentStock : Number.parseFloat(String(item.currentStock).match(/^[\d.]+/)?.[0] || '0');
        return isNaN(stock) ? '0.00' : stock.toFixed(2);
      })()} ${item.unit}). Delete anyway?`
    }

    if (confirm(confirmMessage)) {
      try {
        await deleteItem(item.id)
      } catch (err) {
        console.error("Error deleting item:", err)
        alert("Failed to delete item.")
      }
    }
  }

  const startAddNewItem = () => {
    resetItemForm()
    setIsItemDialogOpen(true)
  }

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    const quantity = Number.parseFloat(purchaseForm.quantity)
    const unitRate = Number.parseFloat(purchaseForm.unitRate)
    const item = getItemById(purchaseForm.itemId)
    try {
      if (editingPurchaseId) {
        const existing = getPurchaseById(editingPurchaseId)
        if (!existing) return
        await updatePurchase(editingPurchaseId, {
          date: purchaseForm.date,
          supplierId: purchaseForm.supplierId,
          itemId: purchaseForm.itemId,
          quantity,
          unitRate,
          invoiceNumber: purchaseForm.invoiceNumber,
        })
        const totalAmount = quantity * unitRate
        if (existing.financeTransactionId) {
          const desc = item ? `${item.code} ${item.name} ${quantity.toFixed(0)}${item.unit}` : `Purchase ${quantity.toFixed(0)} units`
          const ref = purchaseForm.invoiceNumber ? ` INV-${purchaseForm.invoiceNumber}` : ""
          await updateTransaction(existing.financeTransactionId, {
            type: "expense",
            category: "Feed Purchase",
            amount: totalAmount,
            date: purchaseForm.date,
            description: `${desc}${ref}`,
            reference: purchaseForm.invoiceNumber || "",
          })
        } else if (item) {
          const desc = `${item.code} ${item.name} ${quantity.toFixed(0)}${item.unit}`
          const ref = purchaseForm.invoiceNumber ? ` INV-${purchaseForm.invoiceNumber}` : ""
          const tx = await addTransaction({
            type: "expense",
            category: "Feed Purchase",
            amount: quantity * unitRate,
            date: purchaseForm.date,
            description: `${desc}${ref}`,
            reference: purchaseForm.invoiceNumber || "",
          })
          if (tx) await linkPurchaseToFinance(editingPurchaseId, tx.id)
        }
      } else {
        const newPurchase = await addPurchase({
          date: purchaseForm.date,
          supplierId: purchaseForm.supplierId,
          itemId: purchaseForm.itemId,
          quantity,
          unitRate,
          invoiceNumber: purchaseForm.invoiceNumber,
        })
        if (item && newPurchase) {
          const desc = `${item.code} ${item.name} ${quantity.toFixed(0)}${item.unit}`
          const ref = purchaseForm.invoiceNumber ? ` INV-${purchaseForm.invoiceNumber}` : ""
          const tx = await addTransaction({
            type: "expense",
            category: "Feed Purchase",
            amount: newPurchase.totalAmount,
            date: purchaseForm.date,
            description: `${desc}${ref}`,
            reference: purchaseForm.invoiceNumber || "",
          })
          if (tx) await linkPurchaseToFinance(newPurchase.id, tx.id)
        }
      }
      resetPurchaseForm()
      setIsPurchaseDialogOpen(false)
    } catch (err) {
      console.error("Error saving purchase:", err)
      alert(err instanceof Error ? err.message : "Failed to save purchase.")
    }
  }

  const resetPurchaseForm = () => {
    setPurchaseForm({
      date: getTodayDate(),
      supplierId: "",
      itemId: "",
      quantity: "",
      unitRate: "",
      invoiceNumber: "",
    })
    setEditingPurchaseId(null)
  }

  const handleEditPurchase = (purchase: any) => {
    setEditingPurchaseId(purchase.id)
    setPurchaseForm({
      date: purchase.date,
      supplierId: purchase.supplierId,
      itemId: purchase.itemId,
      quantity: purchase.quantity.toString(),
      unitRate: purchase.unitRate.toString(),
      invoiceNumber: purchase.invoiceNumber || "",
    })
    setIsPurchaseDialogOpen(true)
  }

  const handleDeletePurchase = async (purchase: PurchaseEntry) => {
    const linkedIssues = getIssuesByItem(purchase.itemId)
    const item = getItemById(purchase.itemId)
    if (linkedIssues.length > 0) {
      const purchaseTime = toDateKey(purchase.date)
      const after = linkedIssues.filter((i) => toDateKey(i.date) >= purchaseTime)
      if (after.length > 0) {
        alert(`Cannot delete this purchase. It is linked to ${after.length} issue/consumption record(s) that occurred on or after the purchase date.`)
        return
      }
    }
    const itemName = item ? `${item.code} - ${item.name}` : "this item"
    const qty = typeof purchase.quantity === "number" ? purchase.quantity.toFixed(2) : Number.parseFloat(String(purchase.quantity)).toFixed(2)
    const unit = item?.unit || ""
    if (!confirm(`Delete this purchase?\n\nStock will decrease by ${qty} ${unit}.\n\nItem: ${itemName}`)) return
    try {
      if (purchase.financeTransactionId) await deleteTransaction(purchase.financeTransactionId)
      await deletePurchase(purchase.id)
    } catch (err) {
      console.error("Error deleting purchase:", err)
      alert("Failed to delete purchase.")
    }
  }

  const startAddNewPurchase = () => {
    resetPurchaseForm()
    setIsPurchaseDialogOpen(true)
  }

  const syncExistingPurchasesToFinance = async () => {
    const without = purchases.filter((p) => !p.financeTransactionId)
    if (without.length === 0) {
      alert("All purchases are already synced with finance!")
      return
    }
    if (!confirm(`This will create ${without.length} finance expense(s) for existing purchases. Continue?`)) return
    let synced = 0
    for (const p of without) {
      const item = getItemById(p.itemId)
      if (!item) continue
      try {
        const desc = `${item.code} ${item.name} ${p.quantity.toFixed(0)}${item.unit}`
        const ref = p.invoiceNumber ? ` INV-${p.invoiceNumber}` : ""
        const tx = await addTransaction({
          type: "expense",
          category: "Feed Purchase",
          amount: p.totalAmount,
          date: p.date,
          description: `${desc}${ref}`,
          reference: p.invoiceNumber || "",
        })
        if (tx) {
          await linkPurchaseToFinance(p.id, tx.id)
          synced++
        }
      } catch (e) {
        console.error("Sync purchase failed:", e)
      }
    }
    alert(`Successfully synced ${synced} purchase(s) with finance expenses!`)
  }

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addIssue({
        date: issueForm.date,
        batchId: issueForm.batchId,
        itemId: issueForm.itemId,
        quantity: Number.parseFloat(issueForm.quantity),
        purpose: issueForm.purpose,
      })
      setIssueForm({
        date: getTodayDate(),
        batchId: "",
        itemId: "",
        quantity: "",
        purpose: "",
      })
      setIsIssueDialogOpen(false)
    } catch (err) {
      console.error("Error adding issue:", err)
      alert(err instanceof Error ? err.message : "Failed to add issue.")
    }
  }

  const lowStockItems = getLowStockItems()
  const totalValue = items.reduce((sum, item) => sum + item.currentStock * item.averageCost, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Inventory</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Track items, purchases, and issues</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
            setIsItemDialogOpen(open)
            if (!open) {
              resetItemForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={startAddNewItem}>
                <Package className="h-4 w-4 mr-1.5" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItemId ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription>
                  {editingItemId ? "Update inventory item details" : "Create a new inventory item master"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Item Code</label>
                    <Input
                      value={itemForm.code}
                      onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                      placeholder="e.g., FEED-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Item Name</label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      placeholder="e.g., Broiler Starter Feed"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={itemForm.category}
                      onValueChange={(value: any) => setItemForm({ ...itemForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Input
                      value={itemForm.unit}
                      onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                      placeholder="kg, L, pcs"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Opening Stock</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemForm.openingStock}
                      onChange={(e) => setItemForm({ ...itemForm, openingStock: e.target.value })}
                      required={!editingItemId}
                      disabled={editingItemId}
                      className={editingItemId ? "bg-muted" : ""}
                    />
                    {editingItemId && (
                      <p className="text-xs text-muted-foreground">Historical value - cannot be changed</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Opening Value (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemForm.openingValue}
                      onChange={(e) => setItemForm({ ...itemForm, openingValue: e.target.value })}
                      required={!editingItemId}
                      disabled={editingItemId}
                      className={editingItemId ? "bg-muted" : ""}
                    />
                    {editingItemId && (
                      <p className="text-xs text-muted-foreground">Historical value - cannot be changed</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reorder Level</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemForm.reorderLevel}
                      onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingItemId ? "Update Item" : "Add Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPurchaseDialogOpen} onOpenChange={(open) => {
            setIsPurchaseDialogOpen(open)
            if (!open) {
              resetPurchaseForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={startAddNewPurchase}>
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Purchase Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPurchaseId ? "Edit Purchase" : "Record Purchase"}</DialogTitle>
                <DialogDescription>
                  {editingPurchaseId ? "Update purchase entry details" : "Add a new purchase entry"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPurchase} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={purchaseForm.date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier</label>
                  <Select
                    value={purchaseForm.supplierId}
                    onValueChange={(value) => setPurchaseForm({ ...purchaseForm, supplierId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item</label>
                  <Select
                    value={purchaseForm.itemId}
                    onValueChange={(value) => setPurchaseForm({ ...purchaseForm, itemId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={purchaseForm.quantity}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit Rate (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={purchaseForm.unitRate}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, unitRate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Number</label>
                  <Input
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    placeholder="e.g., INV-2024-001"
                  />
                </div>
                {purchaseForm.quantity && purchaseForm.unitRate && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm font-medium">
                      Total Amount: ₹
                      {(Number.parseFloat(purchaseForm.quantity) * Number.parseFloat(purchaseForm.unitRate)).toFixed(2)}
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full">
                  {editingPurchaseId ? "Update Purchase" : "Record Purchase"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs font-bold">
                <TrendingDown className="h-4 w-4 mr-1.5" />
                Issue Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Issue</DialogTitle>
                <DialogDescription>Issue items to a batch</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddIssue} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    className="h-12"
                    value={issueForm.date}
                    onChange={(e) => setIssueForm({ ...issueForm, date: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Selected: {formatIndianDate(issueForm.date)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch</label>
                  <Select
                    value={issueForm.batchId}
                    onValueChange={(value) => setIssueForm({ ...issueForm, batchId: value })}
                    required
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches
                        .filter((b) => {
                          if (b.status !== "active") return false
                          if (user?.role === "owner") return true
                          const house = houses.find((h) => h.id === b.houseId)
                          if (!house) return false
                          return user?.assignedFarmIds?.includes(house.farmId)
                        })
                        .map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batchNumber} - {batch.breed}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item</label>
                  <Select
                    value={issueForm.itemId}
                    onValueChange={(value) => setIssueForm({ ...issueForm, itemId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} - {item.name} (Stock: {item.currentStock} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purpose</label>
                  <Input
                    value={issueForm.purpose}
                    onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })}
                    placeholder="e.g., Daily feeding, medication"
                    required
                  />
                </div>
                {issueForm.itemId && issueForm.quantity && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm font-medium">
                      Estimated Cost: ₹
                      {(
                        Number.parseFloat(issueForm.quantity) * (getItemById(issueForm.itemId)?.averageCost || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full">
                  Record Issue
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 shadow-sm bg-orange-50/20">
          <CardHeader className="py-1.5 px-3 border-b bg-orange-50/50">
            <CardTitle className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Low Stock Alert ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1.5">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-orange-50/50 rounded border border-orange-100 shadow-sm">
                  <div>
                    <p className="text-xs font-bold">
                      {item.code} - {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current: {(() => {
                        const stock = typeof item.currentStock === 'number' ? item.currentStock : Number.parseFloat(String(item.currentStock).match(/^[\d.]+/)?.[0] || '0');
                        return isNaN(stock) ? '0.00' : stock.toFixed(2);
                      })()} {item.unit} | Reorder: {item.reorderLevel.toFixed(2)} {item.unit}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Low Stock
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight">{items.length}</div>
            <p className="text-[10px] text-muted-foreground font-medium">Items in inventory</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Value</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black text-blue-600 tracking-tight">₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <p className="text-[10px] text-muted-foreground font-medium">Current value</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight">{purchases.length}</div>
            <p className="text-[10px] text-muted-foreground font-medium">Purchase entries</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} className="space-y-3" onValueChange={(value) => {
        setActiveTabState(value)
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          url.searchParams.set("tab", value)
          window.history.pushState({}, "", url)
        }
      }}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto h-9 p-1 bg-slate-100">
          <TabsTrigger value="items" className="text-xs h-7 font-bold">Item Master</TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs h-7 font-bold">Purchases</TabsTrigger>
          <TabsTrigger value="issues" className="text-xs h-7 font-bold">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-3">
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="py-1.5 px-3 border-b bg-slate-50/80">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Item Master</CardTitle>
              <CardDescription className="text-[9px] font-medium text-slate-400">Current stock and average cost</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                  {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">No items added yet</p>
                  <Button onClick={startAddNewItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10 bg-slate-50/50">
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Code</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Name</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Category</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Current Stock</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Avg Cost (₹)</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Value (₹)</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Status</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="h-11">
                          <TableCell className="text-xs font-bold py-1">{item.code}</TableCell>
                          <TableCell className="text-xs py-1">{item.name}</TableCell>
                          <TableCell className="text-[10px] py-1 capitalize text-slate-500">
                            {CATEGORIES.find((c) => c.value === item.category)?.label}
                          </TableCell>
                          <TableCell className="text-xs py-1 text-right font-medium">
                            {(() => {
                              // Extract only the numeric part (handles cases where value might be "6000.00 6000")
                              let stock: number;
                              if (typeof item.currentStock === 'number') {
                                stock = item.currentStock;
                              } else {
                                // If it's a string, extract first numeric value
                                const stockStr = String(item.currentStock).trim();
                                const match = stockStr.match(/^[\d.]+/);
                                stock = match ? Number.parseFloat(match[0]) : Number.parseFloat(stockStr);
                              }
                              return isNaN(stock) ? '0.00' : stock.toFixed(2);
                            })()} {item.unit}
                          </TableCell>
                          <TableCell className="text-xs py-1 text-right">{item.averageCost.toFixed(2)}</TableCell>
                          <TableCell className="text-xs py-1 text-right font-bold">
                            {(item.currentStock * item.averageCost).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-1">
                            {item.currentStock <= item.reorderLevel ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[9px] h-4 px-1.5">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-[9px] h-4 px-1.5">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex justify-center gap-1.5">
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(item)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(item)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-3">
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="py-1.5 px-3 border-b bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Purchase Entries</CardTitle>
                  <CardDescription className="text-[9px] font-medium text-slate-400">All purchase transactions</CardDescription>
                </div>
                {purchases.some((p) => !p.financeTransactionId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncExistingPurchasesToFinance}
                    className="h-8 text-xs font-bold text-green-600 hover:text-green-700 bg-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-1.5" />
                    Sync Finance
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {purchases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">No purchases recorded yet</p>
                  <Button onClick={startAddNewPurchase}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Purchase Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10 bg-slate-50/50">
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Date</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Supplier</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Item</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Qty</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Rate</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Amount</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Inv #</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases
                        .sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
                        .map((purchase) => {
                          const item = getItemById(purchase.itemId)
                          const supplier = suppliers.find((s) => s.id === purchase.supplierId)
                          return (
                            <TableRow key={purchase.id} className="h-11">
                              <TableCell className="text-xs py-1">{formatIndianDate(purchase.date)}</TableCell>
                              <TableCell className="text-[11px] py-1 font-medium">{supplier?.name || "Unknown"}</TableCell>
                              <TableCell className="text-[11px] py-1">
                                {item ? `${item.code} - ${item.name}` : "Item Deleted"}
                              </TableCell>
                              <TableCell className="text-xs py-1 text-right">
                                {(() => {
                                  // Extract only the numeric part (handles cases where value might be "6000.00 6000")
                                  let qty: number;
                                  if (typeof purchase.quantity === 'number') {
                                    qty = purchase.quantity;
                                  } else {
                                    // If it's a string, extract first numeric value
                                    const qtyStr = String(purchase.quantity).trim();
                                    const match = qtyStr.match(/^[\d.]+/);
                                    qty = match ? Number.parseFloat(match[0]) : Number.parseFloat(qtyStr);
                                  }
                                  return isNaN(qty) ? '0.00' : qty.toFixed(2);
                                })()} {item?.unit || ""}
                              </TableCell>
                              <TableCell className="text-xs py-1 text-right">{purchase.unitRate.toFixed(2)}</TableCell>
                              <TableCell className="text-xs py-1 text-right font-bold text-slate-900">
                                {purchase.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-[10px] py-1">{purchase.invoiceNumber || "-"}</TableCell>
                              <TableCell className="py-1">
                                <div className="flex justify-center gap-1.5">
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditPurchase(purchase)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeletePurchase(purchase)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                  {purchase.financeTransactionId && (
                                    <Link href={`/dashboard/finance?transactionId=${purchase.financeTransactionId}`}>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View in Finance">
                                        <ExternalLink className="h-3.5 w-3.5 text-green-600" />
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-3">
          {issues.length > 0 && (
            <Card className="shadow-sm border-slate-200/60 bg-blue-50/10">
              <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
                <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Issue Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-white rounded border border-blue-100 shadow-sm">
                    <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Total Feed Issued</p>
                    <p className="text-lg font-black text-blue-600 leading-tight">
                      {issues
                        .filter((issue) => {
                          const item = getItemById(issue.itemId)
                          return item && (item.category === "feed-raw" || item.category === "feed-finished")
                        })
                        .reduce((sum, issue) => sum + issue.quantity, 0)
                        .toFixed(2)}{" "}
                      kg
                    </p>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-green-100 shadow-sm">
                    <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Total Med/Vacc Cost</p>
                    <p className="text-lg font-black text-green-600 leading-tight">
                      ₹
                      {issues
                        .filter((issue) => {
                          const item = getItemById(issue.itemId)
                          return item && (item.category === "medicine" || item.category === "vaccine")
                        })
                        .reduce((sum, issue) => sum + issue.totalCost, 0)
                        .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="py-1.5 px-3 border-b bg-slate-50/80">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Issue History</CardTitle>
              <CardDescription className="text-[9px] font-medium text-slate-400">{issues.length} total issues</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">No issues recorded yet</p>
                  <Button onClick={() => setIsIssueDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Issue Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10 bg-slate-50/50">
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Date</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Batch</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Item</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Qty</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Cost/Unit</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight text-right">Total</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-tight">Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issues
                        .sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
                        .map((issue) => {
                          const item = getItemById(issue.itemId)
                          const batch = batches.find((b) => b.id === issue.batchId)
                          return (
                            <TableRow key={issue.id} className="h-11">
                              <TableCell className="text-xs py-1">{formatIndianDate(issue.date)}</TableCell>
                              <TableCell className="text-xs py-1 font-medium">{batch?.batchNumber || "Unknown"}</TableCell>
                              <TableCell className="text-[11px] py-1">
                                {item ? `${item.code} - ${item.name}` : "Item Deleted"}
                              </TableCell>
                              <TableCell className="text-xs py-1 text-right font-medium">
                                {issue.quantity.toFixed(2)} {item?.unit || ""}
                              </TableCell>
                              <TableCell className="text-xs py-1 text-right">{issue.costPerUnit.toFixed(2)}</TableCell>
                              <TableCell className="text-xs py-1 text-right font-bold text-slate-900">{issue.totalCost.toFixed(2)}</TableCell>
                              <TableCell className="text-[10px] py-1 italic">{issue.purpose}</TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

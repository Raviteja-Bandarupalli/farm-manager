"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useInventory } from "@/lib/inventory-context"
import { useMasterData } from "@/lib/master-data-context"
import { useBatch } from "@/lib/batch-context"
import { useAuth } from "@/lib/auth-context"
import { useFinance } from "@/lib/finance-context"
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
  
  const { items, purchases, issues, addItem, updateItem, deleteItem, addPurchase, updatePurchase, deletePurchase, linkPurchaseToFinance, addIssue, getLowStockItems, getItemById, getIssuesByItem, getPurchaseById } = useInventory()
  const { suppliers, houses, farms } = useMasterData()
  const { batches } = useBatch()
  const { user } = useAuth()
  const { addTransaction, updateTransaction, deleteTransaction, transactions } = useFinance()

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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingItemId) {
      // Update existing item - only update editable fields, not openingStock/openingValue
      // (those are historical and shouldn't be changed after purchases/issues exist)
      updateItem(editingItemId, {
        code: itemForm.code,
        name: itemForm.name,
        category: itemForm.category,
        unit: itemForm.unit,
        reorderLevel: Number.parseFloat(itemForm.reorderLevel),
      })
    } else {
      // Add new item
      addItem({
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

  const handleDelete = (item: any) => {
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
      deleteItem(item.id)
    }
  }

  const startAddNewItem = () => {
    resetItemForm()
    setIsItemDialogOpen(true)
  }

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault()
    const quantity = Number.parseFloat(purchaseForm.quantity)
    const unitRate = Number.parseFloat(purchaseForm.unitRate)
    const totalAmount = quantity * unitRate
    const item = getItemById(purchaseForm.itemId)
    const supplier = suppliers.find((s) => s.id === purchaseForm.supplierId)
    
    if (editingPurchaseId) {
      // Update existing purchase
      const existingPurchase = getPurchaseById(editingPurchaseId)
      if (!existingPurchase) return

      updatePurchase(editingPurchaseId, {
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId,
        itemId: purchaseForm.itemId,
        quantity,
        unitRate,
        invoiceNumber: purchaseForm.invoiceNumber,
      })

      // Update or create finance expense
      if (existingPurchase.financeTransactionId) {
        // Update existing finance transaction
        const description = item 
          ? `${item.code} ${item.name} ${quantity.toFixed(0)}${item.unit}`
          : `Purchase ${quantity.toFixed(0)} units`
        const invoiceRef = purchaseForm.invoiceNumber ? ` INV-${purchaseForm.invoiceNumber}` : ""
        
        updateTransaction(existingPurchase.financeTransactionId, {
          type: "expense",
          category: "Feed Purchase",
          amount: totalAmount,
          date: purchaseForm.date,
          description: `${description}${invoiceRef}`,
          reference: purchaseForm.invoiceNumber || "",
        })
      } else if (item) {
        // Create new finance transaction if it doesn't exist
        const description = `${item.code} ${item.name} ${quantity.toFixed(0)}${item.unit}`
        const invoiceRef = purchaseForm.invoiceNumber ? ` INV-${purchaseForm.invoiceNumber}` : ""
        
        const financeTransaction = addTransaction({
          type: "expense",
          category: "Feed Purchase",
          amount: totalAmount,
          date: purchaseForm.date,
          description: `${description}${invoiceRef}`,
          reference: purchaseForm.invoiceNumber || "",
        })

        // Link finance transaction to purchase
        if (financeTransaction) {
          linkPurchaseToFinance(editingPurchaseId, financeTransaction.id)
        }
      }
    } else {
      // Add new purchase
      console.log("[Inventory Page] Adding new purchase:", {
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId,
        itemId: purchaseForm.itemId,
        quantity,
        unitRate,
        invoiceNumber: purchaseForm.invoiceNumber,
      })
      
      const newPurchase = addPurchase({
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId,
        itemId: purchaseForm.itemId,
        quantity,
        unitRate,
        invoiceNumber: purchaseForm.invoiceNumber,
      })

      console.log("[Inventory Page] Purchase added, new purchase:", newPurchase)
      console.log("[Inventory Page] Current purchases from context:", purchases.length)

      // Create finance expense automatically
      if (item) {
        const description = `${item.code} ${item.name} ${quantity.toFixed(0)}${item.unit}`
        const invoiceRef = purchaseForm.invoiceNumber ? ` INV-${purchaseForm.invoiceNumber}` : ""
        
        const financeTransaction = addTransaction({
          type: "expense",
          category: "Feed Purchase",
          amount: totalAmount,
          date: purchaseForm.date,
          description: `${description}${invoiceRef}`,
          reference: purchaseForm.invoiceNumber || "",
        })

        // Link finance transaction to purchase
        if (newPurchase && financeTransaction) {
          linkPurchaseToFinance(newPurchase.id, financeTransaction.id)
        }
      }
      
      // Force a refresh by reading from localStorage
      setTimeout(() => {
        const savedPurchases = JSON.parse(localStorage.getItem("poultry_purchases") || "[]")
        console.log("[Inventory Page] Purchases in localStorage after save:", savedPurchases.length)
      }, 100)
    }
    resetPurchaseForm()
    setIsPurchaseDialogOpen(false)
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

  const handleDeletePurchase = (purchase: any) => {
    console.log("[Purchase Delete] Attempting to delete purchase:", purchase)
    
    // Check if purchase is linked to any issues
    const linkedIssues = getIssuesByItem(purchase.itemId)
    const item = getItemById(purchase.itemId)
    
    console.log("[Purchase Delete] Linked issues:", linkedIssues.length)
    console.log("[Purchase Delete] Item:", item)
    
    if (linkedIssues.length > 0) {
      // Check if any issues occurred after this purchase date
      const purchaseDate = new Date(purchase.date)
      const issuesAfterPurchase = linkedIssues.filter(
        (issue) => new Date(issue.date) >= purchaseDate
      )
      
      console.log("[Purchase Delete] Issues after purchase date:", issuesAfterPurchase.length)
      
      if (issuesAfterPurchase.length > 0) {
        alert(
          `Cannot delete this purchase. It is linked to ${issuesAfterPurchase.length} issue/consumption record(s) that occurred on or after the purchase date.`
        )
        return
      }
    }

    const itemName = item ? `${item.code} - ${item.name}` : "this item"
    const quantity = typeof purchase.quantity === 'number' 
      ? purchase.quantity.toFixed(2) 
      : Number.parseFloat(String(purchase.quantity)).toFixed(2)
    const unit = item?.unit || ""

    const confirmMessage = `Delete this purchase?\n\nStock will decrease by ${quantity} ${unit}.\n\nItem: ${itemName}`

    if (confirm(confirmMessage)) {
      console.log("[Purchase Delete] Confirmed, calling deletePurchase with id:", purchase.id)
      console.log("[Purchase Delete] Finance transaction ID:", purchase.financeTransactionId)
      
      // Delete linked finance transaction FIRST if it exists
      if (purchase.financeTransactionId) {
        console.log("[Purchase Delete] Deleting finance transaction:", purchase.financeTransactionId)
        deleteTransaction(purchase.financeTransactionId)
        console.log("[Purchase Delete] Finance transaction deleted")
        
        // Verify deletion
        setTimeout(() => {
          const transactionsAfterDelete = JSON.parse(localStorage.getItem("poultry_transactions") || "[]")
          const transactionExists = transactionsAfterDelete.some((t: any) => t.id === purchase.financeTransactionId)
          console.log("[Purchase Delete] Transaction still exists after delete:", transactionExists)
          if (transactionExists) {
            console.error("[Purchase Delete] ERROR: Finance transaction was not deleted!")
          }
        }, 100)
      }
      
      deletePurchase(purchase.id)
      console.log("[Purchase Delete] deletePurchase called")
    } else {
      console.log("[Purchase Delete] Delete cancelled by user")
    }
  }

  const startAddNewPurchase = () => {
    resetPurchaseForm()
    setIsPurchaseDialogOpen(true)
  }

  // Backfill function: Create finance expenses for existing purchases that don't have them
  const syncExistingPurchasesToFinance = () => {
    const purchasesWithoutFinance = purchases.filter((p) => !p.financeTransactionId)
    
    if (purchasesWithoutFinance.length === 0) {
      alert("All purchases are already synced with finance!")
      return
    }

    if (!confirm(`This will create ${purchasesWithoutFinance.length} finance expense(s) for existing purchases. Continue?`)) {
      return
    }

    let syncedCount = 0
    purchasesWithoutFinance.forEach((purchase) => {
      const item = getItemById(purchase.itemId)
      if (item) {
        const description = `${item.code} ${item.name} ${purchase.quantity.toFixed(0)}${item.unit}`
        const invoiceRef = purchase.invoiceNumber ? ` INV-${purchase.invoiceNumber}` : ""
        
        const financeTransaction = addTransaction({
          type: "expense",
          category: "Feed Purchase",
          amount: purchase.totalAmount,
          date: purchase.date,
          description: `${description}${invoiceRef}`,
          reference: purchase.invoiceNumber || "",
        })

        if (financeTransaction) {
          linkPurchaseToFinance(purchase.id, financeTransaction.id)
          syncedCount++
        }
      }
    })

    alert(`Successfully synced ${syncedCount} purchase(s) with finance expenses!`)
  }

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault()
    addIssue({
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
  }

  const lowStockItems = getLowStockItems()
  const totalValue = items.reduce((sum, item) => sum + item.currentStock * item.averageCost, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Track items, purchases, and issues for your broiler farm</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
            setIsItemDialogOpen(open)
            if (!open) {
              resetItemForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={startAddNewItem}>
                <Package className="h-4 w-4 mr-2" />
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
              <Button variant="outline" onClick={startAddNewPurchase}>
                <ShoppingCart className="h-4 w-4 mr-2" />
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
              <Button>
                <TrendingDown className="h-4 w-4 mr-2" />
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
        <Card className="mb-6 border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>{lowStockItems.length} items below reorder level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {item.code} - {item.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
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

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="py-4">
          <CardHeader className="pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold">₹{totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold">{purchases.length}</div>
            <p className="text-xs text-muted-foreground">Purchase entries</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} className="space-y-4" onValueChange={(value) => {
        setActiveTabState(value)
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          url.searchParams.set("tab", value)
          window.history.pushState({}, "", url)
        }
      }}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="items">Item Master</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Master</CardTitle>
              <CardDescription>All inventory items with current stock and average cost</CardDescription>
            </CardHeader>
            <CardContent>
                  {items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No items added yet</p>
                  <Button onClick={startAddNewItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Avg Cost (₹)</TableHead>
                        <TableHead className="text-right">Value (₹)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="capitalize">
                            {CATEGORIES.find((c) => c.value === item.category)?.label}
                          </TableCell>
                          <TableCell className="text-right">
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
                          <TableCell className="text-right">{item.averageCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {(item.currentStock * item.averageCost).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.currentStock <= item.reorderLevel ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(item)}>
                                <Trash2 className="h-4 w-4" />
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

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchase Entries</CardTitle>
                  <CardDescription>All purchase transactions</CardDescription>
                </div>
                {purchases.some((p) => !p.financeTransactionId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncExistingPurchasesToFinance}
                    className="text-green-600 hover:text-green-700"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sync Existing Purchases to Finance
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No purchases recorded yet</p>
                  <Button onClick={startAddNewPurchase}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Purchase Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Rate (₹)</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((purchase) => {
                          const item = getItemById(purchase.itemId)
                          const supplier = suppliers.find((s) => s.id === purchase.supplierId)
                          return (
                            <TableRow key={purchase.id}>
                              <TableCell>{new Date(purchase.date).toLocaleDateString()}</TableCell>
                              <TableCell>{supplier?.name || "Unknown"}</TableCell>
                              <TableCell>
                                {item ? `${item.code} - ${item.name}` : "Item Deleted"}
                              </TableCell>
                              <TableCell className="text-right">
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
                              <TableCell className="text-right">{purchase.unitRate.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {purchase.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell>{purchase.invoiceNumber || "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEditPurchase(purchase)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleDeletePurchase(purchase)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  {purchase.financeTransactionId && (
                                    <Link href={`/dashboard/finance?transactionId=${purchase.financeTransactionId}`}>
                                      <Button variant="ghost" size="sm" title="View in Finance">
                                        <ExternalLink className="h-4 w-4 text-green-600" />
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

        <TabsContent value="issues" className="space-y-4">
          {issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Issue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Feed Issued</p>
                    <p className="text-xl font-bold text-blue-600">
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
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Medicine & Vaccine Cost</p>
                    <p className="text-xl font-bold text-green-600">
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

          <Card>
            <CardHeader>
              <CardTitle>Issue History</CardTitle>
              <CardDescription>{issues.length} total issues</CardDescription>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No issues recorded yet</p>
                  <Button onClick={() => setIsIssueDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Issue Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Cost/Unit (₹)</TableHead>
                        <TableHead className="text-right">Total Cost (₹)</TableHead>
                        <TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issues
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((issue) => {
                          const item = getItemById(issue.itemId)
                          const batch = batches.find((b) => b.id === issue.batchId)
                          return (
                            <TableRow key={issue.id}>
                              <TableCell>{new Date(issue.date).toLocaleDateString()}</TableCell>
                              <TableCell>{batch?.batchNumber || "Unknown"}</TableCell>
                              <TableCell>
                                {item ? `${item.code} - ${item.name}` : "Item Deleted"}
                              </TableCell>
                              <TableCell className="text-right">
                                {issue.quantity.toFixed(2)} {item?.unit || ""}
                              </TableCell>
                              <TableCell className="text-right">{issue.costPerUnit.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">{issue.totalCost.toFixed(2)}</TableCell>
                              <TableCell>{issue.purpose}</TableCell>
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

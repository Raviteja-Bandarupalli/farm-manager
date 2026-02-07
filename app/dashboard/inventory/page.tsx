"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useMasterData } from "@/lib/master-data-context"
import { useBatch } from "@/lib/batch-context"
import { useAuth } from "@/lib/auth-context"
import { useFinance } from "@/lib/finance-context"
import { useInventory, type InventoryItem, type PurchaseEntry, type IssueEntry, type StockTransfer, CORE_INGREDIENTS } from "@/lib/inventory-context"
import { useDailyLogs } from "@/lib/daily-logs-context"
import { formatIndianDate, cn } from "@/lib/utils"
import { getTodayDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Package, ShoppingCart, TrendingDown, TrendingUp, AlertTriangle, Edit, Trash2, ExternalLink, ArrowRightLeft } from "lucide-react"
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
    transfers,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addPurchase,
    addBulkPurchaseAndDispatch,
    updatePurchase,
    deletePurchase,
    linkPurchaseToFinance,
    addIssue,
    moveStock,
    getItemById,
    getPurchaseById,
    getIssuesByItem,
    getLowStockItems,
    initializeCoreItems,
  } = useInventory()

  const { dailyLogs } = useDailyLogs()
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)
  const [isBulkPurchaseDialogOpen, setIsBulkPurchaseDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null)

  const [itemForm, setItemForm] = useState({
    farmId: "" as string,
    code: "",
    name: "",
    category: "feed-raw" as any,
    unit: "kg",
    openingStock: "",
    openingValue: "",
    reorderLevel: "500",
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

  const [bulkPurchaseForm, setBulkPurchaseForm] = useState({
    date: getTodayDate(),
    supplierId: "",
    ingredientCode: "",
    totalKg: "",
    totalBags: "",
    dispatches: [] as { farmId: string; quantity: string; bags: string; manualOverride: boolean }[]
  })

  const handleDispatchChange = (index: number, field: string, value: string) => {
    const newDispatches = [...bulkPurchaseForm.dispatches]
    const d = { ...newDispatches[index] }

    if (field === 'quantity') {
      d.quantity = value
      d.manualOverride = true
    } else if (field === 'bags') {
      d.bags = value
      const bags = Number(value)
      if (bags >= 0) {
        d.quantity = (bags * 50).toString()
        d.manualOverride = false
      }
    }

    newDispatches[index] = d
    setBulkPurchaseForm({ ...bulkPurchaseForm, dispatches: newDispatches })
  }

  const [transferForm, setTransferForm] = useState({
    date: getTodayDate(),
    itemId: "", // Source item ID
    sourceFarmId: "",
    destinationFarmId: "",
    quantity: "",
    driverNotes: ""
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
          farmId: itemForm.farmId,
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
      farmId: "",
      code: "",
      name: "",
      category: "feed-raw",
      unit: "kg",
      openingStock: "",
      openingValue: "",
      reorderLevel: "500",
    })
    setEditingItemId(null)
  }

  const handleEdit = (item: any) => {
    setEditingItemId(item.id)
    setItemForm({
      farmId: item.farmId,
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
    const itemName = `${item.code} - ${item.name}`
    if (confirm(`Delete ${itemName} from this location?`)) {
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

  const startAddNewPurchase = () => {
    resetPurchaseForm()
    setIsPurchaseDialogOpen(true)
  }

  const startBulkPurchase = () => {
    setBulkPurchaseForm({
      date: getTodayDate(),
      supplierId: "",
      ingredientCode: "",
      totalKg: "",
      totalBags: "",
      dispatches: farms.map(f => ({ farmId: f.id, quantity: "", bags: "", manualOverride: false }))
    })
    setIsBulkPurchaseDialogOpen(true)
  }

  useEffect(() => {
    if (isBulkPurchaseDialogOpen && bulkPurchaseForm.dispatches.length === 0 && farms.length > 0) {
      setBulkPurchaseForm(prev => ({
        ...prev,
        dispatches: farms.map(f => ({ farmId: f.id, quantity: "", bags: "", manualOverride: false }))
      }))
    }
  }, [isBulkPurchaseDialogOpen, farms, bulkPurchaseForm.dispatches.length])

  const handleBulkPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const activeDispatches = bulkPurchaseForm.dispatches
      .filter(d => Number(d.quantity) > 0)
      .map(d => ({
        farmId: d.farmId,
        quantity: Number(d.quantity)
      }))

    const totalDispatchedKg = activeDispatches.reduce((sum, d) => sum + d.quantity, 0)
    const lorryTotalKg = Number(bulkPurchaseForm.totalKg || 0)

    if (activeDispatches.length === 0) {
      alert("Please enter quantities for at least one location.")
      return
    }

    if (Math.abs(totalDispatchedKg - lorryTotalKg) > 0.01) {
      alert(`The sum of dispatches (${totalDispatchedKg.toLocaleString()} KG) must match the Total Lorry Load (${lorryTotalKg.toLocaleString()} KG).`)
      return
    }

    try {
      await addBulkPurchaseAndDispatch({
        date: bulkPurchaseForm.date,
        supplierId: bulkPurchaseForm.supplierId,
        ingredientCode: bulkPurchaseForm.ingredientCode,
        unitRate: 0,
        invoiceNumber: "CHALLAN-" + Date.now().toString().slice(-6),
        quantity: lorryTotalKg,
      }, activeDispatches)

      setBulkPurchaseForm({
        date: getTodayDate(),
        supplierId: "",
        ingredientCode: "",
        totalKg: "",
        totalBags: "",
        dispatches: []
      })
      setIsBulkPurchaseDialogOpen(false)
    } catch (err) {
      console.error("Bulk purchase failed:", err)
      alert(err instanceof Error ? err.message : "Failed to save bulk purchase.")
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (transferForm.sourceFarmId === transferForm.destinationFarmId) {
        alert("Source and destination cannot be the same.")
        return
      }

      await moveStock({
        date: transferForm.date,
        itemId: transferForm.itemId,
        sourceFarmId: transferForm.sourceFarmId,
        destinationFarmId: transferForm.destinationFarmId,
        quantity: Number(transferForm.quantity),
        driverNotes: transferForm.driverNotes
      })

      setIsTransferDialogOpen(false)
    } catch (err) {
      console.error("Transfer failed:", err)
      alert(err instanceof Error ? err.message : "Failed to transfer stock.")
    }
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

  // Calculate 7-day average mixing for alerts
  const getAverageDailyMixing = (farmId: string | null, code: string) => {
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    const dateStr = last7Days.toISOString().split('T')[0]

    const logs = dailyLogs.filter(l => {
      if (l.date < dateStr) return false
      const house = houses.find(h => h.id === l.houseId)
      return house?.farmId === farmId
    })

    if (logs.length === 0) return 0

    let total = 0
    logs.forEach(l => {
      if (code === "MAIZE") total += Number(l.maize_kg || 0)
      if (code === "SOYA") total += Number(l.soya_kg || 0)
      if (code === "BROKENRICE") total += Number(l.brokenrice_kg || 0)
      if (code === "SUPPL-5") total += Number(l.suppl5_kg || 0)
    })

    return total / 7
  }

  const lowStockItems = getLowStockItems()
  const totalValue = items.reduce((sum, item) => sum + (Number(item.currentStock) * Number(item.averageCost)), 0)

  const isCoreSetupComplete = farms.every(farm =>
    ["MAIZE", "SOYA", "BROKENRICE", "SUPPL-5"].every(code =>
      items.some(item => item.code === code && item.farmId === farm.id)
    )
  )

  // Global Aggregates for Top Header
  const totalMaize = items.filter(i => i.code === "MAIZE").reduce((sum, i) => sum + Number(i.currentStock), 0)
  const totalSoya = items.filter(i => i.code === "SOYA").reduce((sum, i) => sum + Number(i.currentStock), 0)
  const totalBrokenRice = items.filter(i => i.code === "BROKENRICE").reduce((sum, i) => sum + Number(i.currentStock), 0)
  const totalSuppl5 = items.filter(i => i.code === "SUPPL-5").reduce((sum, i) => sum + Number(i.currentStock), 0)

  // Movement History (Chronological)
  const movementHistory = [
    ...purchases.map(p => ({ ...p, type: 'purchase' as const })),
    ...issues.map(i => ({ ...i, type: 'issue' as const })),
    ...transfers.map(t => ({ ...t, type: 'transfer' as const }))
  ].sort((a, b) => b.date.localeCompare(a.date))

  const filteredHistory = movementHistory.filter(m => {
    if (!selectedFarmId) return true
    if (m.type === 'purchase') {
      const item = items.find(i => i.id === m.itemId)
      return item?.farmId === selectedFarmId
    }
    if (m.type === 'issue') {
      const item = items.find(i => i.id === m.itemId)
      return item?.farmId === selectedFarmId
    }
    if (m.type === 'transfer') {
      return m.sourceFarmId === selectedFarmId || m.destinationFarmId === selectedFarmId
    }
    return false
  })

  const handleInitializeCore = async () => {
    if (confirm("This will initialize core inventory items (Maize, Soya, Broken Rice, 5% Supplement) for all farms. Continue?")) {
      try {
        await initializeCoreItems(farms)
        alert("Inventory initialization complete!")
      } catch (err) {
        console.error("Failed to initialize core items:", err)
        alert("Failed to initialize inventory.")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Inventory Control</h1>
          <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Professional Stock & Mixing Dashboard</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "owner" && (
            <>
              <Dialog open={isBulkPurchaseDialogOpen} onOpenChange={setIsBulkPurchaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    className="bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider"
                    onClick={startBulkPurchase}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Purchase & Dispatch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
                  <div className="bg-slate-900 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase">
                          <ShoppingCart className="h-6 w-6" />
                          LORRY DELIVERY CHALLAN
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Weight Tracking & Distribution</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-500">Date</p>
                        <p className="font-bold">{formatIndianDate(bulkPurchaseForm.date)}</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBulkPurchaseSubmit} className="p-6 space-y-8 bg-white rounded-b-lg">
                    {/* Header Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500">Supplier</label>
                        <Select
                          value={bulkPurchaseForm.supplierId}
                          onValueChange={(v) => setBulkPurchaseForm({ ...bulkPurchaseForm, supplierId: v })}
                          required
                        >
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500">Ingredient</label>
                        <Select
                          value={bulkPurchaseForm.ingredientCode}
                          onValueChange={(v) => {
                            const initialDispatches = farms.map(f => ({ farmId: f.id, quantity: "", bags: "", manualOverride: false }))
                            setBulkPurchaseForm({ ...bulkPurchaseForm, ingredientCode: v, dispatches: initialDispatches })
                          }}
                          required
                        >
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {CORE_INGREDIENTS.map((core) => (
                              <SelectItem key={core.code} value={core.code}>
                                {core.code} - {core.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Total Lorry Load Section */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-1">1. Lorry Total Load</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-600">Total KG in Bill *</label>
                          <Input
                            type="number"
                            step="0.1"
                            className="h-12 text-xl font-black border-2 border-slate-900"
                            value={bulkPurchaseForm.totalKg}
                            onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, totalKg: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-600">Total Bags in Bill</label>
                          <Input
                            type="number"
                            className="h-12 text-xl font-black border-2 border-slate-900"
                            value={bulkPurchaseForm.totalBags}
                            onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, totalBags: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2 flex gap-4">
                          <div className={`flex-1 p-2 rounded border-2 border-dashed ${
                            Math.abs((bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0)) - Number(bulkPurchaseForm.totalKg || 0)) < 0.1
                            ? 'bg-green-50 border-green-500 text-green-700'
                            : 'bg-amber-50 border-amber-500 text-amber-700'
                          }`}>
                            <p className="text-[9px] font-black uppercase opacity-70">Remaining KG</p>
                            <p className="text-lg font-black tracking-tighter">
                              {(Number(bulkPurchaseForm.totalKg || 0) - bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0)).toLocaleString()} KG
                            </p>
                          </div>
                          <div className="flex-1 p-2 rounded border-2 border-dashed bg-slate-50 border-slate-200">
                            <p className="text-[9px] font-black uppercase opacity-70">Remaining Bags</p>
                            <p className="text-lg font-black tracking-tighter">
                              {(Number(bulkPurchaseForm.totalBags || 0) - bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.bags || 0), 0)).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dispatch Table */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-1">2. Farm Wise Dispatch</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="py-2 px-4 font-black uppercase text-[10px]">Location</th>
                              <th className="py-2 px-4 font-black uppercase text-[10px] w-32">Bags</th>
                              <th className="py-2 px-4 font-black uppercase text-[10px] w-48 text-right">Exact KG</th>
                              <th className="py-2 px-4 w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bulkPurchaseForm.dispatches.map((dispatch, idx) => {
                              const farm = farms.find(f => f.id === dispatch.farmId)
                              const label = farm?.name || "Unknown"

                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-4 font-bold text-slate-700">{label}</td>
                                  <td className="py-2 px-4">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="h-10 font-bold"
                                      value={dispatch.bags}
                                      onChange={(e) => handleDispatchChange(idx, 'bags', e.target.value)}
                                    />
                                  </td>
                                  <td className="py-2 px-4">
                                    <div className="flex items-center gap-2 justify-end">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="0.0"
                                        className={`h-10 w-32 font-black text-right ${dispatch.manualOverride ? 'border-amber-400 bg-amber-50' : ''}`}
                                        value={dispatch.quantity}
                                        onChange={(e) => handleDispatchChange(idx, 'quantity', e.target.value)}
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">KG</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    {dispatch.manualOverride && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-amber-600"
                                        onClick={() => {
                                          const newDispatches = [...bulkPurchaseForm.dispatches]
                                          const autoQty = Number(dispatch.bags) * 50
                                          newDispatches[idx] = {
                                            ...dispatch,
                                            quantity: String(autoQty),
                                            manualOverride: false
                                          }
                                          setBulkPurchaseForm({ ...bulkPurchaseForm, dispatches: newDispatches })
                                        }}
                                        title="Reset to 50kg per bag"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-slate-900 text-white font-black">
                            <tr>
                              <td className="py-3 px-4 uppercase text-[10px]">Total Dispatched</td>
                              <td className="py-3 px-4">{bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.bags || 0), 0)} Bags</td>
                              <td className="py-3 px-4 text-right">
                                {bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0).toLocaleString()} KG
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 text-white p-6 rounded-lg shadow-xl">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[10px] uppercase text-slate-400 font-black mb-1">Total Lorry Load</p>
                          <p className="text-3xl font-black tracking-tight">
                            {Number(bulkPurchaseForm.totalKg || 0).toLocaleString()} <span className="text-sm">KG</span>
                          </p>
                        </div>
                        <div className="border-l border-slate-700 pl-8">
                          <p className="text-[10px] uppercase text-slate-400 font-black mb-1">Status</p>
                          <p className={`text-xl font-black tracking-tight ${Math.abs(Number(bulkPurchaseForm.totalKg || 0) - bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0)) < 0.1 ? 'text-green-400' : 'text-amber-400'}`}>
                            {Math.abs(Number(bulkPurchaseForm.totalKg || 0) - bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0)) < 0.1
                              ? 'READY TO RECORD'
                              : `NEED ${Math.abs(Number(bulkPurchaseForm.totalKg || 0) - bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0)).toLocaleString()} KG MORE`}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full md:w-64 h-16 text-lg font-black uppercase tracking-widest bg-white text-slate-900 hover:bg-slate-200"
                        disabled={Math.abs((bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0)) - Number(bulkPurchaseForm.totalKg || 0)) > 0.01}
                      >
                        Record Challan
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Move Stock
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inter-Farm Stock Transfer</DialogTitle>
                    <DialogDescription>Move existing stock between farm locations</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={transferForm.date}
                        onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source Location</label>
                      <Select
                        value={transferForm.sourceFarmId || ""}
                        onValueChange={(v) => setTransferForm({ ...transferForm, sourceFarmId: v, itemId: "" })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {farms.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ingredient</label>
                      <Select
                        value={transferForm.itemId}
                        onValueChange={(v) => setTransferForm({ ...transferForm, itemId: v })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.filter(i => i.farmId === transferForm.sourceFarmId).map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Stock: {item.currentStock} KG)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Destination Location</label>
                      <Select
                        value={transferForm.destinationFarmId || ""}
                        onValueChange={(v) => setTransferForm({ ...transferForm, destinationFarmId: v })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {farms.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity (KG)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={transferForm.quantity}
                        onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Driver Notes / Tractor #</label>
                      <Input
                        value={transferForm.driverNotes}
                        onChange={(e) => setTransferForm({ ...transferForm, driverNotes: e.target.value })}
                        placeholder="e.g., Tractor 1 - Ramesh"
                      />
                    </div>

                    <Button type="submit" className="w-full">Confirm Transfer</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!isCoreSetupComplete && user?.role === "owner" && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-800 flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Complete Inventory Setup
            </CardTitle>
            <CardDescription className="text-blue-600">
              Initialize professional inventory tracking (Maize, Soya, Broken Rice, 5%) for all your farm locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInitializeCore} className="bg-blue-600 hover:bg-blue-700">
              Setup Professional Inventory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 1. Top Metrics Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Maize", value: totalMaize, code: "MAIZE" },
          { label: "Total Soya", value: totalSoya, code: "SOYA" },
          { label: "Total Broken Rice", value: totalBrokenRice, code: "BROKENRICE" },
          { label: "Total 5% Suppl", value: totalSuppl5, code: "SUPPL-5" },
        ].map((stat, idx) => (
          <Card key={idx} className="shadow-sm border-t-2 border-t-red-600">
            <CardHeader className="py-1.5 px-3 border-b">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">{stat.label}</span>
            </CardHeader>
            <CardContent className="p-3">
              <div className="text-xl font-black tracking-tight text-slate-900">
                {stat.value.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 uppercase">KG</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 italic">~{(stat.value / 50).toFixed(0)} Bags</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Farm Sidebar-style Filter */}
        <div className="w-full md:w-64 space-y-2 flex-shrink-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-2">Locations</p>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start font-extrabold tracking-tight",
                !selectedFarmId && "bg-slate-200/60 border-l-4 border-slate-900 rounded-none"
              )}
              onClick={() => setSelectedFarmId(null)}
            >
              All Locations
            </Button>
            {farms.map((farm) => (
              <Button
                key={farm.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start font-extrabold tracking-tight",
                  selectedFarmId === farm.id && "bg-slate-200/60 border-l-4 border-slate-900 rounded-none"
                )}
                onClick={() => setSelectedFarmId(farm.id)}
              >
                {farm.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {/* Station Overview Card (only if farm selected) */}
          {selectedFarmId && (
            <Card className="shadow-sm bg-slate-50 border-slate-200">
              <CardHeader className="py-2 px-4 border-b">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Station Overview: {farms.find(f => f.id === selectedFarmId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {items
                    .filter(i => i.farmId === selectedFarmId && Number(i.currentStock) > 0)
                    .map((item, idx) => {
                      const avgDaily = getAverageDailyMixing(selectedFarmId, item.code)
                      const daysLeft = avgDaily > 0 ? Number(item.currentStock) / avgDaily : 99
                      const isLow = daysLeft < 3
                      return (
                        <div key={idx} className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-slate-400">{item.name}</p>
                          <p className={cn("text-lg font-black tracking-tight", isLow ? "text-red-600" : "text-slate-900")}>
                            {Number(item.currentStock).toLocaleString()} <span className="text-[10px]">KG</span>
                          </p>
                          {avgDaily > 0 && (
                            <p className={cn("text-[8px] font-bold uppercase", isLow ? "text-red-500" : "text-slate-400")}>
                              {isLow ? `LOW: ${daysLeft.toFixed(1)} DAYS` : `${daysLeft.toFixed(0)}+ DAYS SUPPLY`}
                            </p>
                          )}
                        </div>
                      )
                    })
                  }
                  {items.filter(i => i.farmId === selectedFarmId && Number(i.currentStock) > 0).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No active stock at this location.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

      <Tabs value={activeTab} className="space-y-4" onValueChange={(value) => {
        setActiveTabState(value)
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          url.searchParams.set("tab", value)
          window.history.pushState({}, "", url)
        }
      }}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-sm border-none">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Stock Movement History</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Chronological list of all stock ins and outs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-10">
                      <TableHead className="text-[10px] font-extrabold uppercase pl-6 w-32">Date</TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase w-32">Type</TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase">Farm</TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase">Item</TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase text-right">Qty (KG)</TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase">Reference</TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase text-center pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-slate-400 italic text-xs">No movement history found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((m: any, idx) => {
                        let farmName = "-"
                        let itemName = "-"
                        let reference = "-"
                        let qtyColor = "text-slate-900"

                        if (m.type === 'purchase') {
                          const item = items.find(i => i.id === m.itemId)
                          farmName = farms.find(f => f.id === item?.farmId)?.name || "-"
                          itemName = item?.name || "-"
                          reference = m.invoiceNumber ? `Inv: ${m.invoiceNumber}` : "Purchase"
                          qtyColor = "text-green-600"
                        } else if (m.type === 'issue') {
                          const item = items.find(i => i.id === m.itemId)
                          farmName = farms.find(f => f.id === item?.farmId)?.name || "-"
                          itemName = item?.name || "-"
                          reference = m.purpose || "Mix Deduction"
                          qtyColor = "text-red-600"
                        } else if (m.type === 'transfer') {
                          const item = items.find(i => i.id === m.itemId)
                          const from = farms.find(f => f.id === m.sourceFarmId)?.name || "Unknown"
                          const to = farms.find(f => f.id === m.destinationFarmId)?.name || "Unknown"
                          farmName = `${from} → ${to}`
                          itemName = item?.name || "-"
                          reference = m.driverNotes || "Transfer"
                          qtyColor = "text-blue-600"
                        }

                        return (
                          <TableRow key={idx} className="h-11 hover:bg-slate-50/50 border-b">
                            <TableCell className="pl-6 text-[11px] font-bold text-slate-600">{formatIndianDate(m.date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "text-[9px] font-black uppercase px-2 py-0 h-5",
                                m.type === 'purchase' ? "bg-green-50 text-green-700 border-green-200" :
                                m.type === 'issue' ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-blue-50 text-blue-700 border-blue-200"
                              )}>
                                {m.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[11px] font-extrabold text-slate-700">{farmName}</TableCell>
                            <TableCell className="text-[11px] font-bold text-slate-900">{itemName}</TableCell>
                            <TableCell className={cn("text-right font-black text-xs", qtyColor)}>
                              {m.type === 'issue' ? '-' : '+'}{Number(m.quantity).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-[10px] font-medium text-slate-400 italic truncate max-w-[150px]">{reference}</TableCell>
                            <TableCell className="pr-6">
                              <div className="flex justify-center gap-1">
                                {user?.role === "owner" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600"
                                    onClick={() => {
                                      if (confirm(`Delete this ${m.type} entry?`)) {
                                        if (m.type === 'purchase') deletePurchase(m.id)
                                        // Transfer and Issue deletion might need context support if not already there
                                        // For now, these are the primary ones.
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card className="shadow-sm border-none">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Purchase Entries</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">All bulk purchase transactions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {purchases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">No purchases recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-10">
                        <TableHead className="text-[10px] font-extrabold uppercase pl-6">Date</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">Supplier</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">Item</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase text-right">Total KG</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase text-right">Rate</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase text-right">Amount</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase pr-6">Inv #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map(p => {
                        const item = getItemById(p.itemId)
                        const supplier = suppliers.find(s => s.id === p.supplierId)
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{formatIndianDate(p.date)}</TableCell>
                            <TableCell>{supplier?.name || "-"}</TableCell>
                            <TableCell>{item?.name || "-"}</TableCell>
                            <TableCell className="text-right font-bold">{Number(p.quantity).toLocaleString()} KG</TableCell>
                            <TableCell className="text-right">₹{Number(p.unitRate).toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{Number(p.totalAmount).toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-xs">{p.invoiceNumber || "-"}</TableCell>
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

        <TabsContent value="transfers" className="space-y-4">
          <Card className="shadow-sm border-none">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Stock Transfers</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Inter-farm movement history</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsTransferDialogOpen(true)} className="h-7 text-[10px] font-bold uppercase">
                  <Plus className="h-3 w-3 mr-1" />
                  New Transfer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transfers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic text-xs">No transfers recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-10">
                        <TableHead className="text-[10px] font-extrabold uppercase pl-6">Date</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">Item</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">From</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">To</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase text-right">Quantity</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase pr-6">Driver/Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map(t => {
                        const item = items.find(i => i.id === t.itemId)
                        const from = farms.find(f => f.id === t.sourceFarmId)?.name || "Unknown"
                        const to = farms.find(f => f.id === t.destinationFarmId)?.name || "Unknown"

                        return (
                          <TableRow key={t.id}>
                            <TableCell>{formatIndianDate(t.date)}</TableCell>
                            <TableCell className="font-bold">{item?.name || "Deleted Item"}</TableCell>
                            <TableCell>{from}</TableCell>
                            <TableCell>{to}</TableCell>
                            <TableCell className="text-right font-bold">{Number(t.quantity).toLocaleString()} KG</TableCell>
                            <TableCell className="text-sm italic">{t.driverNotes || "-"}</TableCell>
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
          <Card className="shadow-sm border-none">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-base font-bold">Issue History</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400">{issues.length} total issues recorded</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4 text-xs italic">No issues recorded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-10">
                        <TableHead className="text-[10px] font-extrabold uppercase pl-6">Date</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">Batch</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase">Item</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase text-right">Quantity</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase text-right">Total Cost</TableHead>
                        <TableHead className="text-[10px] font-extrabold uppercase pr-6">Purpose</TableHead>
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
                              <TableCell>{formatIndianDate(issue.date)}</TableCell>
                              <TableCell>{batch?.batchNumber || "Unknown"}</TableCell>
                              <TableCell>
                                {item ? `${item.code} - ${item.name}` : "Item Deleted"}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(issue.quantity).toFixed(2)} {item?.unit || ""}
                              </TableCell>
                              <TableCell className="text-right font-medium">₹{Number(issue.totalCost).toLocaleString()}</TableCell>
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
      </div>

      {/* Add Custom Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
        setIsItemDialogOpen(open)
        if (!open) resetItemForm()
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={itemForm.farmId || ""}
                onValueChange={(v) => setItemForm({ ...itemForm, farmId: v })}
                disabled={!!editingItemId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {farms.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Code</label>
                <Input
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                  placeholder="e.g., MEDICINE-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g., Amoxycillin"
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
                  required
                />
              </div>
            </div>
            {!editingItemId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opening Stock</label>
                  <Input
                    type="number"
                    value={itemForm.openingStock}
                    onChange={(e) => setItemForm({ ...itemForm, openingStock: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opening Value (₹)</label>
                  <Input
                    type="number"
                    value={itemForm.openingValue}
                    onChange={(e) => setItemForm({ ...itemForm, openingValue: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reorder Level</label>
              <Input
                type="number"
                value={itemForm.reorderLevel}
                onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {editingItemId ? "Update Item" : "Add Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

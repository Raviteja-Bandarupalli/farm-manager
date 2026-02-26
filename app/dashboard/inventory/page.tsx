"use client"

import React, { useState } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { useAuth } from "@/lib/auth-context"
import { useFinance } from "@/lib/finance-context"
import { useInventory, CORE_INGREDIENTS } from "@/lib/inventory-context"
import { useDailyLogs } from "@/lib/daily-logs-context"
import { useFeedLogs } from "@/lib/feed-logs-context"
import { formatIndianDate, cn } from "@/lib/utils"
import { getTodayDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Package, Edit, ArrowRightLeft } from "lucide-react"
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

export default function InventoryPage() {
  const { suppliers, houses, farms } = useMasterData()
  const { user } = useAuth()
  const { addTransaction } = useFinance()
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
    initializeCoreItems,
  } = useInventory()

  const { dailyLogs } = useDailyLogs()
  const { feedLogs } = useFeedLogs()
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isBulkPurchaseDialogOpen, setIsBulkPurchaseDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

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

  const [bulkPurchaseForm, setBulkPurchaseForm] = useState({
    date: getTodayDate(),
    supplierId: "",
    ingredientCode: "",
    totalKg: "",
    totalBags: "",
    totalCost: "",
    dispatches: [] as { farmId: string; quantity: string; bags: string; manualOverride: boolean }[]
  })

  const [transferForm, setTransferForm] = useState({
    date: getTodayDate(),
    itemId: "",
    sourceFarmId: "",
    destinationFarmId: "",
    quantity: "",
    driverNotes: ""
  })

  const handleDispatchChange = (index: number, field: string, value: string) => {
    const newDispatches = [...bulkPurchaseForm.dispatches]
    const d = { ...newDispatches[index] }
    const totalKg = Number(bulkPurchaseForm.totalKg || 0)
    const totalBags = Number(bulkPurchaseForm.totalBags || 0)
    const avgKgPerBag = totalBags > 0 ? totalKg / totalBags : 0

    if (field === 'bags') {
      d.bags = value
      const bags = Number(value)
      if (bags >= 0 && avgKgPerBag > 0) {
        d.quantity = (bags * avgKgPerBag).toFixed(2)
        d.manualOverride = false
      }
    } else if (field === 'quantity') {
      d.quantity = value
      d.manualOverride = true
    }

    newDispatches[index] = d
    setBulkPurchaseForm({ ...bulkPurchaseForm, dispatches: newDispatches })
  }

  const startBulkPurchase = () => {
    setBulkPurchaseForm({
      date: getTodayDate(),
      supplierId: "",
      ingredientCode: "",
      totalKg: "",
      totalBags: "",
      totalCost: "",
      dispatches: farms.map(f => ({ farmId: f.id, quantity: "", bags: "", manualOverride: false }))
    })
    setIsBulkPurchaseDialogOpen(true)
  }

  const handleBulkPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const activeDispatches = bulkPurchaseForm.dispatches
      .filter(d => Number(d.quantity) > 0)
      .map(d => ({ farmId: d.farmId, quantity: Number(d.quantity) }))

    const totalDispatchedKg = activeDispatches.reduce((sum, d) => sum + d.quantity, 0)
    const lorryTotalKg = Number(bulkPurchaseForm.totalKg || 0)

    if (activeDispatches.length === 0) {
      alert("Please enter quantities for at least one location.")
      return
    }

    if (Math.abs(totalDispatchedKg - lorryTotalKg) > 0.05) {
      alert(`The sum of dispatches must match the Total Lorry Load.`)
      return
    }

    try {
      const unitRate = Number(bulkPurchaseForm.totalCost || 0) / lorryTotalKg
      await addBulkPurchaseAndDispatch({
        date: bulkPurchaseForm.date,
        supplierId: bulkPurchaseForm.supplierId,
        ingredientCode: bulkPurchaseForm.ingredientCode,
        unitRate: unitRate,
        invoiceNumber: "CHALLAN-" + Date.now().toString().slice(-6),
        quantity: lorryTotalKg,
      }, activeDispatches)
      setIsBulkPurchaseDialogOpen(false)
    } catch (err) {
      console.error(err)
      alert("Failed to save bulk purchase.")
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
      console.error(err)
      alert("Failed to transfer stock.")
    }
  }

  const filteredItems = selectedFarmId
    ? items.filter(i => i.farmId === selectedFarmId)
    : items

  const displayTotalValue = filteredItems.reduce((sum, item) => sum + (Number(item.currentStock) * Number(item.averageCost)), 0)
  const displayMaize = filteredItems.filter(i => i.code === "MAIZE").reduce((sum, i) => sum + Number(i.currentStock), 0)
  const displaySoya = filteredItems.filter(i => i.code === "SOYA").reduce((sum, i) => sum + Number(i.currentStock), 0)
  const displayBrokenRice = filteredItems.filter(i => i.code === "BROKENRICE").reduce((sum, i) => sum + Number(i.currentStock), 0)

  // Calculate 7-day average mixing for alerts
  const getAverageDailyMixing = (farmId: string | null, code: string) => {
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    const dateStr = last7Days.toISOString().split('T')[0]

    const logs = feedLogs.filter(l => (farmId ? l.farmId === farmId : true) && l.date >= dateStr)
    if (logs.length === 0) return 0

    let total = 0
    logs.forEach(l => {
      if (code === "MAIZE") total += Number(l.maizeKg || 0)
      if (code === "SOYA") total += Number(l.soyaKg || 0)
      if (code === "BROKENRICE") total += Number(l.brokenRiceKg || 0)
      if (code === "SUPPL-5") total += Number(l.suppl5Kg || 0)
    })

    return total / 7
  }

  const getDaysLeft = (farmId: string | null) => {
    const ingredients = ["MAIZE", "SOYA", "BROKENRICE"]
    let minDays = 99

    ingredients.forEach(code => {
      const stock = filteredItems.filter(i => i.code === code).reduce((sum, i) => sum + Number(i.currentStock), 0)
      const avg = getAverageDailyMixing(farmId, code)
      if (avg > 0) {
        const days = stock / avg
        if (days < minDays) minDays = days
      }
    })

    return minDays === 99 ? "-" : Math.floor(minDays).toString()
  }

  const daysLeft = getDaysLeft(selectedFarmId)

  const movementHistory = [
    ...purchases.map(p => ({ ...p, type: 'purchase' as const })),
    ...issues.map(i => ({ ...i, type: 'issue' as const })),
    ...transfers.map(t => ({ ...t, type: 'transfer' as const }))
  ].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date)
    if (dateComp !== 0) return dateComp
    return (b as any).createdAt?.localeCompare((a as any).createdAt) || 0
  })

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

  const isCoreSetupComplete = farms.every(farm =>
    ["MAIZE", "SOYA", "BROKENRICE", "SUPPL-5"].every(code =>
      items.some(item => item.code === code && item.farmId === farm.id)
    )
  )

  const handleInitializeCore = async () => {
    if (confirm("Initialize core inventory items for all farms?")) {
      try {
        await initializeCoreItems(farms)
        alert("Inventory initialization complete!")
      } catch (err) {
        console.error(err)
        alert("Failed to initialize inventory.")
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Inventory Dashboard</h1>
          <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Centralized Stock & Mixing Control</p>
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
                    New Stock Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
                  <DialogHeader className="p-6 border-b bg-white">
                    <DialogTitle className="text-xl font-black tracking-tight uppercase">New Stock Entry</DialogTitle>
                    <DialogDescription className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Record bulk purchase and dispatch to farms</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleBulkPurchaseSubmit} className="p-6 space-y-6 bg-white">
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Supplier</label>
                          <Select
                            value={bulkPurchaseForm.supplierId}
                            onValueChange={(v) => setBulkPurchaseForm({ ...bulkPurchaseForm, supplierId: v })}
                            required
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-bold border-slate-200">
                              <SelectValue placeholder="Select Supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Ingredient</label>
                          <Select
                            value={bulkPurchaseForm.ingredientCode}
                            onValueChange={(v) => {
                              const initialDispatches = farms.map(f => ({ farmId: f.id, quantity: "", bags: "", manualOverride: false }))
                              setBulkPurchaseForm({ ...bulkPurchaseForm, ingredientCode: v, dispatches: initialDispatches })
                            }}
                            required
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-bold border-slate-200">
                              <SelectValue placeholder="Select Ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {CORE_INGREDIENTS.map((core) => (
                                <SelectItem key={core.code} value={core.code}>{core.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total KG</label>
                          <Input
                            type="number"
                            step="0.1"
                            className="h-9 bg-white text-xs font-bold border-slate-200"
                            value={bulkPurchaseForm.totalKg}
                            onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, totalKg: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total Price (₹)</label>
                          <Input
                            type="number"
                            className="h-9 bg-white text-xs font-bold border-slate-200"
                            value={bulkPurchaseForm.totalCost}
                            onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, totalCost: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total Bags</label>
                          <Input
                            type="number"
                            className="h-9 bg-white text-xs font-bold border-slate-200"
                            value={bulkPurchaseForm.totalBags}
                            onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, totalBags: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-1">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Farm Wise Dispatch</h3>
                        {Number(bulkPurchaseForm.totalKg) > 0 && Number(bulkPurchaseForm.totalBags) > 0 && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            Avg: {(Number(bulkPurchaseForm.totalKg) / Number(bulkPurchaseForm.totalBags)).toFixed(2)} KG / Bag
                          </span>
                        )}
                      </div>

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
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-4 font-bold text-slate-700">{farm?.name || "Unknown"}</td>
                                  <td className="py-2 px-4">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="h-9 font-bold border-slate-300"
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
                                        className={cn(
                                          "h-9 w-32 font-black text-right",
                                          dispatch.manualOverride ? "border-amber-400 bg-amber-50" : "bg-slate-100 border-slate-200 text-slate-500"
                                        )}
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
                                          const avg = Number(bulkPurchaseForm.totalKg) / Number(bulkPurchaseForm.totalBags)
                                          newDispatches[idx] = { ...dispatch, quantity: (Number(dispatch.bags) * avg).toFixed(2), manualOverride: false }
                                          setBulkPurchaseForm({ ...bulkPurchaseForm, dispatches: newDispatches })
                                        }}
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
                              <td className="py-2.5 px-4 uppercase text-[10px]">Current Total</td>
                              <td className="py-2.5 px-4">{bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.bags || 0), 0)} Bags</td>
                              <td className="py-2.5 px-4 text-right">
                                {bulkPurchaseForm.dispatches.reduce((s,d) => s + Number(d.quantity || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-4 border-t">
                      <div className="flex items-center justify-center min-h-8">
                        {Number(bulkPurchaseForm.totalKg) > 0 && (() => {
                          const diff = Number(bulkPurchaseForm.totalKg) - bulkPurchaseForm.dispatches.reduce((s, d) => s + Number(d.quantity || 0), 0)
                          const ok = Math.abs(diff) < 0.05
                          return (
                            <div className="flex items-center gap-2">
                              {ok ? <span className="text-[11px] font-black uppercase text-green-700">READY TO RECORD.</span> : <span className="text-[11px] font-black uppercase text-red-600">WAITING FOR ALL STOCK TO BE ASSIGNED (DIFF: {diff.toFixed(2)} KG).</span>}
                            </div>
                          )
                        })()}
                      </div>
                      <div className="flex items-center justify-between">
                        <Button variant="outline" type="button" onClick={() => setIsBulkPurchaseDialogOpen(false)} className="font-bold uppercase text-[11px] h-10 px-6">Cancel</Button>
                        <Button type="submit" className="font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 px-10 h-10" disabled={Math.abs(Number(bulkPurchaseForm.totalKg) - bulkPurchaseForm.dispatches.reduce((s, d) => s + Number(d.quantity || 0), 0)) > 0.1}>Confirm & Record Stock</Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider">
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
                      <Input type="date" value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source Location</label>
                      <Select value={transferForm.sourceFarmId || ""} onValueChange={(v) => setTransferForm({ ...transferForm, sourceFarmId: v, itemId: "" })} required>
                        <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                        <SelectContent>{farms.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ingredient</label>
                      <Select value={transferForm.itemId} onValueChange={(v) => setTransferForm({ ...transferForm, itemId: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>{items.filter(i => i.farmId === transferForm.sourceFarmId).map((item) => (<SelectItem key={item.id} value={item.id}>{item.name} (Stock: {item.currentStock} KG)</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Destination Location</label>
                      <Select value={transferForm.destinationFarmId || ""} onValueChange={(v) => setTransferForm({ ...transferForm, destinationFarmId: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                        <SelectContent>{farms.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity (KG)</label>
                      <Input type="number" step="0.1" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Driver Notes / Tractor #</label>
                      <Input value={transferForm.driverNotes} onChange={(e) => setTransferForm({ ...transferForm, driverNotes: e.target.value })} placeholder="e.g., Tractor 1 - Ramesh" />
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
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-800" />
              <p className="text-sm font-bold text-blue-800 tracking-tight">Initialize professional inventory tracking for all locations.</p>
            </div>
            <Button onClick={handleInitializeCore} size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs font-bold uppercase px-6">Setup Now</Button>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Scoreboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="shadow-sm border-none">
          <CardHeader className="py-1.5 px-3 border-b">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Total Stock Value</span>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight text-slate-900">₹{displayTotalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{selectedFarmId ? farms.find(f => f.id === selectedFarmId)?.name : "Across all locations"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none">
          <CardHeader className="py-1.5 px-3 border-b">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Maize Stock</span>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight text-slate-900">{displayMaize.toLocaleString()} <span className="text-xs">KG</span></div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">~{(displayMaize / 50).toFixed(0)} Bags</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none">
          <CardHeader className="py-1.5 px-3 border-b">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Soya Stock</span>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight text-slate-900">{displaySoya.toLocaleString()} <span className="text-xs">KG</span></div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">~{(displaySoya / 50).toFixed(0)} Bags</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none">
          <CardHeader className="py-1.5 px-3 border-b">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Days Stock Left</span>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className={cn("text-xl font-black tracking-tight", Number(daysLeft) < 3 ? "text-red-600 animate-pulse" : "text-slate-900")}>
              {daysLeft} <span className="text-xs">DAYS</span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Based on 7-day mix avg</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Ledger */}
      <Card className="shadow-sm border-none mt-4">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filter by Farm</label>
              <Select value={selectedFarmId || "all"} onValueChange={(v) => setSelectedFarmId(v === "all" ? null : v)}>
                <SelectTrigger className="w-64 h-9 bg-slate-50 border-slate-200 text-xs font-bold">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">All Locations</SelectItem>
                  {farms.map((f) => (<SelectItem key={f.id} value={f.id} className="text-xs font-bold">{f.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-end">
              <CardTitle className="text-base font-bold">Stock Movement Ledger</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Unified history of purchases & mixing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-10">
                  <TableHead className="text-[10px] font-extrabold uppercase pl-6 w-28">Date</TableHead>
                  <TableHead className="text-[10px] font-extrabold uppercase">Farm</TableHead>
                  <TableHead className="text-[10px] font-extrabold uppercase">Item</TableHead>
                  <TableHead className="text-[10px] font-extrabold uppercase text-right">Rate</TableHead>
                  <TableHead className="text-[10px] font-extrabold uppercase text-right">Quantity</TableHead>
                  <TableHead className="text-[10px] font-extrabold uppercase text-right pr-6">Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 italic text-xs">No records found.</TableCell></TableRow>
                ) : (
                  filteredHistory.map((m: any, idx) => {
                    let farmName = "-", itemName = "-", qtyColor = "text-slate-900", rateStr = "-", typeLabel = ""
                    if (m.type === 'purchase') {
                      const item = items.find(i => i.id === m.itemId)
                      farmName = farms.find(f => f.id === item?.farmId)?.name || "-"
                      itemName = item?.name || "-"
                      qtyColor = "text-green-600"
                      rateStr = `₹${Number(m.unitRate).toFixed(2)}`
                      typeLabel = "Purchase"
                    } else if (m.type === 'issue') {
                      const item = items.find(i => i.id === m.itemId)
                      farmName = farms.find(f => f.id === item?.farmId)?.name || "-"
                      itemName = item?.name || "-"
                      qtyColor = "text-red-600"
                      rateStr = `₹${Number(m.costPerUnit || 0).toFixed(2)}`
                      typeLabel = "Daily Mix"
                    } else if (m.type === 'transfer') {
                      const item = items.find(i => i.id === m.itemId)
                      const from = farms.find(f => f.id === m.sourceFarmId)?.name || "Unknown"
                      const to = farms.find(f => f.id === m.destinationFarmId)?.name || "Unknown"
                      farmName = `${from} → ${to}`
                      itemName = item?.name || "-"
                      qtyColor = "text-blue-600"
                      typeLabel = "Move"
                    }
                    return (
                      <TableRow key={idx} className="h-11 hover:bg-slate-50/50 border-b">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-600">{formatIndianDate(m.date)}</span>
                            <span className="text-[8px] font-black uppercase text-slate-300 tracking-tighter">{typeLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-extrabold text-slate-700">{farmName}</TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-900">{itemName}</TableCell>
                        <TableCell className="text-right text-[10px] font-medium text-slate-500">{rateStr}</TableCell>
                        <TableCell className={cn("text-right font-black text-xs", qtyColor)}>
                          {m.type === 'issue' ? '-' : '+'}{Number(m.quantity).toLocaleString()} KG
                        </TableCell>
                        <TableCell className="text-right pr-6 text-[11px] font-black text-slate-400">-</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

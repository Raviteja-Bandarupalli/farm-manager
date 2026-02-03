"use client"

import type React from "react"
import { useState } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { useFinance } from "@/lib/finance-context"
import { useInventory } from "@/lib/inventory-context"
import { toDateKey } from "@/lib/daily-logs-context"
import { getTodayDate, getFirstDayOfYear, getLastDayOfYear } from "@/lib/date-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react"
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
import { formatIndianDate } from "@/lib/utils"

export default function SalesPage() {
  const { buyers } = useMasterData()
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance()
  const {
    sales,
    loading,
    refetch,
    addSale,
    updateSale,
    deleteSale,
    linkSaleToFinance,
    getSaleById,
  } = useInventory()

  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("all")

  const [saleForm, setSaleForm] = useState({
    date: getTodayDate(),
    buyerId: "",
    birds: "",
    avgWeightKg: "",
    ratePerKg: "",
    invoiceNumber: "",
    remarks: "",
  })

  const filteredSales =
    selectedBuyerId === "all"
      ? sales
      : sales.filter((s) => s.buyerId === selectedBuyerId)

  const totalSales = sales.reduce((sum, s) => sum + s.totalValue, 0)
  const totalBirdsSold = sales.reduce((sum, s) => sum + s.birds, 0)
  const uniqueBuyers = new Set(sales.map((s) => s.buyerId)).size

  const feedPurchaseExpenses = transactions
    .filter((t) => t.type === "expense" && t.category === "Feed Purchase")
    .reduce((sum, t) => sum + t.amount, 0)
  const netRevenue = totalSales - feedPurchaseExpenses

  const liveWeightKg =
    saleForm.birds && saleForm.avgWeightKg
      ? Number.parseFloat(saleForm.birds || "0") * Number.parseFloat(saleForm.avgWeightKg || "0")
      : 0
  const saleValue =
    liveWeightKg && saleForm.ratePerKg
      ? liveWeightKg * Number.parseFloat(saleForm.ratePerKg || "0")
      : 0

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault()
    const birds = Number.parseFloat(saleForm.birds)
    const avgWeightKg = Number.parseFloat(saleForm.avgWeightKg)
    const ratePerKg = Number.parseFloat(saleForm.ratePerKg)
    const liveWeightKg = birds * avgWeightKg
    const totalValue = liveWeightKg * ratePerKg
    const buyer = buyers.find((b) => b.id === saleForm.buyerId)

    try {
      if (editingSaleId) {
        const existing = getSaleById(editingSaleId)
        if (!existing) return

        await updateSale(editingSaleId, {
          date: saleForm.date,
          buyerId: saleForm.buyerId,
          birds,
          avgWeightKg,
          ratePerKg,
          invoiceNumber: saleForm.invoiceNumber || "",
          remarks: saleForm.remarks || "",
        })

        if (existing.financeTransactionId) {
          const desc = buyer
            ? `Broiler Sale to ${buyer.name} - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
            : `Broiler Sale - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
          const ref = saleForm.invoiceNumber ? ` ${saleForm.invoiceNumber}` : ""
          await updateTransaction(existing.financeTransactionId, {
            type: "income",
            category: "Broiler Sales",
            amount: totalValue,
            date: saleForm.date,
            description: `${desc}${ref}`,
            reference: saleForm.invoiceNumber || "",
          })
        } else {
          const desc = buyer
            ? `Broiler Sale to ${buyer.name} - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
            : `Broiler Sale - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
          const ref = saleForm.invoiceNumber ? ` ${saleForm.invoiceNumber}` : ""
          const tx = await addTransaction({
            type: "income",
            category: "Broiler Sales",
            amount: totalValue,
            date: saleForm.date,
            description: `${desc}${ref}`,
            reference: saleForm.invoiceNumber || "",
          })
          if (tx) await linkSaleToFinance(editingSaleId, tx.id)
        }
      } else {
        const newSale = await addSale({
          date: saleForm.date,
          buyerId: saleForm.buyerId,
          birds,
          avgWeightKg,
          ratePerKg,
          invoiceNumber: saleForm.invoiceNumber || "",
          remarks: saleForm.remarks || "",
        })
        const desc = buyer
          ? `Broiler Sale to ${buyer.name} - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
          : `Broiler Sale - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
        const ref = saleForm.invoiceNumber ? ` ${saleForm.invoiceNumber}` : ""
        const tx = await addTransaction({
          type: "income",
          category: "Broiler Sales",
          amount: totalValue,
          date: saleForm.date,
          description: `${desc}${ref}`,
          reference: saleForm.invoiceNumber || "",
        })
        if (tx && newSale) await linkSaleToFinance(newSale.id, tx.id)
      }

      resetSaleForm()
      setIsSaleDialogOpen(false)
    } catch (err) {
      console.error("Error saving sale:", err)
      alert(err instanceof Error ? err.message : "Failed to save sale.")
    }
  }

  const resetSaleForm = () => {
    setSaleForm({
      date: getTodayDate(),
      buyerId: "",
      birds: "",
      avgWeightKg: "",
      ratePerKg: "",
      invoiceNumber: "",
      remarks: "",
    })
    setEditingSaleId(null)
  }

  const handleEditSale = (sale: { id: string; date: string; buyerId: string; birds: number; avgWeightKg: number; ratePerKg: number; invoiceNumber: string; remarks: string }) => {
    setEditingSaleId(sale.id)
    setSaleForm({
      date: sale.date,
      buyerId: sale.buyerId,
      birds: sale.birds.toString(),
      avgWeightKg: sale.avgWeightKg.toString(),
      ratePerKg: sale.ratePerKg.toString(),
      invoiceNumber: sale.invoiceNumber || "",
      remarks: sale.remarks || "",
    })
    setIsSaleDialogOpen(true)
  }

  const handleDeleteSale = async (sale: { id: string; buyerId: string; date: string; birds: number; totalValue: number; financeTransactionId?: string }) => {
    const buyer = buyers.find((b) => b.id === sale.buyerId)
    const name = buyer ? buyer.name : "Unknown"
    const msg = `Delete sale to ${name} on ${formatIndianDate(sale.date)}?\n\nThis will:\n- Remove ${sale.birds} birds from sales\n- Remove ₹${sale.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })} from finance income`
    if (!confirm(msg)) return
    try {
      if (sale.financeTransactionId) await deleteTransaction(sale.financeTransactionId)
      await deleteSale(sale.id)
    } catch (err) {
      console.error("Error deleting sale:", err)
      alert("Failed to delete sale.")
    }
  }

  const startAddNewSale = () => {
    resetSaleForm()
    setIsSaleDialogOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sales</h1>
          <p className="text-[10px] text-muted-foreground">Record and manage broiler sales</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Total Buyers</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold">{uniqueBuyers}</div>
            <p className="text-[10px] text-muted-foreground">Buyers in system</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold">₹{totalSales.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground">Total sales value</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Total Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold">{sales.length}</div>
            <p className="text-[10px] text-muted-foreground">Sales entries recorded</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card className="shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Sales History</CardTitle>
                <CardDescription className="text-[10px]">Buyer, quantity, and value details</CardDescription>
              </div>
              <Dialog
                open={isSaleDialogOpen}
                onOpenChange={(open) => {
                  setIsSaleDialogOpen(open)
                  if (!open) resetSaleForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-[11px]" onClick={startAddNewSale}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingSaleId ? "Edit Sale" : "New Sale"}</DialogTitle>
                    <DialogDescription>
                      {editingSaleId ? "Update sale entry details" : "Record a new broiler sale. Live weight and total value will be calculated automatically."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSale} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input type="date" value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Buyer</label>
                        <Select value={saleForm.buyerId} onValueChange={(v) => setSaleForm({ ...saleForm, buyerId: v })} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select buyer" />
                          </SelectTrigger>
                          <SelectContent>
                            {buyers.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.contact})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Birds Sold</label>
                        <Input type="number" step="1" min="1" value={saleForm.birds} onChange={(e) => setSaleForm({ ...saleForm, birds: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Avg Wt (kg)</label>
                        <Input type="number" step="0.01" min="0.01" value={saleForm.avgWeightKg} onChange={(e) => setSaleForm({ ...saleForm, avgWeightKg: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rate (₹/kg)</label>
                        <Input type="number" step="0.01" min="0.01" value={saleForm.ratePerKg} onChange={(e) => setSaleForm({ ...saleForm, ratePerKg: e.target.value })} required />
                      </div>
                    </div>
                    {liveWeightKg > 0 && saleValue > 0 && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Live Wt</p>
                          <p className="text-xl font-bold text-blue-600">{liveWeightKg.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-bold text-green-600">₹{saleValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Invoice</label>
                        <Input value={saleForm.invoiceNumber} onChange={(e) => setSaleForm({ ...saleForm, invoiceNumber: e.target.value })} placeholder="SALE-001" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Remarks</label>
                        <Input value={saleForm.remarks} onChange={(e) => setSaleForm({ ...saleForm, remarks: e.target.value })} placeholder="Optional notes..." />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingSaleId ? "Update Sale" : "Record Sale"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-4 py-2 px-3 bg-slate-50/30 border-b">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Filter Buyer:</label>
                <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                  <SelectTrigger className="w-[180px] h-7 text-[10px] bg-white">
                    <SelectValue placeholder="All buyers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {buyers
                      .filter((b) => sales.some((s) => s.buyerId === b.id))
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="text-muted-foreground mt-4">Loading sales...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No sales recorded yet</p>
                <Button onClick={startAddNewSale}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Sale
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10 bg-slate-50/50">
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight">Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight">Buyer</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight text-right">Birds</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight text-right">Live Wt</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight text-right">Rate</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight text-right">Total</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-tight text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredSales]
                      .sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
                      .map((sale) => {
                        const buyer = buyers.find((b) => b.id === sale.buyerId)
                        const liveWeight = sale.birds * sale.avgWeightKg
                        return (
                          <TableRow key={sale.id} className="h-11">
                            <TableCell className="text-xs py-1">
                              {formatIndianDate(sale.date)}
                            </TableCell>
                            <TableCell className="text-[11px] font-medium py-1">{buyer ? buyer.name : "Buyer Deleted"}</TableCell>
                            <TableCell className="text-xs text-right py-1">{sale.birds.toLocaleString("en-IN")}</TableCell>
                            <TableCell className="text-xs text-right py-1">{liveWeight.toFixed(2)}kg</TableCell>
                            <TableCell className="text-xs text-right py-1">₹{sale.ratePerKg.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right font-bold py-1 text-slate-900">
                              ₹{sale.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-1">
                              <div className="flex gap-1.5 justify-center">
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditSale(sale)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSale(sale)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                {sale.financeTransactionId && (
                                  <Link href={`/dashboard/finance?transactionId=${sale.financeTransactionId}`}>
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
      </div>
    </div>
  )
}

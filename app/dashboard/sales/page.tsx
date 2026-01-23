"use client"

import type React from "react"

import { useState } from "react"
import { useInventory } from "@/lib/inventory-context"
import { useMasterData } from "@/lib/master-data-context"
import { useFinance } from "@/lib/finance-context"
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

export default function SalesPage() {
  const { sales, addSale, updateSale, deleteSale, linkSaleToFinance, getSaleById, getTotalBirdsSold, getTotalRevenue } = useInventory()
  const { buyers } = useMasterData()
  const { transactions, getTotalExpenses, addTransaction, updateTransaction, deleteTransaction } = useFinance()

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

  // Filter sales by buyer
  const filteredSales = selectedBuyerId === "all" 
    ? sales 
    : sales.filter((sale) => sale.buyerId === selectedBuyerId)

  // Calculate statistics
  const totalSales = getTotalRevenue()
  const totalBirdsSold = getTotalBirdsSold()
  const uniqueBuyers = new Set(sales.map((sale) => sale.buyerId)).size
  
  // Calculate feed expenses (from finance transactions with "Feed Purchase" category)
  const startOfYear = getFirstDayOfYear()
  const endOfYear = getLastDayOfYear()
  
  // Filter feed expenses from transactions
  const feedPurchaseExpenses = transactions
    .filter((t) => t.type === "expense" && t.category === "Feed Purchase")
    .reduce((sum, t) => sum + t.amount, 0)
  
  const netRevenue = totalSales - feedPurchaseExpenses

  // Calculate live weight and value
  const liveWeightKg = saleForm.birds && saleForm.avgWeightKg
    ? Number.parseFloat(saleForm.birds || "0") * Number.parseFloat(saleForm.avgWeightKg || "0")
    : 0
  const saleValue = liveWeightKg && saleForm.ratePerKg
    ? liveWeightKg * Number.parseFloat(saleForm.ratePerKg || "0")
    : 0

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault()
    const birds = Number.parseFloat(saleForm.birds)
    const avgWeightKg = Number.parseFloat(saleForm.avgWeightKg)
    const ratePerKg = Number.parseFloat(saleForm.ratePerKg)
    const liveWeightKg = birds * avgWeightKg
    const totalValue = liveWeightKg * ratePerKg
    const buyer = buyers.find((b) => b.id === saleForm.buyerId)
    
    if (editingSaleId) {
      // Update existing sale
      const existingSale = getSaleById(editingSaleId)
      if (!existingSale) return

      updateSale(editingSaleId, {
        date: saleForm.date,
        buyerId: saleForm.buyerId,
        birds,
        avgWeightKg,
        ratePerKg,
        invoiceNumber: saleForm.invoiceNumber,
        remarks: saleForm.remarks,
      })

      // Update or create finance income
      if (existingSale.financeTransactionId) {
        const description = buyer 
          ? `Broiler Sale to ${buyer.name} - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
          : `Broiler Sale - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
        const invoiceRef = saleForm.invoiceNumber ? ` ${saleForm.invoiceNumber}` : ""
        
        updateTransaction(existingSale.financeTransactionId, {
          type: "income",
          category: "Broiler Sales",
          amount: totalValue,
          date: saleForm.date,
          description: `${description}${invoiceRef}`,
          reference: saleForm.invoiceNumber || "",
        })
      } else {
        const description = buyer 
          ? `Broiler Sale to ${buyer.name} - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
          : `Broiler Sale - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
        const invoiceRef = saleForm.invoiceNumber ? ` ${saleForm.invoiceNumber}` : ""
        
        const financeTransaction = addTransaction({
          type: "income",
          category: "Broiler Sales",
          amount: totalValue,
          date: saleForm.date,
          description: `${description}${invoiceRef}`,
          reference: saleForm.invoiceNumber || "",
        })

        if (financeTransaction) {
          linkSaleToFinance(editingSaleId, financeTransaction.id)
        }
      }
    } else {
      // Add new sale
      const newSale = addSale({
        date: saleForm.date,
        buyerId: saleForm.buyerId,
        birds,
        avgWeightKg,
        ratePerKg,
        invoiceNumber: saleForm.invoiceNumber,
        remarks: saleForm.remarks,
      })

      // Create finance income automatically
      const description = buyer 
        ? `Broiler Sale to ${buyer.name} - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
        : `Broiler Sale - ${birds} birds (${liveWeightKg.toFixed(0)}kg)`
      const invoiceRef = saleForm.invoiceNumber ? ` ${saleForm.invoiceNumber}` : ""
      
      const financeTransaction = addTransaction({
        type: "income",
        category: "Broiler Sales",
        amount: totalValue,
        date: saleForm.date,
        description: `${description}${invoiceRef}`,
        reference: saleForm.invoiceNumber || "",
      })

      if (financeTransaction && newSale) {
        linkSaleToFinance(newSale.id, financeTransaction.id)
      }
    }
    
    resetSaleForm()
    setIsSaleDialogOpen(false)
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

  const handleEditSale = (sale: any) => {
    setEditingSaleId(sale.id)
    setSaleForm({
      date: sale.date,
      buyerId: sale.buyerId,
      birds: sale.birds.toString(),
      avgWeightKg: sale.avgWeightKg.toString(),
      ratePerKg: sale.ratePerKg.toString(),
      invoiceNumber: sale.invoiceNumber,
      remarks: sale.remarks || "",
    })
    setIsSaleDialogOpen(true)
  }

  const handleDeleteSale = (sale: any) => {
    const buyer = buyers.find((b) => b.id === sale.buyerId)
    const buyerName = buyer ? buyer.name : "Unknown"
    const confirmMessage = `Delete sale to ${buyerName} on ${new Date(sale.date).toLocaleDateString()}?\n\nThis will:\n- Remove ${sale.birds} birds from sales\n- Remove ₹${sale.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })} from finance income`

    if (confirm(confirmMessage)) {
      if (sale.financeTransactionId) {
        deleteTransaction(sale.financeTransactionId)
      }
      deleteSale(sale.id)
    }
  }

  const startAddNewSale = () => {
    resetSaleForm()
    setIsSaleDialogOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground mt-1">Record and manage broiler sales</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="py-4">
          <CardHeader className="pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Buyers</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold">{uniqueBuyers}</div>
            <p className="text-xs text-muted-foreground">Buyers in system</p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total sales value</p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Sales Entries</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-muted-foreground">Sales entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <CardTitle>Sales</CardTitle>
                  <CardDescription>All sales with buyer, quantity, and value details</CardDescription>
                </div>
                <Dialog open={isSaleDialogOpen} onOpenChange={(open) => {
                  setIsSaleDialogOpen(open)
                  if (!open) {
                    resetSaleForm()
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={startAddNewSale}>
                      <Plus className="h-4 w-4 mr-2" />
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
                          <Input
                            type="date"
                            value={saleForm.date}
                            onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Buyer</label>
                          <Select value={saleForm.buyerId} onValueChange={(value) => setSaleForm({ ...saleForm, buyerId: value })} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select buyer" />
                            </SelectTrigger>
                            <SelectContent>
                              {buyers.map((buyer) => (
                                <SelectItem key={buyer.id} value={buyer.id}>
                                  {buyer.name} ({buyer.contact})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Birds Sold</label>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            value={saleForm.birds}
                            onChange={(e) => setSaleForm({ ...saleForm, birds: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Avg Wt (kg)</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={saleForm.avgWeightKg}
                            onChange={(e) => setSaleForm({ ...saleForm, avgWeightKg: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Rate (₹/kg)</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={saleForm.ratePerKg}
                            onChange={(e) => setSaleForm({ ...saleForm, ratePerKg: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      {liveWeightKg > 0 && saleValue > 0 && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Live Wt</p>
                            <p className="text-xl font-bold text-blue-600">
                              {liveWeightKg.toFixed(2)} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-xl font-bold text-green-600">
                              ₹{saleValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Invoice</label>
                          <Input
                            value={saleForm.invoiceNumber}
                            onChange={(e) => setSaleForm({ ...saleForm, invoiceNumber: e.target.value })}
                            placeholder="SALE-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Remarks</label>
                          <Input
                            value={saleForm.remarks}
                            onChange={(e) => setSaleForm({ ...saleForm, remarks: e.target.value })}
                            placeholder="Optional notes..."
                          />
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
            <CardContent>
              {/* Buyer Filter */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Buyer:</label>
                  <Select value={selectedBuyerId} onValueChange={(value) => setSelectedBuyerId(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All buyers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {buyers
                        .filter((buyer) => sales.some((sale) => sale.buyerId === buyer.id))
                        .map((buyer) => (
                          <SelectItem key={buyer.id} value={buyer.id}>
                            {buyer.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredSales.length === 0 ? (
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
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead className="text-right">Birds</TableHead>
                        <TableHead className="text-right">Live Wt (kg)</TableHead>
                        <TableHead className="text-right">Rate (₹/kg)</TableHead>
                        <TableHead className="text-right">Total (₹)</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((sale) => {
                          const buyer = buyers.find((b) => b.id === sale.buyerId)
                          const liveWeight = sale.birds * sale.avgWeightKg
                          return (
                            <TableRow key={sale.id}>
                              <TableCell className="text-sm">
                                {new Date(sale.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              </TableCell>
                              <TableCell>{buyer ? buyer.name : "Buyer Deleted"}</TableCell>
                              <TableCell className="text-right">{sale.birds.toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{liveWeight.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{sale.ratePerKg.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">
                                ₹{sale.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-2 justify-center">
                                  <Button variant="outline" size="sm" onClick={() => handleEditSale(sale)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleDeleteSale(sale)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  {sale.financeTransactionId && (
                                    <Link href={`/dashboard/finance?transactionId=${sale.financeTransactionId}`}>
                                      <Button variant="ghost" size="sm" title="View in Finance" asChild>
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
      </div>
    </div>
  )
}

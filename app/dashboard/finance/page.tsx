"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useFinance } from "@/lib/finance-context"
import { useInventory } from "@/lib/inventory-context"
import { toDateKey } from "@/lib/daily-logs-context"
import { formatIndianDate } from "@/lib/utils"
import { getTodayDate, getFirstDayOfMonth } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

const INCOME_CATEGORIES = ["Sales - Live Birds", "Sales - Eggs", "Sales - Manure", "Government Subsidy", "Other Income"]
const EXPENSE_CATEGORIES = [
  "Chick Purchase",
  "Feed Purchase",
  "Medicine & Vaccines",
  "Labour",
  "Electricity/Generator",
  "Litter",
  "Transportation",
  "Equipment",
  "Maintenance",
  "Other Expenses",
]

export default function FinancePage() {
  const searchParams = useSearchParams()
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTotalIncome,
    getTotalExpenses,
    getBalance,
    getIncomeByCategory,
    getExpensesByCategory,
  } = useFinance()
  const { issues, getItemById } = useInventory()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: getFirstDayOfMonth(),
    end: getTodayDate(),
  })
  const [formData, setFormData] = useState({
    type: "income" as const,
    category: "",
    amount: "",
    date: getTodayDate(),
    description: "",
    reference: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateTransaction(editingId, {
          ...formData,
          amount: Number.parseFloat(formData.amount),
        })
      } else {
        await addTransaction({
          ...formData,
          amount: Number.parseFloat(formData.amount),
        })
      }
      setFormData({
        type: "income",
        category: "",
        amount: "",
        date: getTodayDate(),
        description: "",
        reference: "",
      })
      setEditingId(null)
      setIsDialogOpen(false)
    } catch (err) {
      console.error("Error saving transaction:", err)
      alert(err instanceof Error ? err.message : "Failed to save transaction.")
    }
  }

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id)
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      date: transaction.date,
      description: transaction.description,
      reference: transaction.reference,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return
    try {
      await deleteTransaction(id)
    } catch (err) {
      console.error("Error deleting transaction:", err)
      alert("Failed to delete transaction.")
    }
  }

  // Handle transactionId from URL (for linking from purchases)
  useEffect(() => {
    const transactionId = searchParams.get('transactionId')
    if (transactionId) {
      setHighlightedTransactionId(transactionId)
      // Scroll to transaction after a short delay
      setTimeout(() => {
        const element = document.getElementById(`transaction-${transactionId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Remove highlight after 3 seconds
          setTimeout(() => setHighlightedTransactionId(null), 3000)
        }
      }, 100)
    }
  }, [searchParams])

  const totalIncome = getTotalIncome(dateRange.start, dateRange.end)
  const totalExpenses = getTotalExpenses(dateRange.start, dateRange.end)
  const balance = getBalance(dateRange.start, dateRange.end)
  const incomeByCategory = getIncomeByCategory(dateRange.start, dateRange.end)
  const expensesByCategory = getExpensesByCategory(dateRange.start, dateRange.end)

  const startTime = toDateKey(dateRange.start)
  const endTime = toDateKey(dateRange.end)
  const issuesInRange = issues.filter((issue) => {
    const issueTime = toDateKey(issue.date)
    return issueTime >= startTime && issueTime <= endTime
  })
  let feedCostFromIssues = 0
  let medCostFromIssues = 0

  issuesInRange.forEach((issue) => {
    const item = getItemById(issue.itemId)
    if (item) {
      if (item.category === "feed-raw" || item.category === "feed-finished") {
        feedCostFromIssues += issue.totalCost
      } else if (item.category === "medicine" || item.category === "vaccine") {
        medCostFromIssues += issue.totalCost
      }
    }
  })

  const sortedTransactions = [...transactions]
    .filter((t) => {
      const tTime = toDateKey(t.date)
      return tTime >= startTime && tTime <= endTime
    })
    .sort((a, b) => toDateKey(b.date) - toDateKey(a.date))

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Finance Tracking</h1>
          <p className="text-[10px] text-muted-foreground">Monitor income, expenses, and financial performance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => {
                setEditingId(null)
                setFormData({
                  type: "income",
                  category: "",
                  amount: "",
                  date: getTodayDate(),
                  description: "",
                  reference: "",
                })
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
              <DialogDescription>Enter the transaction details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value, category: "" })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹)</label>
                <Input
                  type="number"
                  className="h-12"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  className="h-12"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the transaction"
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference</label>
                <Input
                  className="h-12"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Invoice #, Receipt #, etc."
                />
              </div>
              <Button type="submit" className="w-full h-12">
                {editingId ? "Update" : "Add"} Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Filter Period
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Start Date</label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">End Date</label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {(feedCostFromIssues > 0 || medCostFromIssues > 0) && (
        <Card className="shadow-sm border-blue-200">
          <CardHeader className="py-2 px-3 border-b bg-blue-50/30">
            <CardTitle className="text-sm font-bold">Cost from Inventory Issues</CardTitle>
            <CardDescription className="text-[10px]">Costs calculated from usage records</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-blue-50/50 rounded border border-blue-100">
                <p className="text-[10px] text-muted-foreground mb-0.5">Feed Usage Cost</p>
                <p className="text-lg font-bold text-blue-600">{formatINR(feedCostFromIssues)}</p>
              </div>
              <div className="p-2 bg-green-50/50 rounded border border-green-100">
                <p className="text-[10px] text-muted-foreground mb-0.5">Medicine/Vaccine Usage Cost</p>
                <p className="text-lg font-bold text-green-600">{formatINR(medCostFromIssues)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Total Income</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-green-600">{formatINR(totalIncome)}</div>
            <p className="text-[10px] text-muted-foreground">Total received</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Total Expenses</CardTitle>
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-red-600">{formatINR(totalExpenses)}</div>
            <p className="text-[10px] text-muted-foreground">Total paid out</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Net Balance</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-3">
            <div className={`text-lg font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatINR(balance)}
            </div>
            <p className="text-[10px] text-muted-foreground">{balance >= 0 ? "Surplus" : "Deficit"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold">Income by Category</CardTitle>
            <CardDescription className="text-[10px]">Breakdown of sources</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            {Object.keys(incomeByCategory).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No income recorded</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(incomeByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[11px] font-medium">{category}</p>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-0.5">
                          <div
                            className="bg-green-600 h-1.5 rounded-full"
                            style={{ width: `${(amount / totalIncome) * 100}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] font-bold ml-4 text-green-600">{formatINR(amount)}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold">Expenses by Category</CardTitle>
            <CardDescription className="text-[10px]">Breakdown of spending</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No expenses recorded</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[11px] font-medium">{category}</p>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-0.5">
                          <div
                            className="bg-red-600 h-1.5 rounded-full"
                            style={{ width: `${(amount / totalExpenses) * 100}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] font-bold ml-4 text-red-600">{formatINR(amount)}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold">Transaction History</CardTitle>
          <CardDescription className="text-[10px]">{sortedTransactions.length} transactions in period</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sortedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No transactions recorded yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Transaction
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-10 bg-slate-50/50">
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight">Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight">Type</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight">Category</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight">Reference</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight text-right">Amount</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-tight text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((transaction) => (
                    <TableRow 
                      key={transaction.id}
                      id={`transaction-${transaction.id}`}
                      className={`h-11 ${highlightedTransactionId === transaction.id ? "bg-blue-50 border-blue-200 border-2" : ""}`}
                    >
                      <TableCell className="text-xs py-1">{formatIndianDate(transaction.date)}</TableCell>
                      <TableCell className="py-1">
                        <Badge
                          variant="secondary"
                          className={`${transaction.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} text-[9px] h-4 px-1.5 capitalize`}
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold py-1">{transaction.category}</TableCell>
                      <TableCell className="text-[11px] py-1 max-w-xs truncate">{transaction.description || "-"}</TableCell>
                      <TableCell className="text-[10px] py-1">{transaction.reference || "-"}</TableCell>
                      <TableCell
                        className={`text-xs text-right font-bold py-1 ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatINR(transaction.amount)}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex justify-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(transaction)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(transaction.id)}>
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
    </div>
  )
}

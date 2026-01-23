"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useFinance } from "@/lib/finance-context"
import { useInventory } from "@/lib/inventory-context"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateTransaction(editingId, {
        ...formData,
        amount: Number.parseFloat(formData.amount),
      })
    } else {
      addTransaction({
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(id)
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

  const issuesInRange = issues.filter((issue) => issue.date >= dateRange.start && issue.date <= dateRange.end)
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
    .filter((t) => t.date >= dateRange.start && t.date <= dateRange.end)
    .sort((a, b) => b.date.localeCompare(a.date))

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Finance Tracking</h1>
          <p className="text-muted-foreground mt-1">Monitor income, expenses, and financial performance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
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
              <Plus className="h-4 w-4 mr-2" />
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                className="h-12"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                className="h-12"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {(feedCostFromIssues > 0 || medCostFromIssues > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cost from Inventory Issues</CardTitle>
            <CardDescription>Costs calculated from inventory issue entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Feed cost from inventory issues</p>
                <p className="text-2xl font-bold text-blue-600">{formatINR(feedCostFromIssues)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Medicine & vaccine cost from issues</p>
                <p className="text-2xl font-bold text-green-600">{formatINR(medCostFromIssues)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold text-green-600">{formatINR(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className="text-2xl font-bold text-red-600">{formatINR(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-6 pt-0">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent className="px-6 pt-0">
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatINR(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
            <CardDescription>Breakdown of income sources</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(incomeByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No income recorded</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(incomeByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{category}</p>
                        <div className="w-full bg-secondary h-2 rounded-full mt-1">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(amount / totalIncome) * 100}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm font-bold ml-4 text-green-600">{formatINR(amount)}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Breakdown of expense categories</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{category}</p>
                        <div className="w-full bg-secondary h-2 rounded-full mt-1">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${(amount / totalExpenses) * 100}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm font-bold ml-4 text-red-600">{formatINR(amount)}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>{sortedTransactions.length} transactions in selected period</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((transaction) => (
                    <TableRow 
                      key={transaction.id}
                      id={`transaction-${transaction.id}`}
                      className={highlightedTransactionId === transaction.id ? "bg-blue-50 border-blue-200 border-2" : ""}
                    >
                      <TableCell>{formatIndianDate(transaction.date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={transaction.type === "income" ? "bg-green-100" : "bg-red-100"}
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.category}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description || "-"}</TableCell>
                      <TableCell>{transaction.reference || "-"}</TableCell>
                      <TableCell
                        className={`text-right font-bold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatINR(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(transaction)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(transaction.id)}>
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
    </div>
  )
}

"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

interface Transaction {
  id: string
  type: "income" | "expense"
  category: string
  amount: number
  date: string
  description: string
  reference: string
  createdAt: string
}

interface FinanceContextType {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => void
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[]
  getTotalIncome: (startDate?: string, endDate?: string) => number
  getTotalExpenses: (startDate?: string, endDate?: string) => number
  getBalance: (startDate?: string, endDate?: string) => number
  getIncomeByCategory: (startDate?: string, endDate?: string) => Record<string, number>
  getExpensesByCategory: (startDate?: string, endDate?: string) => Record<string, number>
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const storedTransactions = localStorage.getItem("poultry_transactions")
    if (storedTransactions) setTransactions(JSON.parse(storedTransactions))
  }, [])

  const addTransaction = (transaction: Omit<Transaction, "id" | "createdAt">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updatedTransactions = [...transactions, newTransaction]
    setTransactions(updatedTransactions)
    localStorage.setItem("poultry_transactions", JSON.stringify(updatedTransactions))
    return newTransaction
  }

  const updateTransaction = (id: string, transaction: Partial<Transaction>) => {
    const updatedTransactions = transactions.map((t) => (t.id === id ? { ...t, ...transaction } : t))
    setTransactions(updatedTransactions)
    localStorage.setItem("poultry_transactions", JSON.stringify(updatedTransactions))
  }

  const deleteTransaction = (id: string) => {
    console.log("[Finance Context] deleteTransaction called with id:", id)
    
    // Read from localStorage to ensure we have the latest state
    const currentTransactions = JSON.parse(localStorage.getItem("poultry_transactions") || "[]")
    console.log("[Finance Context] Current transactions count:", currentTransactions.length)
    console.log("[Finance Context] Transaction to delete exists:", currentTransactions.some((t: Transaction) => t.id === id))
    
    const updatedTransactions = currentTransactions.filter((t: Transaction) => t.id !== id)
    console.log("[Finance Context] Updated transactions count:", updatedTransactions.length)
    
    setTransactions(updatedTransactions)
    localStorage.setItem("poultry_transactions", JSON.stringify(updatedTransactions))
    console.log("[Finance Context] Transaction deleted from localStorage")
    
    // Verify deletion
    const verifyTransactions = JSON.parse(localStorage.getItem("poultry_transactions") || "[]")
    const stillExists = verifyTransactions.some((t: Transaction) => t.id === id)
    if (stillExists) {
      console.error("[Finance Context] ERROR: Transaction still exists after deletion attempt!")
    }
  }

  const getTransactionsByDateRange = (startDate: string, endDate: string) => {
    return transactions
      .filter((t) => t.date >= startDate && t.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  const getTotalIncome = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "income")
    if (startDate && endDate) {
      filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    }
    return filtered.reduce((sum, t) => sum + t.amount, 0)
  }

  const getTotalExpenses = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "expense")
    if (startDate && endDate) {
      filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    }
    return filtered.reduce((sum, t) => sum + t.amount, 0)
  }

  const getBalance = (startDate?: string, endDate?: string) => {
    return getTotalIncome(startDate, endDate) - getTotalExpenses(startDate, endDate)
  }

  const getIncomeByCategory = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "income")
    if (startDate && endDate) {
      filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    }
    return filtered.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )
  }

  const getExpensesByCategory = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "expense")
    if (startDate && endDate) {
      filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    }
    return filtered.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )
  }

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionsByDateRange,
        getTotalIncome,
        getTotalExpenses,
        getBalance,
        getIncomeByCategory,
        getExpensesByCategory,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }
  return context
}

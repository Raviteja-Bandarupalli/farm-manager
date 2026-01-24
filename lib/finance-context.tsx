"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"

export interface Transaction {
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
  loading: boolean
  refetch: () => Promise<void>
  addTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction | null>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
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
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
      if (error) throw error
      setTransactions((data as Transaction[]) || [])
    } catch (e) {
      logFetchError("transactions", e)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async (t: Omit<Transaction, "id" | "createdAt">): Promise<Transaction | null> => {
    const row = {
      id: Date.now().toString(),
      ...t,
      createdAt: new Date().toISOString(),
    }
    const { data, error } = await supabase.from("transactions").insert(row).select().single()
    if (error) throw error
    await fetchTransactions()
    return data as Transaction
  }

  const updateTransaction = async (id: string, t: Partial<Transaction>) => {
    const { error } = await supabase.from("transactions").update(t).eq("id", id)
    if (error) throw error
    await fetchTransactions()
  }

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) throw error
    await fetchTransactions()
  }

  const getTransactionsByDateRange = (startDate: string, endDate: string) =>
    transactions
      .filter((t) => t.date >= startDate && t.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date))

  const getTotalIncome = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "income")
    if (startDate && endDate) filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    return filtered.reduce((sum, t) => sum + t.amount, 0)
  }

  const getTotalExpenses = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "expense")
    if (startDate && endDate) filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    return filtered.reduce((sum, t) => sum + t.amount, 0)
  }

  const getBalance = (startDate?: string, endDate?: string) =>
    getTotalIncome(startDate, endDate) - getTotalExpenses(startDate, endDate)

  const getIncomeByCategory = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "income")
    if (startDate && endDate) filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    return filtered.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
  }

  const getExpensesByCategory = (startDate?: string, endDate?: string) => {
    let filtered = transactions.filter((t) => t.type === "expense")
    if (startDate && endDate) filtered = filtered.filter((t) => t.date >= startDate && t.date <= endDate)
    return filtered.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        loading,
        refetch: fetchTransactions,
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
  const ctx = useContext(FinanceContext)
  if (ctx === undefined) throw new Error("useFinance must be used within a FinanceProvider")
  return ctx
}

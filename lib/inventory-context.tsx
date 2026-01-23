"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface InventoryItem {
  id: string
  code: string
  name: string
  category: "feed-raw" | "feed-finished" | "medicine" | "vaccine" | "litter" | "utilities" | "other"
  unit: string
  openingStock: number
  openingValue: number
  currentStock: number
  averageCost: number
  reorderLevel: number
  createdAt: string
}

export interface PurchaseEntry {
  id: string
  date: string
  supplierId: string
  itemId: string
  quantity: number
  unitRate: number
  totalAmount: number
  invoiceNumber: string
  financeTransactionId?: string // Link to finance expense transaction
  createdAt: string
}

export interface IssueEntry {
  id: string
  date: string
  batchId: string
  itemId: string
  quantity: number
  costPerUnit: number
  totalCost: number
  purpose: string
  createdAt: string
}

export interface SaleEntry {
  id: string
  date: string
  buyerId: string
  birds: number
  avgWeightKg: number
  liveWeightKg: number // Auto-calculated: birds × avgWeightKg
  ratePerKg: number
  totalValue: number // Auto-calculated: liveWeightKg × ratePerKg
  invoiceNumber: string
  remarks: string
  financeTransactionId?: string // Link to finance income transaction
  createdAt: string
}

interface InventoryContextType {
  items: InventoryItem[]
  purchases: PurchaseEntry[]
  issues: IssueEntry[]
  sales: SaleEntry[]
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "currentStock" | "averageCost">) => void
  updateItem: (id: string, item: Partial<InventoryItem>) => void
  deleteItem: (id: string) => void
  addPurchase: (purchase: Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount" | "financeTransactionId">) => PurchaseEntry
  updatePurchase: (id: string, purchase: Partial<Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount">>) => void
  deletePurchase: (id: string) => void
  linkPurchaseToFinance: (purchaseId: string, financeTransactionId: string) => void
  addSale: (sale: Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue" | "financeTransactionId">) => SaleEntry
  updateSale: (id: string, sale: Partial<Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue">>) => void
  deleteSale: (id: string) => void
  linkSaleToFinance: (saleId: string, financeTransactionId: string) => void
  addIssue: (issue: Omit<IssueEntry, "id" | "createdAt" | "costPerUnit" | "totalCost">) => void
  getPurchasesByItem: (itemId: string) => PurchaseEntry[]
  getIssuesByItem: (itemId: string) => IssueEntry[]
  getIssuesByBatch: (batchId: string) => IssueEntry[]
  getSalesByBuyer: (buyerId: string) => SaleEntry[]
  getLowStockItems: () => InventoryItem[]
  getItemById: (id: string) => InventoryItem | undefined
  getPurchaseById: (id: string) => PurchaseEntry | undefined
  getSaleById: (id: string) => SaleEntry | undefined
  getTotalBirdsSold: () => number
  getTotalRevenue: () => number
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([])
  const [issues, setIssues] = useState<IssueEntry[]>([])
  const [sales, setSales] = useState<SaleEntry[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const storedItems = localStorage.getItem("poultry_inventory_items")
      const storedPurchases = localStorage.getItem("poultry_purchases")
      const storedIssues = localStorage.getItem("poultry_issues")
      const storedSales = localStorage.getItem("poultry_sales")
    
    if (storedItems) {
      const parsedItems = JSON.parse(storedItems)
      // Clean up any corrupted stock values (e.g., "6000.00 6000" -> 6000.00)
      const cleanedItems = parsedItems.map((item: InventoryItem) => {
        if (typeof item.currentStock !== 'number') {
          const stockStr = String(item.currentStock).trim()
          const match = stockStr.match(/^[\d.]+/)
          item.currentStock = match ? Number.parseFloat(match[0]) : 0
        }
        return item
      })
      setItems(cleanedItems)
      // Save cleaned data back to localStorage
      if (JSON.stringify(cleanedItems) !== storedItems) {
        localStorage.setItem("poultry_inventory_items", JSON.stringify(cleanedItems))
      }
    }
    
    if (storedPurchases) {
      const parsedPurchases = JSON.parse(storedPurchases)
      // Clean up any corrupted quantity values
      const cleanedPurchases = parsedPurchases.map((purchase: PurchaseEntry) => {
        if (typeof purchase.quantity !== 'number') {
          const qtyStr = String(purchase.quantity).trim()
          const match = qtyStr.match(/^[\d.]+/)
          purchase.quantity = match ? Number.parseFloat(match[0]) : 0
        }
        return purchase
      })
      setPurchases(cleanedPurchases)
      // Save cleaned data back to localStorage
      if (JSON.stringify(cleanedPurchases) !== storedPurchases) {
        localStorage.setItem("poultry_purchases", JSON.stringify(cleanedPurchases))
      }
    }
    
      if (storedIssues) {
        const parsed = JSON.parse(storedIssues)
        if (Array.isArray(parsed)) setIssues(parsed)
      }
      if (storedSales) {
        const parsed = JSON.parse(storedSales)
        if (Array.isArray(parsed)) setSales(parsed)
      }
    } catch (error) {
      console.error("Error loading inventory data from localStorage:", error)
    }
  }, [])

  const addItem = (item: Omit<InventoryItem, "id" | "createdAt" | "currentStock" | "averageCost">) => {
    setItems((prevItems) => {
      const averageCost = item.openingStock > 0 ? item.openingValue / item.openingStock : 0
      const newItem: InventoryItem = {
        ...item,
        id: Date.now().toString(),
        currentStock: item.openingStock,
        averageCost,
        createdAt: new Date().toISOString(),
      }
      const updatedItems = [...prevItems, newItem]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_inventory_items", JSON.stringify(updatedItems))
      }
      return updatedItems
    })
  }

  const updateItem = (id: string, item: Partial<InventoryItem>) => {
    setItems((prevItems) => {
      const updatedItems = prevItems.map((i) => (i.id === id ? { ...i, ...item } : i))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_inventory_items", JSON.stringify(updatedItems))
      }
      return updatedItems
    })
  }

  const deleteItem = (id: string) => {
    setItems((prevItems) => {
      const updatedItems = prevItems.filter((i) => i.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_inventory_items", JSON.stringify(updatedItems))
      }
      return updatedItems
    })
  }

  const addPurchase = (purchase: Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount" | "financeTransactionId">) => {
    console.log("[Inventory Context] addPurchase called with:", purchase)
    
    // Read from localStorage to ensure we have the latest state
    const currentPurchases = JSON.parse(localStorage.getItem("poultry_purchases") || "[]")
    const currentItems = JSON.parse(localStorage.getItem("poultry_inventory_items") || "[]")
    
    const totalAmount = purchase.quantity * purchase.unitRate
    const newPurchase: PurchaseEntry = {
      ...purchase,
      id: Date.now().toString(),
      totalAmount,
      createdAt: new Date().toISOString(),
    }

    console.log("[Inventory Context] New purchase created:", newPurchase)
    console.log("[Inventory Context] Current purchases count:", currentPurchases.length)

    // Update item stock and average cost using weighted average method
    const item = currentItems.find((i: InventoryItem) => i.id === purchase.itemId)
    if (item) {
      const oldValue = item.currentStock * item.averageCost
      const newValue = purchase.quantity * purchase.unitRate
      const newStock = item.currentStock + purchase.quantity
      const newAverageCost = newStock > 0 ? (oldValue + newValue) / newStock : 0

      const updatedItems = currentItems.map((i: InventoryItem) =>
        i.id === purchase.itemId
          ? {
              ...i,
              currentStock: newStock,
              averageCost: newAverageCost,
            }
          : i,
      )
      setItems(updatedItems)
      localStorage.setItem("poultry_inventory_items", JSON.stringify(updatedItems))
      console.log("[Inventory Context] Item stock updated:", item.id, "New stock:", newStock)
    }

    // Add purchase to list
    const updatedPurchases = [...currentPurchases, newPurchase]
    console.log("[Inventory Context] Updated purchases count:", updatedPurchases.length)
    setPurchases(updatedPurchases)
    localStorage.setItem("poultry_purchases", JSON.stringify(updatedPurchases))
    console.log("[Inventory Context] Purchase saved to localStorage")
    
    return newPurchase
  }

  const linkPurchaseToFinance = (purchaseId: string, financeTransactionId: string) => {
    // Read from localStorage to ensure we have the latest state
    const currentPurchases = JSON.parse(localStorage.getItem("poultry_purchases") || "[]")
    const updatedPurchases = currentPurchases.map((p: PurchaseEntry) =>
      p.id === purchaseId ? { ...p, financeTransactionId } : p,
    )
    setPurchases(updatedPurchases)
    localStorage.setItem("poultry_purchases", JSON.stringify(updatedPurchases))
  }

  const updatePurchase = (id: string, purchaseData: Partial<Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount">>) => {
    const existingPurchase = purchases.find((p) => p.id === id)
    if (!existingPurchase) return

    const item = items.find((i) => i.id === existingPurchase.itemId)
    if (!item) return

    // Reverse the existing purchase's impact on stock
    const oldValue = item.currentStock * item.averageCost
    const oldPurchaseValue = existingPurchase.quantity * existingPurchase.unitRate
    const oldStock = item.currentStock - existingPurchase.quantity

    // Calculate what the average cost would have been before this purchase
    let oldAverageCost = item.averageCost
    if (oldStock > 0) {
      const oldTotalValue = oldStock * item.averageCost - oldPurchaseValue
      oldAverageCost = oldTotalValue / oldStock
    } else {
      oldAverageCost = 0
    }

    // Apply new purchase values
    const newQuantity = purchaseData.quantity ?? existingPurchase.quantity
    const newUnitRate = purchaseData.unitRate ?? existingPurchase.unitRate
    const newItemId = purchaseData.itemId ?? existingPurchase.itemId

    // If item changed, reverse from old item and add to new item
    if (newItemId !== existingPurchase.itemId) {
      // Reverse from old item
      const oldItemStock = oldStock
      updateItem(existingPurchase.itemId, {
        currentStock: Math.max(0, oldItemStock),
        averageCost: oldAverageCost >= 0 ? oldAverageCost : 0,
      })

      // Add to new item
      const newItem = items.find((i) => i.id === newItemId)
      if (newItem) {
        const newItemOldValue = newItem.currentStock * newItem.averageCost
        const newItemNewValue = newQuantity * newUnitRate
        const newItemNewStock = newItem.currentStock + newQuantity
        const newItemNewAverageCost = newItemNewStock > 0 ? (newItemOldValue + newItemNewValue) / newItemNewStock : 0
        updateItem(newItemId, {
          currentStock: newItemNewStock,
          averageCost: newItemNewAverageCost,
        })
      }
    } else {
      // Same item - recalculate stock and average cost
      const newStock = oldStock + newQuantity
      const newTotalValue = oldStock * oldAverageCost + newQuantity * newUnitRate
      const newAverageCost = newStock > 0 ? newTotalValue / newStock : 0

      updateItem(newItemId, {
        currentStock: Math.max(0, newStock),
        averageCost: newAverageCost >= 0 ? newAverageCost : 0,
      })
    }

    // Update purchase record
    const totalAmount = newQuantity * newUnitRate
    const updatedPurchases = purchases.map((p) =>
      p.id === id
        ? {
            ...p,
            ...purchaseData,
            quantity: newQuantity,
            unitRate: newUnitRate,
            itemId: newItemId,
            totalAmount,
            supplierId: purchaseData.supplierId ?? p.supplierId,
            date: purchaseData.date ?? p.date,
            invoiceNumber: purchaseData.invoiceNumber ?? p.invoiceNumber,
          }
        : p,
    )
    setPurchases(updatedPurchases)
    localStorage.setItem("poultry_purchases", JSON.stringify(updatedPurchases))
  }

  const deletePurchase = (id: string) => {
    console.log("[Inventory Context] deletePurchase called with id:", id)
    
    // Read from localStorage to ensure we have the latest state
    const currentPurchases = JSON.parse(localStorage.getItem("poultry_purchases") || "[]")
    const currentItems = JSON.parse(localStorage.getItem("poultry_inventory_items") || "[]")
    
    console.log("[Inventory Context] Current purchases count:", currentPurchases.length)
    
    const purchase = currentPurchases.find((p: PurchaseEntry) => p.id === id)
    if (!purchase) {
      console.warn(`[Inventory Context] Purchase with id ${id} not found`)
      return
    }

    console.log("[Inventory Context] Found purchase:", purchase)
    console.log("[Inventory Context] Finance transaction ID:", purchase.financeTransactionId)
    
    const item = currentItems.find((i: InventoryItem) => i.id === purchase.itemId)
    console.log("[Inventory Context] Found item:", item ? `${item.code} - ${item.name}` : "Item not found")
    
    // Only reverse stock if item exists
    if (item) {
      // Reverse the purchase's impact on stock using weighted average reversal
      // Current total value = currentStock * averageCost
      const currentTotalValue = item.currentStock * item.averageCost
      // Purchase value that was added
      const purchaseValue = purchase.quantity * purchase.unitRate
      // Stock before this purchase
      const oldStock = item.currentStock - purchase.quantity

      // Calculate average cost before this purchase
      let oldAverageCost = 0
      if (oldStock > 0) {
        // Reverse the weighted average: total_value_before = total_value_now - purchase_value
        const oldTotalValue = currentTotalValue - purchaseValue
        oldAverageCost = oldTotalValue / oldStock
      } else {
        // If stock goes to 0 or below, reset to opening average cost
        oldAverageCost = item.openingStock > 0 ? item.openingValue / item.openingStock : 0
      }

      // Ensure average cost is not negative
      oldAverageCost = Math.max(0, oldAverageCost)

      // Update item stock and average cost
      const updatedItems = currentItems.map((i: InventoryItem) =>
        i.id === purchase.itemId
          ? {
              ...i,
              currentStock: Math.max(0, oldStock),
              averageCost: oldAverageCost,
            }
          : i,
      )
      setItems(updatedItems)
      localStorage.setItem("poultry_inventory_items", JSON.stringify(updatedItems))
    }

    // Remove purchase - always delete the purchase record even if item is deleted
    const updatedPurchases = currentPurchases.filter((p: PurchaseEntry) => p.id !== id)
    console.log("[Inventory Context] Updated purchases count:", updatedPurchases.length)
    console.log("[Inventory Context] Purchase removed successfully")
    
    setPurchases(updatedPurchases)
    localStorage.setItem("poultry_purchases", JSON.stringify(updatedPurchases))
    
    console.log("[Inventory Context] Purchase deleted and state updated")
  }

  const addSale = (sale: Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue" | "financeTransactionId">) => {
    // Read from localStorage to ensure we have the latest state
    const currentSales = JSON.parse(localStorage.getItem("poultry_sales") || "[]")
    
    const liveWeightKg = sale.birds * sale.avgWeightKg
    const totalValue = liveWeightKg * sale.ratePerKg
    
    const newSale: SaleEntry = {
      ...sale,
      id: Date.now().toString(),
      liveWeightKg,
      totalValue,
      createdAt: new Date().toISOString(),
    }

    const updatedSales = [...currentSales, newSale]
    setSales(updatedSales)
    localStorage.setItem("poultry_sales", JSON.stringify(updatedSales))
    return newSale
  }

  const updateSale = (id: string, saleData: Partial<Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue">>) => {
    // Read from localStorage to ensure we have the latest state
    const currentSales = JSON.parse(localStorage.getItem("poultry_sales") || "[]")
    
    const existingSale = currentSales.find((s: SaleEntry) => s.id === id)
    if (!existingSale) return

    // Recalculate liveWeight and totalValue if birds, avgWeightKg, or ratePerKg changed
    const birds = saleData.birds ?? existingSale.birds
    const avgWeightKg = saleData.avgWeightKg ?? existingSale.avgWeightKg
    const ratePerKg = saleData.ratePerKg ?? existingSale.ratePerKg
    
    const liveWeightKg = birds * avgWeightKg
    const totalValue = liveWeightKg * ratePerKg

    const updatedSales = currentSales.map((s: SaleEntry) =>
      s.id === id
        ? {
            ...s,
            ...saleData,
            birds,
            avgWeightKg,
            ratePerKg,
            liveWeightKg,
            totalValue,
          }
        : s,
    )
    setSales(updatedSales)
    localStorage.setItem("poultry_sales", JSON.stringify(updatedSales))
  }

  const deleteSale = (id: string) => {
    // Read from localStorage to ensure we have the latest state
    const currentSales = JSON.parse(localStorage.getItem("poultry_sales") || "[]")
    
    const sale = currentSales.find((s: SaleEntry) => s.id === id)
    if (!sale) return

    // Remove sale
    const updatedSales = currentSales.filter((s: SaleEntry) => s.id !== id)
    setSales(updatedSales)
    localStorage.setItem("poultry_sales", JSON.stringify(updatedSales))
  }

  const linkSaleToFinance = (saleId: string, financeTransactionId: string) => {
    // Read from localStorage to ensure we have the latest state
    const currentSales = JSON.parse(localStorage.getItem("poultry_sales") || "[]")
    const updatedSales = currentSales.map((s: SaleEntry) =>
      s.id === saleId ? { ...s, financeTransactionId } : s,
    )
    setSales(updatedSales)
    localStorage.setItem("poultry_sales", JSON.stringify(updatedSales))
  }

  const addIssue = (issue: Omit<IssueEntry, "id" | "createdAt" | "costPerUnit" | "totalCost">) => {
    setItems((prevItems) => {
      const item = prevItems.find((i) => i.id === issue.itemId)
      if (!item) return prevItems

      const costPerUnit = item.averageCost
      const totalCost = issue.quantity * costPerUnit

      const newIssue: IssueEntry = {
        ...issue,
        id: Date.now().toString(),
        costPerUnit,
        totalCost,
        createdAt: new Date().toISOString(),
      }

      // Reduce stock
      const updatedItems = prevItems.map((i) =>
        i.id === issue.itemId
          ? {
              ...i,
              currentStock: Math.max(0, i.currentStock - issue.quantity),
            }
          : i,
      )

      // Add issue
      setIssues((prevIssues) => {
        const updatedIssues = [...prevIssues, newIssue]
        if (typeof window !== "undefined") {
          localStorage.setItem("poultry_issues", JSON.stringify(updatedIssues))
        }
        return updatedIssues
      })

      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_inventory_items", JSON.stringify(updatedItems))
      }
      return updatedItems
    })
  }

  const getPurchasesByItem = (itemId: string) => {
    return purchases.filter((p) => p.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date))
  }

  const getIssuesByItem = (itemId: string) => {
    return issues.filter((i) => i.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date))
  }

  const getIssuesByBatch = (batchId: string) => {
    return issues.filter((i) => i.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date))
  }

  const getPurchaseById = (id: string) => {
    return purchases.find((p) => p.id === id)
  }

  const getSaleById = (id: string) => {
    return sales.find((s) => s.id === id)
  }

  const getSalesByBuyer = (buyerId: string) => {
    return sales.filter((s) => s.buyerId === buyerId).sort((a, b) => b.date.localeCompare(a.date))
  }

  const getTotalBirdsSold = () => {
    return sales.reduce((sum, s) => sum + s.birds, 0)
  }

  const getTotalRevenue = () => {
    return sales.reduce((sum, s) => sum + s.totalValue, 0)
  }

  const getLowStockItems = () => {
    return items.filter((item) => item.currentStock <= item.reorderLevel)
  }

  const getItemById = (id: string) => {
    return items.find((i) => i.id === id)
  }

  return (
    <InventoryContext.Provider
      value={{
        items,
        purchases,
        issues,
        sales,
        addItem,
        updateItem,
        deleteItem,
        addPurchase,
        updatePurchase,
        deletePurchase,
        linkPurchaseToFinance,
        addSale,
        updateSale,
        deleteSale,
        linkSaleToFinance,
        addIssue,
        getPurchasesByItem,
        getIssuesByItem,
        getIssuesByBatch,
        getSalesByBuyer,
        getLowStockItems,
        getItemById,
        getPurchaseById,
        getSaleById,
        getTotalBirdsSold,
        getTotalRevenue,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return context
}

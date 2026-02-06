"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"

export interface InventoryItem {
  id: string
  farmId: string | null // NULL means Main Godown
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
  financeTransactionId?: string
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

export interface StockTransfer {
  id: string
  date: string
  itemId: string
  sourceFarmId: string | null
  destinationFarmId: string | null
  quantity: number
  driverNotes: string
  createdAt: string
}

export interface SaleEntry {
  id: string
  date: string
  buyerId: string
  birds: number
  avgWeightKg: number
  liveWeightKg: number
  ratePerKg: number
  totalValue: number
  invoiceNumber: string
  remarks: string
  financeTransactionId?: string
  createdAt: string
}

interface InventoryContextType {
  items: InventoryItem[]
  purchases: PurchaseEntry[]
  issues: IssueEntry[]
  sales: SaleEntry[]
  transfers: StockTransfer[]
  loading: boolean
  refetch: () => Promise<void>
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "currentStock" | "averageCost">) => Promise<void>
  updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  addPurchase: (purchase: Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount" | "financeTransactionId">) => Promise<PurchaseEntry | null>
  addBulkPurchaseAndDispatch: (
    purchase: Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount" | "financeTransactionId">,
    dispatches: { farmId: string | null; quantity: number }[]
  ) => Promise<void>
  updatePurchase: (id: string, purchase: Partial<Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount">>) => Promise<void>
  deletePurchase: (id: string) => Promise<void>
  linkPurchaseToFinance: (purchaseId: string, financeTransactionId: string) => Promise<void>
  addSale: (sale: Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue" | "financeTransactionId">) => Promise<SaleEntry | null>
  updateSale: (id: string, sale: Partial<Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue">>) => Promise<void>
  deleteSale: (id: string) => Promise<void>
  linkSaleToFinance: (saleId: string, financeTransactionId: string) => Promise<void>
  addIssue: (issue: Omit<IssueEntry, "id" | "createdAt" | "costPerUnit" | "totalCost">) => Promise<void>
  moveStock: (transfer: Omit<StockTransfer, "id" | "createdAt">) => Promise<void>
  getPurchasesByItem: (itemId: string) => PurchaseEntry[]
  getIssuesByItem: (itemId: string) => IssueEntry[]
  getIssuesByBatch: (batchId: string) => IssueEntry[]
  getSalesByBuyer: (buyerId: string) => SaleEntry[]
  getLowStockItems: (farmId?: string | null) => InventoryItem[]
  getItemById: (id: string) => InventoryItem | undefined
  getItemByCodeAndFarm: (code: string, farmId: string | null) => InventoryItem | undefined
  getPurchaseById: (id: string) => PurchaseEntry | undefined
  getSaleById: (id: string) => SaleEntry | undefined
  getTotalBirdsSold: () => number
  getTotalRevenue: () => number
  initializeCoreItems: (farms: { id: string }[]) => Promise<void>
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([])
  const [issues, setIssues] = useState<IssueEntry[]>([])
  const [sales, setSales] = useState<SaleEntry[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const [itemsRes, purchasesRes, salesRes, issuesRes, transfersRes] = await Promise.all([
        supabase.from("inventory").select("*").order("code", { ascending: true, nullsFirst: false }),
        supabase.from("purchases").select("*").order("date", { ascending: false }),
        supabase.from("sales").select("*").order("date", { ascending: false }),
        supabase.from("issues").select("*").order("date", { ascending: false }),
        supabase.from("transfers").select("*").order("date", { ascending: false }),
      ])
      if (itemsRes.error) throw itemsRes.error
      if (purchasesRes.error) throw purchasesRes.error
      if (salesRes.error) throw salesRes.error
      setItems((itemsRes.data as InventoryItem[]) || [])
      setPurchases((purchasesRes.data as PurchaseEntry[]) || [])
      setSales((salesRes.data as SaleEntry[]) || [])
      if (issuesRes.error && issuesRes.error.code !== "PGRST116") throw issuesRes.error
      setIssues((issuesRes.data as IssueEntry[]) || [])
      if (transfersRes.error && transfersRes.error.code !== "PGRST116") {
        console.warn("Transfers table might not exist yet:", transfersRes.error.message)
        setTransfers([])
      } else {
        setTransfers((transfersRes.data as StockTransfer[]) || [])
      }
    } catch (e) {
      logFetchError("inventory (inventory, purchases, sales, issues)", e)
      setItems([])
      setPurchases([])
      setIssues([])
      setSales([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const addItem = async (item: Omit<InventoryItem, "id" | "createdAt" | "currentStock" | "averageCost">) => {
    const averageCost = item.openingStock > 0 ? item.openingValue / item.openingStock : 0
    const row = {
      id: Date.now().toString(),
      ...item,
      currentStock: item.openingStock,
      averageCost,
      createdAt: new Date().toISOString(),
    }
    const { error } = await supabase.from("inventory").insert(row)
    if (error) throw error
    await fetchInventory()
  }

  const updateItem = async (id: string, item: Partial<InventoryItem>) => {
    const { error } = await supabase.from("inventory").update(item).eq("id", id)
    if (error) throw error
    await fetchInventory()
  }

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id)
    if (error) throw error
    await fetchInventory()
  }

  const addPurchase = async (
    purchase: Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount" | "financeTransactionId">
  ): Promise<PurchaseEntry | null> => {
    const totalAmount = purchase.quantity * purchase.unitRate
    const row = {
      id: Date.now().toString(),
      ...purchase,
      totalAmount,
      createdAt: new Date().toISOString(),
    }
    const { data, error } = await supabase.from("purchases").insert(row).select().single()
    if (error) throw error
    const item = items.find((i) => i.id === purchase.itemId)
    if (item) {
      const newStock = Number(item.currentStock) + Number(purchase.quantity)
      const newAvg = newStock > 0 ? (Number(item.currentStock) * Number(item.averageCost) + totalAmount) / newStock : 0
      await supabase.from("inventory").update({ currentStock: newStock, averageCost: newAvg }).eq("id", purchase.itemId)
    }
    await fetchInventory()
    return data as PurchaseEntry
  }

  const addBulkPurchaseAndDispatch = async (
    purchase: Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount" | "financeTransactionId">,
    dispatches: { farmId: string | null; quantity: number }[]
  ) => {
    // 1. Record the total purchase in Main Godown first (or just record the financial part)
    // Actually the requirement says "Enter total bill once, then list which farms got how many bags"
    // We'll treat this as:
    // a) Create one Purchase entry (for the total)
    // b) Distribute the quantities to the respective farm inventory items

    const totalQty = dispatches.reduce((sum, d) => sum + d.quantity, 0)
    const totalAmount = totalQty * purchase.unitRate

    // Create the purchase entry
    const purchaseRow = {
      id: Date.now().toString(),
      ...purchase,
      quantity: totalQty,
      totalAmount,
      createdAt: new Date().toISOString(),
    }

    const { data: savedPurchase, error: pError } = await supabase.from("purchases").insert(purchaseRow).select().single()
    if (pError) throw pError

    // Distribute to each farm
    const targetItem = items.find(i => i.id === purchase.itemId)
    if (!targetItem) throw new Error("Item not found")

    for (const dispatch of dispatches) {
      // Find the item for this farm
      let farmItem = items.find(i => i.code === targetItem.code && i.farmId === dispatch.farmId)

      if (!farmItem) {
        // Create if doesn't exist (though they should be auto-created)
        const newItemRow = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          farmId: dispatch.farmId,
          code: targetItem.code,
          name: targetItem.name,
          category: targetItem.category,
          unit: targetItem.unit,
          openingStock: 0,
          openingValue: 0,
          currentStock: dispatch.quantity,
          averageCost: purchase.unitRate,
          reorderLevel: targetItem.reorderLevel,
          createdAt: new Date().toISOString()
        }
        await supabase.from("inventory").insert(newItemRow)
      } else {
        const newStock = Number(farmItem.currentStock) + Number(dispatch.quantity)
        const newAvg = newStock > 0 ? (Number(farmItem.currentStock) * Number(farmItem.averageCost) + (dispatch.quantity * purchase.unitRate)) / newStock : purchase.unitRate
        await supabase.from("inventory").update({ currentStock: newStock, averageCost: newAvg }).eq("id", farmItem.id)
      }
    }

    await fetchInventory()
  }

  const linkPurchaseToFinance = async (purchaseId: string, financeTransactionId: string) => {
    const { error } = await supabase.from("purchases").update({ financeTransactionId }).eq("id", purchaseId)
    if (error) throw error
    await fetchInventory()
  }

  const updatePurchase = async (
    id: string,
    purchaseData: Partial<Omit<PurchaseEntry, "id" | "createdAt" | "totalAmount">>
  ) => {
    const existing = purchases.find((p) => p.id === id)
    if (!existing) return
    const item = items.find((i) => i.id === existing.itemId)
    if (!item) return
    const newQty = purchaseData.quantity ?? existing.quantity
    const newRate = purchaseData.unitRate ?? existing.unitRate
    const totalAmount = newQty * newRate
    const oldStock = item.currentStock - existing.quantity
    const oldVal = oldStock * item.averageCost - existing.quantity * existing.unitRate
    const oldAvg = oldStock > 0 ? oldVal / oldStock : item.averageCost
    const newStock = oldStock + newQty
    const newAvg = newStock > 0 ? (oldStock * oldAvg + totalAmount) / newStock : 0
    await supabase.from("inventory").update({ currentStock: Math.max(0, newStock), averageCost: Math.max(0, newAvg) }).eq("id", existing.itemId)
    await supabase.from("purchases").update({ ...purchaseData, quantity: newQty, unitRate: newRate, totalAmount }).eq("id", id)
    await fetchInventory()
  }

  const deletePurchase = async (id: string) => {
    const purchase = purchases.find((p) => p.id === id)
    if (!purchase) return
    const item = items.find((i) => i.id === purchase.itemId)
    if (item) {
      const oldStock = item.currentStock - purchase.quantity
      const oldVal = item.currentStock * item.averageCost - purchase.quantity * purchase.unitRate
      const oldAvg = oldStock > 0 ? oldVal / oldStock : 0
      await supabase.from("inventory").update({ currentStock: Math.max(0, oldStock), averageCost: Math.max(0, oldAvg) }).eq("id", purchase.itemId)
    }
    const { error } = await supabase.from("purchases").delete().eq("id", id)
    if (error) throw error
    await fetchInventory()
  }

  const addSale = async (
    sale: Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue" | "financeTransactionId">
  ): Promise<SaleEntry | null> => {
    const liveWeightKg = sale.birds * sale.avgWeightKg
    const totalValue = liveWeightKg * sale.ratePerKg
    const row = {
      id: Date.now().toString(),
      ...sale,
      liveWeightKg,
      totalValue,
      createdAt: new Date().toISOString(),
    }
    const { data, error } = await supabase.from("sales").insert(row).select().single()
    if (error) throw error
    await fetchInventory()
    return data as SaleEntry
  }

  const updateSale = async (
    id: string,
    saleData: Partial<Omit<SaleEntry, "id" | "createdAt" | "liveWeightKg" | "totalValue">>
  ) => {
    const existing = sales.find((s) => s.id === id)
    if (!existing) return
    const birds = saleData.birds ?? existing.birds
    const avgWeightKg = saleData.avgWeightKg ?? existing.avgWeightKg
    const ratePerKg = saleData.ratePerKg ?? existing.ratePerKg
    const liveWeightKg = birds * avgWeightKg
    const totalValue = liveWeightKg * ratePerKg
    await supabase
      .from("sales")
      .update({ ...saleData, birds, avgWeightKg, ratePerKg, liveWeightKg, totalValue })
      .eq("id", id)
    await fetchInventory()
  }

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", id)
    if (error) throw error
    await fetchInventory()
  }

  const linkSaleToFinance = async (saleId: string, financeTransactionId: string) => {
    const { error } = await supabase.from("sales").update({ financeTransactionId }).eq("id", saleId)
    if (error) throw error
    await fetchInventory()
  }

  const addIssue = async (issue: Omit<IssueEntry, "id" | "createdAt" | "costPerUnit" | "totalCost">) => {
    const item = items.find((i) => i.id === issue.itemId)
    if (!item) throw new Error("Item not found")
    const costPerUnit = item.averageCost
    const totalCost = issue.quantity * costPerUnit
    const row = {
      id: Date.now().toString(),
      ...issue,
      costPerUnit,
      totalCost,
      createdAt: new Date().toISOString(),
    }
    const { error } = await supabase.from("issues").insert(row)
    if (error) throw error
    await supabase
      .from("inventory")
      .update({ currentStock: Math.max(0, Number(item.currentStock) - Number(issue.quantity)) })
      .eq("id", issue.itemId)
    await fetchInventory()
  }

  const moveStock = async (transfer: Omit<StockTransfer, "id" | "createdAt">) => {
    const sourceItem = items.find(i => i.id === transfer.itemId)
    if (!sourceItem) throw new Error("Source item not found")

    if (Number(sourceItem.currentStock) < Number(transfer.quantity)) {
      throw new Error(`Insufficient stock in source location. Available: ${sourceItem.currentStock}`)
    }

    // Find destination item (same code, different farmId)
    let destItem = items.find(i => i.code === sourceItem.code && i.farmId === transfer.destinationFarmId)

    if (!destItem) {
      // Create destination item if not exists
      const newItemRow = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        farmId: transfer.destinationFarmId,
        code: sourceItem.code,
        name: sourceItem.name,
        category: sourceItem.category,
        unit: sourceItem.unit,
        openingStock: 0,
        openingValue: 0,
        currentStock: transfer.quantity,
        averageCost: sourceItem.averageCost,
        reorderLevel: sourceItem.reorderLevel,
        createdAt: new Date().toISOString()
      }
      const { error } = await supabase.from("inventory").insert(newItemRow)
      if (error) throw error
    } else {
      // Update destination stock and avg cost
      const newStock = Number(destItem.currentStock) + Number(transfer.quantity)
      const newAvg = newStock > 0 ? (Number(destItem.currentStock) * Number(destItem.averageCost) + (transfer.quantity * sourceItem.averageCost)) / newStock : sourceItem.averageCost
      await supabase.from("inventory").update({ currentStock: newStock, averageCost: newAvg }).eq("id", destItem.id)
    }

    // Update source stock
    await supabase.from("inventory").update({ currentStock: Number(sourceItem.currentStock) - Number(transfer.quantity) }).eq("id", sourceItem.id)

    // Record transfer
    const transferRow = {
      id: Date.now().toString(),
      ...transfer,
      createdAt: new Date().toISOString()
    }
    await supabase.from("transfers").insert(transferRow)

    await fetchInventory()
  }

  const initializeCoreItems = async (farms: { id: string }[]) => {
    const coreItems = [
      { code: "MAIZE", name: "Maize", category: "feed-raw", unit: "kg" },
      { code: "SOYA", name: "Soya", category: "feed-raw", unit: "kg" },
      { code: "BROKENRICE", name: "Broken Rice (Nukalu)", category: "feed-raw", unit: "kg" },
      { code: "SUPPL-5", name: "5% Supplement", category: "feed-raw", unit: "kg" },
    ]

    const locations = [null, ...farms.map(f => f.id)]

    for (const farmId of locations) {
      for (const core of coreItems) {
        const existing = items.find(i => i.code === core.code && i.farmId === farmId)
        if (!existing) {
          const row = {
            id: `item-${core.code}-${farmId || 'godown'}-${Date.now()}`,
            farmId,
            code: core.code,
            name: core.name,
            category: core.category,
            unit: core.unit,
            openingStock: 0,
            openingValue: 0,
            currentStock: 0,
            averageCost: 0,
            reorderLevel: 500, // Default reorder level
            createdAt: new Date().toISOString()
          }
          await supabase.from("inventory").insert(row)
        }
      }
    }
    await fetchInventory()
  }

  const getPurchasesByItem = (itemId: string) =>
    purchases.filter((p) => p.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date))
  const getIssuesByItem = (itemId: string) =>
    issues.filter((i) => i.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date))
  const getIssuesByBatch = (batchId: string) =>
    issues.filter((i) => i.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date))
  const getPurchaseById = (id: string) => purchases.find((p) => p.id === id)
  const getSaleById = (id: string) => sales.find((s) => s.id === id)
  const getSalesByBuyer = (buyerId: string) =>
    sales.filter((s) => s.buyerId === buyerId).sort((a, b) => b.date.localeCompare(a.date))
  const getTotalBirdsSold = () => sales.reduce((sum, s) => sum + s.birds, 0)
  const getTotalRevenue = () => sales.reduce((sum, s) => sum + s.totalValue, 0)
  const getLowStockItems = (farmId?: string | null) => {
    let filtered = items
    if (farmId !== undefined) {
      filtered = items.filter(i => i.farmId === farmId)
    }
    return filtered.filter((i) => Number(i.currentStock) <= Number(i.reorderLevel))
  }
  const getItemById = (id: string) => items.find((i) => i.id === id)
  const getItemByCodeAndFarm = (code: string, farmId: string | null) => items.find(i => i.code === code && i.farmId === farmId)

  return (
    <InventoryContext.Provider
      value={{
        items,
        purchases,
        issues,
        sales,
        transfers,
        loading,
        refetch: fetchInventory,
        addItem,
        updateItem,
        deleteItem,
        addPurchase,
        addBulkPurchaseAndDispatch,
        updatePurchase,
        deletePurchase,
        linkPurchaseToFinance,
        addSale,
        updateSale,
        deleteSale,
        linkSaleToFinance,
        addIssue,
        moveStock,
        getPurchasesByItem,
        getIssuesByItem,
        getIssuesByBatch,
        getSalesByBuyer,
        getLowStockItems,
        getItemById,
        getItemByCodeAndFarm,
        getPurchaseById,
        getSaleById,
        getTotalBirdsSold,
        getTotalRevenue,
        initializeCoreItems,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (ctx === undefined) throw new Error("useInventory must be used within an InventoryProvider")
  return ctx
}

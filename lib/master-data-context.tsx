"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logFetchError } from "@/lib/supabase-errors"

export interface Farm {
  id: string
  name: string
  location: string
  capacity: number
  createdAt: string
}

export interface House {
  id: string
  farmId: string
  name: string
  capacity: number
  status: "active" | "maintenance" | "inactive"
  createdAt: string
}

interface Supplier {
  id: string
  name: string
  type: "feed" | "medicine" | "equipment" | "other"
  contact: string
  createdAt: string
}

interface Buyer {
  id: string
  name: string
  contact: string
  address: string
  createdAt: string
}

interface FeedType {
  id: string
  name: string
  category: "starter" | "grower" | "finisher"
  protein: number
  price: number
  createdAt: string
}

interface MasterDataContextType {
  farms: Farm[]
  houses: House[]
  suppliers: Supplier[]
  buyers: Buyer[]
  feedTypes: FeedType[]
  loading: boolean
  refetch: () => Promise<void>
  addFarm: (farm: Omit<Farm, "id" | "createdAt">) => Promise<void>
  updateFarm: (id: string, farm: Partial<Farm>) => Promise<void>
  deleteFarm: (id: string) => Promise<void>
  addHouse: (house: Omit<House, "id" | "createdAt">) => Promise<void>
  updateHouse: (id: string, house: Partial<House>) => Promise<void>
  deleteHouse: (id: string) => Promise<void>
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => Promise<void>
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
  addBuyer: (buyer: Omit<Buyer, "id" | "createdAt">) => Promise<void>
  updateBuyer: (id: string, buyer: Partial<Buyer>) => Promise<void>
  deleteBuyer: (id: string) => Promise<void>
  addFeedType: (feedType: Omit<FeedType, "id" | "createdAt">) => Promise<void>
  updateFeedType: (id: string, feedType: Partial<FeedType>) => Promise<void>
  deleteFeedType: (id: string) => Promise<void>
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined)

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*")
  if (error) throw error
  return (data as T[]) || []
}

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const [farms, setFarms] = useState<Farm[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [f, h, s, b, ft] = await Promise.all([
        fetchTable<Farm>("farms"),
        fetchTable<House>("houses"),
        fetchTable<Supplier>("suppliers"),
        fetchTable<Buyer>("buyers"),
        fetchTable<FeedType>("feed_types"),
      ])
      setFarms(f)
      setHouses(h)
      setSuppliers(s)
      setBuyers(b)
      setFeedTypes(ft)
    } catch (e) {
      logFetchError("master data (farms, houses, suppliers, buyers, feed_types)", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const row = (o: object) => ({ ...o, id: Date.now().toString(), createdAt: new Date().toISOString() })

  const addFarm = async (farm: Omit<Farm, "id" | "createdAt">) => {
    const farmId = Date.now().toString()
    const { error } = await supabase.from("farms").insert({ ...farm, id: farmId, createdAt: new Date().toISOString() })
    if (error) throw error

    // Auto-initialize core inventory items for the new farm
    const coreItems = [
      { code: "MAIZE", name: "Maize", category: "feed-raw", unit: "kg" },
      { code: "SOYA", name: "Soya", category: "feed-raw", unit: "kg" },
      { code: "BROKENRICE", name: "Broken Rice", category: "feed-raw", unit: "kg" },
      { code: "SUPPL-5", name: "5% Supplement", category: "feed-raw", unit: "kg" },
    ]

    for (const core of coreItems) {
      const row = {
        id: `item-${core.code}-${farmId}-${Date.now()}`,
        farmId,
        code: core.code,
        name: core.name,
        category: core.category,
        unit: core.unit,
        openingStock: 0,
        openingValue: 0,
        currentStock: 0,
        averageCost: 0,
        reorderLevel: 500,
        createdAt: new Date().toISOString()
      }
      await supabase.from("inventory").insert(row)
    }

    await fetchAll()
  }
  const updateFarm = async (id: string, farm: Partial<Farm>) => {
    const { error } = await supabase.from("farms").update(farm).eq("id", id)
    if (error) throw error
    await fetchAll()
  }
  const deleteFarm = async (id: string) => {
    const { error } = await supabase.from("farms").delete().eq("id", id)
    if (error) {
      console.error("Error deleting farm:", error)
      throw error
    }
    await fetchAll()
  }

  const addHouse = async (house: Omit<House, "id" | "createdAt">) => {
    const { error } = await supabase.from("houses").insert(row(house))
    if (error) throw error
    await fetchAll()
  }
  const updateHouse = async (id: string, house: Partial<House>) => {
    const { error } = await supabase.from("houses").update(house).eq("id", id)
    if (error) throw error
    await fetchAll()
  }
  const deleteHouse = async (id: string) => {
    const { error } = await supabase.from("houses").delete().eq("id", id)
    if (error) throw error
    await fetchAll()
  }

  const addSupplier = async (supplier: Omit<Supplier, "id" | "createdAt">) => {
    const { error } = await supabase.from("suppliers").insert(row(supplier))
    if (error) throw error
    await fetchAll()
  }
  const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    const { error } = await supabase.from("suppliers").update(supplier).eq("id", id)
    if (error) throw error
    await fetchAll()
  }
  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id)
    if (error) throw error
    await fetchAll()
  }

  const addBuyer = async (buyer: Omit<Buyer, "id" | "createdAt">) => {
    const { error } = await supabase.from("buyers").insert(row(buyer))
    if (error) throw error
    await fetchAll()
  }
  const updateBuyer = async (id: string, buyer: Partial<Buyer>) => {
    const { error } = await supabase.from("buyers").update(buyer).eq("id", id)
    if (error) throw error
    await fetchAll()
  }
  const deleteBuyer = async (id: string) => {
    const { error } = await supabase.from("buyers").delete().eq("id", id)
    if (error) throw error
    await fetchAll()
  }

  const addFeedType = async (feedType: Omit<FeedType, "id" | "createdAt">) => {
    const { error } = await supabase.from("feed_types").insert(row(feedType))
    if (error) throw error
    await fetchAll()
  }
  const updateFeedType = async (id: string, feedType: Partial<FeedType>) => {
    const { error } = await supabase.from("feed_types").update(feedType).eq("id", id)
    if (error) throw error
    await fetchAll()
  }
  const deleteFeedType = async (id: string) => {
    const { error } = await supabase.from("feed_types").delete().eq("id", id)
    if (error) throw error
    await fetchAll()
  }

  return (
    <MasterDataContext.Provider
      value={{
        farms,
        houses,
        suppliers,
        buyers,
        feedTypes,
        loading,
        refetch: fetchAll,
        addFarm,
        updateFarm,
        deleteFarm,
        addHouse,
        updateHouse,
        deleteHouse,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addBuyer,
        updateBuyer,
        deleteBuyer,
        addFeedType,
        updateFeedType,
        deleteFeedType,
      }}
    >
      {children}
    </MasterDataContext.Provider>
  )
}

export function useMasterData() {
  const ctx = useContext(MasterDataContext)
  if (ctx === undefined) throw new Error("useMasterData must be used within a MasterDataProvider")
  return ctx
}

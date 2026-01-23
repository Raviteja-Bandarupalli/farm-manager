"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

interface Farm {
  id: string
  name: string
  location: string
  capacity: number
  createdAt: string
}

interface House {
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
  addFarm: (farm: Omit<Farm, "id" | "createdAt">) => void
  updateFarm: (id: string, farm: Partial<Farm>) => void
  deleteFarm: (id: string) => void
  addHouse: (house: Omit<House, "id" | "createdAt">) => void
  updateHouse: (id: string, house: Partial<House>) => void
  deleteHouse: (id: string) => void
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => void
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  addBuyer: (buyer: Omit<Buyer, "id" | "createdAt">) => void
  updateBuyer: (id: string, buyer: Partial<Buyer>) => void
  deleteBuyer: (id: string) => void
  addFeedType: (feedType: Omit<FeedType, "id" | "createdAt">) => void
  updateFeedType: (id: string, feedType: Partial<FeedType>) => void
  deleteFeedType: (id: string) => void
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined)

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const [farms, setFarms] = useState<Farm[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([])

  useEffect(() => {
    // Load data from localStorage (only on client side)
    if (typeof window !== "undefined") {
      try {
        const storedFarms = localStorage.getItem("poultry_farms")
        const storedHouses = localStorage.getItem("poultry_houses")
        const storedSuppliers = localStorage.getItem("poultry_suppliers")
        const storedBuyers = localStorage.getItem("poultry_buyers")
        const storedFeedTypes = localStorage.getItem("poultry_feed_types")

        if (storedFarms) {
          const parsed = JSON.parse(storedFarms)
          if (Array.isArray(parsed)) setFarms(parsed)
        }
        if (storedHouses) {
          const parsed = JSON.parse(storedHouses)
          if (Array.isArray(parsed)) setHouses(parsed)
        }
        if (storedSuppliers) {
          const parsed = JSON.parse(storedSuppliers)
          if (Array.isArray(parsed)) setSuppliers(parsed)
        }
        if (storedBuyers) {
          const parsed = JSON.parse(storedBuyers)
          if (Array.isArray(parsed)) setBuyers(parsed)
        }
        if (storedFeedTypes) {
          const parsed = JSON.parse(storedFeedTypes)
          if (Array.isArray(parsed)) setFeedTypes(parsed)
        }
      } catch (error) {
        console.error("Error loading data from localStorage:", error)
      }
    }
  }, [])

  // Farm operations
  const addFarm = (farm: Omit<Farm, "id" | "createdAt">) => {
    setFarms((prevFarms) => {
      const newFarm: Farm = { ...farm, id: Date.now().toString(), createdAt: new Date().toISOString() }
      const updatedFarms = [...prevFarms, newFarm]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_farms", JSON.stringify(updatedFarms))
      }
      return updatedFarms
    })
  }

  const updateFarm = (id: string, farm: Partial<Farm>) => {
    setFarms((prevFarms) => {
      const updatedFarms = prevFarms.map((f) => (f.id === id ? { ...f, ...farm } : f))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_farms", JSON.stringify(updatedFarms))
      }
      return updatedFarms
    })
  }

  const deleteFarm = (id: string) => {
    setFarms((prevFarms) => {
      const updatedFarms = prevFarms.filter((f) => f.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_farms", JSON.stringify(updatedFarms))
      }
      return updatedFarms
    })
  }

  // House operations
  const addHouse = (house: Omit<House, "id" | "createdAt">) => {
    setHouses((prevHouses) => {
      const newHouse: House = { ...house, id: Date.now().toString(), createdAt: new Date().toISOString() }
      const updatedHouses = [...prevHouses, newHouse]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_houses", JSON.stringify(updatedHouses))
      }
      return updatedHouses
    })
  }

  const updateHouse = (id: string, house: Partial<House>) => {
    setHouses((prevHouses) => {
      const updatedHouses = prevHouses.map((h) => (h.id === id ? { ...h, ...house } : h))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_houses", JSON.stringify(updatedHouses))
      }
      return updatedHouses
    })
  }

  const deleteHouse = (id: string) => {
    setHouses((prevHouses) => {
      const updatedHouses = prevHouses.filter((h) => h.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_houses", JSON.stringify(updatedHouses))
      }
      return updatedHouses
    })
  }

  // Supplier operations
  const addSupplier = (supplier: Omit<Supplier, "id" | "createdAt">) => {
    setSuppliers((prevSuppliers) => {
      const newSupplier: Supplier = { ...supplier, id: Date.now().toString(), createdAt: new Date().toISOString() }
      const updatedSuppliers = [...prevSuppliers, newSupplier]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_suppliers", JSON.stringify(updatedSuppliers))
      }
      return updatedSuppliers
    })
  }

  const updateSupplier = (id: string, supplier: Partial<Supplier>) => {
    setSuppliers((prevSuppliers) => {
      const updatedSuppliers = prevSuppliers.map((s) => (s.id === id ? { ...s, ...supplier } : s))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_suppliers", JSON.stringify(updatedSuppliers))
      }
      return updatedSuppliers
    })
  }

  const deleteSupplier = (id: string) => {
    setSuppliers((prevSuppliers) => {
      const updatedSuppliers = prevSuppliers.filter((s) => s.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_suppliers", JSON.stringify(updatedSuppliers))
      }
      return updatedSuppliers
    })
  }

  // Buyer operations
  const addBuyer = (buyer: Omit<Buyer, "id" | "createdAt">) => {
    setBuyers((prevBuyers) => {
      const newBuyer: Buyer = { ...buyer, id: Date.now().toString(), createdAt: new Date().toISOString() }
      const updatedBuyers = [...prevBuyers, newBuyer]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_buyers", JSON.stringify(updatedBuyers))
      }
      return updatedBuyers
    })
  }

  const updateBuyer = (id: string, buyer: Partial<Buyer>) => {
    setBuyers((prevBuyers) => {
      const updatedBuyers = prevBuyers.map((b) => (b.id === id ? { ...b, ...buyer } : b))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_buyers", JSON.stringify(updatedBuyers))
      }
      return updatedBuyers
    })
  }

  const deleteBuyer = (id: string) => {
    setBuyers((prevBuyers) => {
      const updatedBuyers = prevBuyers.filter((b) => b.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_buyers", JSON.stringify(updatedBuyers))
      }
      return updatedBuyers
    })
  }

  // Feed Type operations
  const addFeedType = (feedType: Omit<FeedType, "id" | "createdAt">) => {
    setFeedTypes((prevFeedTypes) => {
      const newFeedType: FeedType = { ...feedType, id: Date.now().toString(), createdAt: new Date().toISOString() }
      const updatedFeedTypes = [...prevFeedTypes, newFeedType]
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_feed_types", JSON.stringify(updatedFeedTypes))
      }
      return updatedFeedTypes
    })
  }

  const updateFeedType = (id: string, feedType: Partial<FeedType>) => {
    setFeedTypes((prevFeedTypes) => {
      const updatedFeedTypes = prevFeedTypes.map((f) => (f.id === id ? { ...f, ...feedType } : f))
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_feed_types", JSON.stringify(updatedFeedTypes))
      }
      return updatedFeedTypes
    })
  }

  const deleteFeedType = (id: string) => {
    setFeedTypes((prevFeedTypes) => {
      const updatedFeedTypes = prevFeedTypes.filter((f) => f.id !== id)
      if (typeof window !== "undefined") {
        localStorage.setItem("poultry_feed_types", JSON.stringify(updatedFeedTypes))
      }
      return updatedFeedTypes
    })
  }

  return (
    <MasterDataContext.Provider
      value={{
        farms,
        houses,
        suppliers,
        buyers,
        feedTypes,
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
  const context = useContext(MasterDataContext)
  if (context === undefined) {
    throw new Error("useMasterData must be used within a MasterDataProvider")
  }
  return context
}

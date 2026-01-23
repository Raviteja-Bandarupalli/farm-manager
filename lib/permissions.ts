import type { User } from "./auth-context"
import type { Farm, House, Batch } from "./master-data-context"

export function canViewFarm(user: User | null, farmId: string): boolean {
  if (!user) return false
  if (user.role === "owner") return true
  if (user.role === "manager") {
    // If no farms assigned, manager can see all (backward compatibility)
    if (!user.assignedFarmIds || user.assignedFarmIds.length === 0) return true
    return user.assignedFarmIds.includes(farmId)
  }
  return false
}

export function canViewHouse(user: User | null, house: House, farms: Farm[]): boolean {
  if (!user) return false
  if (user.role === "owner") return true

  const farm = farms.find((f) => f.id === house.farmId)
  if (!farm) return false

  return canViewFarm(user, farm.id)
}

export function canViewBatch(user: User | null, batch: Batch, houses: House[], farms: Farm[]): boolean {
  if (!user) return false
  if (user.role === "owner") return true

  const house = houses.find((h) => h.id === batch.houseId)
  if (!house) return false

  return canViewHouse(user, house, farms)
}

export function canAccessMasterData(user: User | null): boolean {
  if (!user) return false
  return user.role === "owner"
}

export function canAccessInventory(user: User | null): boolean {
  if (!user) return false
  return user.role === "owner"
}

export function canAccessFinance(user: User | null): boolean {
  if (!user) return false
  return user.role === "owner"
}

export function canEditBatchSettings(user: User | null): boolean {
  if (!user) return false
  return user.role === "owner"
}

export function filterVisibleFarms(user: User | null, farms: Farm[]): Farm[] {
  if (!user) return []
  if (user.role === "owner") return farms

  if (user.role === "manager") {
    if (!user.assignedFarmIds || user.assignedFarmIds.length === 0) return farms
    return farms.filter((farm) => user.assignedFarmIds!.includes(farm.id))
  }

  return []
}

export function filterVisibleHouses(user: User | null, houses: House[], farms: Farm[]): House[] {
  if (!user) return []
  if (user.role === "owner") return houses

  const visibleFarms = filterVisibleFarms(user, farms)
  const visibleFarmIds = visibleFarms.map((f) => f.id)

  return houses.filter((house) => visibleFarmIds.includes(house.farmId))
}

export function filterVisibleBatches(user: User | null, batches: Batch[], houses: House[], farms: Farm[]): Batch[] {
  if (!user) return []
  if (user.role === "owner") return batches

  const visibleHouses = filterVisibleHouses(user, houses, farms)
  const visibleHouseIds = visibleHouses.map((h) => h.id)

  return batches.filter((batch) => visibleHouseIds.includes(batch.houseId))
}

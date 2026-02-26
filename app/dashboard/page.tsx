"use client"

import { useState, useMemo } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { useDailyLogs, toDateKey } from "@/lib/daily-logs-context"
import { useInventory } from "@/lib/inventory-context"
import { useFinance } from "@/lib/finance-context"
import { useBatch } from "@/lib/batch-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Home, Package, DollarSign, TrendingUp, AlertTriangle, Activity, Users, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { filterVisibleFarms, filterVisibleHouses, filterVisibleBatches, canAccessFinance } from "@/lib/permissions"
import { getFirstDayOfMonth, getLastDayOfMonth } from "@/lib/date-utils"
import { getTodayDate } from "@/lib/date-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function DashboardPage() {
  const [showFinancials, setShowFinancials] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState("All")
  const { user } = useAuth()
  const { farms: allFarms, houses: allHouses, suppliers, buyers, feedTypes } = useMasterData()
  const { dailyLogs: allDailyLogs } = useDailyLogs()
  const { items, issues: allIssues, getLowStockItems, getTotalBirdsSold, getTotalRevenue } = useInventory()
  const { getTotalIncome, getTotalExpenses, getBalance } = useFinance()
  const { batches: allBatches } = useBatch()

  const filteredFarms = useMemo(() => {
    const visibleFarms = filterVisibleFarms(user, allFarms)
    if (selectedLocation === "All") return visibleFarms
    return visibleFarms.filter((f) => f.location === selectedLocation)
  }, [user, allFarms, selectedLocation])

  const farms = filteredFarms
  const filteredHouseIds = useMemo(() => {
    return filterVisibleHouses(user, allHouses, allFarms)
      .filter((h) => filteredFarms.some((f) => f.id === h.farmId))
      .map((h) => h.id)
  }, [user, allHouses, allFarms, filteredFarms])

  const houses = allHouses.filter((h) => filteredHouseIds.includes(h.id))

  const batches = useMemo(() => {
    return filterVisibleBatches(user, allBatches, allHouses, allFarms).filter((b) =>
      filteredHouseIds.includes(b.houseId),
    )
  }, [user, allBatches, allHouses, allFarms, filteredHouseIds])

  const dailyLogs = useMemo(() => {
    const batchIds = batches.map((b) => b.id)
    return allDailyLogs.filter((log) => batchIds.includes(log.batchId))
  }, [allDailyLogs, batches])

  const issues = useMemo(() => {
    const batchIds = batches.map((b) => b.id)
    return allIssues.filter((iss) => batchIds.includes(iss.batchId))
  }, [allIssues, batches])

  const startOfMonth = getFirstDayOfMonth()
  const endOfMonth = getLastDayOfMonth()

  const monthlyIncome = getTotalIncome(startOfMonth, endOfMonth)
  const monthlyExpenses = getTotalExpenses(startOfMonth, endOfMonth)
  const monthlyBalance = getBalance(startOfMonth, endOfMonth)

  const lowStockItems = getLowStockItems()

  // Calculate Days of Feed Left
  const feedLeftData = useMemo(() => {
    const feedItems = items.filter((i) => i.category.startsWith("feed"))
    const totalFeedStock = feedItems.reduce((sum, i) => sum + i.currentStock, 0)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    const yesterdayConsumption = issues
      .filter((iss) => iss.date === yesterdayStr && feedItems.some(fi => fi.id === iss.itemId))
      .reduce((sum, iss) => sum + iss.quantity, 0)

    // Fallback to average if yesterday was 0
    let consumptionToUse = yesterdayConsumption
    if (consumptionToUse === 0) {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (i + 1))
        return d.toISOString().split("T")[0]
      })
      const weekConsumption = issues
        .filter((iss) => last7Days.includes(iss.date) && feedItems.some(fi => fi.id === iss.itemId))
        .reduce((sum, iss) => sum + iss.quantity, 0)
      consumptionToUse = weekConsumption / 7
    }

    const daysLeft = consumptionToUse > 0 ? Math.floor(totalFeedStock / consumptionToUse) : 0
    return { totalFeedStock, daysLeft, consumptionToUse }
  }, [items, issues])

  const activeBatches = batches.filter((b) => b.status === "active")
  const activeBatchCount = activeBatches.length
  const activeHousesCount = houses.filter((h) => h.status === "active").length

  let totalLiveBirds = 0
  let avgFCR = 0
  let avgMortality = 0
  let avgTargetFCR = 0
  let avgAgeDays = 0
  const performanceAlerts: any[] = []

  let totalInitialBirds = 0
  let totalDeaths = 0
  
  if (activeBatches.length > 0) {
    let fcrSum = 0
    let fcrCount = 0
    let targetFCRSum = 0
    let ageSum = 0

    activeBatches.forEach((batch) => {
      const today = new Date().getTime()
      const placement = new Date(batch.placementDate).getTime()
      const age = Math.max(0, Math.ceil((today - placement) / (1000 * 60 * 60 * 24)))
      ageSum += age

      const batchLogs = dailyLogs.filter((log) => log.batchId === batch.id).sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
      const latestLog = batchLogs[0]

      if (latestLog) {
        totalLiveBirds += latestLog.closingBirds
        
        let batchTotalDeaths = 0
        if (latestLog.cumulativeMortality !== undefined && latestLog.cumulativeMortality !== null) {
          batchTotalDeaths = latestLog.cumulativeMortality + (latestLog.cumulativeCulls || 0)
        } else {
          batchTotalDeaths = batchLogs.reduce((sum, log) => sum + (log.mortality || 0), 0) + (latestLog.cumulativeCulls || 0)
        }
        
        totalDeaths += batchTotalDeaths
        totalInitialBirds += batch.initialBirds

        if (latestLog.cumulativeFCR > 0) {
          fcrSum += latestLog.cumulativeFCR
          fcrCount++
        }

        if (
          latestLog.cumulativeMortalityPercent > batch.mortalityThreshold ||
          latestLog.cumulativeFCR > batch.targetFCR
        ) {
          const house = houses.find((h) => h.id === batch.houseId)
          const farm = house ? farms.find((f) => f.id === house.farmId) : null
          const logAge = Math.ceil(
            (toDateKey(latestLog.date) - toDateKey(batch.placementDate)) / (1000 * 60 * 60 * 24),
          )

          performanceAlerts.push({
            farm: farm?.name || "Unknown",
            house: house?.name || "Unknown",
            batchNumber: batch.batchNumber,
            age: logAge,
            fcr: latestLog.cumulativeFCR.toFixed(2),
            mortality: latestLog.cumulativeMortalityPercent.toFixed(2),
            fcrExceeded: latestLog.cumulativeFCR > batch.targetFCR,
            mortalityExceeded: latestLog.cumulativeMortalityPercent > batch.mortalityThreshold,
          })
        }
      } else {
        totalLiveBirds += batch.initialBirds
        totalInitialBirds += batch.initialBirds
      }

      targetFCRSum += batch.targetFCR
    })

    avgFCR = fcrCount > 0 ? fcrSum / fcrCount : 0
    avgTargetFCR = activeBatches.length > 0 ? targetFCRSum / activeBatches.length : 0
    avgAgeDays = activeBatches.length > 0 ? Math.round(ageSum / activeBatches.length) : 0
  }
  
  if (totalInitialBirds > 0) {
    avgMortality = (totalDeaths / totalInitialBirds) * 100
  } else if (dailyLogs.length > 0) {
    const totalMortalityFromLogs = dailyLogs.reduce((sum, log) => sum + (log.mortality || 0), 0)
    const startingBirds = batches.length > 0 
      ? batches.reduce((sum, b) => sum + (b.initialBirds || 0), 0)
      : dailyLogs.length > 0 
        ? (dailyLogs.sort((a, b) => toDateKey(a.date) - toDateKey(b.date))[0].openingBirds || 0)
        : 0
    
    if (startingBirds > 0) {
      totalDeaths = totalMortalityFromLogs
      totalInitialBirds = startingBirds
      avgMortality = (totalMortalityFromLogs / startingBirds) * 100
    }
  }

  // Mortality Trend (Last 14 days)
  const mortalityTrendData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return d.toISOString().split("T")[0]
    })

    return last14Days.map((date) => {
      const logsOnDay = dailyLogs.filter((log) => log.date === date)
      const totalMortality = logsOnDay.reduce((sum, log) => sum + (log.mortality || 0), 0)
      const totalOpeningBirds = logsOnDay.reduce((sum, log) => sum + (log.openingBirds || 0), 0)

      const dailyMortalityPercent = totalOpeningBirds > 0 ? (totalMortality / totalOpeningBirds) * 100 : 0

      return {
        date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        mortalityPercent: Number(dailyMortalityPercent.toFixed(3)),
        standard: 0.1,
      }
    })
  }, [dailyLogs])

  // Feed vs. Growth (Last 14 days)
  const feedVsGrowthData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return d.toISOString().split("T")[0]
    })

    return last14Days.map((date) => {
      const feedItems = items.filter((i) => i.category.startsWith("feed"))
      const feedItemIds = feedItems.map((i) => i.id)

      const dailyFeedKg = issues
        .filter((iss) => iss.date === date && feedItemIds.includes(iss.itemId))
        .reduce((sum, iss) => sum + iss.quantity, 0)

      const feedBags = dailyFeedKg / 50

      const logsOnDay = dailyLogs.filter((log) => log.date === date)
      const avgCumMortalityPercent =
        logsOnDay.length > 0 ? logsOnDay.reduce((sum, log) => sum + (log.cumulativeMortalityPercent || 0), 0) / logsOnDay.length : 0

      return {
        date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        feedBags: Number(feedBags.toFixed(1)),
        mortalityPercent: Number(avgCumMortalityPercent.toFixed(2)),
      }
    })
  }, [dailyLogs, issues, items])

  const todayStr = getTodayDate()
  const logsToday = dailyLogs.filter((l) => l.date === todayStr).length
  const totalActiveHouses = activeBatches.length

  const progressData = [
    { name: "Completed", value: logsToday },
    { name: "Remaining", value: Math.max(0, totalActiveHouses - logsToday) },
  ]

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">B.N.Rao Poultry Farms | Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">Comprehensive Farm Insights</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-lg border">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Location:</span>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-8 min-w-[120px] border-none bg-transparent text-sm font-bold focus:ring-0">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Regions</SelectItem>
                  {Array.from(new Set(filterVisibleFarms(user, allFarms).map(f => f.location))).map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {user?.role === "owner" && (
              <div className="flex items-center gap-2 border-l pl-3 pr-2">
                <Label htmlFor="financial-view" className="text-xs font-bold uppercase text-muted-foreground cursor-pointer flex items-center gap-1.5">
                  {showFinancials ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Finance View
                </Label>
                <Switch
                  id="financial-view"
                  checked={showFinancials}
                  onCheckedChange={setShowFinancials}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 1: Operations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Houses</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeHousesCount}</div>
            <p className="text-xs text-muted-foreground uppercase">
              OF {houses.length} TOTAL • {farms.length} locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Birds</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiveBirds.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground uppercase">
              Avg. Age: <span className="font-bold">{avgAgeDays} Days</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average FCR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgFCR <= avgTargetFCR ? "text-green-600" : "text-orange-600"}`}>
              {avgFCR > 0 ? avgFCR.toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground uppercase">Target: {avgTargetFCR.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mortality %</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgMortality < 2 ? 'text-green-600' : avgMortality < 5 ? 'text-orange-600' : 'text-red-600'}`}>
              {avgMortality.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground uppercase">{totalDeaths.toLocaleString()} total deaths</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Financials (Conditional) */}
      {showFinancials && canAccessFinance(user) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatINR(monthlyBalance)}
              </div>
              <p className="text-xs text-muted-foreground">{monthlyBalance >= 0 ? "Profit" : "Loss"} this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatINR(monthlyExpenses)}</div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatINR(monthlyIncome)}</div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(lowStockItems.length > 0 || performanceAlerts.length > 0) && (
        <Card className="border-yellow-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600 text-base">
              <AlertTriangle className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockItems.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <Package className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-yellow-900">Low Stock Alert</p>
                  <p className="text-sm text-yellow-700">
                    {lowStockItems.length} items need restocking. Check your inventory.
                  </p>
                  <Button asChild variant="link" className="h-auto p-0 text-yellow-600 mt-1 font-bold">
                    <Link href="/dashboard/inventory">View Inventory →</Link>
                  </Button>
                </div>
              </div>
            )}

            {performanceAlerts.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-orange-900">Performance Alerts</p>
                  <p className="text-sm text-orange-700 mb-2 font-medium">{performanceAlerts.length} batches need attention</p>
                  <div className="flex flex-wrap gap-2">
                    {performanceAlerts.map((alert, idx) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded border border-orange-200 shadow-sm">
                        <span className="font-bold">
                          {alert.farm} - {alert.house}
                        </span>
                        <span className="text-muted-foreground"> | Age: {alert.age}d</span>
                        {alert.fcrExceeded && <span className="text-orange-600 font-bold"> | FCR: {alert.fcr}</span>}
                        {alert.mortalityExceeded && (
                          <span className="text-red-600 font-bold"> | Mort: {alert.mortality}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sales Summary */}
      {(getTotalBirdsSold() > 0 || getTotalRevenue() > 0) && (
        <Card className="border-green-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 text-base">
              <DollarSign className="h-5 w-5" />
              Sales Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm font-bold text-green-800 mb-1 uppercase tracking-wider">Broilers Sold</p>
                <p className="text-3xl font-black text-green-600">{getTotalBirdsSold().toLocaleString("en-IN")}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-bold text-blue-800 mb-1 uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-black text-blue-600">{formatINR(getTotalRevenue())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Houses Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Total Houses</span>
                <span className="font-bold">{houses.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Active</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 font-bold">
                  {activeHousesCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Maintenance</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 font-bold">
                  {houses.filter((h) => h.status === "maintenance").length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Inactive</span>
                <Badge variant="secondary" className="bg-gray-100 font-bold">
                  {houses.filter((h) => h.status === "inactive").length}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 font-bold" size="sm">
              <Link href="/dashboard/master-data">Manage Houses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Total Suppliers</span>
                <span className="font-bold">{suppliers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Feed Suppliers</span>
                <span className="font-bold">{suppliers.filter((s) => s.type === "feed").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Medicine Suppliers</span>
                <span className="font-bold">{suppliers.filter((s) => s.type === "medicine").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Total Buyers</span>
                <span className="font-bold">{buyers.length}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 font-bold" size="sm">
              <Link href="/dashboard/master-data">Manage Contacts</Link>
            </Button>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Total Items</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Feed Stock</span>
                  <span className="font-bold">{feedLeftData.totalFeedStock.toLocaleString()} kg</span>
                </div>
                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estimated Duration</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{feedLeftData.daysLeft} Days left</span>
                    <Badge className={feedLeftData.daysLeft < 3 ? 'bg-red-500' : 'bg-green-500'}>
                      {feedLeftData.daysLeft < 3 ? 'Low' : 'Healthy'}
                    </Badge>
                  </div>
                  <Progress value={Math.min((feedLeftData.daysLeft / 7) * 100, 100)} className="h-1.5 mt-2" />
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4 font-bold" size="sm">
                <Link href="/dashboard/inventory">View Inventory</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Performance Trend (Last 14 Days)</CardTitle>
            <CardDescription>Daily mortality rates across all active batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mortalityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "12px" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Line
                    type="monotone"
                    dataKey="mortalityPercent"
                    name="Daily Mortality %"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="step"
                    dataKey="standard"
                    name="Standard (0.1%)"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
            <CardDescription>Daily log recording status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-6">
            <div className="relative h-[180px] w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={progressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill="#10b981" strokeWidth={0} />
                    <Cell fill="#f1f5f9" strokeWidth={0} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{logsToday}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">OF {totalActiveHouses} LOGS</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm font-bold uppercase tracking-tight">Log Completion</p>
              <p className="text-xs text-muted-foreground mt-1">Record all active houses by EOD</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feed Consumption vs. Cumulative Mortality %</CardTitle>
          <CardDescription>Correlation between feed input and batch mortality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedVsGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} dy={10} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "12px" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar yAxisId="left" dataKey="feedBags" name="Feed Bags" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mortalityPercent"
                  name="Mortality %"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#ef4444" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="w-full h-12 font-bold text-base shadow-sm">
              <Link href="/dashboard/daily-logs">Add Daily Log</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 font-bold text-base shadow-sm">
              <Link href="/dashboard/inventory">Stock Movement</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 font-bold text-base shadow-sm">
              <Link href="/dashboard/finance">Add Transaction</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 font-bold text-base shadow-sm">
              <Link href="/dashboard/master-data">Master Data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

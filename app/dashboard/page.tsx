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

    console.log("[v0] Calculating live birds for", activeBatches.length, "active batches")

    activeBatches.forEach((batch) => {
      const today = new Date().getTime()
      const placement = toDateKey(batch.placementDate)
      const age = Math.max(0, Math.ceil((today - placement) / (1000 * 60 * 60 * 24)))
      ageSum += age

      const batchLogs = dailyLogs.filter((log) => log.batchId === batch.id).sort((a, b) => toDateKey(b.date) - toDateKey(a.date))
      const latestLog = batchLogs[0]

      if (latestLog) {
        console.log(`[v0] Batch ${batch.batchNumber}: Latest log shows ${latestLog.closingBirds} closing birds`)
        totalLiveBirds += latestLog.closingBirds
        
        // Calculate total deaths for this batch
        // Use cumulativeMortality if available, otherwise sum all mortalities from batch logs
        let batchTotalDeaths = 0
        if (latestLog.cumulativeMortality !== undefined && latestLog.cumulativeMortality !== null) {
          // Use cumulative value if available
          batchTotalDeaths = latestLog.cumulativeMortality + (latestLog.cumulativeCulls || 0)
          console.log(`[v0] Batch ${batch.batchNumber}: Using cumulative mortality: ${latestLog.cumulativeMortality}`)
        } else {
          // Fallback: sum all mortalities from logs if cumulative not available
          batchTotalDeaths = batchLogs.reduce((sum, log) => sum + (log.mortality || 0), 0) + (latestLog.cumulativeCulls || 0)
          console.log(`[v0] Batch ${batch.batchNumber}: Summing mortalities from ${batchLogs.length} logs: ${batchTotalDeaths}`)
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
          const age = Math.ceil(
            (toDateKey(latestLog.date) - toDateKey(batch.placementDate)) / (1000 * 60 * 60 * 24),
          )

          performanceAlerts.push({
            farm: farm?.name || "Unknown",
            house: house?.name || "Unknown",
            batchNumber: batch.batchNumber,
            age,
            fcr: latestLog.cumulativeFCR.toFixed(2),
            mortality: latestLog.cumulativeMortalityPercent.toFixed(2),
            fcrExceeded: latestLog.cumulativeFCR > batch.targetFCR,
            mortalityExceeded: latestLog.cumulativeMortalityPercent > batch.mortalityThreshold,
          })
        }
      } else {
        console.log(`[v0] Batch ${batch.batchNumber}: No logs yet, using initial birds ${batch.initialBirds}`)
        totalLiveBirds += batch.initialBirds
        totalInitialBirds += batch.initialBirds
      }

      targetFCRSum += batch.targetFCR
    })

    console.log(`[v0] Total live birds calculated: ${totalLiveBirds.toLocaleString("en-IN")}`)
    console.log(`[v0] Total initial birds: ${totalInitialBirds.toLocaleString("en-IN")}`)
    console.log(`[v0] Total deaths calculated: ${totalDeaths}`)

    avgFCR = fcrCount > 0 ? fcrSum / fcrCount : 0
    avgTargetFCR = activeBatches.length > 0 ? targetFCRSum / activeBatches.length : 0
    avgAgeDays = activeBatches.length > 0 ? Math.round(ageSum / activeBatches.length) : 0
  }
  
  // Calculate mortality - use cumulative from logs if available, otherwise sum all mortalities
  if (totalInitialBirds > 0) {
    avgMortality = (totalDeaths / totalInitialBirds) * 100
    console.log(`[v0] Average mortality calculated: ${avgMortality.toFixed(2)}% (Deaths: ${totalDeaths}, Initial: ${totalInitialBirds})`)
  } else if (dailyLogs.length > 0) {
    // Fallback: Calculate mortality from all daily logs if no active batches or no initial birds
    console.log("[v0] No active batches or initial birds, calculating mortality from all daily logs")
    const totalMortalityFromLogs = dailyLogs.reduce((sum, log) => sum + (log.mortality || 0), 0)
    // Get starting birds from batches or first log's opening birds
    const startingBirds = batches.length > 0 
      ? batches.reduce((sum, b) => sum + (b.initialBirds || 0), 0)
      : dailyLogs.length > 0 
        ? (dailyLogs.sort((a, b) => toDateKey(a.date) - toDateKey(b.date))[0].openingBirds || 0)
        : 0
    
    if (startingBirds > 0) {
      totalDeaths = totalMortalityFromLogs
      totalInitialBirds = startingBirds
      avgMortality = (totalMortalityFromLogs / startingBirds) * 100
      console.log(`[v0] Mortality from logs: ${avgMortality.toFixed(2)}% (Total mortality: ${totalMortalityFromLogs}, Starting birds: ${startingBirds})`)
    } else {
      console.log("[v0] Cannot calculate mortality: No starting birds found")
    }
  }

  const recentLogs = dailyLogs.filter((log) => {
    const logTime = toDateKey(log.date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return logTime >= thirtyDaysAgo.getTime()
  })

  const totalMortality = recentLogs.reduce((sum, log) => sum + log.mortality, 0)
  const totalFeedConsumed = recentLogs.reduce((sum, log) => sum + (log.cumulativeFeed ?? 0), 0)

  const activeHouses = houses.filter((h) => h.status === "active").length

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
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">B.N.Rao Poultry Farms | Executive Dashboard</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Comprehensive Farm Insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="location-filter" className="text-[10px] font-bold uppercase tracking-tight text-slate-600">Location:</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger id="location-filter" size="sm" className="w-[120px] h-8 text-[11px] font-bold bg-white">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Regions</SelectItem>
                <SelectItem value="Satuluru">Satuluru</SelectItem>
                <SelectItem value="Guntur">Guntur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <Label htmlFor="financial-view" className="text-[10px] font-bold uppercase tracking-tight text-slate-600 flex items-center gap-1.5 cursor-pointer">
              {showFinancials ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Financial View
            </Label>
            <Switch
              id="financial-view"
              checked={showFinancials}
              onCheckedChange={setShowFinancials}
            />
          </div>
        </div>
      </div>

      {/* Row 1: Operations */}
      <div className="grid gap-2 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Active Houses</CardTitle>
            <Home className="h-3.5 w-3.5 text-slate-400 opacity-70" />
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight">{activeHouses}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Across {farms.length} farms
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Live Birds</CardTitle>
            <Activity className="h-3.5 w-3.5 text-slate-400 opacity-70" />
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xl font-black tracking-tight">{totalLiveBirds.toLocaleString("en-IN")}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  Avg. Age: <span className="font-bold text-slate-900">{avgAgeDays} Days</span>
                </p>
              </div>
              <div className="text-right w-20">
                <p className="text-[8px] font-extrabold text-slate-400 uppercase mb-1">Day {avgAgeDays}/40</p>
                <Progress value={(avgAgeDays / 40) * 100} className="h-1 bg-slate-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Flock Efficiency</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-slate-400 opacity-70" />
          </CardHeader>
          <CardContent className="p-2.5">
            <div className={`text-xl font-black tracking-tight ${avgFCR <= avgTargetFCR ? "text-green-600" : "text-orange-600"}`}>
              {avgFCR > 0 ? avgFCR.toFixed(2) : "N/A"} <span className="text-[10px] font-bold text-muted-foreground uppercase ml-0.5">FCR</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
              Mortality: <span className={`font-bold ${avgMortality > 5 ? 'text-red-600' : avgMortality > 2 ? 'text-orange-500' : 'text-green-600'}`}>{avgMortality.toFixed(1)}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Financials (Conditional) */}
      {showFinancials && canAccessFinance(user) && (
        <div className="grid gap-2 md:grid-cols-3 bg-slate-100/50 p-2 rounded-xl border border-slate-200/60 shadow-inner">
          <Card className="shadow-sm border-slate-200/60 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/30">
              <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Net Balance</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-slate-400 opacity-70" />
            </CardHeader>
            <CardContent className="p-2.5">
              <div className={`text-xl font-black tracking-tight ${monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatINR(monthlyBalance)}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{monthlyBalance >= 0 ? "Profit" : "Loss"} this month</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200/60 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/30">
              <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Total Expenses</CardTitle>
              <Package className="h-3.5 w-3.5 text-slate-400 opacity-70" />
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="text-xl font-black text-red-600 tracking-tight">{formatINR(monthlyExpenses)}</div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Current month</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200/60 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/30">
              <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Total Income</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-slate-400 opacity-70" />
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="text-xl font-black text-green-600 tracking-tight">{formatINR(monthlyIncome)}</div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Current month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(lowStockItems.length > 0 || performanceAlerts.length > 0) && (
        <div className="grid gap-3">
          {lowStockItems.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 rounded-full">
                  <Package className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Low Stock Alert: <span className="font-medium">{lowStockItems.length} items need restocking.</span></p>
                </div>
              </div>
              <Button asChild variant="link" className="h-auto p-0 text-xs font-bold text-amber-700">
                <Link href="/dashboard/inventory">View Inventory →</Link>
              </Button>
            </div>
          )}

          {performanceAlerts.length > 0 && (
            <div className="px-4 py-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-orange-100 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-orange-700" />
                </div>
                <p className="text-xs font-bold text-orange-900">Performance Alerts: <span className="font-medium">{performanceAlerts.length} batches need attention</span></p>
              </div>
              <div className="flex flex-wrap gap-2 ml-10">
                {performanceAlerts.map((alert, idx) => (
                  <div key={idx} className="text-[10px] bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-orange-200 shadow-sm flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 uppercase tracking-tighter">{alert.farm} - {alert.house}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-bold text-slate-600">B{alert.batchNumber} ({alert.age}d)</span>
                    <div className="flex gap-2 ml-1">
                      {alert.fcrExceeded && <span className="text-orange-600 font-extrabold">FCR: {alert.fcr}</span>}
                      {alert.mortalityExceeded && (
                        <span className="text-red-600 font-extrabold">Mort: {alert.mortality}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales Summary */}
      {(getTotalBirdsSold() > 0 || getTotalRevenue() > 0) && (
        <Card className="border-green-200 shadow-sm bg-green-50/10">
          <CardHeader className="py-1.5 px-3 border-b bg-green-50/50 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-green-800">
              <DollarSign className="h-3 w-3" />
              Sales Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="p-2.5 bg-white rounded-lg border border-green-100 shadow-sm">
                <p className="text-[9px] uppercase font-bold text-green-600/80 mb-0.5 tracking-wider">Broilers Sold</p>
                <p className="text-lg font-black text-green-700 tracking-tight">{getTotalBirdsSold().toLocaleString("en-IN")}</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-sm">
                <p className="text-[9px] uppercase font-bold text-blue-600/80 mb-0.5 tracking-wider">Total Revenue</p>
                <p className="text-lg font-black text-blue-700 tracking-tight">{formatINR(getTotalRevenue())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <Home className="h-3.5 w-3.5 text-slate-500 opacity-70" />
              Houses Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total Houses</span>
                <span className="text-sm font-extrabold text-slate-900">{houses.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Active</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] font-bold h-5 px-2 border-green-200">
                  {activeHouses}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Maintenance</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] font-bold h-5 px-2 border-amber-200">
                  {houses.filter((h) => h.status === "maintenance").length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Inactive</span>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-bold h-5 px-2 border-slate-200">
                  {houses.filter((h) => h.status === "inactive").length}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 h-8 text-[11px] font-bold bg-white shadow-sm border-slate-200 text-slate-700" size="sm">
              <Link href="/dashboard/master-data">Manage Houses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-500 opacity-70" />
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total Suppliers</span>
                <span className="text-sm font-extrabold text-slate-900">{suppliers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Feed Suppliers</span>
                <span className="text-xs font-extrabold text-slate-700">{suppliers.filter((s) => s.type === "feed").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Medicine Suppliers</span>
                <span className="text-xs font-extrabold text-slate-700">{suppliers.filter((s) => s.type === "medicine").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total Buyers</span>
                <span className="text-sm font-extrabold text-slate-900">{buyers.length}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 h-8 text-[11px] font-bold bg-white shadow-sm border-slate-200 text-slate-700" size="sm">
              <Link href="/dashboard/master-data">Manage Contacts</Link>
            </Button>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                <Package className="h-3.5 w-3.5 text-slate-500 opacity-70" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Total Items</span>
                  <span className="text-sm font-extrabold text-slate-900">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Feed Types</span>
                  <span className="text-xs font-extrabold text-slate-700">
                    {items.filter((i) => i.category === "feed-raw" || i.category === "feed-finished").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Medicines</span>
                  <span className="text-xs font-extrabold text-slate-700">
                    {items.filter((i) => i.category === "medicine" || i.category === "vaccine").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Feed Stock</span>
                  <span className="text-xs font-extrabold text-slate-700">{feedLeftData.totalFeedStock.toLocaleString()} kg</span>
                </div>
                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[8px] font-extrabold text-slate-400 uppercase mb-0.5">Estimated Duration</p>
                  <p className="text-sm font-black text-slate-900">
                    {feedLeftData.daysLeft} <span className="text-[10px] font-bold text-slate-500 uppercase">Days of feed left</span>
                  </p>
                  <Progress value={Math.min((feedLeftData.daysLeft / 7) * 100, 100)} className={`h-1 mt-1 ${feedLeftData.daysLeft < 3 ? 'bg-red-100' : 'bg-green-100'}`} />
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-3 h-8 text-[11px] font-bold bg-white shadow-sm border-slate-200 text-slate-700" size="sm">
                <Link href="/dashboard/inventory">View Inventory</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Mortality Trend (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mortalityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b", fontWeight: "bold" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b", fontWeight: "bold" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Line
                    type="monotone"
                    dataKey="mortalityPercent"
                    name="Daily Mortality %"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="step"
                    dataKey="standard"
                    name="Standard (0.1%)"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-6 p-4">
            <div className="relative h-[160px] w-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={progressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
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
                <span className="text-3xl font-black text-slate-900 tracking-tighter">{logsToday}</span>
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">OF {totalActiveHouses} LOGS</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">Daily Log Completion</p>
              <p className="text-[9px] text-slate-500 font-medium">Record all active houses by EOD</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
          <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Feed Consumption vs. Cumulative Mortality %</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedVsGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b", fontWeight: "bold" }} dy={10} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#64748b", fontWeight: "bold" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#64748b", fontWeight: "bold" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "10px", fontWeight: "bold" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar yAxisId="left" dataKey="feedBags" name="Feed Bags" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mortalityPercent"
                  name="Mortality %"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
          <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="w-full h-8 text-[10px] font-extrabold bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary transition-all">
              <Link href="/dashboard/daily-logs">Add Daily Log</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-10 text-xs font-extrabold bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary transition-all">
              <Link href="/dashboard/inventory">Stock Movement</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-10 text-xs font-extrabold bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary transition-all">
              <Link href="/dashboard/finance">Add Transaction</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-10 text-xs font-extrabold bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary transition-all">
              <Link href="/dashboard/master-data">Master Data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

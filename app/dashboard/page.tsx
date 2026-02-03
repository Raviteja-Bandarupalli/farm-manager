"use client"

import { useMasterData } from "@/lib/master-data-context"
import { useDailyLogs, toDateKey } from "@/lib/daily-logs-context"
import { useInventory } from "@/lib/inventory-context"
import { useFinance } from "@/lib/finance-context"
import { useBatch } from "@/lib/batch-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Home, Package, DollarSign, TrendingUp, AlertTriangle, Activity, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { filterVisibleFarms, filterVisibleHouses, filterVisibleBatches, canAccessFinance } from "@/lib/permissions"
import { getFirstDayOfMonth, getLastDayOfMonth } from "@/lib/date-utils"

export default function DashboardPage() {
  const { user } = useAuth()
  const { farms: allFarms, houses: allHouses, suppliers, buyers, feedTypes } = useMasterData()
  const { dailyLogs } = useDailyLogs()
  const { items, getLowStockItems, getTotalBirdsSold, getTotalRevenue } = useInventory()
  const { getTotalIncome, getTotalExpenses, getBalance } = useFinance()
  const { batches: allBatches } = useBatch()

  const farms = filterVisibleFarms(user, allFarms)
  const houses = filterVisibleHouses(user, allHouses, allFarms)
  const batches = filterVisibleBatches(user, allBatches, allHouses, allFarms)

  const startOfMonth = getFirstDayOfMonth()
  const endOfMonth = getLastDayOfMonth()

  const monthlyIncome = getTotalIncome(startOfMonth, endOfMonth)
  const monthlyExpenses = getTotalExpenses(startOfMonth, endOfMonth)
  const monthlyBalance = getBalance(startOfMonth, endOfMonth)

  const lowStockItems = getLowStockItems()

  const activeBatches = batches.filter((b) => b.status === "active")
  const activeBatchCount = activeBatches.length

  let totalLiveBirds = 0
  let avgFCR = 0
  let avgMortality = 0
  let avgTargetFCR = 0
  const performanceAlerts: any[] = []

  let totalInitialBirds = 0
  let totalDeaths = 0
  
  if (activeBatches.length > 0) {
    let fcrSum = 0
    let fcrCount = 0
    let targetFCRSum = 0

    console.log("[v0] Calculating live birds for", activeBatches.length, "active batches")

    activeBatches.forEach((batch) => {
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

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  return (
    <div className="space-y-3">
      <div className="mb-2">
        <h1 className="text-xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Farm overview</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Total Farms</CardTitle>
            <Building2 className="h-3.5 w-3.5 text-slate-400 opacity-70" />
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight">{farms.length}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {activeHouses}/{houses.length} active houses
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Live Birds</CardTitle>
            <Activity className="h-3.5 w-3.5 text-slate-400 opacity-70" />
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="text-xl font-black tracking-tight">{totalLiveBirds.toLocaleString("en-IN")}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {activeBatchCount} active batches
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Performance</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-slate-400 opacity-70" />
          </CardHeader>
          <CardContent className="p-2.5">
            <div className={`text-xl font-black tracking-tight ${avgFCR <= avgTargetFCR ? "text-green-600" : "text-orange-600"}`}>
              {avgFCR > 0 ? avgFCR.toFixed(2) : "N/A"} <span className="text-[10px] font-bold text-muted-foreground uppercase ml-0.5">FCR</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Mortality: {avgMortality.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 border-b bg-slate-50/50">
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
        )}
      </div>

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
                  <span className="text-xs font-semibold text-slate-600">Low Stock</span>
                  <Badge variant="secondary" className={`${lowStockItems.length > 0 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-green-100 text-green-700 border-green-200"} text-[10px] font-bold h-5 px-2`}>
                    {lowStockItems.length}
                  </Badge>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4 h-8 text-[11px] font-bold bg-white shadow-sm border-slate-200 text-slate-700" size="sm">
                <Link href="/dashboard/inventory">View Inventory</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <Activity className="h-3.5 w-3.5 text-slate-500 opacity-70" />
              Activity Summary
            </CardTitle>
            <CardDescription className="text-[9px] font-medium text-slate-400">Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Logs Recorded</span>
                  <span className="font-black text-base text-primary tracking-tight">{recentLogs.length}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.min((recentLogs.length / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 shadow-sm">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5 tracking-wider">Total Mortality</p>
                  <p className="text-lg font-black text-red-600 tracking-tight">{totalMortality}</p>
                </div>
                <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 shadow-sm">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5 tracking-wider">Feed Consumed</p>
                  <p className="text-lg font-black text-slate-800 tracking-tight">{totalFeedConsumed.toFixed(0)} <span className="text-[9px] font-bold text-slate-400">kg</span></p>
                </div>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 h-7 text-[10px] font-bold bg-white shadow-sm border-slate-200 text-slate-700" size="sm">
              <Link href="/dashboard/daily-logs">View All Logs</Link>
            </Button>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                <DollarSign className="h-3.5 w-3.5 text-slate-500 opacity-70" />
                Financial Summary
              </CardTitle>
              <CardDescription className="text-[9px] font-medium text-slate-400">Current month</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Income</span>
                      <span className="font-bold text-[11px] text-green-600">{formatINR(monthlyIncome)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Expenses</span>
                      <span className="font-bold text-[11px] text-red-600">{formatINR(monthlyExpenses)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full"
                        style={{
                          width: `${monthlyIncome > 0 ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                  <div className="space-y-0">
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Net Balance</span>
                    <p className={`font-black text-xl tracking-tight leading-tight ${monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatINR(monthlyBalance)}
                    </p>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4 h-7 text-[10px] font-bold bg-white shadow-sm border-slate-200 text-slate-700" size="sm">
                <Link href="/dashboard/finance">View Finances</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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

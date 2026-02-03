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
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-[10px] text-muted-foreground">Overview of your poultry farm operations</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Total Farms</CardTitle>
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold">{farms.length}</div>
            <p className="text-[10px] text-muted-foreground">
              {activeHouses} active houses of {houses.length} total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Live Birds</CardTitle>
            <Activity className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold">{totalLiveBirds.toLocaleString("en-IN")}</div>
            <p className="text-[10px] text-muted-foreground">
              {activeBatchCount} active batches
              {getTotalBirdsSold() > 0 && ` • ${getTotalBirdsSold().toLocaleString("en-IN")} sold`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">FCR & Mortality</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-3">
            <div className={`text-base font-bold ${avgFCR <= avgTargetFCR ? "text-green-600" : "text-orange-600"}`}>
              FCR: {avgFCR > 0 ? avgFCR.toFixed(2) : "N/A"}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Mortality: {(totalInitialBirds > 0 && dailyLogs.length > 0) || (dailyLogs.length > 0 && avgMortality > 0)
                ? `${avgMortality.toFixed(2)}%` 
                : dailyLogs.length === 0
                  ? "N/A"
                  : `${avgMortality.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 border-b bg-slate-50/30">
              <CardTitle className="text-[11px] font-bold uppercase tracking-tight text-slate-500">Net Balance</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            </CardHeader>
            <CardContent className="p-3">
              <div className={`text-lg font-bold ${monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatINR(monthlyBalance)}
              </div>
              <p className="text-[10px] text-muted-foreground">{monthlyBalance >= 0 ? "Profit" : "Loss"} this month</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales Summary */}
      {(getTotalBirdsSold() > 0 || getTotalRevenue() > 0) && (
        <Card className="border-green-500 shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-green-50/30">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-green-700">
              <DollarSign className="h-4 w-4" />
              Sales Summary
            </CardTitle>
            <CardDescription className="text-[10px]">Total broiler sales recorded</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="p-2 bg-green-50/50 rounded border border-green-100">
                <p className="text-[10px] text-muted-foreground mb-0.5">Broilers Sold</p>
                <p className="text-lg font-bold text-green-600">{getTotalBirdsSold().toLocaleString("en-IN")}</p>
              </div>
              <div className="p-2 bg-blue-50/50 rounded border border-blue-100">
                <p className="text-[10px] text-muted-foreground mb-0.5">Total Revenue</p>
                <p className="text-lg font-bold text-blue-600">{formatINR(getTotalRevenue())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(lowStockItems.length > 0 || performanceAlerts.length > 0) && (
        <Card className="border-yellow-500 shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-yellow-50/30">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2">
              {lowStockItems.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50/50 rounded border border-yellow-100">
                  <Package className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-yellow-900">Low Stock Alert</p>
                    <p className="text-[10px] text-yellow-700">
                      {lowStockItems.length} items need restocking.
                    </p>
                    <Button asChild variant="link" className="h-auto p-0 text-[10px] text-yellow-600 mt-0.5">
                      <Link href="/dashboard/inventory">View Inventory →</Link>
                    </Button>
                  </div>
                </div>
              )}

              {performanceAlerts.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-orange-50/50 rounded border border-orange-100">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-orange-900">Performance Alerts</p>
                    <p className="text-[10px] text-orange-700 mb-1">{performanceAlerts.length} batches need attention</p>
                    <div className="space-y-1">
                      {performanceAlerts.map((alert, idx) => (
                        <div key={idx} className="text-[10px] bg-white p-1.5 rounded border border-orange-200">
                          <span className="font-bold">
                            {alert.farm} - {alert.house} - B{alert.batchNumber}
                          </span>
                          <span className="text-muted-foreground"> | {alert.age}d</span>
                          {alert.fcrExceeded && <span className="text-orange-600 font-medium"> | FCR: {alert.fcr}</span>}
                          {alert.mortalityExceeded && (
                            <span className="text-red-600 font-medium"> | Mort: {alert.mortality}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Home className="h-3.5 w-3.5" />
              Houses Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Houses</span>
                <span className="text-xs font-bold">{houses.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Active</span>
                <Badge variant="secondary" className="bg-green-100 text-[10px] h-4 px-1.5 py-0">
                  {activeHouses}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Maintenance</span>
                <Badge variant="secondary" className="bg-yellow-100 text-[10px] h-4 px-1.5 py-0">
                  {houses.filter((h) => h.status === "maintenance").length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Inactive</span>
                <Badge variant="secondary" className="bg-gray-100 text-[10px] h-4 px-1.5 py-0">
                  {houses.filter((h) => h.status === "inactive").length}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-3 h-7 text-[10px] bg-transparent" size="sm">
              <Link href="/dashboard/master-data">Manage Houses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Suppliers & Buyers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Suppliers</span>
                <span className="text-xs font-bold">{suppliers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Feed Suppliers</span>
                <span className="text-xs font-medium">{suppliers.filter((s) => s.type === "feed").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Medicine Suppliers</span>
                <span className="text-xs font-medium">{suppliers.filter((s) => s.type === "medicine").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Buyers</span>
                <span className="text-xs font-bold">{buyers.length}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-3 h-7 text-[10px] bg-transparent" size="sm">
              <Link href="/dashboard/master-data">Manage Contacts</Link>
            </Button>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card className="shadow-sm">
            <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Items</span>
                  <span className="text-xs font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Feed Types</span>
                  <span className="text-xs font-medium">
                    {items.filter((i) => i.category === "feed-raw" || i.category === "feed-finished").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Medicines</span>
                  <span className="text-xs font-medium">
                    {items.filter((i) => i.category === "medicine" || i.category === "vaccine").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Low Stock</span>
                  <Badge variant="secondary" className={`${lowStockItems.length > 0 ? "bg-yellow-100" : "bg-green-100"} text-[10px] h-4 px-1.5 py-0`}>
                    {lowStockItems.length}
                  </Badge>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-3 h-7 text-[10px] bg-transparent" size="sm">
                <Link href="/dashboard/inventory">View Inventory</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" />
              Activity Summary
            </CardTitle>
            <CardDescription className="text-[10px]">Last 30 days statistics</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">Logs Recorded</span>
                  <span className="font-bold text-sm">{recentLogs.length}</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${Math.min((recentLogs.length / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Total Mortality</p>
                  <p className="text-sm font-bold text-red-600">{totalMortality}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Feed Consumed</p>
                  <p className="text-sm font-bold">{totalFeedConsumed.toFixed(1)} kg</p>
                </div>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-3 h-7 text-[10px] bg-transparent" size="sm">
              <Link href="/dashboard/daily-logs">View All Logs</Link>
            </Button>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card className="shadow-sm">
            <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" />
                Financial Summary
              </CardTitle>
              <CardDescription className="text-[10px]">Current month performance</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-medium">Income</span>
                      <span className="font-bold text-xs text-green-600">{formatINR(monthlyIncome)}</span>
                    </div>
                    <div className="w-full bg-secondary h-1 rounded-full">
                      <div className="bg-green-600 h-1 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-medium">Expenses</span>
                      <span className="font-bold text-xs text-red-600">{formatINR(monthlyExpenses)}</span>
                    </div>
                    <div className="w-full bg-secondary h-1 rounded-full">
                      <div
                        className="bg-red-600 h-1 rounded-full"
                        style={{
                          width: `${monthlyIncome > 0 ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-medium">Net Balance</span>
                    <p className={`font-bold text-sm ${monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatINR(monthlyBalance)}
                    </p>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-right italic">
                    {monthlyBalance >= 0 ? "Profitable" : "Operating loss"}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-3 h-7 text-[10px] bg-transparent" size="sm">
                <Link href="/dashboard/finance">View Finances</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="py-2 px-3 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
          <CardDescription className="text-[10px]">Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="w-full h-8 text-xs bg-transparent">
              <Link href="/dashboard/daily-logs">Add Daily Log</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-8 text-xs bg-transparent">
              <Link href="/dashboard/inventory">Stock Movement</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-8 text-xs bg-transparent">
              <Link href="/dashboard/finance">Add Transaction</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-8 text-xs bg-transparent">
              <Link href="/dashboard/master-data">Master Data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

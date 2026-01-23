"use client"

import { useMasterData } from "@/lib/master-data-context"
import { useDailyLogs } from "@/lib/daily-logs-context"
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
      const batchLogs = dailyLogs.filter((log) => log.batchId === batch.id).sort((a, b) => b.date.localeCompare(a.date))
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
            (new Date(latestLog.date).getTime() - new Date(batch.placementDate).getTime()) / (1000 * 60 * 60 * 24),
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
        ? (dailyLogs.sort((a, b) => a.date.localeCompare(b.date))[0].openingBirds || 0)
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
    const logDate = new Date(log.date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return logDate >= thirtyDaysAgo
  })

  const totalMortality = recentLogs.reduce((sum, log) => sum + log.mortality, 0)
  const totalFeedConsumed = recentLogs.reduce((sum, log) => sum + log.feedGiven, 0)

  const activeHouses = houses.filter((h) => h.status === "active").length

  const formatINR = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your poultry farm operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farms.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeHouses} active houses of {houses.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batches & Live Birds</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiveBirds.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">
              {activeBatchCount} active batches
              {getTotalBirdsSold() > 0 && ` • ${getTotalBirdsSold().toLocaleString("en-IN")} sold`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average FCR & Mortality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${avgFCR <= avgTargetFCR ? "text-green-600" : "text-orange-600"}`}>
              FCR: {avgFCR > 0 ? avgFCR.toFixed(2) : "N/A"}
            </div>
            <p className="text-sm text-muted-foreground">
              Mortality: {(totalInitialBirds > 0 && dailyLogs.length > 0) || (dailyLogs.length > 0 && avgMortality > 0)
                ? `${avgMortality.toFixed(2)}%` 
                : dailyLogs.length === 0
                  ? "N/A"
                  : `${avgMortality.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
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
        )}
      </div>

      {/* Sales Summary */}
      {(getTotalBirdsSold() > 0 || getTotalRevenue() > 0) && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <DollarSign className="h-5 w-5" />
              Sales Summary
            </CardTitle>
            <CardDescription>Total broiler sales recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Broilers Sold</p>
                <p className="text-2xl font-bold text-green-600">{getTotalBirdsSold().toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">Total birds sold</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">{formatINR(getTotalRevenue())}</p>
                <p className="text-xs text-muted-foreground mt-1">From all sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(lowStockItems.length > 0 || performanceAlerts.length > 0) && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Package className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">Low Stock Alert</p>
                    <p className="text-sm text-yellow-700">
                      {lowStockItems.length} items need restocking. Check your inventory to avoid running out of
                      supplies.
                    </p>
                    <Button asChild variant="link" className="h-auto p-0 text-yellow-600 mt-1">
                      <Link href="/dashboard/inventory">View Inventory →</Link>
                    </Button>
                  </div>
                </div>
              )}

              {performanceAlerts.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-orange-900">Performance Alerts</p>
                    <p className="text-sm text-orange-700 mb-2">{performanceAlerts.length} batches need attention</p>
                    <div className="space-y-1">
                      {performanceAlerts.map((alert, idx) => (
                        <div key={idx} className="text-sm bg-white p-2 rounded border border-orange-200">
                          <span className="font-medium">
                            {alert.farm} - {alert.house} - Batch {alert.batchNumber}
                          </span>
                          <span className="text-muted-foreground"> | Age: {alert.age} days</span>
                          {alert.fcrExceeded && <span className="text-orange-600"> | FCR: {alert.fcr} (High)</span>}
                          {alert.mortalityExceeded && (
                            <span className="text-red-600"> | Mortality: {alert.mortality}% (High)</span>
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
                <span className="text-sm text-muted-foreground">Total Houses</span>
                <span className="font-bold">{houses.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active</span>
                <Badge variant="secondary" className="bg-green-100">
                  {activeHouses}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Maintenance</span>
                <Badge variant="secondary" className="bg-yellow-100">
                  {houses.filter((h) => h.status === "maintenance").length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Inactive</span>
                <Badge variant="secondary" className="bg-gray-100">
                  {houses.filter((h) => h.status === "inactive").length}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 bg-transparent" size="sm">
              <Link href="/dashboard/master-data">Manage Houses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Suppliers & Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Suppliers</span>
                <span className="font-bold">{suppliers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Feed Suppliers</span>
                <span className="font-medium">{suppliers.filter((s) => s.type === "feed").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Medicine Suppliers</span>
                <span className="font-medium">{suppliers.filter((s) => s.type === "medicine").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Buyers</span>
                <span className="font-bold">{buyers.length}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 bg-transparent" size="sm">
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
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Feed Types</span>
                  <span className="font-medium">
                    {items.filter((i) => i.category === "feed-raw" || i.category === "feed-finished").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Medicines</span>
                  <span className="font-medium">
                    {items.filter((i) => i.category === "medicine" || i.category === "vaccine").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Low Stock</span>
                  <Badge variant="secondary" className={lowStockItems.length > 0 ? "bg-yellow-100" : "bg-green-100"}>
                    {lowStockItems.length}
                  </Badge>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4 bg-transparent" size="sm">
                <Link href="/dashboard/inventory">View Inventory</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Last 30 Days Activity
            </CardTitle>
            <CardDescription>Daily logging statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Total Logs Recorded</span>
                  <span className="font-bold text-lg">{recentLogs.length}</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${Math.min((recentLogs.length / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Total Mortality</span>
                  <span className="font-bold text-lg text-red-600">{totalMortality}</span>
                </div>
                <p className="text-xs text-muted-foreground">Birds lost in the last 30 days</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Feed Consumed</span>
                  <span className="font-bold text-lg">{totalFeedConsumed.toFixed(1)} kg</span>
                </div>
                <p className="text-xs text-muted-foreground">Total feed used in last 30 days</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 bg-transparent" size="sm">
              <Link href="/dashboard/daily-logs">View All Logs</Link>
            </Button>
          </CardContent>
        </Card>

        {canAccessFinance(user) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Summary
              </CardTitle>
              <CardDescription>Current month performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Income</span>
                    <span className="font-bold text-lg text-green-600">{formatINR(monthlyIncome)}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Expenses</span>
                    <span className="font-bold text-lg text-red-600">{formatINR(monthlyExpenses)}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{
                        width: `${monthlyIncome > 0 ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Net Balance</span>
                    <span className={`font-bold text-lg ${monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatINR(monthlyBalance)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthlyBalance >= 0 ? "Profitable" : "Operating at loss"}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4 bg-transparent" size="sm">
                <Link href="/dashboard/finance">View Finances</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/daily-logs">Add Daily Log</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/inventory">Record Stock Movement</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/finance">Add Transaction</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/master-data">Manage Master Data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

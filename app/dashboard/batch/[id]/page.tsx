"use client"

import { useBatch } from "@/lib/batch-context"
import { useDailyLogs, toDateKey } from "@/lib/daily-logs-context"
import { useMasterData } from "@/lib/master-data-context"
import { useWorkers } from "@/lib/workers-context"
import { useWeeklyFeed } from "@/lib/weekly-feed-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { formatIndianDate } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from "@/lib/auth-context"
import { canViewBatch } from "@/lib/permissions"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function BatchDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { user } = useAuth()
  const router = useRouter()
  const { batches } = useBatch()
  const { dailyLogs } = useDailyLogs()
  const { houses, farms } = useMasterData()
  const { getWorkersByIds } = useWorkers()
  const { getFeedsByBatch, getTotalFeedForBatch, getLatestWeightForBatch } = useWeeklyFeed()

  const batch = batches.find((b) => b.id === id)
  const batchLogs = dailyLogs.filter((log) => log.batchId === id).sort((a, b) => toDateKey(a.date) - toDateKey(b.date))

  const weeklyFeeds = batch ? getFeedsByBatch(batch.id) : []
  const totalFeedUsed = batch ? getTotalFeedForBatch(batch.id) : 0
  const latestWeight = batch ? getLatestWeightForBatch(batch.id) : 0

  useEffect(() => {
    if (!batch) return

    if (!canViewBatch(user, batch, houses, farms)) {
      console.log("[v0] Access denied to batch:", { batchId: id, userRole: user?.role })
      router.push("/dashboard/daily-logs")
    }
  }, [batch, user, houses, farms, router, id])

  if (!batch) {
    return (
      <div className="p-6 space-y-4">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Not Authorized</CardTitle>
            <CardDescription>This batch does not exist or you do not have permission to view it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/daily-logs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Daily Logs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canViewBatch(user, batch, houses, farms)) {
    return null
  }

  const house = houses.find((h) => h.id === batch.houseId)
  const farm = house ? farms.find((f) => f.id === house.farmId) : null
  const batchWorkers = batch?.workerIds ? getWorkersByIds(batch.workerIds) : []

  const currentDate = new Date()
  const placementDateTime = toDateKey(batch.placementDate)
  const ageInDays = Math.ceil((currentDate.getTime() - placementDateTime) / (1000 * 60 * 60 * 24))

  const latestLog = batchLogs[batchLogs.length - 1]
  const currentBirds = latestLog?.closingBirds || batch.initialBirds
  const totalMortality = batchLogs.reduce((sum, log) => sum + log.mortality, 0)
  const mortalityPercent = (totalMortality / batch.initialBirds) * 100
  const currentFCR = latestLog?.cumulativeFCR || 0

  const fcrChartData = batchLogs.map((log) => ({
    date: formatIndianDate(log.date),
    fcr: log.cumulativeFCR,
    target: batch.targetFCR,
  }))

  const mortalityChartData = batchLogs.map((log) => ({
    date: formatIndianDate(log.date),
    mortality: log.cumulativeMortalityPercent,
    threshold: batch.mortalityThreshold,
  }))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/daily-logs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Batch: {batch.name}</h1>
          <p className="text-muted-foreground">
            {house?.name} - {farm?.name}
          </p>
          {batchWorkers.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">Workers: {batchWorkers.map((w) => w.name).join(", ")}</p>
          )}
        </div>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Birds & Mortality Summary</CardTitle>
          <CardDescription>Current flock status and mortality tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Initial Birds Placed</p>
              <p className="text-2xl font-bold">{batch.initialBirds.toLocaleString("en-IN")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Mortality</p>
              <p className="text-2xl font-bold text-red-600">
                {latestLog ? latestLog.cumulativeMortality.toLocaleString("en-IN") : 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Live Birds</p>
              <p className="text-2xl font-bold text-green-600">{currentBirds.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">
                = {batch.initialBirds.toLocaleString("en-IN")} -{" "}
                {latestLog ? latestLog.cumulativeMortality.toLocaleString("en-IN") : 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Mortality %</p>
              <p
                className={`text-2xl font-bold ${mortalityPercent > batch.mortalityThreshold ? "text-red-600" : "text-green-600"}`}
              >
                {mortalityPercent.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">
                = ({latestLog ? latestLog.cumulativeMortality : 0} / {batch.initialBirds}) × 100
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Age & Feed Conversion</CardTitle>
          <CardDescription>Flock age and feed efficiency metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Age in Days</p>
              <p className="text-2xl font-bold">{ageInDays}</p>
              <p className="text-xs text-muted-foreground mt-1">From: {formatIndianDate(batch.placementDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Feed Used (kg)</p>
              <p className="text-2xl font-bold">{totalFeedUsed.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{weeklyFeeds.length} weekly entries</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Latest Avg Weight (kg)</p>
              <p className="text-2xl font-bold">{latestWeight > 0 ? latestWeight.toFixed(2) : "0.00"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cumulative FCR</p>
              <p
                className={`text-2xl font-bold ${currentFCR > batch.targetFCR ? "text-orange-600" : "text-green-600"}`}
              >
                {currentFCR.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                = {totalFeedUsed.toFixed(0)} / ({currentBirds} × {latestWeight > 0 ? latestWeight.toFixed(2) : "0"})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Age</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ageInDays} days</p>
            <p className="text-xs text-muted-foreground mt-1">Placed: {formatIndianDate(batch.placementDate)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Live Birds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{currentBirds.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground mt-1">Initial: {batch.initialBirds.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">FCR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${currentFCR > batch.targetFCR ? "text-orange-600" : "text-green-600"}`}>
              {currentFCR.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              Target: {batch.targetFCR}
              {currentFCR > batch.targetFCR ? (
                <TrendingUp className="h-3 w-3 text-orange-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-600" />
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mortality %</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${mortalityPercent > batch.mortalityThreshold ? "text-red-600" : "text-green-600"}`}
            >
              {mortalityPercent.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Threshold: {batch.mortalityThreshold}% | Total: {totalMortality} birds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>FCR Trend</CardTitle>
            <CardDescription>Feed Conversion Ratio over time</CardDescription>
          </CardHeader>
          <CardContent>
            {fcrChartData.length > 0 ? (
              <ChartContainer
                config={{
                  fcr: { label: "Actual FCR", color: "#3b82f6" },
                  target: { label: "Target FCR", color: "#10b981" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fcrChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="fcr" stroke="#3b82f6" strokeWidth={2} name="Actual FCR" />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mortality Trend</CardTitle>
            <CardDescription>Cumulative mortality percentage over time</CardDescription>
          </CardHeader>
          <CardContent>
            {mortalityChartData.length > 0 ? (
              <ChartContainer
                config={{
                  mortality: { label: "Mortality %", color: "#ef4444" },
                  threshold: { label: "Threshold", color: "#f59e0b" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mortalityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="mortality" stroke="#ef4444" strokeWidth={2} name="Mortality %" />
                    <Line
                      type="monotone"
                      dataKey="threshold"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Threshold"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Feed & Weight Records</CardTitle>
          <CardDescription>Feed and average weight entries recorded by week</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold mb-4">{totalFeedUsed.toFixed(1)} kg total feed</p>
          {weeklyFeeds.length > 0 ? (
            <div className="space-y-2">
              {weeklyFeeds.map((feed) => (
                <div key={feed.id} className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <span className="text-sm font-medium">
                      {formatIndianDate(feed.weekStart)} - {formatIndianDate(feed.weekEnd)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg Weight: {feed.averageWeightKg.toFixed(2)} kg
                    </p>
                  </div>
                  <span className="font-semibold">{feed.totalFeedKg.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No weekly feed entries recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Log History */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Log History</CardTitle>
          <CardDescription>{batchLogs.length} logs recorded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Age (days)</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Mortality</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead>FCR</TableHead>
                  <TableHead>Mort %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchLogs.map((log) => {
                  const logTime = toDateKey(log.date)
                  const age = Math.ceil((logTime - placementDateTime) / (1000 * 60 * 60 * 24))

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatIndianDate(log.date)}</TableCell>
                      <TableCell>{age}</TableCell>
                      <TableCell>{log.openingBirds.toLocaleString("en-IN")}</TableCell>
                      <TableCell>{log.mortality}</TableCell>
                      <TableCell className="font-semibold">{log.closingBirds.toLocaleString("en-IN")}</TableCell>
                      <TableCell
                        className={`font-semibold ${log.cumulativeFCR > batch.targetFCR ? "text-orange-600" : "text-green-600"}`}
                      >
                        {log.cumulativeFCR.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`font-semibold ${log.cumulativeMortalityPercent > batch.mortalityThreshold ? "text-red-600" : "text-green-600"}`}
                      >
                        {log.cumulativeMortalityPercent.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

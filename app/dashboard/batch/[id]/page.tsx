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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="h-8 px-2 text-[10px] font-bold bg-white shadow-sm border-slate-200">
          <Link href="/dashboard/daily-logs">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-black tracking-tight leading-none">Batch: {batch.name}</h1>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-0.5">
            {house?.name} • {farm?.name}
            {batchWorkers.length > 0 && (
              <span className="ml-1.5 opacity-70">| Workers: {batchWorkers.map((w) => w.name).join(", ")}</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Birds & Mortality</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Initial Birds</p>
                <p className="text-xl font-black tracking-tight">{batch.initialBirds.toLocaleString("en-IN")}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-red-400 uppercase font-bold tracking-tight">Mortality</p>
                <p className="text-xl font-black tracking-tight text-red-600">
                  {latestLog ? latestLog.cumulativeMortality.toLocaleString("en-IN") : 0}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-green-400 uppercase font-bold tracking-tight">Live Birds</p>
                <p className="text-xl font-black tracking-tight text-green-600">{currentBirds.toLocaleString("en-IN")}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Mortality %</p>
                <p
                  className={`text-xl font-black tracking-tight ${mortalityPercent > batch.mortalityThreshold ? "text-red-600" : "text-green-600"}`}
                >
                  {mortalityPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Age & Feed Conversion</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Age (Days)</p>
                <p className="text-xl font-black tracking-tight">{ageInDays}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-blue-400 uppercase font-bold tracking-tight">Feed (kg)</p>
                <p className="text-xl font-black tracking-tight text-blue-600">{totalFeedUsed.toFixed(0)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Avg Wt (kg)</p>
                <p className="text-xl font-black tracking-tight text-slate-700">{latestWeight > 0 ? latestWeight.toFixed(2) : "0.00"}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Cum. FCR</p>
                <p
                  className={`text-xl font-black tracking-tight ${currentFCR > batch.targetFCR ? "text-orange-600" : "text-green-600"}`}
                >
                  {currentFCR.toFixed(2)}
                </p>
              </div>
            </div>
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

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
          <CardTitle className="text-xs font-bold">Weekly Feed & Weight</CardTitle>
        </CardHeader>
        <CardContent className="p-2.5">
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-lg font-black">{totalFeedUsed.toFixed(0)} kg</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Total Feed</p>
          </div>
          {weeklyFeeds.length > 0 ? (
            <div className="space-y-1.5">
              {weeklyFeeds.map((feed) => (
                <div key={feed.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <span className="text-xs font-bold">
                      {formatIndianDate(feed.weekStart)} - {formatIndianDate(feed.weekEnd)}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Avg Weight: <span className="font-bold text-slate-700">{feed.averageWeightKg.toFixed(2)} kg</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600">{feed.totalFeedKg.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No weekly feed entries recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Log History */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="py-1.5 px-3 border-b bg-slate-50/80">
          <CardTitle className="text-sm font-bold">Daily Log History</CardTitle>
          <CardDescription className="text-[10px]">{batchLogs.length} logs recorded</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-10 bg-slate-50/50">
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">Age</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">Opening</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">Mortality</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">Closing</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">FCR</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-tight">Mort %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchLogs.map((log) => {
                  const logTime = toDateKey(log.date)
                  const age = Math.ceil((logTime - placementDateTime) / (1000 * 60 * 60 * 24))

                  return (
                    <TableRow key={log.id} className="h-11">
                      <TableCell className="text-xs py-1 whitespace-nowrap">{formatIndianDate(log.date)}</TableCell>
                      <TableCell className="text-xs py-1">{age}d</TableCell>
                      <TableCell className="text-xs py-1">{log.openingBirds.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs py-1 font-medium text-red-600">{log.mortality}</TableCell>
                      <TableCell className="text-xs py-1 font-bold text-slate-900">{log.closingBirds.toLocaleString("en-IN")}</TableCell>
                      <TableCell
                        className={`text-xs py-1 font-bold ${log.cumulativeFCR > batch.targetFCR ? "text-orange-600" : "text-green-600"}`}
                      >
                        {log.cumulativeFCR.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-xs py-1 font-bold ${log.cumulativeMortalityPercent > batch.mortalityThreshold ? "text-red-600" : "text-green-600"}`}
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

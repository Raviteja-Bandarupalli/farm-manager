"use client"
import React, { useState } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { useAuth } from "@/lib/auth-context"
import { useFeedLogs, type FeedLog } from "@/lib/feed-logs-context"
import { useBatch } from "@/lib/batch-context"
import { formatIndianDate, cn } from "@/lib/utils"
import { getTodayDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Wheat, Beef, Droplet, FlaskConical } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type FeedType = "Pre-Starter" | "Starter" | "Grower"

export default function FeedLogsPage() {
  const { farms, houses } = useMasterData()
  const { user } = useAuth()
  const { feedLogs, addFeedLog, deleteFeedLog } = useFeedLogs()
  const { getActiveBatchByHouse } = useBatch()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [feedType, setFeedType] = useState<FeedType | "">("")
  const [formData, setFormData] = useState({
    farmId: "", date: getTodayDate(),
    maizeKg: "", soyaKg: "", brokenRiceKg: "", suppl5Kg: "", oilLiters: "",
    distribution: {} as Record<string, string>
  })
  const [filterFarm, setFilterFarm] = useState<string>("all")

  const calculatedTotal = Number(formData.maizeKg || 0) + Number(formData.soyaKg || 0) + Number(formData.brokenRiceKg || 0) + Number(formData.suppl5Kg || 0) + Number(formData.oilLiters || 0)
  const farmHouses = houses.filter(h => h.farmId === formData.farmId && getActiveBatchByHouse(h.id))
  const currentDistributedTotal = Object.values(formData.distribution).reduce((sum, val) => sum + Number(val || 0), 0)
  const isDistributionValid = calculatedTotal > 0 && Math.abs(currentDistributedTotal - calculatedTotal) < 0.1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDistributionValid) { alert("Distribution sum must match Total Batch Weight."); return }
    try {
      const numericDistribution: Record<string, number> = {}
      Object.entries(formData.distribution).forEach(([hid, kg]) => { if (Number(kg) > 0) numericDistribution[hid] = Number(kg) })
      await addFeedLog({
        farmId: formData.farmId, date: formData.date, totalWeight: calculatedTotal,
        maizeKg: Number(formData.maizeKg), soyaKg: Number(formData.soyaKg),
        brokenRiceKg: Number(formData.brokenRiceKg), suppl5Kg: Number(formData.suppl5Kg),
        oilLiters: Number(formData.oilLiters), distribution: numericDistribution,
      })
      setIsDialogOpen(false)
      setFeedType("")
      setFormData({ farmId: "", date: getTodayDate(), maizeKg: "", soyaKg: "", brokenRiceKg: "", suppl5Kg: "", oilLiters: "", distribution: {} })
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save feed log") }
  }

  const filteredLogs = filterFarm === "all" ? feedLogs : feedLogs.filter(l => l.farmId === filterFarm)
  const totalMaizeUsed = filteredLogs.reduce((s, l) => s + l.maizeKg, 0)
  const totalSoyaUsed = filteredLogs.reduce((s, l) => s + l.soyaKg, 0)
  const totalMixed = filteredLogs.reduce((s, l) => s + l.totalWeight, 0)
  const totalCostVal = filteredLogs.reduce((s, l) => s + l.totalCost, 0)
  const avgCostPerKg = totalMixed > 0 ? totalCostVal / totalMixed : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Daily Feed Mixing</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Farm-wise Production & House-wise Distribution</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-2" /> New Feed Mix
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 border-b bg-white">
              <DialogTitle className="text-xl font-black tracking-tight uppercase">Daily Feed Mix Entry</DialogTitle>
              <DialogDescription className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Record production and distribution</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Farm Location</label>
                  <Select value={formData.farmId} onValueChange={(v) => setFormData({...formData, farmId: v, distribution: {}})} required>
                    <SelectTrigger className="h-10 font-bold"><SelectValue placeholder="Select Farm" /></SelectTrigger>
                    <SelectContent>{farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Mixing Date</label>
                  <Input type="date" className="h-10 font-bold" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                </div>
              </div>

              {/* Feed Type - NEW */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Feed Type</label>
                <div className="flex gap-3">
                  {(["Pre-Starter", "Starter", "Grower"] as FeedType[]).map(ft => (
                    <button key={ft} type="button" onClick={() => setFeedType(ft)}
                      className={"flex-1 py-3 text-sm font-bold rounded-lg border-2 transition-all " + (
                        feedType === ft ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                      )}>{ft}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 bg-slate-900 p-4 rounded-lg shadow-inner">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Batch Weight (KG)</label>
                <div className="text-2xl font-black text-white">{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'maizeKg', label: 'Maize (KG)', icon: Wheat, color: 'text-amber-500' },
                  { id: 'soyaKg', label: 'Soya (KG)', icon: Beef, color: 'text-orange-600' },
                  { id: 'brokenRiceKg', label: 'Rice (KG)', icon: Droplet, color: 'text-blue-400' },
                  { id: 'suppl5Kg', label: '5% Suppl (KG)', icon: FlaskConical, color: 'text-purple-500' },
                  { id: 'oilLiters', label: 'Oil (Ltr)', icon: Droplet, color: 'text-yellow-600' },
                ].map((item) => (
                  <div key={item.id} className="p-2 border rounded-md space-y-1 bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <item.icon className={cn("h-3 w-3", item.color)} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{item.label}</span>
                    </div>
                    <Input type="number" step="0.1" className="h-8 font-black text-xs" value={(formData as any)[item.id]} onChange={(e) => setFormData({...formData, [item.id]: e.target.value})} />
                  </div>
                ))}
              </div>

              {formData.farmId && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">House Wise Distribution</h3>
                    <span className={cn("text-[9px] font-bold uppercase", Math.abs(currentDistributedTotal - calculatedTotal) < 0.1 ? "text-green-600" : "text-red-500")}>
                      {currentDistributedTotal} / {calculatedTotal} KG
                    </span>
                  </div>
                  <div className="space-y-2">
                    {farmHouses.map(house => (
                      <div key={house.id} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{house.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Active Batch: {getActiveBatchByHouse(house.id)?.name || 'None'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="h-8 w-24 font-black text-right" placeholder="0"
                            value={formData.distribution[house.id] || ""}
                            onChange={(e) => setFormData({ ...formData, distribution: {...formData.distribution, [house.id]: e.target.value} })} />
                          <span className="text-[10px] font-bold text-slate-400">KG</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="h-10 text-[11px] font-bold uppercase px-8">Cancel</Button>
                <Button type="submit" disabled={!isDistributionValid || !formData.farmId} className="h-10 bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-black uppercase tracking-widest px-12">
                  Confirm & Deduct Stock
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Total Maize Used', value: totalMaizeUsed, suffix: 'KG', sub: 'Across filter' },
          { label: 'Total Soya Used', value: totalSoyaUsed, suffix: 'KG', sub: 'Across filter' },
          { label: 'Total Produced', value: totalMixed, suffix: 'KG', sub: 'Mixed Feed' },
          { label: 'Avg Feed Cost', value: avgCostPerKg.toFixed(2), prefix: '₹', suffix: '/KG', sub: 'Estimated' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm border-slate-200/60 overflow-hidden">
            <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{stat.label}</span>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="text-xl font-black tracking-tight text-slate-900">{stat.prefix}{stat.value.toLocaleString()}{stat.suffix}</div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="py-1.5 px-3 border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Filter by Farm</label>
              <Select value={filterFarm} onValueChange={setFilterFarm}>
                <SelectTrigger className="w-48 h-8 bg-white border-slate-200 text-[11px] font-bold"><SelectValue placeholder="All Locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Feed Movement Ledger</CardTitle>
              <p className="text-[9px] font-medium text-slate-400">Chronological Mixing History</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-10 border-b">
                <TableHead className="text-[10px] font-extrabold uppercase pl-6 w-28">Date</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase">Location</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase text-right">Batch Weight</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase text-right">Maize</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase text-right">Soya</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase text-right">Oil</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase text-right pr-6 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400 italic text-xs">No records found.</TableCell></TableRow>
              ) : (
                filteredLogs.map(log => (
                  <TableRow key={log.id} className="h-11 border-b hover:bg-slate-50/50">
                    <TableCell className="pl-6 text-[11px] font-bold text-slate-600">{formatIndianDate(log.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-extrabold text-slate-700">{farms.find(f => f.id === log.farmId)?.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Dist: {Object.keys(log.distribution).length} Houses</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-black text-slate-900">{log.totalWeight.toLocaleString()} KG</TableCell>
                    <TableCell className="text-right text-[11px] font-medium text-slate-500">{log.maizeKg.toLocaleString()} KG</TableCell>
                    <TableCell className="text-right text-[11px] font-medium text-slate-500">{log.soyaKg.toLocaleString()} KG</TableCell>
                    <TableCell className="text-right text-[11px] font-medium text-slate-500">{log.oilLiters?.toLocaleString() || 0} L</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600"
                        onClick={() => { if(confirm("Delete this mix? Stock will be restored.")) deleteFeedLog(log.id) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

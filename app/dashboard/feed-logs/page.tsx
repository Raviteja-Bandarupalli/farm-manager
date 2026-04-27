"use client"

import { useState, useEffect } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"

type FeedType = "Pre-Starter" | "Starter" | "Grower"

interface FeedLog {
  id: string
  farm_id: string
  date: string
  feed_type: string
  maize_kg: number
  soya_kg: number
  rice_kg: number
  supplement_kg: number
  oil_ltr: number
  total_kg: number
}

export default function FeedLogsPage() {
  const { farms } = useMasterData()
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterFarm, setFilterFarm] = useState("all")
  const [feedType, setFeedType] = useState<FeedType | "">("")
  const [farm, setFarm] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [maize, setMaize] = useState("")
  const [soya, setSoya] = useState("")
  const [rice, setRice] = useState("")
  const [suppl, setSuppl] = useState("")
  const [oil, setOil] = useState("")

  const total = (parseFloat(maize)||0)+(parseFloat(soya)||0)+(parseFloat(rice)||0)+(parseFloat(suppl)||0)+(parseFloat(oil)||0)

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from("feed_logs").select("*").order("date", { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const resetForm = () => {
    setFeedType(""); setFarm(""); setMaize(""); setSoya("")
    setRice(""); setSuppl(""); setOil(""); setShowForm(false)
  }

  const handleSave = async () => {
    if (!farm || !feedType || !date) { alert("Please select farm, feed type and date"); return }
    setSaving(true)
    const { error } = await supabase.from("feed_logs").insert({
      farm_id: farm, date, feed_type: feedType,
      maize_kg: parseFloat(maize)||0, soya_kg: parseFloat(soya)||0,
      rice_kg: parseFloat(rice)||0, supplement_kg: parseFloat(suppl)||0,
      oil_ltr: parseFloat(oil)||0, total_kg: total,
    })
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    resetForm(); fetchLogs()
  }

  const filteredLogs = filterFarm === "all" ? logs : logs.filter(l => l.farm_id === filterFarm)
  const totalMaize = filteredLogs.reduce((s, l) => s + (l.maize_kg || 0), 0)
  const totalSoya = filteredLogs.reduce((s, l) => s + (l.soya_kg || 0), 0)
  const totalProduced = filteredLogs.reduce((s, l) => s + (l.total_kg || 0), 0)
  const getFarmName = (id: string) => (farms as any[]).find(f => f.id === id)?.name || id

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Feed Mixing</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">Farm-wise Production & House-wise Distribution</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Feed Mix
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "TOTAL MAIZE USED", value: `${totalMaize.toFixed(0)}KG`, sub: "Across filter" },
          { label: "TOTAL SOYA USED", value: `${totalSoya.toFixed(0)}KG`, sub: "Across filter" },
          { label: "TOTAL PRODUCED", value: `${totalProduced.toFixed(0)}KG`, sub: "Mixed Feed" },
          { label: "AVG FEED COST", value: "₹0.00/KG", sub: "Estimated" },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Filter by Farm</p>
          <select value={filterFarm} onChange={e => setFilterFarm(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">All Locations</option>
            {(farms as any[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">FEED MOVEMENT LEDGER</p>
          <p className="text-xs text-muted-foreground">Chronological Mixing History</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["DATE","LOCATION","FEED TYPE","BATCH WEIGHT","MAIZE","SOYA","OIL"].map(h => (
                    <th key={h} className="text-left p-4 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Loading...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No records found.</td></tr>
                ) : filteredLogs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">{log.date}</td>
                    <td className="p-4">{getFarmName(log.farm_id)}</td>
                    <td className="p-4">
                      <span className={"px-2 py-1 rounded-full text-xs font-semibold " + (
                        log.feed_type === "Grower" ? "bg-green-100 text-green-700" :
                        log.feed_type === "Starter" ? "bg-blue-100 text-blue-700" :
                        "bg-orange-100 text-orange-700"
                      )}>{log.feed_type}</span>
                    </td>
                    <td className="p-4">{log.total_kg}kg</td>
                    <td className="p-4">{log.maize_kg}kg</td>
                    <td className="p-4">{log.soya_kg}kg</td>
                    <td className="p-4">{log.oil_ltr}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background rounded-t-2xl p-6 w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">New Feed Mix Entry</h2>
            <p className="text-sm text-muted-foreground mb-5">Fill in today mixing details</p>

            <label className="text-sm font-semibold text-muted-foreground">Farm</label>
            <select value={farm} onChange={e => setFarm(e.target.value)}
              className="w-full p-4 text-base rounded-xl border mt-1 mb-4 bg-background">
              <option value="">Select Farm</option>
              {(farms as any[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            <label className="text-sm font-semibold text-muted-foreground">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full p-4 text-base rounded-xl border mt-1 mb-4 bg-background block" />

            <label className="text-sm font-semibold text-muted-foreground">Feed Type</label>
            <div className="flex gap-3 mt-2 mb-5">
              {(["Pre-Starter","Starter","Grower"] as FeedType[]).map(ft => (
                <button key={ft} onClick={() => setFeedType(ft)}
                  className={"flex-1 py-4 text-sm font-bold rounded-xl border-2 transition-all " + (
                    feedType === ft ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground"
                  )}>{ft}</button>
              ))}
            </div>

            <div className="bg-foreground text-background rounded-xl p-4 mb-5 text-center">
              <div className="text-xs mb-1">TOTAL BATCH WEIGHT (KG)</div>
              <div className="text-3xl font-bold">{total.toFixed(1)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Maize (kg)", value: maize, set: setMaize },
                { label: "Soya (kg)", value: soya, set: setSoya },
                { label: "Rice (kg)", value: rice, set: setRice },
                { label: "5% Suppl (kg)", value: suppl, set: setSuppl },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                  <input type="number" inputMode="numeric" value={value}
                    onChange={e => set(e.target.value)} placeholder="0"
                    className="w-full p-4 text-xl font-bold rounded-xl border mt-1 text-center bg-background" />
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold text-muted-foreground">Oil (litres)</label>
              <input type="number" inputMode="numeric" value={oil}
                onChange={e => setOil(e.target.value)} placeholder="0"
                className="w-full p-4 text-xl font-bold rounded-xl border mt-1 text-center bg-background" />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 py-6 text-base" onClick={resetForm}>Cancel</Button>
              <Button className="flex-1 py-6 text-base" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Confirm & Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

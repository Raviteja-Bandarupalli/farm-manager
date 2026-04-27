"use client"

import { useState } from "react"
import { useMasterData } from "@/lib/master-data-context"
import { Button } from "@/components/ui/button"

type FeedType = "Pre-Starter" | "Starter" | "Grower"

export default function FeedLogsPage() {
  const { farms } = useMasterData()
  const [showForm, setShowForm] = useState(false)
  const [feedType, setFeedType] = useState<FeedType | "">("")
  const [farm, setFarm] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [maize, setMaize] = useState("")
  const [soya, setSoya] = useState("")
  const [rice, setRice] = useState("")
  const [suppl, setSuppl] = useState("")
  const [oil, setOil] = useState("")

  const total =
    (parseFloat(maize) || 0) +
    (parseFloat(soya) || 0) +
    (parseFloat(rice) || 0) +
    (parseFloat(suppl) || 0) +
    (parseFloat(oil) || 0)

  const resetForm = () => {
    setFeedType(""); setFarm(""); setMaize("")
    setSoya(""); setRice(""); setSuppl("")
    setOil(""); setShowForm(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Feed Mixing</h1>
          <p className="text-sm text-muted-foreground">Daily feed production log</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New Entry</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background rounded-t-2xl p-6 w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">New Feed Mix Entry</h2>
            <p className="text-sm text-muted-foreground mb-5">Fill in today mixing details</p>

            <label className="text-sm font-semibold text-muted-foreground">Farm</label>
            <select value={farm} onChange={(e) => setFarm(e.target.value)}
              className="w-full p-4 text-base rounded-xl border mt-1 mb-4 bg-background">
              <option value="">Select Farm</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            <label className="text-sm font-semibold text-muted-foreground">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full p-4 text-base rounded-xl border mt-1 mb-4 bg-background block" />

            <label className="text-sm font-semibold text-muted-foreground">Feed Type</label>
            <div className="flex gap-3 mt-2 mb-5">
              {(["Pre-Starter", "Starter", "Grower"] as FeedType[]).map((ft) => (
                <button key={ft} onClick={() => setFeedType(ft)}
                  className={`flex-1 py-4 text-sm font-bold rounded-xl border-2 transition-all ${
                    feedType === ft
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground"
                  }`}>
                  {ft}
                </button>
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
                    onChange={(e) => set(e.target.value)} placeholder="0"
                    className="w-full p-4 text-xl font-bold rounded-xl border mt-1 text-center bg-background" />
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold text-muted-foreground">Oil (litres)</label>
              <input type="number" inputMode="numeric" value={oil}
                onChange={(e) => setOil(e.target.value)} placeholder="0"
                className="w-full p-4 text-xl font-bold rounded-xl border mt-1 text-center bg-background" />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 py-6 text-base" onClick={resetForm}>
                Cancel
              </Button>
              <Button className="flex-1 py-6 text-base" onClick={resetForm}>
                Confirm and Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center py-16 text-muted-foreground">
        No records yet. Tap + New Entry to start.
      </div>
    </div>
  )
}

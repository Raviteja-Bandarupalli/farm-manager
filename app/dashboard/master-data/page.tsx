"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FarmsTab } from "@/components/master-data/farms-tab"
import { HousesTab } from "@/components/master-data/houses-tab"
import { SuppliersTab } from "@/components/master-data/suppliers-tab"
import { BuyersTab } from "@/components/master-data/buyers-tab"
import { FeedTypesTab } from "@/components/master-data/feed-types-tab"
import { BatchesTab } from "@/components/master-data/batches-tab"
import { WorkersTab } from "@/components/master-data/workers-tab"

export default function MasterDataPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Master Data</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Manage core configuration and settings</p>
        </div>
      </div>

      <Tabs defaultValue="farms" className="space-y-3">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto h-9 p-1 bg-slate-100">
          <TabsTrigger value="farms" className="text-[10px] h-7 font-bold">Farms</TabsTrigger>
          <TabsTrigger value="houses" className="text-[10px] h-7 font-bold">Houses</TabsTrigger>
          <TabsTrigger value="batches" className="text-[10px] h-7 font-bold">Batches</TabsTrigger>
          <TabsTrigger value="workers" className="text-[10px] h-7 font-bold">Workers</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-[10px] h-7 font-bold">Suppliers</TabsTrigger>
          <TabsTrigger value="buyers" className="text-[10px] h-7 font-bold">Buyers</TabsTrigger>
          <TabsTrigger value="feed" className="text-[10px] h-7 font-bold">Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="farms">
          <FarmsTab />
        </TabsContent>

        <TabsContent value="houses">
          <HousesTab />
        </TabsContent>

        <TabsContent value="batches">
          <BatchesTab />
        </TabsContent>

        <TabsContent value="workers">
          <WorkersTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>

        <TabsContent value="buyers">
          <BuyersTab />
        </TabsContent>

        <TabsContent value="feed">
          <FeedTypesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

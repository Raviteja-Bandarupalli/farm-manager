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
          <h1 className="text-xl font-bold">Master Data</h1>
          <p className="text-[10px] text-muted-foreground">Manage your farm's core configuration and settings</p>
        </div>
      </div>

      <Tabs defaultValue="farms" className="space-y-3">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto h-8 p-0.5 bg-slate-100">
          <TabsTrigger value="farms" className="text-xs h-7">Farms</TabsTrigger>
          <TabsTrigger value="houses" className="text-xs h-7">Houses</TabsTrigger>
          <TabsTrigger value="batches" className="text-xs h-7">Batches</TabsTrigger>
          <TabsTrigger value="workers" className="text-xs h-7">Workers</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs h-7">Suppliers</TabsTrigger>
          <TabsTrigger value="buyers" className="text-xs h-7">Buyers</TabsTrigger>
          <TabsTrigger value="feed" className="text-xs h-7">Feed</TabsTrigger>
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

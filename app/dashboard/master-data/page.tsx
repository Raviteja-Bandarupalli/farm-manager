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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Data</h1>
          <p className="text-xs text-muted-foreground">Manage your farm's core configuration and settings</p>
        </div>
      </div>

      <Tabs defaultValue="farms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto h-10 p-1 bg-slate-100">
          <TabsTrigger value="farms" className="text-xs h-8 font-bold">Farms</TabsTrigger>
          <TabsTrigger value="houses" className="text-xs h-8 font-bold">Houses</TabsTrigger>
          <TabsTrigger value="batches" className="text-xs h-8 font-bold">Batches</TabsTrigger>
          <TabsTrigger value="workers" className="text-xs h-8 font-bold">Workers</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs h-8 font-bold">Suppliers</TabsTrigger>
          <TabsTrigger value="buyers" className="text-xs h-8 font-bold">Buyers</TabsTrigger>
          <TabsTrigger value="feed" className="text-xs h-8 font-bold">Feed</TabsTrigger>
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

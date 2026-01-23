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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Master Data</h1>
          <p className="text-muted-foreground mt-1">Manage your farm's core configuration and settings</p>
        </div>
      </div>

      <Tabs defaultValue="farms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="farms">Farms</TabsTrigger>
          <TabsTrigger value="houses">Houses</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
          <TabsTrigger value="feed">Feed Types</TabsTrigger>
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

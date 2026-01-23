import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { MasterDataProvider } from "@/lib/master-data-context"
import { BatchProvider } from "@/lib/batch-context"
import { DailyLogsProvider } from "@/lib/daily-logs-context"
import { InventoryProvider } from "@/lib/inventory-context"
import { FinanceProvider } from "@/lib/finance-context"
import { BatchCostingProvider } from "@/lib/batch-costing-context"
import { WorkersProvider } from "@/lib/workers-context"
import { BatchSectionsProvider } from "@/lib/batch-sections-context"
import { WeeklyFeedProvider } from "@/lib/weekly-feed-context"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FarmManager - Complete Broiler Farm Management Solution",
  description:
    "Streamline your poultry operations with real-time flock tracking, inventory management, and performance analytics",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <MasterDataProvider>
            <WorkersProvider>
              <BatchProvider>
                <BatchSectionsProvider>
                  <WeeklyFeedProvider>
                    <DailyLogsProvider>
                      <InventoryProvider>
                        <BatchCostingProvider>
                          <FinanceProvider>{children}</FinanceProvider>
                        </BatchCostingProvider>
                      </InventoryProvider>
                    </DailyLogsProvider>
                  </WeeklyFeedProvider>
                </BatchSectionsProvider>
              </BatchProvider>
            </WorkersProvider>
          </MasterDataProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

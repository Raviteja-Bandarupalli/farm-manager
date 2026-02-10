"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LayoutDashboard, Database, ClipboardList, Package, DollarSign, Wallet, LogOut, Menu, Utensils } from "lucide-react"
import { useState } from "react"
import { canAccessMasterData, canAccessInventory, canAccessFinance } from "@/lib/permissions"
import { cn } from "@/lib/utils"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", show: true },
    { icon: Database, label: "Master Data", href: "/dashboard/master-data", show: canAccessMasterData(user) },
    { icon: ClipboardList, label: "Daily Logs", href: "/dashboard/daily-logs", show: true },
    { icon: Utensils, label: "Daily Feed Log", href: "/dashboard/feed-logs", show: true },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory", show: canAccessInventory(user) },
    { icon: Wallet, label: "Sales", href: "/dashboard/sales", show: true },
    { icon: DollarSign, label: "Finance", href: "/dashboard/finance", show: canAccessFinance(user) },
  ].filter((item) => item.show)

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xl text-primary-foreground">🐔</span>
              </div>
              <span className="font-bold text-lg">FarmManager</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden md:flex w-64 flex-col gap-2 border-r p-4 overflow-y-auto flex-shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start relative",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground border-b-2 border-primary-foreground"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background border-r p-4">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                  return (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start relative",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground border-b-2 border-primary-foreground"
                      )}
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Link>
                    </Button>
                  )
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

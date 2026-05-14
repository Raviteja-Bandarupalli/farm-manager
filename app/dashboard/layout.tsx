"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LayoutDashboard, Database, ClipboardList, Package, DollarSign, Wallet, LogOut, Menu } from "lucide-react"
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
    { icon: Package, label: "Inventory", href: "/dashboard/inventory", show: canAccessInventory(user) },
    { icon: Wallet, label: "Sales", href: "/dashboard/sales", show: true },
    { icon: DollarSign, label: "Finance", href: "/dashboard/finance", show: canAccessFinance(user) },
  ].filter((item) => item.show)

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <span className="text-xl text-primary-foreground">🐔</span>
              </div>
              <span className="font-bold text-lg tracking-tight">FarmManager</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold px-3" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden md:flex w-60 flex-col gap-2 border-r p-2 overflow-y-auto flex-shrink-0 bg-slate-50/20">
          <div className="px-3 py-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Main Menu</h2>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn(
                      "w-full h-9 justify-start relative text-[13px] px-3 font-bold tracking-tight transition-all duration-200",
                      isActive
                        ? "bg-slate-200/60 text-slate-900 font-black border-r-4 border-primary"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon className={cn("h-4 w-4 mr-2.5", isActive ? "text-primary" : "text-slate-400")} />
                      {item.label}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
            <aside className="fixed left-0 top-14 bottom-0 w-64 bg-background border-r p-4 shadow-xl">
              <div className="mb-6">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Navigation</h2>
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                    return (
                      <Button
                        key={item.href}
                        variant="ghost"
                        className={cn(
                          "w-full h-11 justify-start relative text-sm font-extrabold tracking-tight",
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Link>
                      </Button>
                    )
                  })}
                </nav>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-2 md:p-3 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

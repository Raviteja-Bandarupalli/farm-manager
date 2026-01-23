"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface User {
  id: string
  email: string
  name: string
  role: "owner" | "manager" | "worker"
  assignedFarmIds?: string[]
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USERS: User[] = [
  {
    id: "owner-1",
    email: "ravi@gmail.com",
    name: "Ravi",
    role: "owner",
    assignedFarmIds: [], // Owner sees all farms
  },
  {
    id: "manager-1",
    email: "7893214444", // Mobile number as login ID
    name: "Ravi Manager",
    role: "manager",
    assignedFarmIds: [], // Can see all farms but role restricts actions
  },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = localStorage.getItem("poultry_user")
    if (storedUser) {
      const parsed = JSON.parse(storedUser)
      const validUser = USERS.find((u) => u.email === parsed.email)
      if (validUser) {
        setUser(validUser)
      } else {
        // Clear invalid/old test users
        localStorage.removeItem("poultry_user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const user = USERS.find(
      (u) => u.email === email && password === (u.email === "ravi@gmail.com" ? "raviteja" : "1234"),
    )

    if (!user) {
      throw new Error("Invalid email or password")
    }

    localStorage.setItem("poultry_user", JSON.stringify(user))
    setUser(user)
    router.push("/dashboard")
  }

  const signup = async (email: string, password: string, name: string) => {
    throw new Error("Signup is disabled. Contact the owner.")
  }

  const logout = () => {
    localStorage.removeItem("poultry_user")
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

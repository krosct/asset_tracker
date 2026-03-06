"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "@/lib/api"

interface AuthContextType {
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user has valid token
    const token = localStorage.getItem("access_token")
    setIsAuthenticated(!!token)
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password })
    const { access_token, refresh_token } = response.data.session

    localStorage.setItem("access_token", access_token)
    localStorage.setItem("refresh_token", refresh_token)
    setIsAuthenticated(true)
  }

  const register = async (data: any) => {
    const response = await api.post("/auth/register", data)
    const { access_token, refresh_token } = response.data.session

    localStorage.setItem("access_token", access_token)
    localStorage.setItem("refresh_token", refresh_token)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

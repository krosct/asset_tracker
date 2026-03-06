"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { TrendingUp, Eye, EyeOff } from "lucide-react"
import { useEffect, useRef } from "react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    birthDate: "",
  })

  // Estados para controlar a visibilidade das senhas
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register } = useAuth()

  // Cálculos de restrição de idade
  const today = new Date();
  // Limite Superior: Máximo 2008 (para ter 18 anos em 2026)
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    .toISOString().split("T")[0];
  // Limite Inferior: Mínimo 1906 (limite de 120 anos)
  const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
    .toISOString().split("T")[0];

  // 1. Crie uma referência para o input de confirmação
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  // 2. Monitore a mudança das senhas
  useEffect(() => {
    if (confirmPasswordRef.current) {
      if (formData.confirmPassword !== "" && formData.password !== formData.confirmPassword) {
        // Define a mensagem que aparecerá no tooltip do navegador
        confirmPasswordRef.current.setCustomValidity("Passwords don't match!");
      } else {
        // Limpa o erro (permite o envio do formulário)
        confirmPasswordRef.current.setCustomValidity("");
      }
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!")
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...apiData } = formData
      await register(apiData)
      router.push("/dashboard")
    } catch (err: any) {
      const backendResponse = err.response?.data?.error;
      if (Array.isArray(backendResponse)) {
        // Se for erro do Zod (array), pega a mensagem do primeiro item
        setError(backendResponse[0]?.message || "Validation Error.");
      } else if (typeof backendResponse === "string") {
        // Se for uma string simples enviada pelo backend
        setError(backendResponse);
      } else {
        // Fallback para erros genéricos (ex: servidor offline)
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <TrendingUp className="h-6 w-6 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Start tracking your investments today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-background/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  ref={confirmPasswordRef}
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="bg-background/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+00 00 00000-0000"
                value={formData.phone}
                onChange={handleChange}
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                min={minDate}
                max={maxDate}
                value={formData.birthDate}
                onChange={(e) => {
                  // Limpa a mensagem customizada ao mudar o valor
                  e.target.setCustomValidity("");
                  handleChange(e);
                }}
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.validity.rangeUnderflow) {
                    target.setCustomValidity("If you really are too old like that, go enjoy your days, man!");
                  } else if (target.validity.rangeOverflow) {
                    target.setCustomValidity("If you really are too new like that, go back to your mom, kiddo!");
                  } else {
                    target.setCustomValidity("Please, enter a valid birth date.");
                  }
                }}
                required
                className="bg-background/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

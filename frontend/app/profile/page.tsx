"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, TrendingUp, User, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, logout } = useAuth()
  const [loading, setLoading] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    birthDate: "",
    address: "",
    gender: "",
    password: "",
    confirmPassword: ""
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Busca dos dados do perfil
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const fetchProfile = async () => {
        try {
          const response = await api.get("/auth/profile")
          if (response.data && response.data.profile) {
            const p = response.data.profile
            setFormData(prev => ({
              ...prev,
              fullName: p.fullName || "",
              username: p.username || "",
              email: p.email || "",
              phone: p.phone || "",
              birthDate: p.birthDate ? new Date(p.birthDate).toISOString().split('T')[0] : "",
              address: p.address || "",
              gender: p.gender || "",
              password: "",
              confirmPassword: ""
            }))
          }
        } catch (error) {
          console.error("Erro ao buscar perfil:", error)
        }
      }
      fetchProfile()
    }
  }, [isAuthenticated, authLoading])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      toast.error("Nome completo, Nome de usuário e E-mail são obrigatórios.")
      return
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        toast.error("As senhas não coincidem.")
        return
      }
    }

    setLoading(true)
    
    try {
      const updateData: any = {
        fullName: formData.fullName,
        username: formData.username,
        phone: formData.phone,
        birthDate: formData.birthDate,
        address: formData.address,
        gender: formData.gender,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      // Calls the real API to update profile
      const response = await api.put("/auth/profile", updateData)

      if (response.data && response.data.error) {
        throw new Error(response.data.error)
      }

      toast.success("Perfil atualizado com sucesso!")
      setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }))
    } catch (error: any) {
      // Axios error handling
      const errorMessage = error.response?.data?.error || error.message || "Erro ao atualizar perfil";
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AssetTracker</h1>
              <p className="text-xs text-muted-foreground">Portfolio Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")} className="text-emerald-500 font-medium">
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <User className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Meu Perfil</h2>
            <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e configurações de conta</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    value={formData.fullName} 
                    onChange={handleChange} 
                    placeholder="Seu nome completo" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input 
                    id="username" 
                    name="username" 
                    value={formData.username} 
                    onChange={handleChange} 
                    placeholder="seunome123" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="seu@email.com" 
                    disabled 
                  />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado diretamente.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="(11) 99999-9999" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input 
                    id="birthDate" 
                    name="birthDate" 
                    type="date" 
                    value={formData.birthDate} 
                    onChange={handleChange} 
                    className="[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select value={formData.gender} onValueChange={(val) => handleSelectChange("gender", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço Completo</Label>
                  <Input 
                    id="address" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    placeholder="Rua, número, complemento, bairro, cidade, estado" 
                  />
                </div>

                <div className="space-y-2 md:col-span-2 pt-4 border-t border-border/50">
                  <Label htmlFor="password">Nova Senha (opcional)</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    placeholder="Preencha apenas se quiser alterar a senha" 
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    type="password" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    placeholder="Confirme a sua nova senha" 
                  />
                </div>

              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white min-w-[120px]">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

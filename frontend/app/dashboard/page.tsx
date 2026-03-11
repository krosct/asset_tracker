"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useTransactionFilters } from "@/hooks/use-transaction-filters"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AllocationChart } from "@/components/dashboard/allocation-chart"
import { ChartTabs } from "@/components/dashboard/ChartTabs"
import { AssetsList } from "@/components/dashboard/assets-list"
import { TransactionsList } from "@/components/dashboard/transactions-list"
import { TransactionFiltersPanel } from "@/components/dashboard/transaction-filters-panel"
import { AddAssetDialog } from "@/components/dashboard/add-asset-dialog"
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog"
import { LogOut, TrendingUp, Plus, Filter, X, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, loading: authLoading, logout } = useAuth()
  
  // Lógica extraída para hooks (mantendo a funcionalidade original)
  const { assets, transactions, history, profitability, loading, refresh } = useDashboardData(isAuthenticated)
  const { displayedTransactions, filters, sorting } = useTransactionFilters(transactions)

  // Estados de UI originais
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedAssetTypeFilter, setSelectedAssetTypeFilter] = useState<string | null>(null)
  const [addAssetOpen, setAddAssetOpen] = useState(false)
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    refresh({ start: "", end: "" })
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleUpdatePrices = async () => {
    try {
      setIsUpdating(true)
      await api.post('/assets/update-prices')
      toast({
        title: "Atualização concluída",
        description: "Cotações e proventos foram atualizados com sucesso.",
        variant: "default",
      })
      refresh()
    } catch (error) {
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar as cotações e proventos no momento.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
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
      {/* Header - Classes Originais Restauradas */}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUpdatePrices} 
              disabled={isUpdating}
              className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
              title="Atualizar cotações e proventos"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="text-emerald-500 font-medium">
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Estrutura de Grid e Spacing Originais */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {loading && assets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <SummaryCards assets={assets} />

            <div className="grid gap-8 md:grid-cols-6">
              {/* Coluna 1: Allocation e Assets */}
              <div className="md:col-span-3 space-y-8">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-2xl font-bold">Allocation</CardTitle>
                    {selectedAssetTypeFilter && (
                      <Button onClick={() => setSelectedAssetTypeFilter(null)} variant="ghost" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                        <X className="h-4 w-4 mr-2" />
                        Resetar Filtro ({selectedAssetTypeFilter})
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <AllocationChart assets={assets} onSliceClick={setSelectedAssetTypeFilter} />
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Assets</h2>
                      <p className="text-sm text-muted-foreground">Manage your investment portfolio</p>
                    </div>
                  </div>
                  <AssetsList assets={assets} onUpdate={refresh} filterType={selectedAssetTypeFilter} />
                </div>
              </div>

              {/* Coluna 2: Transactions */}
              <div className="md:col-span-3 space-y-4">
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Transactions</h2>
                    <p className="text-sm text-muted-foreground">History</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="w-auto [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="w-auto [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                    />
                    <Button
                      onClick={() => setShowFilterPanel(!showFilterPanel)}
                      variant="secondary"
                      size="icon"
                      title="Filtros e ordenação"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    {(startDate || endDate) && (
                      <Button onClick={clearFilters} variant="destructive" size="icon" title="Limpar Filtros">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button onClick={() => setAddTransactionOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {showFilterPanel && (
                  <TransactionFiltersPanel filters={filters} sorting={sorting} />
                )}
                <TransactionsList transactions={displayedTransactions} />
              </div>
            </div>

            {/* Gráfico de Barras no final como solicitado */}
            {!loading && history && history.length > 0 && (
              <ChartTabs historyData={history} profitabilityData={profitability} assets={assets} />
            )}
          </>
        )}
      </main>

      <AddAssetDialog open={addAssetOpen} onOpenChange={setAddAssetOpen} onSuccess={refresh} />
      <AddTransactionDialog 
        open={addTransactionOpen} 
        onOpenChange={setAddTransactionOpen} 
        onSuccess={refresh}
        assets={assets}
      />
    </div>
  )
}
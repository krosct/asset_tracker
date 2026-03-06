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
import { BarChartComponent } from "@/components/dashboard/BarChartComponent"
import { AssetsList } from "@/components/dashboard/assets-list"
import { TransactionsList } from "@/components/dashboard/transactions-list"
import { TransactionFiltersPanel } from "@/components/dashboard/transaction-filters-panel"
import { AddAssetDialog } from "@/components/dashboard/add-asset-dialog"
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog"
import { LogOut, TrendingUp, Plus, Filter, X } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, logout } = useAuth()
  
  // Lógica extraída para hooks (mantendo a funcionalidade original)
  const { assets, transactions, loading, refresh } = useDashboardData(isAuthenticated)
  const { displayedTransactions, filters, sorting } = useTransactionFilters(transactions)

  // Estados de UI originais
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedAssetTypeFilter, setSelectedAssetTypeFilter] = useState<string | null>(null)
  const [addAssetOpen, setAddAssetOpen] = useState(false)
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)

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
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
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
                      className="w-auto"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="w-auto"
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
            {!loading && assets.length > 0 && (
              <BarChartComponent data={assets} />
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
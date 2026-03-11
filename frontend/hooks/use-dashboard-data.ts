import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export function useDashboardData(isAuthenticated: boolean) {
  const [assets, setAssets] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [profitability, setProfitability] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (filters?: { start?: string; end?: string }) => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      const params: any = { limit: 100 }
      if (filters?.start) params.startDate = filters.start
      if (filters?.end) params.endDate = filters.end

      const [assetsRes, transactionsRes, historyRes, profitabilityRes] = await Promise.all([
        api.get("/assets"),
        api.get("/transactions", { params }),
        api.get("/assets/history"),
        api.get("/assets/profitability")
      ])
      
      setAssets(assetsRes.data.assets || [])
      setTransactions(transactionsRes.data || [])
      setHistory(historyRes.data || [])
      setProfitability(profitabilityRes.data || [])
    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Erro ao carregar dados.")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { assets, transactions, history, profitability, loading, refresh: loadData }
}
import { useMemo, useState } from "react"

export function useTransactionFilters(transactions: any[]) {
  const [filterTicker, setFilterTicker] = useState("")
  const [filterMinTotal, setFilterMinTotal] = useState("")
  const [filterMaxTotal, setFilterMaxTotal] = useState("")
  const [sortField, setSortField] = useState<"date" | "ticker" | "totalValue">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const displayedTransactions = useMemo(() => {
    const withTotal = transactions.map((tx: any) => ({
      ...tx,
      _totalValue: Number(tx.quantity || 0) * Number(tx.value || 0),
    }))

    let filtered = withTotal

    if (filterTicker.trim()) {
      const needle = filterTicker.trim().toLowerCase()
      filtered = filtered.filter((tx: any) => 
        String(tx.asset?.ticker || tx.ticker || "").toLowerCase().includes(needle)
      )
    }

    if (filterMinTotal) filtered = filtered.filter(tx => tx._totalValue >= Number(filterMinTotal))
    if (filterMaxTotal) filtered = filtered.filter(tx => tx._totalValue <= Number(filterMaxTotal))

    return [...filtered].sort((a: any, b: any) => {
      let av: any, bv: any
      if (sortField === "ticker") {
        av = (a.asset?.ticker || a.ticker || "").toLowerCase()
        bv = (b.asset?.ticker || b.ticker || "").toLowerCase()
      } else if (sortField === "totalValue") {
        av = a._totalValue; bv = b._totalValue
      } else {
        av = new Date(a.transaction_date || a.date || 0).getTime()
        bv = new Date(b.transaction_date || b.date || 0).getTime()
      }
      return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [transactions, filterTicker, filterMinTotal, filterMaxTotal, sortField, sortDirection])

  return {
    displayedTransactions,
    filters: { filterTicker, setFilterTicker, filterMinTotal, setFilterMinTotal, filterMaxTotal, setFilterMaxTotal },
    sorting: { sortField, setSortField, sortDirection, setSortDirection }
  }
}
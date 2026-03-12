import { useMemo, useState } from "react"

export function useTransactionFilters(transactions: any[]) {
  const [filterTickers, setFilterTickers] = useState<string[]>([])
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterMinTotal, setFilterMinTotal] = useState("")
  const [filterMaxTotal, setFilterMaxTotal] = useState("")
  const [filterMinQuantity, setFilterMinQuantity] = useState("")
  const [filterMaxQuantity, setFilterMaxQuantity] = useState("")
  const [filterMinUnitPrice, setFilterMinUnitPrice] = useState("")
  const [filterMaxUnitPrice, setFilterMaxUnitPrice] = useState("")
  const [filterType, setFilterType] = useState<"all" | "BUY" | "SELL">("all")
  const [filterAssetType, setFilterAssetType] = useState<string>("all")
  
  const [sortField, setSortField] = useState<"date" | "ticker" | "totalValue" | "unitPrice" | "quantity" | "type">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const displayedTransactions = useMemo(() => {
    const withTotal = transactions.map((tx: any) => ({
      ...tx,
      _totalValue: Number(tx.quantity || 0) * Number(tx.value || 0),
    }))

    let filtered = withTotal

    if (filterTickers.length > 0) {
      filtered = filtered.filter((tx: any) => {
        const txTicker = String(tx.asset?.ticker || tx.ticker || "").toLowerCase()
        return filterTickers.some(t => t.toLowerCase() === txTicker)
      })
    }

    if (filterStartDate) {
      filtered = filtered.filter(tx => new Date(tx.transaction_date || tx.date) >= new Date(filterStartDate))
    }
    if (filterEndDate) {
      const eDate = new Date(filterEndDate)
      eDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(tx => new Date(tx.transaction_date || tx.date) <= eDate)
    }

    if (filterMinTotal) filtered = filtered.filter(tx => tx._totalValue >= Number(filterMinTotal))
    if (filterMaxTotal) filtered = filtered.filter(tx => tx._totalValue <= Number(filterMaxTotal))

    if (filterMinQuantity) filtered = filtered.filter(tx => Number(tx.quantity) >= Number(filterMinQuantity))
    if (filterMaxQuantity) filtered = filtered.filter(tx => Number(tx.quantity) <= Number(filterMaxQuantity))

    if (filterMinUnitPrice) filtered = filtered.filter(tx => Number(tx.value) >= Number(filterMinUnitPrice))
    if (filterMaxUnitPrice) filtered = filtered.filter(tx => Number(tx.value) <= Number(filterMaxUnitPrice))

    if (filterType !== "all") {
      filtered = filtered.filter(tx => tx.type === filterType)
    }

    if (filterAssetType !== "all") {
      filtered = filtered.filter(tx => tx.asset?.type === filterAssetType)
    }

    return [...filtered].sort((a: any, b: any) => {
      let av: any, bv: any
      if (sortField === "ticker") {
        av = (a.asset?.ticker || a.ticker || "").toLowerCase()
        bv = (b.asset?.ticker || b.ticker || "").toLowerCase()
      } else if (sortField === "totalValue") {
        av = a._totalValue; bv = b._totalValue
      } else if (sortField === "unitPrice") {
        av = Number(a.value || 0); bv = Number(b.value || 0)
      } else if (sortField === "quantity") {
        av = Number(a.quantity || 0); bv = Number(b.quantity || 0)
      } else if (sortField === "type") {
        av = (a.type || "").toLowerCase()
        bv = (b.type || "").toLowerCase()
      } else {
        av = new Date(a.transaction_date || a.date || 0).getTime()
        bv = new Date(b.transaction_date || b.date || 0).getTime()
      }
      return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [
    transactions, 
    filterTickers, 
    filterStartDate, filterEndDate,
    filterMinTotal, filterMaxTotal, 
    filterMinQuantity, filterMaxQuantity,
    filterMinUnitPrice, filterMaxUnitPrice,
    filterType, filterAssetType,
    sortField, sortDirection
  ])

  return {
    displayedTransactions,
    filters: { 
      filterTickers, setFilterTickers, 
      filterStartDate, setFilterStartDate,
      filterEndDate, setFilterEndDate,
      filterMinTotal, setFilterMinTotal, 
      filterMaxTotal, setFilterMaxTotal,
      filterMinQuantity, setFilterMinQuantity,
      filterMaxQuantity, setFilterMaxQuantity,
      filterMinUnitPrice, setFilterMinUnitPrice,
      filterMaxUnitPrice, setFilterMaxUnitPrice,
      filterType, setFilterType,
      filterAssetType, setFilterAssetType
    },
    sorting: { sortField, setSortField, sortDirection, setSortDirection }
  }
}
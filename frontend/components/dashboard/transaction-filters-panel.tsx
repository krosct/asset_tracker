import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface FiltersPanelProps {
  sorting: any
  filters: any
}

export function TransactionFiltersPanel({ sorting, filters }: FiltersPanelProps) {
  return (
    <Card className="border-border/50 bg-card/40 pt-4">
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold">Order</p>
          <select 
            value={sorting.sortField} 
            onChange={(e) => sorting.setSortField(e.target.value)} 
            className="w-full h-8 rounded-md border text-sm bg-background"
          >
            <option value="date">Date</option>
            <option value="ticker">Ticker</option>
            <option value="totalValue">Value</option>
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold">Ticker</p>
          <Input 
            placeholder="Filter..." 
            value={filters.filterTicker} 
            onChange={(e) => filters.setFilterTicker(e.target.value)} 
            className="h-8" 
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold">Values (Min/Max)</p>
          <div className="flex gap-1">
            <Input 
                type="number" 
                placeholder="Min" 
                value={filters.filterMinTotal} 
                onChange={(e) => filters.setFilterMinTotal(e.target.value)} 
                className="h-8" 
            />
            <Input 
                type="number" 
                placeholder="Max" 
                value={filters.filterMaxTotal} 
                onChange={(e) => filters.setFilterMaxTotal(e.target.value)} 
                className="h-8" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
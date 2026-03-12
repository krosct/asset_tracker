import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Filter } from "lucide-react"

interface FiltersPanelProps {
  sorting: any
  filters: any
  assets?: any[]
}

export function TransactionFiltersPanel({ sorting, filters, assets = [] }: FiltersPanelProps) {
  const uniqueAssetTypes = Array.from(new Set(assets.map(a => a.type).filter(Boolean)));
  // Collect unique tickers for the checkboxes
  const uniqueTickers = Array.from(new Set(assets.map(a => a.ticker).filter(Boolean)));

  const isFiltering = filters.filterTickers.length > 0 || 
    filters.filterStartDate || filters.filterEndDate || 
    filters.filterMinTotal || filters.filterMaxTotal || 
    filters.filterMinQuantity || filters.filterMaxQuantity || 
    filters.filterMinUnitPrice || filters.filterMaxUnitPrice || 
    filters.filterType !== 'all' || filters.filterAssetType !== 'all' || 
    sorting.sortField !== 'date' || sorting.sortDirection !== 'desc';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon" title="Filtros e ordenação">
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <ScrollArea className="h-[300px] w-full rounded-md">
          <div className="p-4 space-y-4">
            <h4 className="font-medium text-sm leading-none mb-4">Filtros e Ordenação</h4>

            {/* Ordenação */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs text-muted-foreground font-medium">Ordenar por</label>
              <div className="flex gap-2 w-full">
                <Select value={sorting.sortField} onValueChange={sorting.setSortField}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="unitPrice">Valor Unitário</SelectItem>
                    <SelectItem value="totalValue">Valor Total</SelectItem>
                    <SelectItem value="ticker">Ticker</SelectItem>
                    <SelectItem value="quantity">Quantidade</SelectItem>
                    <SelectItem value="type">Tipo (Buy/Sell)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sorting.sortDirection} onValueChange={sorting.setSortDirection}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Início e Fim */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs text-muted-foreground font-medium">Data Início</label>
                <Input 
                  type="date" 
                  value={filters.filterStartDate} 
                  onChange={(e) => filters.setFilterStartDate(e.target.value)}
                  className="w-full [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs text-muted-foreground font-medium">Data Fim</label>
                <Input 
                  type="date" 
                  value={filters.filterEndDate} 
                  onChange={(e) => filters.setFilterEndDate(e.target.value)}
                  className="w-full [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                />
              </div>
            </div>

            {/* Ticker (Checkbox Multi-select) */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs text-muted-foreground font-medium">Ativos Específicos (Ticker)</label>
              <div className="border rounded-md p-2 bg-background">
                <ScrollArea className="h-[120px] pr-3">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="all-tickers" 
                        checked={filters.filterTickers.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) filters.setFilterTickers([]);
                        }}
                      />
                      <label htmlFor="all-tickers" className="text-sm font-medium leading-none cursor-pointer">
                        Todos os Ativos
                      </label>
                    </div>
                    {uniqueTickers.map((ticker: any) => (
                      <div key={ticker} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`ticker-${ticker}`} 
                          checked={filters.filterTickers.includes(ticker)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              filters.setFilterTickers((prev: string[]) => [...prev, ticker]);
                            } else {
                              filters.setFilterTickers((prev: string[]) => prev.filter(t => t !== ticker));
                            }
                          }}
                        />
                        <label htmlFor={`ticker-${ticker}`} className="text-sm font-medium leading-none cursor-pointer">
                          {ticker}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Tipo de Ativo e Transação */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs text-muted-foreground font-medium">Categoria</label>
                <Select value={filters.filterAssetType} onValueChange={filters.setFilterAssetType}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueAssetTypes.map((type: any) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs text-muted-foreground font-medium">Tipo</label>
                <Select value={filters.filterType} onValueChange={filters.setFilterType}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="BUY">Compra (Buy)</SelectItem>
                    <SelectItem value="SELL">Venda (Sell)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valores Totais */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs text-muted-foreground font-medium">Valor Total (Min / Max)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  value={filters.filterMinTotal} 
                  onChange={(e) => filters.setFilterMinTotal(e.target.value)} 
                />
                <Input 
                  type="number" 
                  placeholder="Max" 
                  value={filters.filterMaxTotal} 
                  onChange={(e) => filters.setFilterMaxTotal(e.target.value)} 
                />
              </div>
            </div>

            {/* Valores Unitários */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs text-muted-foreground font-medium">Valor Unitário (Min / Max)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  value={filters.filterMinUnitPrice} 
                  onChange={(e) => filters.setFilterMinUnitPrice(e.target.value)} 
                />
                <Input 
                  type="number" 
                  placeholder="Max" 
                  value={filters.filterMaxUnitPrice} 
                  onChange={(e) => filters.setFilterMaxUnitPrice(e.target.value)} 
                />
              </div>
            </div>

            {/* Quantidade */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs text-muted-foreground font-medium">Quantidade (Min / Max)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  value={filters.filterMinQuantity} 
                  onChange={(e) => filters.setFilterMinQuantity(e.target.value)} 
                />
                <Input 
                  type="number" 
                  placeholder="Max" 
                  value={filters.filterMaxQuantity} 
                  onChange={(e) => filters.setFilterMaxQuantity(e.target.value)} 
                />
              </div>
            </div>

            {/* Botão Limpar */}
            {isFiltering && (
              <Button 
                variant="ghost" 
                className="w-full text-xs text-muted-foreground mt-2 h-8"
                onClick={() => {
                  filters.setFilterTickers([]);
                  filters.setFilterStartDate("");
                  filters.setFilterEndDate("");
                  filters.setFilterMinTotal("");
                  filters.setFilterMaxTotal("");
                  filters.setFilterMinQuantity("");
                  filters.setFilterMaxQuantity("");
                  filters.setFilterMinUnitPrice("");
                  filters.setFilterMaxUnitPrice("");
                  filters.setFilterType("all");
                  filters.setFilterAssetType("all");
                  sorting.setSortField("date");
                  sorting.setSortDirection("desc");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
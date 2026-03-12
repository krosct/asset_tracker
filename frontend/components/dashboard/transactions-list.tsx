import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowUpCircle, ArrowDownCircle, Edit2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/utils" // <--- Importação adicionada
import { Button } from "@/components/ui/button"

interface TransactionsListProps {
  transactions: any[]
  onEdit?: (transaction: any) => void
  onDelete?: (transaction: any) => void
}

export function TransactionsList({ transactions, onEdit, onDelete }: TransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
        <CardContent className="p-8 text-center text-muted-foreground">
          No transactions yet. Click "Add Transaction" to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
      <CardContent className="p-0">
        <ScrollArea className="h-[1050px]">
          <div className="divide-y divide-border/50">
            {transactions.map((transaction: any) => {
              const isBuy = transaction.type === "BUY"
              
              // CORREÇÃO: Usando 'value' ao invés de 'price'
              const price = Number(transaction.value || 0)
              const quantity = Number(transaction.quantity || 0)
              const totalValue = quantity * price
              
              // CORREÇÃO: O ticker vem dentro do objeto asset
              const ticker = transaction.asset?.ticker || transaction.ticker || "N/A"
              const date = transaction.transaction_date || transaction.date // Fallback para data

              return (
                <div key={transaction.id} className="group relative p-4 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isBuy ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-red-500/10 ring-1 ring-red-500/20"
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {/* Exibindo o Ticker corrigido */}
                          <p className="font-semibold">{ticker}</p>
                          <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                            {transaction.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {/* Formatando preço unitário */}
                          {quantity} × {formatCurrency(price)}
                        </p>
                      </div>
                    </div>

                    {/* Botões de Ação - Visíveis no hover */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 backdrop-blur-[1px] pointer-events-none">
                      <div className="pointer-events-auto flex items-center gap-2">
                        {onEdit && (
                          <Button size="icon" variant="secondary" onClick={() => onEdit(transaction)} className="h-8 w-8 rounded-full shadow-md hover:bg-emerald-500 hover:text-white transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button size="icon" variant="destructive" onClick={() => onDelete(transaction)} className="h-8 w-8 rounded-full shadow-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {/* Formatando valor total */}
                        {formatCurrency(totalValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date && format(new Date(date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
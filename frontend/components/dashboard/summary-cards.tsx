import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, DollarSign, Package, Activity } from "lucide-react"
import { formatCurrency } from "@/lib/utils" // <--- Importação adicionada

interface SummaryCardsProps {
  assets: any[]
}

export function SummaryCards({ assets }: SummaryCardsProps) {
  // Total Value = soma de (quantidade * preço atual ou médio)
  const totalValue = assets.reduce((sum, asset) => {
    const quantity = Number(asset.quantity || 0)
    const price =
      asset.current_price != null
        ? Number(asset.current_price)
        : Number(asset.avg_price || 0)
    return sum + quantity * price
  }, 0)

  const totalAssets = assets.length

  // Tipos de ativos distintos
  const assetTypes = [...new Set(assets.map((a) => a.type || "Outros"))].length

  // Growth da carteira: ((valor_atual - valor_investido) / valor_investido) * 100
  const invested = assets.reduce((sum, asset) => {
    const quantity = Number(asset.quantity || 0)
    const avgPrice = Number(asset.avg_price || 0)
    return sum + quantity * avgPrice
  }, 0)

  const current = totalValue
  const portfolioGrowth =
    invested > 0 ? ((current - invested) / invested) * 100 : 0
  const growthPositive = portfolioGrowth >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl shadow-emerald-500/10 border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Value</p>
              <p className="text-3xl font-extrabold">
                {/* CORREÇÃO: Usando o formatador */}
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-inner shadow-emerald-500/20">
              <DollarSign className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl shadow-emerald-500/10 border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Assets</p>
              <p className="text-3xl font-extrabold">{totalAssets}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-inner shadow-emerald-500/20">
              <Package className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl shadow-emerald-500/10 border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Asset Types</p>
              <p className="text-3xl font-extrabold">{assetTypes}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-inner shadow-emerald-500/20">
              <Activity className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl shadow-emerald-500/10 border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Growth</p>
              <p
                className={`text-3xl font-extrabold ${
                  growthPositive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {growthPositive ? "+" : ""}
                {portfolioGrowth.toFixed(2)}%
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-inner shadow-emerald-500/20">
              <TrendingUp className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
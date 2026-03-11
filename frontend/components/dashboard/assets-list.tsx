"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { EditAssetDialog } from "@/components/dashboard/edit-asset-dialog"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AssetsListProps {
  assets: any[]
  onUpdate: () => void
  filterType?: string | null
}

export function AssetsList({ assets, onUpdate, filterType }: AssetsListProps) {
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deletingAsset, setDeletingAsset] = useState<any>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleEditClick = (asset: any) => {
    setEditingAsset(asset)
    setEditOpen(true)
  }

  const handleEditSuccess = () => {
    setEditOpen(false)
    onUpdate()
  }

  const handleDeleteClick = (asset: any) => {
    setDeletingAsset(asset)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingAsset) return
    try {
      const assetId = deletingAsset.id || deletingAsset._id
      await api.delete(`/assets/${assetId}`)
      toast.success("Ativo removido com sucesso")
      onUpdate()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao remover ativo")
    } finally {
      setDeleteOpen(false)
      setDeletingAsset(null)
    }
  }

  const filteredAssets = filterType
    ? assets.filter(
        (asset) =>
          (asset.type || asset.sector || "Outros") === filterType
      )
    : assets

  if (!filteredAssets || filteredAssets.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum ativo encontrado para o filtro selecionado.
        </CardContent>
      </Card>
    )
  }

  const groupedAssets = filteredAssets.reduce((acc: any, asset: any) => {
    const groupKey = asset.type || asset.sector || "Outros"
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(asset)
    return acc
  }, {})

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
                <div className="space-y-3 px-2">
          {(Object.entries(groupedAssets) as [string, any[]][]).map(
            ([groupTitle, groupAssets]) => {
              // ===== CÁLCULOS APENAS PARA O TÍTULO =====
              let totalGroupValue = 0
              let variationSum = 0
              let variationCount = 0

              groupAssets.forEach((asset) => {
                const avgPrice = Number(
                  asset.averagePrice ??
                    asset.avg_price ??
                    asset.average_price ??
                    0
                )

                const rawCurrentPrice =
                  asset.currentPrice ?? asset.current_price
                let currentPrice = Number(rawCurrentPrice ?? 0)
                if (currentPrice === 0) currentPrice = avgPrice

                const quantity = Number(asset.quantity || 0)
                const totalValue = quantity * currentPrice

                totalGroupValue += totalValue

                if (avgPrice > 0 && currentPrice > 0) {
                  variationSum +=
                    ((currentPrice - avgPrice) / avgPrice) * 100
                  variationCount++
                }
              })

              const avgVariation =
                variationCount > 0 ? variationSum / variationCount : 0

              const currency = groupAssets[0]?.currency || "BRL"

              return (
                <Card key={groupTitle} className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
                  <CardContent className="px-4 space-y-3">
                    {/* 🔹 TÍTULO PROFISSIONAL */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold capitalize">
                        {groupTitle}
                      </h3>

                      <span className="text-muted-foreground">|</span>

                      <span
                        className={`flex items-center gap-1 text-sm font-semibold ${
                          avgVariation > 0
                            ? "text-emerald-500"
                            : avgVariation < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {avgVariation > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : avgVariation < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        {avgVariation >= 0 ? "+" : ""}
                        {avgVariation.toFixed(2)}%
                      </span>

                      <span className="text-muted-foreground">|</span>

                      <span className="text-sm text-muted-foreground">
                        Total:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(totalGroupValue, currency)}
                        </span>
                      </span>
                    </div>

                    {/* ===== CARDS ORIGINAIS (RESTAURADOS) ===== */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {groupAssets.map((asset: any) => {
                        const avgPrice = Number(
                          asset.averagePrice ??
                            asset.avg_price ??
                            asset.average_price ??
                            0
                        )

                        const rawCurrentPrice =
                          asset.currentPrice ?? asset.current_price
                        let currentPrice = Number(rawCurrentPrice ?? 0)
                        if (currentPrice === 0) currentPrice = avgPrice

                        const quantity = Number(asset.quantity || 0)
                        const totalValue = quantity * currentPrice
                        const currency = asset.currency || "BRL"

                        let variation = 0
                        if (currentPrice > 0 && avgPrice > 0) {
                          variation =
                            ((currentPrice - avgPrice) / avgPrice) * 100
                        }

                        return (
                          <Card
                            key={asset.id || asset._id}
                            className="group relative border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 transition-all overflow-hidden"
                          >
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 ${
                                variation > 0
                                  ? "bg-emerald-500"
                                  : variation < 0
                                  ? "bg-red-500"
                                  : "bg-muted"
                              }`}
                            />

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-500"
                                onClick={() => handleEditClick(asset)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-500/20 hover:text-red-500"
                                onClick={() => handleDeleteClick(asset)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <CardContent className="px-4 pl-6 space-y-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-xl tracking-tight">
                                    {asset.ticker}
                                  </h4>
                                  {(asset.sector || asset.type) &&
                                    asset.sector !== groupTitle && (
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-[10px] h-5 border-emerald-500/30"
                                      >
                                        {asset.sector || asset.type}
                                      </Badge>
                                    )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground mb-0.5">
                                    Valor Total
                                  </p>
                                  <p className="font-bold text-lg">
                                    {formatCurrency(totalValue, currency)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-3 border-t border-border/50">
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Qtd
                                  </p>
                                  <p className="font-medium text-sm">
                                    {quantity}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Médio
                                  </p>
                                  <p className="font-medium text-sm">
                                    {formatCurrency(avgPrice, currency)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Atual
                                  </p>
                                  <p className="font-medium text-sm">
                                    {formatCurrency(currentPrice, currency)}
                                  </p>
                                </div>

                                <div className="flex flex-col items-end">
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Variação
                                  </p>
                                  <div
                                    className={`flex items-center gap-1 text-sm font-bold ${
                                      variation > 0
                                        ? "text-emerald-500"
                                        : variation < 0
                                        ? "text-red-500"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {variation > 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : variation < 0 ? (
                                      <TrendingDown className="h-3 w-3" />
                                    ) : (
                                      <Minus className="h-3 w-3" />
                                    )}
                                    {Math.abs(variation).toFixed(2)}%
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            }
          )}
        </div>
          </ScrollArea>
        </CardContent>
      </Card>


      <EditAssetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleEditSuccess}
        asset={editingAsset}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o ativo
              <span className="font-bold mx-1">
                {deletingAsset?.ticker}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

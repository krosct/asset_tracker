"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface AddAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddAssetDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddAssetDialogProps) {
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<{
    ticker: string
    type: string
    sector: string
    quantity: string
    currency: string
    avg_price: string
    current_price?: string
  }>({
    ticker: "",
    type: "",
    sector: "",
    quantity: "",
    currency: "BRL",
    avg_price: "",
    current_price: undefined,
  })

  const parseCurrency = (value?: string) => {
    if (!value) return undefined
    return Number(value.replace(",", "."))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const avgPrice = parseCurrency(formData.avg_price)
      if (avgPrice === undefined || isNaN(avgPrice)) {
        toast.error("Preço médio inválido")
        return
      }

      const currentPrice =
        parseCurrency(formData.current_price) ?? avgPrice

      const payload = {
        ticker: formData.ticker.toUpperCase(),
        type: formData.type,
        sector: formData.sector,
        currency: formData.currency,
        quantity: Number(formData.quantity),
        avg_price: avgPrice,
        current_price: currentPrice,
      }

      await api.post("/assets", payload)


      toast.success("Ativo salvo com sucesso!")

      setFormData({
        ticker: "",
        type: "",
        sector: "",
        quantity: "",
        currency: "BRL",
        avg_price: "",
        current_price: undefined,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao adicionar ativo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Ativo</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo. Preços aceitam vírgula ou ponto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Ticker + Moeda */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Ticker</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  value={formData.ticker}
                  onChange={(e) =>
                    setFormData({ ...formData, ticker: e.target.value })
                  }
                  className="uppercase font-mono flex-1"
                  required
                />
                <Select
                  value={formData.currency}
                  onValueChange={(val) =>
                    setFormData({ ...formData, currency: val })
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ação">Ação</SelectItem>
                  <SelectItem value="FIIs">FIIs</SelectItem>
                  <SelectItem value="Stocks">Stocks</SelectItem>
                  <SelectItem value="Reits">Reits</SelectItem>
                  <SelectItem value="ETF">ETF</SelectItem>
                  <SelectItem value="Cripto">Cripto</SelectItem>
                  <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                  <SelectItem value="Caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Setor */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Setor</Label>
              <Input
                className="col-span-3"
                value={formData.sector}
                onChange={(e) =>
                  setFormData({ ...formData, sector: e.target.value })
                }
              />
            </div>

            {/* Quantidade */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Qtd</Label>
              <Input
                type="number"
                className="col-span-3"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />
            </div>

            {/* Preço Médio */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Preço Médio</Label>
              <Input
                type="text"
                inputMode="decimal"
                className="col-span-3"
                value={formData.avg_price}
                onChange={(e) =>
                  setFormData({ ...formData, avg_price: e.target.value })
                }
                required
              />
            </div>

            {/* Preço Atual */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Atual</Label>
              <Input
                type="text"
                inputMode="decimal"
                className="col-span-3"
                value={formData.current_price ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_price: e.target.value || undefined,
                  })
                }
                placeholder="Opcional (usa Preço Médio)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Ativo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const PREDEFINED_ASSET_TYPES = [
  "FIIs",
  "Stocks",
  "Reits",
  "ETF",
  "Cripto",
  "Renda Fixa",
  "Caixa",
];

// Schema do Front deve garantir a conversão antes de enviar
const formSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").toUpperCase(), // Força maiúscula
  type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive("Quantity must be positive"), // z.coerce transforma texto em número
  value: z.coerce.number().positive("Value must be positive"),       // z.coerce transforma texto em número
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  assetType: z.string().optional(),
  sector: z.string().optional(),
})

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  assets?: any[]
}

export function AddTransactionDialog({ open, onOpenChange, onSuccess, assets = [] }: AddTransactionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [assetTypeLocked, setAssetTypeLocked] = useState(false)
  const [showCustomAssetTypeInput, setShowCustomAssetTypeInput] = useState(false)

  const availableAssetTypes = useMemo(() => {
    const existingTypes = new Set<string>(assets.map(asset => asset.type || asset.asset_type).filter(Boolean));
    return Array.from(new Set([...PREDEFINED_ASSET_TYPES, ...Array.from(existingTypes)])).sort();
  }, [assets]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: "",
      type: "BUY",
      quantity: 0,
      value: 0,
      date: new Date().toISOString().split("T")[0], // Data de hoje YYYY-MM-DD para o input
      assetType: "",
      sector: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)

      // PREPARAÇÃO DOS DADOS (O Pulo do Gato para evitar erro 400)
      const payload = {
        ...values,
        // Garante que são números
        quantity: Number(values.quantity),
        value: Number(values.value),
        // Garante formato ISO 8601 (ex: 2023-12-25T14:00:00.000Z) que o backend espera
        date: new Date(values.date).toISOString(), 
      }

      await api.post("/transactions", payload)
      
      toast.success("Transaction added successfully")
      form.reset()
      onSuccess()
    } catch (error: any) {
      console.error("Erro ao enviar:", error.response?.data || error)
      // Mostra mensagem amigável se o backend retornar erro
      const errorMsg = error.response?.data?.error || "Failed to add transaction. Check your inputs."
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Record a new buy or sell transaction.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ticker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticker</FormLabel>
                  <FormControl>
                  <Input
                    placeholder="PETR4"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      field.onChange(value)

                      if (assets && assets.length > 0) {
                        const existing = assets.find((asset) => {
                          const ticker = asset.ticker || asset.symbol
                          return (
                            typeof ticker === "string" &&
                            ticker.toUpperCase() === value
                          )
                        })

                        if (existing) {
                          const inferredType =
                            existing.type ||
                            existing.asset_type ||
                            "Ação"
                          form.setValue("assetType", inferredType)
                          setAssetTypeLocked(true)
                        } else {
                          setAssetTypeLocked(false)
                          form.setValue("assetType", "")
                          setShowCustomAssetTypeInput(false)
                        }
                      }
                    }}
                  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Unit)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="10.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos Opcionais para Criar Ativo Automaticamente */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4 border-border/50">
              <FormField
                control={form.control}
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Type (New Assets)</FormLabel>
                    <FormControl>
                      {assetTypeLocked ? (
                        <Input
                          className="h-8 text-sm"
                          placeholder="Ação, FII..."
                          {...field}
                          disabled={assetTypeLocked}
                        />
                      ) : (
                        <div className="space-y-2">
                          <Select
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setShowCustomAssetTypeInput(true);
                                field.onChange(""); // Clear assetType when switching to custom
                              } else {
                                setShowCustomAssetTypeInput(false);
                                field.onChange(value);
                              }
                            }}
                            value={showCustomAssetTypeInput ? "custom" : field.value}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select asset type" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAssetTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Outro (Digitar)</SelectItem>
                            </SelectContent>
                          </Select>
                          {showCustomAssetTypeInput && (
                            <Input
                              className="h-8 text-sm mt-2"
                              placeholder="Digite um novo tipo..."
                              {...field}
                            />
                          )}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Sector (Optional)</FormLabel>
                    <FormControl>
                      <Input className="h-8 text-sm" placeholder="Banking, Retail..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
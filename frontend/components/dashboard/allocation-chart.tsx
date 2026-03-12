// components/dashboard/allocation-chart.tsx
"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface AllocationChartProps {
  assets: any[]
  onSliceClick?: (type: string) => void
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-3 min-w-[150px]">
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.fill }} 
          />
          <p className="font-semibold text-popover-foreground">{data.name}</p>
        </div>
        <p className="text-sm text-muted-foreground pl-5">
          {formatCurrency(data.value)} ({data.percent.toFixed(1)}%)
        </p>
      </div>
    )
  }
  return null
}

export function AllocationChart({ assets, onSliceClick }: AllocationChartProps) {
  // Agrupar por tipo (Setor ou Tipo de ativo)
  const data = assets.reduce((acc: any[], asset) => {
    const avgPrice = Number(asset.averagePrice ?? asset.avg_price ?? asset.average_price ?? 0)
    let price = Number(asset.currentPrice ?? asset.current_price ?? 0)
    if (price === 0) {
      price = avgPrice
    }
    const value = Number(asset.quantity || 0) * price
    
    // Ignorar se for negativo ou zero
    if (value <= 0) return acc

    const type = asset.type || asset.sector || "Outros"
    const existing = acc.find((item) => item.name === type)
    
    if (existing) {
      existing.value += value
    } else {
      acc.push({ name: type, value })
    }
    return acc
  }, [])

  // Calcular porcentagens para o tooltip
  const total = data.reduce((sum: number, item: any) => sum + item.value, 0)
  const dataWithPercent = data.map((item: any) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0
  }))

  const handlePieClick = (data: any) => {
    if (onSliceClick) {
      onSliceClick(data.name)
    }
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart key={JSON.stringify(dataWithPercent)}>
          <Pie
            data={dataWithPercent}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            onClick={handlePieClick}
          >
            {dataWithPercent.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
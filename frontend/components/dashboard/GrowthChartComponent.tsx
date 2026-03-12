"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartData {
  name: string;
  value: number;
  details?: {
    categories: Record<string, number>;
    assets: { ticker: string; type: string; value: number; quantity: number }[];
  };
}

interface GrowthChartComponentProps {
  data?: BarChartData[]; // Tornar opcional para usar o default
  periodicity?: string;
}

const dummyData: BarChartData[] = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 5500 },
];

const getPeriodLabel = (periodicity: string) => {
  switch (periodicity) {
    case 'Daily': return 'Day';
    case 'Weekly': return 'Week';
    case 'Quarterly': return 'Quarter';
    case 'Yearly': return 'Year';
    default: return 'Mês';
  }
};

const CustomTooltip = ({ active, payload, label, periodicity = 'Mensal' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const details = data.details;
    const periodName = getPeriodLabel(periodicity);

    return (
      <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-3 shadow-lg min-w-[200px] text-sm">
        <p className="font-semibold text-white mb-2 pb-1 border-b border-[#3f3f46]">{periodName}: {label}</p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-zinc-400">Growth Evolution</span>
          <span className="font-bold text-emerald-400">R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        {details && Object.keys(details.categories).length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Por Categoria</p>
            {Object.entries(details.categories)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([category, value]) => {
                const percentage = data.value > 0 ? ((value as number) / data.value) * 100 : 0;
                return (
                  <div key={category} className="flex justify-between items-center text-xs my-0.5 gap-4">
                    <span className="text-zinc-300">{category}</span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-white">R$ {(value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-zinc-500 text-[10px] w-8">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
            })}
          </div>
        )}

        {details && details.assets && details.assets.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Por Ativo</p>
            <div className="max-h-[150px] overflow-y-auto overflow-x-hidden pr-1">
              {details.assets.map((asset: any) => {
                const percentage = data.value > 0 ? (asset.value / data.value) * 100 : 0;
                return (
                  <div key={asset.ticker} className="flex justify-between items-center text-xs my-0.5 gap-4">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <span>{asset.ticker}</span>
                      <span className="text-[10px] text-zinc-500">({asset.quantity})</span>
                    </span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-white">R$ {asset.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-zinc-500 text-[10px] w-8">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export const GrowthChartComponent: React.FC<GrowthChartComponentProps> = ({ data = dummyData, periodicity = 'Mensal' }) => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Growth Evolution</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" tickFormatter={(value) => `R$ ${value / 1000}k`} />
            <Tooltip content={<CustomTooltip periodicity={periodicity} />} cursor={{fill: 'transparent'}} />
            <Bar dataKey="value" name="Valor Total" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

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
  Cell,
} from 'recharts';

interface ProfitabilityChartData {
  name: string;
  value: number;
  details?: {
    categories: Record<string, number>;
    assets: { ticker: string; type: string; value: number; quantity: number }[];
  };
}

interface ProfitabilityChartComponentProps {
  data?: ProfitabilityChartData[];
  periodicity?: string;
}

const getPeriodLabel = (periodicity: string) => {
  switch (periodicity) {
    case 'Diário': return 'Dia';
    case 'Semanal': return 'Semana';
    case 'Trimestral': return 'Trimestre';
    case 'Anual': return 'Ano';
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
          <span className="text-zinc-400">Rentabilidade</span>
          <span className={`font-bold ${data.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.value > 0 ? '+' : ''}{data.value.toFixed(2)}%
          </span>
        </div>
        
        {details && Object.keys(details.categories).length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Por Categoria</p>
            {Object.entries(details.categories)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([category, value]) => (
                <div key={category} className="flex justify-between items-center text-xs my-0.5 gap-4">
                  <span className="text-zinc-300">{category}</span>
                  <div className="flex items-center gap-2 text-right">
                    <span className={(value as number) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {(value as number) > 0 ? '+' : ''}{(value as number).toFixed(2)}%
                    </span>
                  </div>
                </div>
            ))}
          </div>
        )}

        {details && details.assets && details.assets.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Por Ativo</p>
            <div className="max-h-[150px] overflow-y-auto overflow-x-hidden pr-1">
              {details.assets.map((asset: any) => (
                <div key={asset.ticker} className="flex justify-between items-center text-xs my-0.5 gap-4">
                  <span className="text-zinc-300 flex items-center gap-1">
                    <span>{asset.ticker}</span>
                    <span className="text-[10px] text-zinc-500">({asset.quantity})</span>
                  </span>
                  <div className="flex items-center gap-2 text-right">
                    <span className={asset.value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {asset.value > 0 ? '+' : ''}{asset.value.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export const ProfitabilityChartComponent: React.FC<ProfitabilityChartComponentProps> = ({ data = [], periodicity = 'Mensal' }) => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Evolução da Rentabilidade</CardTitle>
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
            <YAxis stroke="#888888" tickFormatter={(value) => `${value}%`} />
            <Tooltip content={<CustomTooltip periodicity={periodicity} />} cursor={{fill: 'transparent'}} />
            <Bar dataKey="value" name="Rentabilidade (%)" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};


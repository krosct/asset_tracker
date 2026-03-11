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
}

interface ProfitabilityChartComponentProps {
  data?: ProfitabilityChartData[];
}

export const ProfitabilityChartComponent: React.FC<ProfitabilityChartComponentProps> = ({ data = [] }) => {
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
            <Tooltip 
                formatter={(value: number) => [`${value}%`, "Rentabilidade"]}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
            />
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


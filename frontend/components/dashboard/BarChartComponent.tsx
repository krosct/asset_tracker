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
}

interface BarChartComponentProps {
  data?: BarChartData[]; // Tornar opcional para usar o default
}

const dummyData: BarChartData[] = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Abr', value: 4500 },
  { name: 'Mai', value: 6000 },
  { name: 'Jun', value: 5500 },
];

export const BarChartComponent: React.FC<BarChartComponentProps> = ({ data = dummyData }) => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-emerald-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Evolução do Patrimônio</CardTitle>
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
            {/* Correção: Removidas as barras invertidas desnecessárias */}
            <YAxis stroke="#888888" tickFormatter={(value) => `R$ ${value / 1000}k`} />
            <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, "Patrimônio"]}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="value" name="Valor Total" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
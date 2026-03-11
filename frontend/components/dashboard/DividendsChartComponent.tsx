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

interface DividendsChartData {
  name: string;
  value: number;
}

interface DividendsChartComponentProps {
  data?: DividendsChartData[];
}

const dummyData: DividendsChartData[] = [
  { name: 'Jan', value: 0 },
];

export const DividendsChartComponent: React.FC<DividendsChartComponentProps> = ({ data = dummyData }) => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-purple-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Dividendos Recebidos</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Nenhum dividendo registrado no período.
          </div>
        ) : (
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
              <YAxis stroke="#888888" tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, "Dividendos"]}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px' }}
              />
              <Bar dataKey="value" name="Valor" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
"use client"

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { BarChartComponent } from "./BarChartComponent";
import { ProfitabilityChartComponent } from "./ProfitabilityChartComponent";
import { DividendsChartComponent } from "./DividendsChartComponent";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

interface ChartTabsProps {
  historyData?: any[];
  profitabilityData?: any[];
  assets?: any[];
}

export function ChartTabs({ historyData: initialHistory, profitabilityData: initialProfitability, assets = [] }: ChartTabsProps) {
  const [historyData, setHistoryData] = useState<any[]>(initialHistory || []);
  const [profitabilityData, setProfitabilityData] = useState<any[]>(initialProfitability || []);
  const [dividendsData, setDividendsData] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assetId, setAssetId] = useState("all");
  const [assetTypeId, setAssetTypeId] = useState("all");

  const [loading, setLoading] = useState(false);

  // Extrai tipos únicos dos ativos para o filtro
  const uniqueAssetTypes = Array.from(new Set(assets.map(a => a.type).filter(Boolean)));

  useEffect(() => {
    async function fetchFilteredData() {
      try {
        setLoading(true);
        const params: any = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (assetId && assetId !== "all") params.assetId = assetId;
        if (assetTypeId && assetTypeId !== "all") params.assetTypeId = assetTypeId;
        
        const [histRes, profRes, divRes] = await Promise.all([
          api.get('/assets/history', { params }),
          api.get('/assets/profitability', { params }),
          api.get('/assets/dividends', { params })
        ]);
        
        setHistoryData(histRes.data);
        setProfitabilityData(profRes.data);
        setDividendsData(divRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados dos gráficos", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Só faz fetch se algum filtro for aplicado, caso contrário usa os iniciais ou busca inicial
    fetchFilteredData();
  }, [startDate, endDate, assetId, assetTypeId]);

  return (
    <div className="w-full mt-8 space-y-6">
      <Tabs defaultValue="patrimonio" className="w-full">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0 justify-between mb-6">
          <div className="hidden sm:block flex-1" />
          
          <TabsList className="grid w-full sm:w-auto sm:min-w-[400px] max-w-2xl grid-cols-3 bg-card/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="patrimonio" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-500">
              Patrimônio
            </TabsTrigger>
            <TabsTrigger value="rentabilidade" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">
              Rentabilidade
            </TabsTrigger>
            <TabsTrigger value="dividendos" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-500">
              Dividendos
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 flex justify-end w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Filtrar gráficos">
                  <Filter className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm leading-none mb-4">Filtros do Gráfico</h4>
                  
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs text-muted-foreground font-medium">Ativo Específico</label>
                    <Select value={assetId} onValueChange={setAssetId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os Ativos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Ativos</SelectItem>
                        {assets.map((a: any) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.ticker}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs text-muted-foreground font-medium">Tipo de Ativo</label>
                    <Select value={assetTypeId} onValueChange={setAssetTypeId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os Tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        {uniqueAssetTypes.map((type: any) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs text-muted-foreground font-medium">Data Início</label>
                      <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs text-muted-foreground font-medium">Data Fim</label>
                      <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[48%] [&::-webkit-calendar-picker-indicator]:sepia-[79%] [&::-webkit-calendar-picker-indicator]:saturate-[2476%] [&::-webkit-calendar-picker-indicator]:hue-rotate-[130deg] [&::-webkit-calendar-picker-indicator]:brightness-[96%] [&::-webkit-calendar-picker-indicator]:contrast-[101%]"
                      />
                    </div>
                  </div>
                  
                  {/* Botão de limpar filtros opcional */}
                  {(startDate || endDate || assetId !== 'all' || assetTypeId !== 'all') && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs text-muted-foreground mt-2 h-8"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setAssetId("all");
                        setAssetTypeId("all");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <TabsContent value="patrimonio" className="mt-0 relative">
          {loading && <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-sm">Carregando...</div>}
          <BarChartComponent data={historyData} />
        </TabsContent>
        
        <TabsContent value="rentabilidade" className="mt-0 relative">
          {loading && <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-sm">Carregando...</div>}
          <ProfitabilityChartComponent data={profitabilityData} />
        </TabsContent>

        <TabsContent value="dividendos" className="mt-0 relative">
          {loading && <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-sm">Carregando...</div>}
          <DividendsChartComponent data={dividendsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

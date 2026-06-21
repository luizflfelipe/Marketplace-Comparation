/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { Product } from "../types";

interface ChartsProps {
  products: Product[];
}

export default function ChartsView({ products }: ChartsProps) {
  // 1. Process data for Business Units comparing MinhaLoja Average vs Market Lowest Average
  const bus = Array.from(new Set(products.map((p) => p.bu)));
  
  const buPerfData = bus.map((bu) => {
    const buProds = products.filter((p) => p.bu === bu);
    let totalMinhaLoja = 0;
    let totalMarketMin = 0;
    let leadershipCount = 0;

    buProds.forEach((prod) => {
      totalMinhaLoja += prod.localPrice;

      const activeComps = prod.competitors.filter((c) => c.inStock);
      if (activeComps.length === 0) {
        totalMarketMin += prod.localPrice;
        leadershipCount++;
      } else {
        const lowestCompPrice = Math.min(...activeComps.map((c) => c.price));
        totalMarketMin += lowestCompPrice;
        if (prod.localPrice <= lowestCompPrice) {
          leadershipCount++;
        }
      }
    });

    const avgMinhaLoja = buProds.length ? totalMinhaLoja / buProds.length : 0;
    const avgMarketMin = buProds.length ? totalMarketMin / buProds.length : 0;
    const leadershipPct = buProds.length ? (leadershipCount / buProds.length) * 100 : 0;
    const gapPercent = avgMinhaLoja > 0 ? ((avgMinhaLoja - avgMarketMin) / avgMinhaLoja) * 100 : 0;

    return {
      name: bu,
      "Preço Médio MinhaLoja (R$)": Math.round(avgMinhaLoja * 100) / 100,
      "Preço Médio Concorrente (R$)": Math.round(avgMarketMin * 100) / 100,
      "Leadership %": Math.round(leadershipPct * 10) / 10,
      "Gap Médio %": Math.round(gapPercent * 10) / 10,
      count: buProds.length,
    };
  });

  // 2. Process data for Competitor Share - How active is each player in our Top 500 items?
  const competitorStatsMap: Record<string, { count: number; bestPriceCount: number; sumPrice: number }> = {};
  
  products.forEach((prod) => {
    const activeComps = prod.competitors.filter((c) => c.inStock);
    if (activeComps.length === 0) return;

    // Lowest active competitor price (using base prices)
    const lowestPrice = Math.min(...activeComps.map((c) => c.price));

    activeComps.forEach((comp) => {
      if (!competitorStatsMap[comp.name]) {
        competitorStatsMap[comp.name] = { count: 0, bestPriceCount: 0, sumPrice: 0 };
      }
      competitorStatsMap[comp.name].count++;
      competitorStatsMap[comp.name].sumPrice += comp.price;

      // Check if this specific competitor is at least tied for lowest competitor price
      const compRealPrice = comp.price;
      if (compRealPrice <= lowestPrice + 0.1) {
        competitorStatsMap[comp.name].bestPriceCount++;
      }
    });
  });

  const competitorData = Object.entries(competitorStatsMap).map(([name, stats]) => {
    return {
      name,
      "Itens Ativos no Catálogo": stats.count,
      "Vezes Lider de Preço": stats.bestPriceCount,
      "Preço Médio (R$)": Math.round((stats.sumPrice / stats.count) * 100) / 100,
    };
  }).sort((a, b) => b["Itens Ativos no Catálogo"] - a["Itens Ativos no Catálogo"]);

  // Colors for visualization layers
  const BU_COLORS = ["#18181b", "#2563eb", "#10b981", "#f59e0b"];
  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#a4de6c"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Chart 1: Average Price MinhaLoja vs Mercado Per BU */}
      <div className="bg-[#111111] p-5 rounded-xl border border-zinc-200 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-2">
          Estratégia de Gap por BU (Business Unit)
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Compara a média dos nossos preços de venda reais vs a média do menor preço mapeado no mercado.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buPerfData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="name" fontSize={11} stroke="#71717a" />
              <YAxis fontSize={11} stroke="#71717a" unit="R$" />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e4e4e7" }}
                formatter={(val: number) => [`R$ ${val.toFixed(2)}`]}
              />
              <Legend fontSize={12} wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Bar dataKey="Preço Médio MinhaLoja (R$)" fill="#18181b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Preço Médio Concorrente (R$)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Leadership % (Best Price) and Gap % per BU */}
      <div className="bg-[#111111] p-5 rounded-xl border border-zinc-200 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-2">
          Share de Liderança vs Gap Médio
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Porcentagem de itens onde somos a melhor oferta (%) versus o percentual de desvio médio de preço.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buPerfData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="name" fontSize={11} stroke="#71717a" />
              <YAxis yAxisId="left" fontSize={11} stroke="#71717a" unit="%" label={{ value: "Liderança", angle: -90, position: "insideLeft", style: { fontSize: 9 } }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#71717a" unit="%" label={{ value: "Desvio (Gap)", angle: 90, position: "insideRight", style: { fontSize: 9 } }} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e4e4e7" }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Bar yAxisId="left" dataKey="Leadership %" fill="#10b981" radius={[4, 4, 0, 0]} name="Liderança (MinhaLoja mais barata %)" />
              <Bar yAxisId="right" dataKey="Gap Médio %" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Afastamento de Preço (Gap %)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Competitor Penetration across Top 500 items */}
      <div className="bg-[#111111] p-5 rounded-xl border border-zinc-200 shadow-sm lg:col-span-2">
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-2">
          Presença e Atividade dos Concorrentes
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Quantidade de itens (dos {products.length} monitorados) em que o concorrente possui oferta ativa contrapostos ao seu preço médio.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={competitorData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="name" fontSize={11} stroke="#71717a" />
              <YAxis yAxisId="left" fontSize={11} stroke="#18181b" label={{ value: "Ofertas Ativas", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#2563eb" label={{ value: "Preço Médio (R$)", angle: 90, position: "insideRight", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e4e4e7" }} />
              <Bar yAxisId="left" dataKey="Itens Ativos no Catálogo" fill="#2563eb" radius={[4, 4, 0, 0]} name="Itens Ativos no Concorrente" />
              <Line yAxisId="right" type="monotone" dataKey="Preço Médio (R$)" stroke="#ef4444" strokeWidth={2.5} name="Preço Médio Concorrente" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

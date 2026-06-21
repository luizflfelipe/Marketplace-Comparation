import React, { useMemo } from "react";
import { Product } from "../types";
import { getProductWithStatus } from "../utils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

interface StatusDashboardViewProps {
  products: Product[];
}

export default function StatusDashboardView({ products }: StatusDashboardViewProps) {
  const processedProducts = useMemo(() => products.map(getProductWithStatus), [products]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      "Melhor Preço": 0,
      "Melhor Preço a Prazo": 0,
      "Igual ao Mercado": 0,
      "Perde Preço": 0,
      "Sem Concorrentes": 0,
      "Outro": 0
    };

    processedProducts.forEach(p => {
      if (counts[p.marketStatus] !== undefined) {
        counts[p.marketStatus]++;
      } else {
        counts["Outro"]++;
      }
    });

    return [
      { name: "Melhor Preço", value: counts["Melhor Preço"], color: "#10b981" }, // emerald-500
      { name: "Melhor Preço a Prazo", value: counts["Melhor Preço a Prazo"], color: "#3b82f6" }, // blue-500
      { name: "Igual ao Mercado", value: counts["Igual ao Mercado"], color: "#f59e0b" }, // amber-500
      { name: "Perde Preço", value: counts["Perde Preço"], color: "#ef4444" }, // rose-500
      { name: "Sem Concorrentes", value: counts["Sem Concorrentes"], color: "#52525b" } // zinc-500
    ].filter(item => item.value > 0);
  }, [processedProducts]);

  const byDivision = useMemo(() => {
    const divisions = Array.from(new Set(processedProducts.map(p => p.division)));
    return divisions.map(division => {
      const prods = processedProducts.filter(p => p.division === division);
      let perde = 0;
      let melhor = 0;
      let prazo = 0;
      let igual = 0;

      prods.forEach(p => {
        if (p.marketStatus === "Perde Preço") perde++;
        if (p.marketStatus === "Melhor Preço") melhor++;
        if (p.marketStatus === "Melhor Preço a Prazo") prazo++;
        if (p.marketStatus === "Igual ao Mercado") igual++;
      });

      return {
        name: division,
        "Perde Preço": perde,
        "Melhor Preço": melhor,
        "Melhor Preço a Prazo": prazo,
        "Igual ao Mercado": igual
      };
    });
  }, [processedProducts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Chart 1: Distribution */}
      <div className="bg-[#111111] p-5 rounded-xl border border-zinc-800 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-2">
          Distribuição dos Status
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Visão geral de como nosso portfólio está posicionado contra a melhor oferta do mercado (Status à vista vs Prazo).
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#18181b", borderRadius: "8px", borderColor: "#27272a", color: "#fff" }} 
                itemStyle={{ color: "#fff", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px", color: "#a1a1aa" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Status BY Division */}
      <div className="bg-[#111111] p-5 rounded-xl border border-zinc-800 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-2">
          Status de Preço por Division
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Quantidade de itens em cada status para cada Division monitorada.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDivision} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis dataKey="name" fontSize={11} stroke="#71717a" />
              <YAxis fontSize={11} stroke="#71717a" />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderRadius: "8px", borderColor: "#27272a", color: "#fff" }}
                itemStyle={{ fontSize: "12px" }}
              />
              <Legend fontSize={12} wrapperStyle={{ fontSize: "11px", paddingTop: "10px", color: "#a1a1aa" }} />
              <Bar dataKey="Perde Preço" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Igual ao Mercado" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Melhor Preço a Prazo" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Melhor Preço" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

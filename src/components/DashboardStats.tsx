/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Award, AlertTriangle, TrendingDown, DollarSign, Activity, Percent, Sparkles } from "lucide-react";
import { CompetitivenessMetrics } from "../types";

interface StatsProps {
  metrics: CompetitivenessMetrics;
  onAdvisorClick: () => void;
  isLoadingAdvisor: boolean;
}

export default function DashboardStats({ metrics, onAdvisorClick, isLoadingAdvisor }: StatsProps) {
  const isGapFavorable = metrics.averageGapPercent <= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 select-none">
      
      {/* 1. Share de Liderança (Best Price) */}
      <div className="bg-[#111111] border border-zinc-800/80 shadow-sm rounded-md p-5 relative overflow-hidden">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-semibold">
          Share de Liderança
        </div>
        <div className="text-3xl font-light text-zinc-100 flex items-baseline">
          <span>{metrics.leadershipShare.toFixed(1)}</span>
          <span className="text-sm text-emerald-600 ml-1">%</span>
        </div>
        <div className="text-xs text-zinc-400 mt-2">
          Melhor preço em {metrics.bestPriceCount} dos {metrics.totalItems} itens monitorados.
        </div>
        <div className="mt-3">
          <div className="w-full bg-[#000000] rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.leadershipShare, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Gap de Competitividade */}
      <div className="bg-[#111111] border border-zinc-800/80 shadow-sm rounded-md p-5">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-semibold">
          Gap Médio de Competitividade
        </div>
        <div className="text-3xl font-light text-zinc-100 flex items-baseline">
          <span className={isGapFavorable ? "text-emerald-600" : "text-amber-600 font-medium"}>
            {metrics.averageGapPercent > 0 ? `+${metrics.averageGapPercent.toFixed(1)}%` : `${metrics.averageGapPercent.toFixed(1)}%`}
          </span>
        </div>
        <div className="text-xs text-zinc-400 mt-2">
          {isGapFavorable ? (
            <span className="text-emerald-600 font-medium">Melhor que a concorrência direta</span>
          ) : (
            <span>Média ponderada acima do mercado</span>
          )}
        </div>
      </div>

      {/* 3. Desvios Críticos */}
      <div className="bg-[#111111] border border-zinc-800/80 shadow-sm rounded-md p-5 border-l-4 border-l-rose-500 flex flex-col justify-between">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-semibold">
            Desvios Críticos (&gt;10%)
          </div>
          <div className="text-3xl font-light text-rose-600">
            {metrics.criticalDeviationsCount}
          </div>
          <div className="text-xs text-zinc-400 mt-2">
            Alertas com desvio de preço excedendo limite
          </div>
        </div>
        
        <div className="pt-3 mt-3 border-t border-zinc-900 flex justify-between items-center">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Ação Recomendada</span>
          <button
            onClick={onAdvisorClick}
            disabled={isLoadingAdvisor}
            className="text-[10px] text-[#111111] bg-zinc-200 hover:bg-zinc-300 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition-colors cursor-pointer flex items-center shadow-sm disabled:opacity-50"
          >
            <Sparkles size={11} className="mr-1 text-emerald-400" />
            <span>{isLoadingAdvisor ? "ANALISANDO..." : "ADVISOR IA →"}</span>
          </button>
        </div>
      </div>

    </div>
  );
}

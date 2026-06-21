/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, X, FileText, Download, Copy, Check, TrendingUp, AlertTriangle } from "lucide-react";
import { CompetitivenessMetrics, Product } from "../types";

interface AdvisorProps {
  metrics: CompetitivenessMetrics;
  products: Product[];
  onClose: () => void;
}

export default function StrategicAdvisor({ metrics, products, onClose }: AdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [copied, setCopied] = useState(false);

  // Extract a small sample of the highest gap items to supply as context
  const sampleHighestGaps = useMemo(() => {
    return products
      .map((p) => {
        const activeComps = p.competitors.filter((c) => c.inStock);
        if (activeComps.length === 0) return null;
        const lowestCompPrice = Math.min(...activeComps.map((c) => c.price));
        const gap = p.localPrice > 0 ? ((p.localPrice - lowestCompPrice) / p.localPrice) * 100 : 0;
        return {
          sku: p.sku,
          bu: p.bu,
          name: p.name,
          brand: p.brand,
          color: p.color,
          localPrice: p.localPrice,
          bestCompetitorPrice: lowestCompPrice,
          bestCompetitorName: activeComps.reduce((prev, curr) => curr.price < prev.price ? curr : prev).name,
          gapPercent: gap,
          revenueDaily: p.revenueDaily
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && p.gapPercent >= 10)
      .sort((a, b) => b.gapPercent - a.gapPercent)
      .slice(0, 8); // top 8 critical gaps
  }, [products]);

  const loadStrategicAdvice = async () => {
    setLoading(true);
    setError(null);
    setReportText("");

    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics,
          sampleHighestGaps,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Ocorreu uma falha ao contatar assessor comercial.");
      }

      if (resData.success) {
        setReportText(resData.text || "");
      } else {
        throw new Error("Não foi possível processar o parecer estratégico.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro desconhecido ao carregar consultoria do Advisor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrategicAdvice();
  }, [metrics]);

  const handleCopyClipboard = () => {
    if (reportText) {
      navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#111111] border border-zinc-800/80 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#111111] border-b border-zinc-800/80 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-blue-400" size={20} />
            <div>
              <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Parecer Executivo de Competitividade • Advisor IA</h3>
              <p className="text-xs text-zinc-400 font-mono">Concedido em tempo real pelo modelo generativo comercial</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#000000] rounded-md text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Content Panel */}
        <div className="p-6 overflow-y-auto flex-1 bg-zinc-900/50">
          
          {/* Quick Metrics Header inside Advice modal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 select-none">
            <div className="bg-[#111111] border border-zinc-800/80 rounded-lg p-4 text-center shadow-sm">
              <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">SHARE DE LIDERANÇA</span>
              <strong className="text-2xl text-emerald-600 font-bold font-mono mt-1 block">{metrics.leadershipShare}%</strong>
            </div>
            <div className="bg-[#111111] border border-zinc-800/80 rounded-lg p-4 text-center shadow-sm">
              <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">SKUS EM DESVIO CRÍTICO</span>
              <strong className="text-2xl text-rose-500 font-bold font-mono mt-1 block">{metrics.criticalDeviationsCount} SKUs</strong>
            </div>
          </div>

          {/* Loading Animation */}
          {loading && (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 select-none">
              <div className="w-12 h-12 border-4 border-zinc-800/80 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-zinc-200 flex items-center space-x-2 uppercase tracking-wider">
                <Sparkles size={16} className="text-blue-400 animate-pulse" />
                <span>Gerando consultoria tática de portfólio...</span>
              </p>
              <div className="max-w-md text-center text-xs text-zinc-400 leading-relaxed font-sans">
                Analisando os 500 SKUs do marketplace, cruzando dados de desvio médio com itens líderes de faturamento para apontar as ações prioritárias de negociação comercial imediata.
              </div>
            </div>
          )}

          {/* Error Trap */}
          {error && (
            <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center my-6 shadow-sm">
              <AlertTriangle className="mx-auto text-rose-500 mb-2" size={28} />
              <h5 className="text-sm font-bold text-rose-400 uppercase tracking-widest">Falha ao gerar o parecer</h5>
              <p className="text-xs text-rose-600 mt-2 leading-relaxed">{error}</p>
              <button
                onClick={loadStrategicAdvice}
                className="mt-4 text-[11px] uppercase tracking-widest font-bold bg-[#111111] hover:bg-zinc-900/50 text-zinc-200 border border-zinc-800 py-2 px-5 rounded-md cursor-pointer transition-colors shadow-sm"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Render drafted advisory text (Structured Markdown output) */}
          {reportText && (
            <div className="bg-[#111111] border border-zinc-800/80 rounded-lg p-6 sm:p-8 shadow-sm">
              <div className="flex justify-end mb-6 select-none">
                <button
                  onClick={handleCopyClipboard}
                  className="px-3 py-1.5 bg-[#111111] hover:bg-zinc-900/50 border border-zinc-800/80 rounded-md text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span className="text-emerald-600">Parecer Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="text-zinc-500" />
                      <span>Copiar Diretrizes</span>
                    </>
                  )}
                </button>
              </div>

              {/* Render custom styled Markdown response to look elegant without external libraries */}
              <div className="prose prose-slate max-w-none text-sm text-zinc-200 leading-relaxed space-y-4">
                {reportText.split("\n").map((line, idx) => {
                  if (line.trim().startsWith("# ")) {
                     return (
                      <h3 key={idx} className="text-lg font-bold text-white uppercase tracking-widest border-b border-zinc-800/80 pb-2 pt-6 first:pt-0">
                        {line.replace("# ", "")}
                      </h3>
                    );
                  }
                  if (line.trim().startsWith("## ")) {
                    return (
                      <h4 key={idx} className="text-sm font-bold text-zinc-100 uppercase tracking-wider pt-4 flex items-center gap-2 text-blue-700">
                        <TrendingUp size={16} />
                        {line.replace("## ", "")}
                      </h4>
                    );
                  }
                  if (line.trim().startsWith("### ")) {
                    return (
                      <h5 key={idx} className="text-sm font-semibold text-zinc-100 leading-tight pt-2">
                        {line.replace("### ", "")}
                      </h5>
                    );
                  }
                  if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                    return (
                      <ul key={idx} className="list-disc pl-6 my-2 text-zinc-300 space-y-1">
                        <li className="leading-relaxed">
                          {parseBoldMarkdown(line.substring(2))}
                        </li>
                      </ul>
                    );
                  }
                  if (line.trim() === "") return <div key={idx} className="h-3" />;
                  
                  return <p key={idx} className="text-zinc-200 leading-relaxed font-sans">{parseBoldMarkdown(line)}</p>;
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-zinc-800/80 bg-[#111111] flex justify-between items-center select-none rounded-b-xl">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">
            MinhaLoja Pricing Intelligence Report • Atividade Comercial Auditada
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 border border-zinc-800 bg-[#111111] rounded-md text-xs font-bold uppercase tracking-wider hover:bg-zinc-900/50 text-zinc-200 cursor-pointer shadow-sm transition-colors"
          >
            Fechar Parecer
          </button>
        </div>

      </div>
    </div>
  );
}

// Custom memoized helper to parse double asterisks like **bold** in the text
function parseBoldMarkdown(txt: string) {
  const parts = txt.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-white font-sans">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    }
    return part;
  });
}

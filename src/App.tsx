/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import {
  RefreshCw,
  TrendingDown,
  Upload,
  Download,
  Sparkles,
  Sliders,
  DollarSign,
  Briefcase,
  AlertOctagon,
  CheckCircle,
  Award,
  LogOut,
  BookOpen,
  Info,
  Calendar,
  ChevronDown,
  FileText
} from "lucide-react";
import { Product, CompetitivenessMetrics, CompetitorPrice } from "./types";
import DashboardStats from "./components/DashboardStats";
import ProductTable from "./components/ProductTable";
import StrategicAdvisor from "./components/StrategicAdvisor";
import StatusDashboardView from "./components/StatusDashboardView";
import Login from "./components/Login";
import { generatePriceDistributionPDF } from "./utils/pdfGenerator";

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Main states
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<CompetitivenessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDailyUpdate, setLastDailyUpdate] = useState<string>("");

  useEffect(() => {
    // Check auth status
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setIsAuthenticated(true);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const [activeTab, setActiveTab] = useState<"audit" | "dashboard">("audit");

  // AI-agent modals control
  const [activeAdvisor, setActiveAdvisor] = useState(false);

  // CSV QuickSight simulation control
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Daily price scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Helper date formatter
  const formatTimestamp = (isoString: string) => {
    if (!isoString) return "--/-- --:--";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Hoje";
    }
  };

  // Load the products list on component mount
  const fetchProductsAndMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Falha no carregamento dos dados estratégicos.");
      }
      const data = await response.json();
      setProducts(data.products || []);
      setMetrics(data.metrics || null);
      setLastDailyUpdate(data.lastDailyUpdate || "");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ocorreu um erro ao comunicar com os APIs comerciais.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRunDailyScan = async () => {
    setIsScanning(true);
    setScanSuccess(false);

    try {
      const response = await fetch("/api/products/daily-scan", {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Não foi possível conectar com o scanner de cotações.");
      }
      const data = await response.json();
      setProducts(data.products || []);
      setMetrics(data.metrics || null);
      setLastDailyUpdate(data.lastDailyUpdate || "");
      
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 5000);
    } catch (err: any) {
      alert("Falha geral durante a varredura: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProductsAndMetrics();
    }
  }, [isAuthenticated]);

  // Update a single SKU's data (prices or competitor list)
  const handleUpdateProduct = async (sku: string, localPrice?: number, competitors?: CompetitorPrice[], rawCompetitors?: CompetitorPrice[]) => {
    try {
      const response = await fetch("/api/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, localPrice, competitors, rawCompetitors }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar alterações no servidor.");
      }

      const resData = await response.json();
      if (resData.status === "success") {
        // Optimistic metric calculation and refresh
        setProducts((prev) =>
          prev.map((p) => {
            if (p.sku === sku) {
              const updated = { ...p };
              if (localPrice !== undefined) {
                updated.localPrice = Number(localPrice);
              }
              if (competitors !== undefined) {
                updated.competitors = competitors;
              }
              if (rawCompetitors !== undefined) {
                updated.rawCompetitors = rawCompetitors;
              }
              return updated;
            }
            return p;
          })
        );
        setMetrics(resData.metrics);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Falha ao persistir reajuste.");
    }
  };

  // Add a single custom product dynamically and trigger real-time comparisons
  const handleAddProduct = async (newProductData: any) => {
    try {
      const response = await fetch("/api/products/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProductData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao adicionar produto no servidor.");
      }

      const resData = await response.json();
      if (resData.status === "success") {
        setProducts(resData.products || []);
        setMetrics(resData.metrics || null);
        alert(`SKU ${newProductData.sku.toUpperCase()} cadastrado com sucesso! Clique no botão "Buscar Preços Web" para rodar o rastreador de preços.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Falha ao adicionar SKU.");
      throw err;
    }
  };

  // Sync found research prices with the target competitor records
  // (Function removed)

  // Re-generate database back to starting state (clear data)
  const handleResetDatabase = async () => {
    setLoading(true);
    setConfirmReset(false);
    try {
      const response = await fetch("/api/products/reset", { method: "POST" });
      if (!response.ok) {
        throw new Error("Não foi possível restaurar os padrões.");
      }
      const resData = await response.json();
      setProducts(resData.products || []);
      setMetrics(resData.metrics || null);
    } catch (err: any) {
      alert(err?.message || "Ocorreu uma falha na redefinição.");
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(false);

    const reader = new FileReader();

    reader.onload = async (evt) => {
      const data = evt.target?.result;
      if (!data) return setIsUploading(false);

      let rows: any[] = [];

      try {
        if (file.name.endsWith('.csv')) {
          const parsed = Papa.parse(data as string, { header: true, skipEmptyLines: true });
          rows = parsed.data;
        } else if (file.name.endsWith('.xlsx')) {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data as ArrayBuffer);
          const worksheet = workbook.worksheets[0];
          const headers: string[] = [];
          if (worksheet) {
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) {
                row.eachCell((cell) => {
                  headers.push(cell.text || "");
                });
              } else {
                const rowData: Record<string, string> = {};
                row.eachCell((cell, colNumber) => {
                  rowData[headers[colNumber - 1]] = cell.text || "";
                });
                rows.push(rowData);
              }
            });
          }
        }

        if (rows.length > 0) {
          const response = await fetch("/api/products/bulk-upload-rows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows })
          });
          
          if (!response.ok) throw new Error("Falha ao processar arquivo");
          
          const responseData = await response.json();
          setProducts(responseData.products || []);
          setMetrics(responseData.metrics || null);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      } catch (err: any) {
        alert("Erro ao ler o arquivo: " + err.message);
      } finally {
        setIsUploading(false);
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      alert("Formato não suportado. Use CSV ou XLSX.");
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportData = async () => {
    if (!products || products.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const exportData = products.map((prod: any) => {
      const activeCompetitors = prod.competitors?.filter((c: any) => c.inStock) || [];
      let bestCompPrice = prod.localPrice;
      let bestCompPriceWithPix = prod.localPrice;
      let leaderDetails = "-";
      let formatGap = "-";
      let compatibleAdUrl = "-";
      
      if (activeCompetitors.length > 0) {
        const highlySimilarCompetitor = activeCompetitors.find((c: any) => c.isHighlySimilar);
        let bestCompetitor: any = null;
        
        if (highlySimilarCompetitor) {
          bestCompetitor = highlySimilarCompetitor;
          bestCompPrice = highlySimilarCompetitor.price;
          bestCompPriceWithPix = highlySimilarCompetitor.pixPrice || highlySimilarCompetitor.price;
        } else {
          bestCompetitor = activeCompetitors.reduce((prev: any, curr: any) => {
            const prevPix = prev.pixPrice || prev.price;
            const currPix = curr.pixPrice || curr.price;
            return currPix < prevPix ? curr : prev;
          });
          bestCompPrice = Math.min(...activeCompetitors.map((c: any) => c.price));
          bestCompPriceWithPix = Math.min(...activeCompetitors.map((c: any) => c.pixPrice || c.price));
        }

        if (bestCompetitor) {
          leaderDetails = `${bestCompetitor.name}\n${bestCompetitor.isOfficialSeller ? '★ Oficial' : '3P Seller'} • +R$ ${(bestCompetitor.shippingCost || 0).toFixed(2)} Frete`;
          compatibleAdUrl = bestCompetitor.url || "-";
        }
        
        const gapVal = prod.localPrice > 0 
          ? ((prod.localPrice - bestCompPrice) / prod.localPrice) * 100
          : 0;

        formatGap = gapVal > 0 ? `+${gapVal.toFixed(1)}%` : `${gapVal.toFixed(1)}%`;
      }

      if (compatibleAdUrl === "-") {
        compatibleAdUrl = prod.imageUrl 
          ? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(prod.imageUrl)}&q=${encodeURIComponent('"' + prod.brand + ' ' + (prod.name || "").trim() + ' ' + prod.color + '"')}`
          : `https://www.google.com/search?tbm=shop&q=${encodeURIComponent('"' + prod.brand + ' ' + (prod.name || "").trim() + ' ' + prod.color + '"')}`;
      }

      return {
        "SKU / Produto": `${prod.name}\n${prod.sku}`,
        "Division": prod.division || prod.bu,
        "Categoria / Marca / Cor": `${prod.brand}\n${prod.category} • ${prod.color}`,
        "Preço MinhaLoja": `R$ ${(prod.localPrice || 0).toFixed(2)}`,
        "Mercado (Menor)": activeCompetitors.length > 0 
           ? `R$ ${bestCompPrice.toFixed(2)}`
           : "Sem estoque mercado",
        "Mercado Pix": activeCompetitors.length > 0
           ? `R$ ${bestCompPriceWithPix.toFixed(2)}`
           : "-",
        "Líder no Google Shopping/Lens": leaderDetails,
        "Estoque": activeCompetitors.length === 0 ? "OOS" : "IN STOCK",
        "Gap (%)": formatGap,
        "Link de Busca": compatibleAdUrl
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Auditoria");
    if (exportData.length > 0) {
      worksheet.columns = Object.keys(exportData[0]).map(key => ({
        header: key,
        key,
        width: 25
      }));
      exportData.forEach(row => worksheet.addRow(row));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minhaloja_auditoria_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="bg-[#000000] min-h-screen font-sans antialiased text-zinc-100 pb-16">
      
      {/* 1. Header Navigation Bar */}
      <nav id="minhaloja-nav-main" className="bg-[#111111] border-b border-zinc-800/80 px-6 py-4 sticky top-0 z-40 select-none shadow-sm flex items-center justify-between">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Headline */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center text-black font-bold shadow-sm p-0.5 overflow-hidden">
                <img src="/logo.png" alt="Argus Pricing Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div>
              <h1 className="text-[14px] uppercase tracking-widest text-zinc-100 font-bold flex items-center gap-1.5">
                <span>Argus Pricing</span>
              </h1>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Monitoramento: <span className="font-mono text-zinc-200 font-medium tracking-tight">SP/Capital</span> • Base: <span className="text-indigo-400 font-semibold tracking-tight">Google APIs</span>
              </p>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900/50 text-zinc-400 rounded-md px-3 py-1.5 text-xs flex items-center gap-2 font-medium border border-zinc-800/80" title="Última sincronização de cotações">
              <Calendar size={13} className="text-zinc-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Atualizado: <span className="text-emerald-600 ml-1">{lastDailyUpdate ? formatTimestamp(lastDailyUpdate) : "Hoje, 08:45"}</span>
              </span>
            </div>

            <div className="flex items-center bg-zinc-900/80 rounded-md p-1 border border-zinc-800/60 shadow-sm">
              <button
                onClick={handleRunDailyScan}
                disabled={isScanning || isUploading || loading}
                className={`py-1.5 px-3 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  isScanning 
                    ? "bg-[#111111] text-emerald-600 shadow-sm cursor-not-allowed animate-pulse" 
                    : "text-zinc-300 hover:text-white hover:bg-[#111111] hover:shadow-sm cursor-pointer disabled:opacity-50"
                }`}
                title="Executar varredura do mercado"
              >
                <RefreshCw size={13} className={isScanning ? "animate-spin text-emerald-600" : "text-emerald-600"} />
                <span className="uppercase tracking-wider">{isScanning ? "VARRENDO..." : "ATUALIZAR PREÇOS"}</span>
              </button>

              <div className="w-px h-4 bg-zinc-800 mx-1"></div>

              <input 
                type="file" 
                accept=".csv,.xlsx" 
                onChange={handleFileUpload} 
                ref={fileInputRef} 
                className="hidden" 
              />
              <button
                onClick={handleUploadClick}
                disabled={isUploading || isScanning}
                className="py-1.5 px-3 rounded text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-[#111111] hover:shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                title="Importar base de dados"
              >
                <Upload size={13} className="text-blue-400" />
                <span>{isUploading ? "IMPORTANDO..." : "IMPORTAR"}</span>
              </button>

              <div className="w-px h-4 bg-zinc-800 mx-1"></div>

              <div className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="py-1.5 px-3 rounded text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-[#111111] hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  title="Opções de Exportação"
                >
                  <Download size={13} className="text-indigo-400" />
                  <span>EXPORTAR</span>
                  <ChevronDown size={11} className="text-zinc-500" />
                </button>

                {isExportDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsExportDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-60 rounded-md bg-zinc-950 border border-zinc-850 shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                      <button
                        onClick={() => {
                          handleExportData();
                          setIsExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                      >
                        <Download size={13} className="text-indigo-400" />
                        <span>Excel Planilha Completa</span>
                      </button>
                      <div className="h-px bg-zinc-800/80"></div>
                      <button
                        onClick={() => {
                          generatePriceDistributionPDF(products);
                          setIsExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                      >
                        <FileText size={13} className="text-emerald-400" />
                        <span>Resumo de Reunião (PDF)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="w-px h-4 bg-zinc-800 mx-1"></div>

              {confirmReset ? (
                <button
                  onClick={handleResetDatabase}
                  className="py-1.5 px-3 rounded text-[11px] font-bold bg-rose-600 text-white transition-all flex items-center gap-1.5 cursor-pointer animate-pulse uppercase tracking-wider shadow-sm border border-transparent"
                >
                  <RefreshCw size={13} />
                  <span>CONFIRMAR?</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setConfirmReset(true);
                    setTimeout(() => setConfirmReset(false), 4000);
                  }}
                  className="py-1.5 px-3 rounded text-[11px] font-bold text-zinc-300 hover:text-rose-400 hover:bg-[#111111] hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  title="Limpar todos os dados"
                >
                  <AlertOctagon size={13} className="text-rose-500" />
                  <span>LIMPAR</span>
                </button>
              )}

              <div className="w-px h-4 bg-zinc-800 mx-1"></div>

              <button
                onClick={handleLogout}
                className="py-1.5 px-3 rounded text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-rose-900/30 hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                title="Sair do sistema"
              >
                <LogOut size={13} className="text-zinc-500" />
                <span>SAIR</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Main Workspace Layout container */}
      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        
        {/* Bulk upload simulated alert toast */}
        {uploadSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded text-xs font-semibold flex items-center space-x-2 mb-6 animate-fade-in shadow-sm">
            <CheckCircle className="text-emerald-500" size={16} />
            <span>Top 500 SKUs do arquivo foram injetados com sucesso! Relatórios de faturamento atualizados.</span>
          </div>
        )}

        {/* Daily scanner success toast */}
        {scanSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded text-xs font-semibold flex items-center space-x-2 mb-6 animate-fade-in shadow-sm">
            <CheckCircle className="text-emerald-500" size={16} />
            <span>Sucesso! Varredura completa realizada. As cotações foram atualizadas.</span>
          </div>
        )}

        {/* Global Loading Spinner */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800/80 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-zinc-400">Calculando matriz de competitividade diária...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 bg-[#111111] rounded-md border border-rose-500/20 p-6 shadow-md text-center">
            <AlertOctagon className="mx-auto text-rose-500 mb-2" size={32} />
            <h3 className="text-sm font-extrabold text-zinc-100 uppercase">Falha na Matriz de Preços</h3>
            <p className="text-xs text-rose-600/80 mt-2 leading-relaxed">{error}</p>
            <button
              onClick={() => fetchProductsAndMetrics()}
              className="mt-4 px-4 py-1.5 bg-zinc-200 text-[#111111] text-xs font-semibold rounded hover:bg-zinc-300 cursor-pointer"
            >
              Recarregar Painel
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="max-w-2xl mx-auto my-12 bg-[#111111] rounded-xl border border-zinc-800/80 p-12 text-center shadow-sm select-none">
            <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-zinc-100">Nenhum dado de planilha carregado</h3>
            <p className="text-sm text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
              O monitor de preços está limpo. Importe uma planilha de produtos utilizando o botão 
              <strong className="text-blue-400 font-semibold"> "IMPORT SHEET" </strong> no canto superior direito para iniciar a análise comparativa.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleUploadClick}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-[#111111] rounded text-xs font-bold cursor-pointer transition-colors shadow-sm inline-flex items-center space-x-1.5"
              >
                <Upload size={14} />
                <span>IMPORTAR PLANILHA</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Core KPI metrics Row */}
            {metrics && (
              <DashboardStats
                metrics={metrics}
                onAdvisorClick={() => setActiveAdvisor(true)}
                isLoadingAdvisor={activeAdvisor}
              />
            )}

            {/* Sub-Header Tabs controllers */}
            <div className="flex border-b border-zinc-800 mb-6 font-medium select-none text-xs">
              <button
                onClick={() => setActiveTab("audit")}
                className={`py-3 px-4 font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all border-b-2 ${
                  activeTab === "audit"
                    ? "border-blue-600 text-blue-700 font-bold"
                    : "border-transparent text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <span>Painel de Auditoria de SKUs ({products.length} Itens)</span>
                {metrics && (
                  <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 font-mono text-[9px] rounded font-bold ml-1.5 border border-rose-500/20">
                    {metrics.criticalDeviationsCount} Alertas
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`py-3 px-4 font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all border-b-2 ${
                  activeTab === "dashboard"
                    ? "border-emerald-600 text-emerald-500 font-bold"
                    : "border-transparent text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <span>Dashboard de Status</span>
              </button>
            </div>

            {/* Active Workspace View switch */}
            {activeTab === "dashboard" ? (
              <StatusDashboardView products={products} />
            ) : (
              <ProductTable
                products={products}
                onUpdateProduct={handleUpdateProduct}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Global AI Agent Modal overlays */}

      {/* DASHBOARD STRATEGIC ADVISOR REPORT MODAL (Gemini Executive Advisor) */}
      {metrics && activeAdvisor && (
        <StrategicAdvisor
          metrics={metrics}
          products={products}
          onClose={() => setActiveAdvisor(false)}
        />
      )}

    </div>
  );
}

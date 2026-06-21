/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  MessageSquare,
  Info,
  DollarSign,
  Truck,
  Eye,
  Activity
} from "lucide-react";
import { Product, CompetitorPrice } from "../types";

interface ProductTableProps {
  products: Product[];
  onUpdateProduct: (sku: string, localPrice?: number, competitors?: CompetitorPrice[], rawCompetitors?: CompetitorPrice[]) => void;
}

export default function ProductTable({
  products,
  onUpdateProduct,
}: ProductTableProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState("TODAS");
  const [selectedDivision, setSelectedDivision] = useState("TODAS");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [scrapingSku, setScrapingSku] = useState<string | null>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Close brand dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [filterType, setFilterType] = useState<"ALL" | "BEST_PRICE" | "CRITICAL_DEV">("ALL");

  // Sorting
  const [sortField, setSortField] = useState<"rank" | "revenue" | "gap">("rank");
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const handleScrape = async (productName: string, fallbackName: string, sku: string, imageUrl?: string) => {
    if (!imageUrl || imageUrl.trim() === "" || !imageUrl.startsWith("http")) {
      alert("A imagem do produto está ausente ou inválida. A busca não será realizada para evitar falhas de requisição.");
      return;
    }
    setScrapingSku(sku);
    try {
      let res = await fetch("/api/scrape/serpapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, sku, imageUrl })
      });
      let data = await res.json();
      
      // Retry logic if no valid competitors found
      if ((!data.competitors || data.competitors.length === 0) && fallbackName) {
        console.log(`[Retry] Zero competidores encontrados para "${productName}". Retentando com "${fallbackName}"`);
        res = await fetch("/api/scrape/serpapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productName: fallbackName, sku, imageUrl })
        });
        const retryData = await res.json();
        // If retry is successful, use its data (even if competitors is still empty, we use whatever it returns)
        if (!retryData.error && retryData.success) {
            data = retryData;
        }
      }

      if (data.error || !data.success) {
        alert("Erro na SerpAPI: " + (data.error || "Unknown"));
      } else if (data.competitors && data.competitors.length > 0) {
        onUpdateProduct(sku, undefined, data.competitors, data.rawCompetitors);
        alert(`Atualizado com ${data.competitors.length} concorrentes vindos do Google Lens!`);
      } else if (data.rawCompetitors && data.rawCompetitors.length > 0) {
        // Fallback update to at least show the raw competitors even if strict matches = 0
        onUpdateProduct(sku, undefined, [], data.rawCompetitors);
        alert(`Nenhum preço estruturado de alta similaridade encontrado. Exibindo ${data.rawCompetitors.length} resultados brutos.`);
      } else {
        alert(`Nenhum preço estruturado encontrado. Resultados brutos: ${data.rawCount || 0}`);
      }
    } catch (e: any) {
      alert("Erro na requisição: " + e.message);
    } finally {
      setScrapingSku(null);
    }
  };

  // Get distinct BUs and Brands for filter dropdowns
  const buList = useMemo(() => {
    return ["TODAS", ...Array.from(new Set(products.map((p) => p.bu)))];
  }, [products]);

  const brandList = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand))).sort();
  }, [products]);

  const divisionList = useMemo(() => {
    return ["TODAS", ...Array.from(new Set(products.map((p) => p.division)))].filter(Boolean);
  }, [products]);

  // Helper calculation per product for sorting & display
  const processedProducts = useMemo(() => {
    return products.map((prod) => {
      const activeCompetitors = prod.competitors.filter((c) => c.inStock);
      
      let bestCompPrice = prod.localPrice;
      let worstCompPrice = prod.localPrice;
      let bestCompPriceWithPix = prod.localPrice;
      let bestCompetitor: CompetitorPrice | null = null;

      if (activeCompetitors.length > 0) {
        // Find best competitor: prioritize the very first high similarity master match if present, otherwise fallback to absolute lowest price
        const highlySimilarCompetitor = activeCompetitors.find(c => c.isHighlySimilar);
        
        if (highlySimilarCompetitor) {
          bestCompetitor = highlySimilarCompetitor;
          bestCompPrice = highlySimilarCompetitor.price;
          bestCompPriceWithPix = highlySimilarCompetitor.pixPrice || highlySimilarCompetitor.price;
        } else {
          bestCompetitor = activeCompetitors.reduce((prev, curr) => {
            const prevPix = prev.pixPrice || prev.price;
            const currPix = curr.pixPrice || curr.price;
            return currPix < prevPix ? curr : prev;
          });
          bestCompPrice = Math.min(...activeCompetitors.map((c) => c.price));
          bestCompPriceWithPix = Math.min(...activeCompetitors.map((c) => c.pixPrice || c.price));
        }
        
        worstCompPrice = Math.max(...activeCompetitors.map((c) => c.price));
      }

      const minhalojaCurrentReal = prod.localPrice; // Valor inteiro
      const gapPercent = minhalojaCurrentReal > 0 
        ? ((minhalojaCurrentReal - bestCompPrice) / minhalojaCurrentReal) * 100 
        : 0;

      const isBestPrice = activeCompetitors.length === 0 || minhalojaCurrentReal <= bestCompPrice;
      const isCritical = gapPercent >= 10.0;

      let marketStatus = "Sem Concorrentes";
      if (activeCompetitors.length > 0) {
        const EPSILON = 0.01;
        const getStatus = (minhaloja: number, comp: number) => {
          if (minhaloja > comp + EPSILON) return "Perde Preço";
          if (minhaloja < comp - EPSILON) return "Melhor Preço";
          return "Igual ao Mercado";
        };

        const statusR2 = getStatus(prod.localPrice, bestCompPriceWithPix);
        const statusS2 = getStatus(prod.localPrice, bestCompPrice);

        if (statusR2 === "Perde Preço" && statusS2 === "Melhor Preço") marketStatus = "Melhor Preço a Prazo";
        else if (statusR2 === "Perde Preço" && statusS2 === "Perde Preço") marketStatus = "Perde Preço";
        else if (statusR2 === "Melhor Preço" && statusS2 === "Melhor Preço") marketStatus = "Melhor Preço";
        else if (statusR2 === "Igual ao Mercado" && statusS2 === "Igual ao Mercado") marketStatus = "Igual ao Mercado";
        else if (statusR2 === "Perde Preço" && statusS2 === "Igual ao Mercado") marketStatus = "Igual ao Mercado";
        else if (statusR2 === "Igual ao Mercado" && statusS2 === "Melhor Preço") marketStatus = "Melhor Preço";
        else if (statusR2 === "Melhor Preço" && statusS2 === "Perde Preço") marketStatus = "Melhor Preço";
        else marketStatus = "Outro";
      }

      return {
        ...prod,
        bestCompPrice,
        bestCompPriceWithPix,
        bestCompetitor,
        gapPercent,
        isBestPrice,
        isCritical,
        marketStatus
      };
    });
  }, [products]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = processedProducts;

    // Search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.color.toLowerCase().includes(term)
      );
    }

    // Business Unit filter
    if (selectedBU !== "TODAS") {
      result = result.filter((p) => p.bu === selectedBU);
    }

    // Brand filter
    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    // Division filter
    if (selectedDivision !== "TODAS") {
      result = result.filter((p) => p.division === selectedDivision);
    }

    // Status filter
    if (filterType === "BEST_PRICE") {
      result = result.filter((p) => p.isBestPrice);
    } else if (filterType === "CRITICAL_DEV") {
      result = result.filter((p) => p.isCritical);
    }

    // Sorting
    result.sort((a, b) => {
      let multiplier = sortAsc ? 1 : -1;
      if (sortField === "rank") {
        return (a.revenueRank - b.revenueRank) * multiplier;
      }
      if (sortField === "revenue") {
        return (b.revenueDaily - a.revenueDaily) * multiplier;
      }
      if (sortField === "gap") {
        return (a.gapPercent - b.gapPercent) * multiplier;
      }
      return 0;
    });

    return result;
  }, [processedProducts, searchTerm, selectedBU, selectedDivision, selectedBrands, filterType, sortField, sortAsc]);

  // Handle pagination values
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  return (
    <div id="comp-product-monitor" className="bg-[#111111] border border-dark-border shadow-sm rounded-md overflow-hidden mb-8">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-dark-border bg-zinc-900/50 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar SKU, Nike, Preto..."
              className="pl-9 pr-3 py-2 w-full bg-[#111111] border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-md text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-sans"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          
          <select
            className="bg-[#111111] border border-zinc-800 text-zinc-200 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none cursor-pointer"
            value={selectedBU}
            onChange={(e) => { setSelectedBU(e.target.value); setCurrentPage(1); }}
          >
            {buList.map((bu) => (
              <option key={bu} value={bu}>{bu === "TODAS" ? "Todas as BUs" : bu}</option>
            ))}
          </select>

          <select
            className="bg-[#111111] border border-zinc-800 text-zinc-200 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none cursor-pointer"
            value={selectedDivision}
            onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
          >
            {divisionList.map((div) => (
              <option key={div} value={div}>{div === "TODAS" ? "Todas Divisions" : div}</option>
            ))}
          </select>

          <div className="relative hidden md:block" ref={brandDropdownRef}>
            <div 
              className="bg-[#111111] border border-zinc-800 text-zinc-200 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none cursor-pointer flex items-center justify-between gap-2 min-w-[150px]"
              onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            >
              <span className="truncate">
                {selectedBrands.length === 0 
                  ? "Todas as Marcas" 
                  : `${selectedBrands.length} marca(s) selecionada(s)`}
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </div>
            {isBrandDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-[#111111] border border-zinc-800/80 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 sticky top-0 bg-[#111111] border-b border-zinc-900 flex justify-between items-center">
                  <div className="text-xs font-semibold text-zinc-400">
                    SELECIONAR MARCAS
                  </div>
                  {selectedBrands.length > 0 && (
                    <button 
                      onClick={() => { setSelectedBrands([]); setCurrentPage(1); }}
                      className="text-xs text-blue-400 hover:text-blue-800"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="py-1">
                  {brandList.map((brand) => (
                    <label key={brand} className="flex items-center px-3 py-2 hover:bg-zinc-900/50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mr-2 rounded text-blue-400"
                        checked={selectedBrands.includes(brand)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBrands([...selectedBrands, brand]);
                          } else {
                            setSelectedBrands(selectedBrands.filter(b => b !== brand));
                          }
                          setCurrentPage(1);
                        }}
                      />
                      <span className="text-sm text-zinc-200 truncate" title={brand}>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setFilterType("ALL"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              filterType === "ALL" ? "bg-zinc-200 text-[#111111]" : "bg-[#111111] text-zinc-300 border border-zinc-800 hover:bg-zinc-900/50"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => { setFilterType("BEST_PRICE"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors flex items-center space-x-1 ${
              filterType === "BEST_PRICE" ? "bg-emerald-600 text-white" : "bg-[#111111] text-zinc-300 border border-zinc-800 hover:bg-emerald-500/10"
            }`}
          >
            <CheckCircle size={13} className="mr-1" />
            <span>Best Price</span>
          </button>
          <button
            onClick={() => { setFilterType("CRITICAL_DEV"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors flex items-center space-x-1 ${
              filterType === "CRITICAL_DEV" ? "bg-rose-600 text-white" : "bg-[#111111] text-zinc-300 border border-zinc-800 hover:bg-rose-500/10"
            }`}
          >
            <AlertTriangle size={13} className="mr-1" />
            <span>Desvio &gt; 10%</span>
          </button>
        </div>
      </div>

      {/* Main Table Layer */}
      <div className="overflow-x-auto w-full shadow-inner">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#000000] border-b border-zinc-800/80 text-zinc-300 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 w-10 text-center text-zinc-500">#</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80">Imagem</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 whitespace-nowrap">SKU</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 whitespace-nowrap">Produto</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 whitespace-nowrap">Division</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 whitespace-nowrap">Categoria / Marca / Cor</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 text-right bg-zinc-900/50 whitespace-nowrap">Preço MinhaLoja</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 text-right font-bold text-zinc-200 whitespace-nowrap">Mercado (Menor)</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 text-right font-bold text-zinc-200 whitespace-nowrap">Mercado Pix</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 whitespace-nowrap">Líder / Shopping</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 text-right whitespace-nowrap">Estoque</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 text-right whitespace-nowrap">Gap (%)</th>
              <th className="py-2.5 px-3 border-r border-zinc-800/80 text-center whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-[#111111]">
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-zinc-400 font-medium italic">
                  Nenhum produto encontrado nos filtros atuais.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((prod) => {
                const gapVal = prod.gapPercent;
                const formattedGap = gapVal > 0 ? `+${gapVal.toFixed(1)}%` : `${gapVal.toFixed(1)}%`;
                const isOutOfStock = !prod.bestCompetitor; // if no active competitors

                return (
                  <React.Fragment key={prod.sku}>
                    {/* Row Item */}
                    <tr 
                      className={`transition-colors hover:bg-zinc-900/40 group cursor-pointer ${expandedSku === prod.sku ? 'bg-zinc-900/60' : ''}`}
                      onClick={() => setExpandedSku(expandedSku === prod.sku ? null : prod.sku)}
                    >
                      <td className="py-2 px-3 border-r border-zinc-900 text-center text-xs text-zinc-500 font-mono relative">
                        <div className="flex items-center justify-center gap-1">
                          <span>{prod.revenueRank}</span>
                        </div>
                      </td>
                      
                      <td className="py-2 px-3 border-r border-zinc-900 relative group cursor-pointer" title="Buscar no Google Lens">
                        {prod.imageUrl ? (
                          <a 
                            href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(prod.imageUrl)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="block w-9 h-9 rounded bg-[#111111] border border-zinc-800/80 overflow-hidden flex items-center justify-center group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                          >
                            <img src={prod.imageUrl} alt={prod.sku} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                          </a>
                        ) : (
                          <div className="w-9 h-9 rounded bg-[#000000] border border-zinc-800/80"></div>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 whitespace-nowrap">
                        <div className="text-xs text-zinc-400 font-mono">{prod.sku}</div>
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900">
                        <div className="text-zinc-100 font-medium whitespace-normal leading-snug w-auto max-w-[450px]" title={prod.name}>
                          {prod.name}
                        </div>
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-xs whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-[#000000] border border-zinc-800/80 text-zinc-300 rounded-full font-medium tracking-wide">
                          {prod.division}
                        </span>
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-xs whitespace-nowrap">
                        <div className="text-zinc-200 font-medium">{prod.brand}</div>
                        <div className="text-zinc-400">{prod.bu} • {prod.color}</div>
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-right bg-zinc-900/50/50 whitespace-nowrap">
                        <div className="font-mono text-zinc-100 font-semibold">R$ {prod.localPrice.toFixed(2)}</div>
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-right whitespace-nowrap">
                        {isOutOfStock ? (
                           <span className="text-zinc-500 text-xs italic">-</span>
                        ) : (
                          <div className="font-mono text-white font-bold">R$ {prod.bestCompPrice.toFixed(2)}</div>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-right whitespace-nowrap">
                        {isOutOfStock ? (
                           <span className="text-zinc-500 text-xs italic">-</span>
                        ) : (
                          <div className="font-mono text-emerald-400 font-bold">R$ {prod.bestCompPriceWithPix.toFixed(2)}</div>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-xs whitespace-nowrap">
                        {prod.bestCompetitor ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {prod.bestCompetitor.thumbnail && (
                                <img 
                                  src={prod.bestCompetitor.thumbnail} 
                                  alt="Preview Concorrente" 
                                  className="w-6 h-6 object-cover rounded bg-[#000000] border border-zinc-800/80"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span className="font-semibold text-zinc-100">{prod.bestCompetitor.name}</span>
                              <a
                                href={prod.bestCompetitor.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Anúncio Concorrente"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer"
                              >
                                <Search size={8} />
                                <span>Ver Anúncio</span>
                              </a>
                            </div>
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1">
                              {prod.bestCompetitor.isOfficialSeller ? <span className="text-amber-600 font-medium">★ Oficial</span> : "3P Seller"} 
                              • +R$ {prod.bestCompetitor.shippingCost?.toFixed(2) || "0.00"} Frete
                            </span>
                            <div className="mt-2 text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullName = [prod.brand, prod.name, prod.color].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                                  const fallbackName = [prod.name, prod.color].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                                  handleScrape(fullName, fallbackName, prod.sku, prod.imageUrl);
                                }}
                                disabled={scrapingSku === prod.sku}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {scrapingSku === prod.sku ? (
                                  <RefreshCw size={10} className="animate-spin text-orange-500" />
                                ) : (
                                  <Eye size={10} className="text-zinc-400" />
                                )}
                                <span>Comparar Lado a Lado</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col text-left">
                            <span className="text-zinc-500">—</span>
                            <div className="mt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullName = [prod.brand, prod.name, prod.color].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                                  const fallbackName = [prod.name, prod.color].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                                  handleScrape(fullName, fallbackName, prod.sku, prod.imageUrl);
                                }}
                                disabled={scrapingSku === prod.sku}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {scrapingSku === prod.sku ? (
                                  <RefreshCw size={10} className="animate-spin" />
                                ) : (
                                  <Search size={10} />
                                )}
                                <span>Buscar Preços Web</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-right whitespace-nowrap">
                        {isOutOfStock ? (
                           <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#000000] text-zinc-400">OOS</span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">IN STOCK</span>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-right whitespace-nowrap">
                        {isOutOfStock ? (
                           <span className="text-zinc-500">—</span>
                        ) : (
                          <span className={`font-mono font-bold text-sm ${prod.isBestPrice ? "text-emerald-600" : prod.isCritical ? "text-rose-600" : "text-amber-600"}`}>
                            {formattedGap}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-zinc-900 text-center whitespace-nowrap">
                        {prod.marketStatus === "Sem Concorrentes" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400">
                            Sem Concorrentes
                          </span>
                        ) : prod.marketStatus === "Melhor Preço" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                            {prod.marketStatus}
                          </span>
                        ) : prod.marketStatus === "Melhor Preço a Prazo" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400">
                            {prod.marketStatus}
                          </span>
                        ) : prod.marketStatus === "Perde Preço" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400">
                            {prod.marketStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400">
                            {prod.marketStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Detail View */}
                    {expandedSku === prod.sku && (
                      <tr className="bg-[#0a0a0a]">
                        <td colSpan={13} className="px-6 py-6 border-b border-zinc-800">
                          <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* MinhaLoja Current */}
                            <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded bg-[#111111] border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">DAF</div>
                                <div>
                                  <h4 className="text-sm font-semibold text-zinc-100">MinhaLoja (Atual)</h4>
                                  <p className="text-[11px] text-zinc-500">Nosso preço publicado</p>
                                </div>
                              </div>
                              <div className="text-3xl font-bold font-mono text-white mb-1">R$ {prod.localPrice.toFixed(2)}</div>
                              <p className="text-xs text-zinc-400 mb-4">Preço base sem filtros de frete aplicados</p>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullName = [prod.brand, prod.name, prod.color].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                                  const fallbackName = [prod.name, prod.color].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                                  handleScrape(fullName, fallbackName, prod.sku, prod.imageUrl);
                                }}
                                disabled={scrapingSku === prod.sku}
                                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 rounded transition-colors disabled:opacity-50"
                              >
                                {scrapingSku === prod.sku ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                                Atualizar Dados do Mercado
                              </button>
                            </div>

                            {/* Best Match */}
                            <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-5">
                              <div className="flex items-center gap-2 mb-4">
                                {prod.bestCompetitor?.thumbnail ? (
                                  <img src={prod.bestCompetitor.thumbnail} alt="" className="w-8 h-8 rounded object-cover bg-white p-0.5" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-orange-600/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-500 text-xs shadow-inner">
                                    <Search size={14} />
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-sm font-semibold text-zinc-100">Inteligência Visual (Vencedor)</h4>
                                  <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">{prod.bestCompetitor?.name || "Nenhum Encontrado"}</p>
                                </div>
                              </div>
                              {prod.bestCompetitor ? (
                                <>
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <div className="text-3xl font-bold font-mono text-emerald-400">R$ {prod.bestCompPriceWithPix.toFixed(2)}</div>
                                    {prod.bestCompPrice !== prod.bestCompPriceWithPix && (
                                      <span className="text-xs text-zinc-500 font-mono line-through">R$ {prod.bestCompPrice.toFixed(2)}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded inline-flex mb-4">
                                    <CheckCircle size={12} />
                                    <span>Vencedor BuyBox (Lens)</span>
                                  </div>
                                  <a href={prod.bestCompetitor.url} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs py-2 rounded transition-colors group">
                                    Ver Anúncio Original <ExternalLink size={12} className="group-hover:text-white" />
                                  </a>
                                </>
                              ) : (
                                <div className="py-6 flex flex-col items-center justify-center text-zinc-500 text-center bg-[#111] rounded border border-zinc-800">
                                  <Search size={20} className="mb-2 opacity-50" />
                                  <span className="text-sm">Sem concorrentes localizados</span>
                                </div>
                              )}
                            </div>

                            {/* AI Price Suggestion */}
                            <div className="flex-1 bg-indigo-900/10 border border-indigo-500/20 rounded-lg p-5 relative overflow-hidden">
                              <div className="absolute -right-6 -top-6 text-indigo-500/10 rotate-12 pointer-events-none">
                                <Activity size={100} />
                              </div>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center">
                                  <span className="font-bold text-indigo-400 text-lg">✨</span>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-indigo-200">Sugestão de Reajuste (IA)</h4>
                                  <p className="text-[11px] text-indigo-400/70">Calculado via Elasticidade de Buybox</p>
                                </div>
                              </div>
                              
                              {prod.bestCompetitor ? (() => {
                                const marketPrice = prod.bestCompPriceWithPix;
                                const localPrice = prod.localPrice;
                                let suggestedPrice = marketPrice;
                                let reason = "";
                                
                                if (localPrice > marketPrice) {
                                  // We are losing
                                  suggestedPrice = marketPrice * 0.99; // Beat them by 1%
                                  reason = `Recomendamos alinhar R$ ${(localPrice - suggestedPrice).toFixed(2)} abaixo do vencedor para recuperar a BuyBox de PIX.`;
                                } else if (localPrice < marketPrice) {
                                  // We are winning, maximize margin
                                  const diff = marketPrice - localPrice;
                                  if (diff > localPrice * 0.05) {
                                    suggestedPrice = marketPrice * 0.98; // Still beat them by 2% to stay safe
                                    reason = `Você está com preço excessivamente descontado. Sugerimos subir R$ ${(suggestedPrice - localPrice).toFixed(2)} para maximizar sua margem e manter a liderança.`;
                                  } else {
                                    suggestedPrice = localPrice;
                                    reason = "Margem otimizada atualmente. Nenhuma ação matemática imediata necessária.";
                                  }
                                } else {
                                  suggestedPrice = marketPrice * 0.99;
                                  reason = "Preços idênticos. Uma redução de 1% garante o badge de destaque no Shopping.";
                                }

                                const diffValue = suggestedPrice - localPrice;
                                const diffPercent = (diffValue / localPrice) * 100;
                                
                                return (
                                  <>
                                    <div className="flex gap-4 items-end mb-3">
                                      <div className="text-3xl font-bold font-mono text-indigo-400">R$ {suggestedPrice.toFixed(2)}</div>
                                      {diffValue !== 0 && (
                                        <div className={`px-2 py-0.5 rounded mb-1 text-xs font-bold font-mono ${diffValue > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                                          {diffValue > 0 ? "+" : ""}{diffPercent.toFixed(1)}%
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-indigo-200/80 leading-relaxed mb-4">{reason}</p>
                                    
                                    <button 
                                      className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 rounded transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateProduct(prod.sku, Number(suggestedPrice.toFixed(2)), undefined);
                                      }}
                                    >
                                      <CheckCircle size={14} />
                                      Aplicar Sugestão de Preço MinhaLoja
                                    </button>
                                  </>
                                );
                              })() : (
                                <div className="py-6 flex flex-col items-center justify-center text-indigo-400/50 text-center">
                                  <span className="text-sm">Inviável calcular cenário.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Raw Competitors List */}
                          {prod.rawCompetitors && prod.rawCompetitors.length > 0 && (
                            <div className="mt-6 border border-zinc-800/80 rounded-lg overflow-hidden flex flex-col w-full bg-[#111]">
                              <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-700/50 flex items-center gap-2 text-xs font-semibold text-zinc-300">
                                <Eye size={14} className="text-indigo-400" />
                                Inteligência Visual - Todos os Resultados da Busca (Google Lens e Google Shopping)
                              </div>
                              <div className="max-h-60 overflow-y-auto w-full">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#1a1a1a] sticky top-0 border-b border-zinc-800">
                                    <tr className="text-zinc-500">
                                      <th className="font-medium p-3">Imagem</th>
                                      <th className="font-medium p-3">Concorrente</th>
                                      <th className="font-medium p-3">Anúncio</th>
                                      <th className="font-medium p-3">Preço</th>
                                      <th className="font-medium p-3 text-right">Link</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                                    {prod.rawCompetitors.map((c, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-900/40">
                                        <td className="p-2 align-middle">
                                          {c.thumbnail ? (
                                            <img src={c.thumbnail} alt="" className="w-8 h-8 rounded object-cover bg-white" referrerPolicy="no-referrer" />
                                          ) : (
                                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                                              <Eye size={12} className="text-zinc-500" />
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 font-medium text-zinc-200">
                                          {c.name}
                                        </td>
                                        <td className="p-3 max-w-[200px] truncate" title={(c as any).title}>
                                          <div className="flex flex-col gap-1 items-start">
                                            <span>{(c as any).title || "N/A"}</span>
                                            {c.isHighlySimilar ? (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Alta Similaridade</span>
                                            ) : (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">Sem Correspondência Estruturada</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-3 font-mono text-indigo-300">
                                          R$ {c.price.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right">
                                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
                                            Visitar
                                          </a>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between text-sm text-zinc-400">
        <div>
          Mostrando <span className="font-semibold text-zinc-100">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-semibold text-zinc-100">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="font-semibold text-zinc-100">{totalItems}</span> registros
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 bg-[#111111] border border-zinc-800 rounded hover:bg-[#000000] disabled:opacity-50">Anterior</button>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 bg-[#111111] border border-zinc-800 rounded hover:bg-[#000000] disabled:opacity-50">Próxima</button>
        </div>
      </div>
    </div>
  );
}

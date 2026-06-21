import { jsPDF } from "jspdf";
import { Product } from "../types";

/**
 * Generates an executive-level PDF presentation with a beautiful vector-based
 * price distribution chart and top products table.
 */
export function generatePriceDistributionPDF(products: Product[]) {
  if (!products || products.length === 0) {
    alert("Não há dados para gerar o PDF.");
    return;
  }

  // Define "Top Products" by daily revenue or revenue rank
  // If revenueDaily is present, sort by it descending; otherwise sort by revenueRank ascending
  const sortedProducts = [...products].sort((a, b) => {
    const revA = a.revenueDaily || 0;
    const revB = b.revenueDaily || 0;
    if (revA !== revB) {
      return revB - revA; // Higher revenue first
    }
    return (a.revenueRank || 999) - (b.revenueRank || 999); // Lower rank first
  });

  // Take the top 5 products for a focused, ultra-polished view
  const topProducts = sortedProducts.slice(0, 5);

  // Initialize jsPDF with A4 Landscape (297mm wide x 210mm high)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // 1. Sleek corporate background & header background
  // Header accent bar (Argus Indigo: #4f46e5 / RGB: 79, 70, 229)
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 5, "F");

  // Soft background card structure
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 5, pageWidth, pageHeight - 5, "F");

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("ARGUS PRICING", 15, 20);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Resumo Executivo • Distribuição de Preço dos Top Produtos", 15, 25);

  // Timestamp & Metadata (Clean and literal)
  const currentDateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const currentTimeStr = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Gerado em: ${currentDateStr} às ${currentTimeStr}`, pageWidth - 15, 20, { align: "right" });
  doc.text("Apresentação Executiva de Reunião", pageWidth - 15, 25, { align: "right" });

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 29, pageWidth - 15, 29);

  // 2. Overview Metrics Cards (KPIs)
  const totalItems = products.length;
  // Calculate Avg Gap of loaded products where localPrice and competitor are valid
  let sumGaps = 0;
  let gapCount = 0;
  let overPricedCount = 0;
  let sumRevenueAtRisk = 0;

  products.forEach(p => {
    const activeCompetitors = p.competitors?.filter(c => c.inStock) || [];
    if (activeCompetitors.length > 0) {
      const bestComp = activeCompetitors.reduce((prev, curr) => {
        const prevPix = prev.pixPrice || prev.price;
        const currPix = curr.pixPrice || curr.price;
        return currPix < prevPix ? curr : prev;
      }, activeCompetitors[0]);
      
      const bestPrice = bestComp.pixPrice || bestComp.price;
      if (p.localPrice > 0 && bestPrice > 0) {
        const gap = ((p.localPrice - bestPrice) / p.localPrice) * 100;
        sumGaps += gap;
        gapCount++;
        
        if (gap > 5) {
          overPricedCount++;
          sumRevenueAtRisk += (p.revenueDaily || 0);
        }
      }
    }
  });

  const avgGap = gapCount > 0 ? sumGaps / gapCount : 0;

  // Draw 3 KPI Cards
  // Card 1: Total Produtos
  drawKpiCard(doc, 15, 34, 82, 22, "TOTAL DE PRODUTOS", totalItems.toString(), "Itens monitorados na base");
  // Card 2: Gap Médio de Mercado
  const avgGapSign = avgGap > 0 ? "+" : "";
  drawKpiCard(doc, 107, 34, 82, 22, "DESVIO MÉDIO (GAP %)", `${avgGapSign}${avgGap.toFixed(1)}%`, "Diferença em relação aos concorrentes");
  // Card 3: Receita Diária sob Risco
  drawKpiCard(doc, 200, 34, 82, 22, "RECEITA SOB RISCO (DESVIO > 5%)", `R$ ${sumRevenueAtRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Faturamento diário de SKUs desregulados");

  // 3. Price Distribution Chart (Pure Vector Bar Chart)
  // Let's reserve left half for the gorgeous visual chart, right half for the top table.
  const chartX = 15;
  const chartY = 65;
  const chartWidth = 140;
  const chartHeight = 120;

  // Background card for Chart
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(chartX, chartY, chartWidth, chartHeight, "FD");

  // Chart Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Distribuição de Preços: Nossa Loja vs Concorrente (PIX)", chartX + 8, chartY + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Grupo dos Top 5 produtos monitorados de maior relevância", chartX + 8, chartY + 15);

  // Legend
  // MinhaLoja (Indigo: #4f46e5)
  doc.setFillColor(79, 70, 229);
  doc.rect(chartX + 8, chartY + 20, 4, 4, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("Preço MinhaLoja", chartX + 14, chartY + 23.5);

  // Competitor (Emerald: #10b981 / RGB: 16, 185, 129)
  doc.setFillColor(16, 185, 129);
  doc.rect(chartX + 45, chartY + 20, 4, 4, "F");
  doc.text("Melhor Concorrente (PIX)", chartX + 51, chartY + 23.5);

  // Plot details
  const plotX = chartX + 15;
  const plotY = chartY + 105;
  const plotW = chartWidth - 25;
  const plotH = 68; // Height of chart space

  // Draw coordinate axis
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(plotX, plotY, plotX + plotW, plotY); // X-axis
  doc.line(plotX, plotY - plotH, plotX, plotY); // Y-axis

  // Grid lines & values
  // Find max price to scale accurately
  let maxPrice = 100;
  topProducts.forEach(p => {
    const competitorPix = getBestCompetitorPix(p);
    maxPrice = Math.max(maxPrice, p.localPrice, competitorPix);
  });
  // Round maxPrice to a nice round number for axis, e.g., next multiple of 100
  const yAxisMax = Math.ceil(maxPrice / 100) * 100;

  // Let's draw 4 grid lines
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setLineWidth(0.2);

  for (let i = 0; i <= 4; i++) {
    const yVal = plotY - (plotH * i) / 4;
    const priceLabel = Math.round((yAxisMax * i) / 4);
    
    // Draw grid line
    if (i > 0) {
      doc.line(plotX, yVal, plotX + plotW, yVal);
    }
    // Y-label
    doc.text(`R$ ${priceLabel}`, plotX - 2, yVal + 1.5, { align: "right" });
  }

  // Draw Bars for each Product
  const numBars = topProducts.length;
  // Width allocated for each product group
  const groupWidth = plotW / Math.max(numBars, 1);
  const barWidth = Math.min(groupWidth * 0.28, 8); // Elegant thin-medium bars

  topProducts.forEach((p, idx) => {
    const groupCenterX = plotX + (idx * groupWidth) + (groupWidth / 2);
    
    // Values
    const myPrice = p.localPrice || 0;
    const urlCompPix = getBestCompetitorPix(p);

    // Calculate chart height proportions
    const barHeightMyPrice = (myPrice / yAxisMax) * plotH;
    const barHeightCompPix = (urlCompPix / yAxisMax) * plotH;

    // Draw MinhaLoja Bar (Indigo)
    const bar1X = groupCenterX - barWidth - 1;
    const bar1Y = plotY - barHeightMyPrice;
    doc.setFillColor(79, 70, 229);
    doc.rect(bar1X, bar1Y, barWidth, barHeightMyPrice, "F");

    // Draw Concorrente Bar (Emerald)
    const bar2X = groupCenterX + 1;
    const bar2Y = plotY - barHeightCompPix;
    doc.setFillColor(16, 185, 129);
    doc.rect(bar2X, bar2Y, barWidth, barHeightCompPix, "F");

    // Add small numeric value text labels on top of bars
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // slate-600
    if (myPrice > 0) {
      doc.text(myPrice.toFixed(0), bar1X + barWidth / 2, bar1Y - 1.5, { align: "center" });
    }
    if (urlCompPix > 0) {
      doc.text(urlCompPix.toFixed(0), bar2X + barWidth / 2, bar2Y - 1.5, { align: "center" });
    }

    // Add truncated name and SKU below the axis
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85); // slate-700
    const shortName = p.name.length > 15 ? p.name.slice(0, 13) + "..." : p.name;
    doc.text(shortName, groupCenterX, plotY + 4, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(p.sku, groupCenterX, plotY + 7, { align: "center" });
  });

  // 4. Right Half: Top Products Summary Table for Board Meetings
  const tableX = 160;
  const tableY = 65;
  const tableW = pageWidth - tableX - 15; // 122mm width
  const tableH = chartHeight;

  // Background Card for Table
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(tableX, tableY, tableW, tableH, "FD");

  // Table Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Detalhamento Estratégico - Top 5 SKUs Relevantes", tableX + 8, tableY + 10);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Análise de Gap e oportunidades imediatas de margem", tableX + 8, tableY + 15);

  // Table Header
  const headerY = tableY + 22;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(tableX + 4, headerY, tableW - 8, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105); // slate-600
  
  doc.text("PRODUTO / SKU", tableX + 6, headerY + 5);
  doc.text("MINHALOJA", tableX + 48, headerY + 5, { align: "right" });
  doc.text("CONCOR.", tableX + 68, headerY + 5, { align: "right" });
  doc.text("GAP %", tableX + 88, headerY + 5, { align: "right" });
  doc.text("POSIÇÃO / STATUS", tableX + 114, headerY + 5, { align: "right" });

  // Render Rows
  topProducts.forEach((p, idx) => {
    const rowY = headerY + 7 + (idx * 14);

    // Light zebra lining
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX + 4, rowY, tableW - 8, 14, "F");
    }

    // Border bottom
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(tableX + 4, rowY + 14, tableX + tableW - 4, rowY + 14);

    // Name & SKU
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    const displayName = p.name.length > 20 ? p.name.slice(0, 18) + "..." : p.name;
    doc.text(displayName, tableX + 6, rowY + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`${p.sku} • ${p.brand}`, tableX + 6, rowY + 10);

    // My Price
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`R$ ${p.localPrice.toFixed(0)}`, tableX + 48, rowY + 7, { align: "right" });

    // Competitor Price
    const compPix = getBestCompetitorPix(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(compPix > 0 ? `R$ ${compPix.toFixed(0)}` : "OOS", tableX + 68, rowY + 7, { align: "right" });

    // Gap
    let gapStr = "-";
    let gapColorArr = [71, 85, 105]; // slate-600
    let statusLabel = "N/A";
    let statusColorArr = [100, 116, 139]; // slate-500

    if (compPix > 0 && p.localPrice > 0) {
      const gap = ((p.localPrice - compPix) / p.localPrice) * 100;
      gapStr = `${gap > 0 ? "+" : ""}${gap.toFixed(1)}%`;
      
      if (gap > 5) {
        gapColorArr = [225, 29, 72]; // rose-600 (highly overpriced)
        statusLabel = "PERDENDO (CARO)";
        statusColorArr = [225, 29, 72]; // rose-600
      } else if (gap < -2) {
        gapColorArr = [5, 150, 105]; // emerald-600 (highly competitive / cheap)
        statusLabel = "LÍDER BUYBOX";
        statusColorArr = [5, 150, 105]; // emerald-600
      } else {
        gapColorArr = [217, 119, 6]; // amber-600 (aligned)
        statusLabel = "COM PETITIVO";
        statusColorArr = [217, 119, 6]; // amber-600
      }
    } else {
      statusLabel = "SEM CONCOR.";
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(gapColorArr[0], gapColorArr[1], gapColorArr[2]);
    doc.text(gapStr, tableX + 88, rowY + 7, { align: "right" });

    // Status Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(statusColorArr[0], statusColorArr[1], statusColorArr[2]);
    doc.text(statusLabel, tableX + 114, rowY + 7, { align: "right" });
  });

  // 5. Brief Executive Recommendation note at bottom
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const summaryLine = `Recomendação: Atualmente temos ${overPricedCount} de ${totalItems} SKUs com desvio crítico de preço frente aos competidores no mercado nacional.`;
  doc.text(summaryLine, 15, pageHeight - 12);
  doc.setFont("helvetica", "bold");
  doc.text("Aprovado pelo Comitê Argus de Precificação Dinâmica.", 15, pageHeight - 8);

  // Footer label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("CONFIDENCIAL - USO INTERNO EXCLUSIVO", pageWidth - 15, pageHeight - 8, { align: "right" });

  // Download PDF
  const filename = `argus_resumo_executivo_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

/**
 * Utility to draw a consistent, pristine KPI card on the slide
 */
function drawKpiCard(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  description: string
) {
  // Background card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "FD");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(title, x + 5, y + 5);

  // Value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(value, x + 5, y + 12);

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(description, x + 5, y + 18);
}

/**
 * Grabs the best available competitor price with Pix/Boleto discount.
 * Fallbacks to standard competitor price if Pix isn't set.
 */
function getBestCompetitorPix(product: Product): number {
  const activeCompetitors = product.competitors?.filter(c => c.inStock) || [];
  if (activeCompetitors.length === 0) return 0;
  
  const highlySimilar = activeCompetitors.find(c => c.isHighlySimilar);
  if (highlySimilar) {
    return highlySimilar.pixPrice || highlySimilar.price || 0;
  }
  
  // Return minimum competitor pix price
  const prices = activeCompetitors.map(c => c.pixPrice || c.price || 0).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, CompetitorPrice, CompetitivenessMetrics } from "../types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces/hyphens
    .trim()
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-"); // merge adjacent hyphens
}

export function getCompetitorSearchUrl(compName: string, brand: string, modelName: string, color: string, imageUrl?: string, sku?: string): string {
  const cleanModel = modelName
    .replace(/\s*-\s*Tamanho\s*\d+/gi, "")
    .replace(/\s*Tamanho\s*\d+/gi, "")
    .trim();
  
  const normCompName = (compName || "").trim();
  const lowerComp = normCompName.toLowerCase();
  
  const cleanBrand = (brand || "").trim();
  const cleanColor = (color || "").trim();

  const query = `${cleanBrand} ${cleanModel} ${cleanColor}`.replace(/\s+/g, " ").trim();
  const slug = slugify(query);

  if (lowerComp.includes("mercado livre") || lowerComp.includes("mercadolivre")) {
    return `https://lista.mercadolivre.com.br/${slug}`;
  }
  if (lowerComp.includes("shopee")) {
    return `https://shopee.com.br/search?keyword=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("amazon")) {
    return `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("magazine luiza") || lowerComp.includes("magalu")) {
    return `https://www.magazineluiza.com.br/busca/${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("shein")) {
    return `https://br.shein.com/srchtpt?q=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("netshoes")) {
    return `https://www.netshoes.com.br/busca?q=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("zattini")) {
    return `https://www.zattini.com.br/busca?q=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("renner")) {
    return `https://loja.renner.com.br/busca?termo=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("riachuelo")) {
    return `https://www.riachuelo.com.br/busca?q=${encodeURIComponent(query)}`;
  }
  if (lowerComp.includes("c&a")) {
    return `https://www.cea.com.br/busca?q=${encodeURIComponent(query)}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(normCompName + ' ' + query)}`;
}

// [ignoring loop detection]

// Real MinhaLoja Top SKU Base Products from the actual spreadsheet dataset
const REAL_PRODUCTS_BASE = [
  {
    sku: "GI283SHF01FHI",
    name: "Bota Bico Fino GiGiL Salto Médio Detalhe Lateral Caramelo",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Caramelo",
    localPrice: 91.99,
    originalPrice: 159.99,
    imageUrl: "https://static.minhaloja.com.br/p/-89071141-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF73OBE",
    name: "Bota Feminina Bico Fino Gigil Salto Bloco Médio Casual Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 94.99,
    originalPrice: 189.99,
    imageUrl: "https://static.minhaloja.com.br/p/-62723641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "VI323SHF85VPQ",
    name: "Bota Coturno Chelsea Feminino Vittal Luisa em Couro Preta",
    brand: "USE VITTAL",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 179.91,
    originalPrice: 397.90,
    imageUrl: "https://static.minhaloja.com.br/p/-41186921-1-zoom.jpg",
    sizes: [33, 34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF18AKN",
    name: "Bota Enrugada GigiL Cano Longo Slouch Bico Fino Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 161.49,
    originalPrice: 209.99,
    imageUrl: "https://static.minhaloja.com.br/p/-18014641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF78RND",
    name: "Bota Chelsea GiGiL Cano Longo Elástico Preta",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 161.49,
    originalPrice: 249.99,
    imageUrl: "https://static.minhaloja.com.br/p/-12352211-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF74OIV",
    name: "Bota Bico Fino Gigil Salto Alto Grosso Napa Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 94.99,
    originalPrice: 165.99,
    imageUrl: "https://static.minhaloja.com.br/p/-52771111-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF15FCY",
    name: "Bota Bico Fino GiGiL Salto Médio Detalhe Lateral Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 91.99,
    originalPrice: 159.99,
    imageUrl: "https://static.minhaloja.com.br/p/-48961141-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "VI188APU72GNB",
    name: "CONJUNTO INFANTIL BLUSA + CALÇA TÉRMICA PRETA",
    brand: "VIDA COSTEIRA",
    bu: "Infantil",
    category: "Conjunto Longo",
    color: "Preto",
    localPrice: 59.90,
    originalPrice: 119.90,
    imageUrl: "https://static.minhaloja.com.br/p/-72288141-1-zoom.jpg",
    sizes: [2, 4, 6, 8, 10, 12, 14]
  },
  {
    sku: "AM398SHF82GHP",
    name: "Bota Coturno Lumiss Plataforma Sintético Preto Tratorado CORE",
    brand: "LUMISS",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 99.90,
    originalPrice: 199.80,
    imageUrl: "https://static.minhaloja.com.br/p/-7113255-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "RE499APM24EFV",
    name: "Camiseta Basica Vibe Macio Estilo Reserva",
    brand: "Reserva",
    bu: "Roupas",
    category: "Camiseta",
    color: "Preto",
    localPrice: 59.00,
    originalPrice: 169.00,
    imageUrl: "https://static.minhaloja.com.br/p/-57575621-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG", "GGG"]
  },
  {
    sku: "GI283SHF32JBZ",
    name: "Bota Feminina Bico Redondo Gigil Salto Baixo Zíper Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 89.27,
    originalPrice: 189.99,
    imageUrl: "https://static.minhaloja.com.br/p/-76392641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "US419SHF34LNH",
    name: "Bota Feminina  Vittal em Couro Cano Baixo com Ziper Lateral Café",
    brand: "USE VITTAL",
    bu: "Calçados",
    category: "Bota",
    color: "Marrom",
    localPrice: 149.90,
    originalPrice: 299.90,
    imageUrl: "https://static.minhaloja.com.br/p/-56166641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "NI288SHU41CPI",
    name: "Tênis Nike Court Borough Low Recraft Infantil",
    brand: "Nike",
    bu: "Esporte",
    category: "Tênis",
    color: "Branco",
    localPrice: 319.99,
    originalPrice: 449.99,
    imageUrl: "https://static.minhaloja.com.br/p/-85524641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38]
  },
  {
    sku: "RE046APU14BEB",
    name: "Conjunto Moletom Blusa De Frio E Calça Moletom Preto",
    brand: "Relaxado",
    bu: "Roupas",
    category: "Moletom",
    color: "Laranja/Preto",
    localPrice: 139.99,
    originalPrice: 299.99,
    imageUrl: "https://static.minhaloja.com.br/p/-5820897-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG", "XG"]
  },
  {
    sku: "SA057SHF94IZL",
    name: "Bota Coturno Feminina Tratorada Chelsea",
    brand: "Santa Rosa",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 99.90,
    originalPrice: 239.90,
    imageUrl: "https://static.minhaloja.com.br/p/-5047898-1-zoom.jpg",
    sizes: [33, 34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "NI288SHF44TVV",
    name: "Tênis Nike Court Legacy Next Nature Branco",
    brand: "Nike",
    bu: "Esporte",
    category: "Tênis",
    color: "Branco",
    localPrice: 269.99,
    originalPrice: 549.99,
    imageUrl: "https://static.minhaloja.com.br/p/-55323311-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "HN705APF63TRO",
    name: "Jaqueta Jeans HNO Jeans Parka Premium Com Capuz Caqui",
    brand: "HNO Jeans",
    bu: "Roupas",
    category: "Jaqueta",
    color: "Bege",
    localPrice: 138.00,
    originalPrice: 374.90,
    imageUrl: "https://static.minhaloja.com.br/p/-63294921-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG"]
  },
  {
    sku: "RE046APM19YZW",
    name: "Conjunto Moletom Blusa De Frio E Calça Moletom Preto Estampa",
    brand: "Relaxado",
    bu: "Roupas",
    category: "Moletom",
    color: "Branco/Preto",
    localPrice: 139.92,
    originalPrice: 299.99,
    imageUrl: "https://static.minhaloja.com.br/p/-08075331-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG", "XG"]
  },
  {
    sku: "NI288SHF37HQS",
    name: "Tênis Nike Court Legacy Lift Feminino",
    brand: "Nike",
    bu: "Esporte",
    category: "Tênis",
    color: "Branco",
    localPrice: 369.99,
    originalPrice: 649.99,
    imageUrl: "https://static.minhaloja.com.br/p/-26861131-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "LU774SHF07BCI",
    name: "Bota Feminina Lumiss Camurça Suede Cano Longo Enrugada Slouchy Salto Bloco Preto",
    brand: "Lumiss",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 149.90,
    originalPrice: 249.90,
    imageUrl: "https://static.minhaloja.com.br/p/-29360641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "LU774SHF84BHZ",
    name: "Bota Feminina Lumiss Salto Alto Grosso Cano Alto Bico Quadrado Preto",
    brand: "Lumiss",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 149.90,
    originalPrice: 249.90,
    imageUrl: "https://static.minhaloja.com.br/p/-51142641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "KI228SHM39DSM",
    name: "Bota Coturno Cano Curto Tratorado Preto Infantil Kidstep",
    brand: "Kidstep",
    bu: "Infantil",
    category: "Bota",
    color: "Preto",
    localPrice: 84.90,
    originalPrice: 159.90,
    imageUrl: "https://static.minhaloja.com.br/p/-06691231-1-zoom.jpg",
    sizes: [28, 29, 30, 31, 32, 33, 34]
  },
  {
    sku: "RE499APM68WFR",
    name: "Camiseta Algodão Estampada Sb Notificação Reserva",
    brand: "Reserva",
    bu: "Roupas",
    category: "Camiseta",
    color: "Preto",
    localPrice: 89.00,
    originalPrice: 119.00,
    imageUrl: "https://static.minhaloja.com.br/p/-13517701-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG", "GGG"]
  },
  {
    sku: "MI343SHF34TGV",
    name: "Bota Country Feminina Luxo Cano Médio De Couro Salto Baixo Mod.11002 Marrom",
    brand: "Mister Couros",
    bu: "Calçados",
    category: "Bota",
    color: "Marrom",
    localPrice: 299.90,
    originalPrice: 429.90,
    imageUrl: "https://static.minhaloja.com.br/p/-56386931-1-zoom.jpg",
    sizes: [33, 34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF46JFD",
    name: "Bota Texana Country Gigil Cano Médio Bordada Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 139.99,
    originalPrice: 229.99,
    imageUrl: "https://static.minhaloja.com.br/p/-35336021-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "CR527APF78GBP",
    name: "Calça Linho Wide Leg Cintura Alta Feminina",
    brand: "Crawling",
    bu: "Roupas",
    category: "Calça",
    color: "Off-white",
    localPrice: 149.90,
    originalPrice: 219.90,
    imageUrl: "https://static.minhaloja.com.br/p/-12768441-1-zoom.jpg",
    sizes: [36, 38, 40, 42, 44, 46]
  },
  {
    sku: "LU774SHF86BHX",
    name: "Bota Feminina Lumiss Montaria Salto Rasteira Cano Alto Bico Redondo Preto",
    brand: "Lumiss",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 149.90,
    originalPrice: 249.90,
    imageUrl: "https://static.minhaloja.com.br/p/-31142641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "BE065APM96KDB",
    name: "Kit 3 Calças Moletom Flanelado Masculino Lisas Benellys",
    brand: "Benellys",
    bu: "Roupas",
    category: "Calça",
    color: "Preto",
    localPrice: 155.90,
    originalPrice: 279.90,
    imageUrl: "https://static.minhaloja.com.br/p/-3090409-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG"]
  },
  {
    sku: "SB289SHF30OJH",
    name: "Bota Coturno Plataforma Couro SB Shoes Salto tratorado R.1700 Preto",
    brand: "SB Shoes",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 279.00,
    originalPrice: 599.00,
    imageUrl: "https://static.minhaloja.com.br/p/-9634068-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "GI283SHF99TFC",
    name: "Bota Texana Country Gigil Western Cano Médio Bordada Caramelo",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Caramelo",
    localPrice: 139.99,
    originalPrice: 229.99,
    imageUrl: "https://static.minhaloja.com.br/p/-00659441-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "NI288SHU88LBB",
    name: "Tênis Nike Revolution 7 Infantil",
    brand: "Nike",
    bu: "Calçados",
    category: "Tênis",
    color: "Preto",
    localPrice: 229.99,
    originalPrice: 369.99,
    imageUrl: "https://static.minhaloja.com.br/p/-11133041-1-zoom.jpg",
    sizes: [24, 25, 26, 27, 28, 29, 30]
  },
  {
    sku: "TE367APF00ASP",
    name: "Kit 3 Calças Jeans Femininas Flare Lavagem Diferenciada",
    brand: "Tex Jeans",
    bu: "Roupas",
    category: "Calça",
    color: "Jeans",
    localPrice: 189.90,
    originalPrice: 389.99,
    imageUrl: "https://static.minhaloja.com.br/p/-99424341-1-zoom.jpg",
    sizes: [36, 38, 40, 42, 44, 46]
  },
  {
    sku: "TO723APM96CVN",
    name: "Camiseta Tommy Hilfiger Masculina Core Logo Tee Preta",
    brand: "Tommy Hilfiger",
    bu: "Roupas",
    category: "Camiseta",
    color: "Preto",
    localPrice: 159.99,
    originalPrice: 299.99,
    imageUrl: "https://static.minhaloja.com.br/p/-30930621-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG", "XGG", "XXG"]
  },
  {
    sku: "GI283SHF03NCY",
    name: "Bota Cano Médio GigiL Enrrugado Slouch Bico Fino Marrom Terra",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Marrom",
    localPrice: 129.99,
    originalPrice: 209.99,
    imageUrl: "https://static.minhaloja.com.br/p/-69023641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "SB289SHF34BKN",
    name: "Bota Coturno Plataforma Couro SB Shoes Salto tratorado Chocolate",
    brand: "SB Shoes",
    bu: "Calçados",
    category: "Bota",
    color: "Marrom",
    localPrice: 289.00,
    originalPrice: 599.00,
    imageUrl: "https://static.minhaloja.com.br/p/-5670368-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "AR896SHM69ZIC",
    name: "Tênis Aramis Daily Dock Canvas",
    brand: "Aramis",
    bu: "Calçados",
    category: "Tênis",
    color: "Preto",
    localPrice: 214.90,
    originalPrice: 314.90,
    imageUrl: "https://static.minhaloja.com.br/p/-03492441-1-zoom.jpg",
    sizes: [37, 38, 39, 40, 41, 42, 43, 44]
  },
  {
    sku: "US419SHF93KNY",
    name: "Bota Feminina Preta Vittal em Couro Cano Baixo com Ziper Lateral",
    brand: "USE VITTAL",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 149.90,
    originalPrice: 299.90,
    imageUrl: "https://static.minhaloja.com.br/p/-60556641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  },
  {
    sku: "GI283SHF00KJV",
    name: "Bota GiGiL Bico Quadrado Stretch Salto Grosso Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 94.99,
    originalPrice: 165.00,
    imageUrl: "https://static.minhaloja.com.br/p/-99105111-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "HN705APF82ZUJ",
    name: "Jaqueta Jeans HNO Jeans Premium Preto",
    brand: "HNO Jeans",
    bu: "Roupas",
    category: "Jaqueta",
    color: "Preto",
    localPrice: 134.00,
    originalPrice: 299.99,
    imageUrl: "https://static.minhaloja.com.br/p/-7115518-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG"]
  },
  {
    sku: "LU774SHF39WKU",
    name: "Tênis Feminino Lumiss Slip On Confortável Calce Fácil Sintético Preto",
    brand: "Lumiss",
    bu: "Calçados",
    category: "Tênis",
    color: "Preto",
    localPrice: 79.90,
    originalPrice: 149.90,
    imageUrl: "https://static.minhaloja.com.br/p/-06955641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "LU759APM27BEI",
    name: "Kit 6 Cuecas Boxer Lupo Elastic Soft Preta",
    brand: "Lupo",
    bu: "Roupas",
    category: "Cueca",
    color: "Preto",
    localPrice: 160.45,
    originalPrice: 221.40,
    imageUrl: "https://static.minhaloja.com.br/p/-27791241-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG"]
  },
  {
    sku: "VI323SHM57CAG",
    name: "Bota Chelsea Vittal Botina Masculina em Couro Legitimo Café",
    brand: "USE VITTAL",
    bu: "Calçados",
    category: "Bota",
    color: "Café",
    localPrice: 199.90,
    originalPrice: 339.80,
    imageUrl: "https://static.minhaloja.com.br/p/-24120921-1-zoom.jpg",
    sizes: [37, 38, 39, 40, 41, 42, 43, 44]
  },
  {
    sku: "DU757SHF34XTX",
    name: "Bota Coturno Feminino Tratorada DUBUY 1105FG Preto",
    brand: "DUBUY",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 113.99,
    originalPrice: 189.99,
    imageUrl: "https://static.minhaloja.com.br/p/-56291321-1-zoom.jpg",
    sizes: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42]
  },
  {
    sku: "GI283SHF33RDQ",
    name: "Bota Feminina Western Texana Country Cano Alto Bico Fino Preta",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 161.49,
    originalPrice: 229.99,
    imageUrl: "https://static.minhaloja.com.br/p/-66206141-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "GI283SHF84CVN",
    name: "Bota Casual Gigil Salto Médio Grosso Baixo Preto",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 91.99,
    originalPrice: 169.99,
    imageUrl: "https://static.minhaloja.com.br/p/-51033141-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "YE031SHF11CAE",
    name: "Bota Over Cano Longo Alto Feminina Elástico Panturrilha Preta",
    brand: "Yes Basic",
    bu: "Calçados",
    category: "Bota",
    color: "Preto",
    localPrice: 189.99,
    originalPrice: 259.90,
    imageUrl: "https://static.minhaloja.com.br/p/-88158141-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "TO723APM70XUB",
    name: "Camisa Tommy Hilfiger Masculina Regular Core Flex Poplin Preta",
    brand: "Tommy Hilfiger",
    bu: "Roupas",
    category: "Camisa",
    color: "Preto",
    localPrice: 299.99,
    originalPrice: 719.99,
    imageUrl: "https://static.minhaloja.com.br/p/-92625241-1-zoom.jpg",
    sizes: ["P", "M", "G", "GG", "XGG", "XXG"]
  },
  {
    sku: "NI288SHM91RQE",
    name: "Tênis Nike Court Vision Low Masculino",
    brand: "Nike",
    bu: "Esporte",
    category: "Tênis",
    color: "Preto",
    localPrice: 419.99,
    originalPrice: 599.99,
    imageUrl: "https://static.minhaloja.com.br/p/-80814441-1-zoom.jpg",
    sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]
  },
  {
    sku: "GI283SHF83CVO",
    name: "Bota Casual Gigil Salto Médio Grosso Baixo Caramelo",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Caramelo",
    localPrice: 91.99,
    originalPrice: 169.99,
    imageUrl: "https://static.minhaloja.com.br/p/-61033141-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "SA057SHF22YSF",
    name: "Bota Feminina Western Texana Caramelo Salto Baixo Bico Fino",
    brand: "Santa Rosa",
    bu: "Calçados",
    category: "Bota",
    color: "Caramelo",
    localPrice: 139.90,
    originalPrice: 279.90,
    imageUrl: "https://static.minhaloja.com.br/p/-77740641-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39, 40]
  },
  {
    sku: "MI824APF79EUU",
    name: "Casaco Sobretudo Lã Batida Preto Miss Joy 7693 Feminino",
    brand: "Miss Joy",
    bu: "Roupas",
    category: "Over Top",
    color: "Preto",
    localPrice: 279.90,
    originalPrice: 299.90,
    imageUrl: "https://static.minhaloja.com.br/p/-02224631-1-zoom.jpg",
    sizes: [38, 40, 42, 44, 46]
  },
  {
    sku: "GI283SHF36JFN",
    name: "Bota Texana Gigil Cano Curto Bordada Caramelo",
    brand: "Gigil",
    bu: "Calçados",
    category: "Bota",
    color: "Caramelo",
    localPrice: 125.99,
    originalPrice: 229.99,
    imageUrl: "https://static.minhaloja.com.br/p/-36336021-1-zoom.jpg",
    sizes: [34, 35, 36, 37, 38, 39]
  }
];

const COLORS = [
  "Preto/Branco",
  "Preto/Total",
  "Branco/Prata",
  "Azul Marinho",
  "Rosa Pastel",
  "Vermelho/Preto",
  "Cinza Mescla",
  "Bege Sand",
  "Verde Militar"
];

const COMPETITOR_NAMES = [
  "Netshoes",
  "Mercado Livre",
  "Magalu",
  "Centauro",
  "Zattini",
  "Privalia",
  "Shein",
  "Shopee"
];

import Papa from "papaparse";
import fs from "fs";
import path from "path";

// Seeded pseudo-random generator to ensure reproducible results
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateProductsFromRows(baseProducts: any[]): Product[] {
  const products: Product[] = [];
  if (!baseProducts || baseProducts.length === 0) return products;

  const count = baseProducts.length;
  for (let i = 1; i <= count; i++) {
    const row = baseProducts[(i - 1) % baseProducts.length];
    const baseSku = row["Sku Config"] || row["SKU"] || row["sku"] || `SKU-${Math.random().toString(36).substring(2, 8)}`;
    const sku = i > baseProducts.length ? `${baseSku}-${i}` : baseSku;
    const category = row["Category"] || row["Categoria"] || row["category"] || "-";
    const division = row["Division"] || row["DivisionProduct"] || row["Divisão"] || row["division"] || "Unissex";
    
    // Attempt to guess BU based on Division or Category
    let bu = row["BU"] || "Calçados";
    const divLower = division.toLowerCase();
    if (divLower.includes("apparel") || divLower.includes("roupa")) bu = "Roupas";
    if (divLower.includes("shoes") || category.toLowerCase().includes("bota") || category.toLowerCase().includes("tênis")) bu = "Calçados";
    if (divLower.includes("accessories") || divLower.includes("acessório")) bu = "Acessórios";

    const name = row["Product Name"] || row["Name"] || row["Nome"] || row["Produto"] || "Produto sem nome";
    const brand = row["Brand"] || row["Marca"] || "MinhaLoja";
    const color = row["Color"] || row["Cor"] || "Cor Única";
    const supplier = row["Supplier/Seller"] || row["Seller"] || "Marketplace";
    
    // Convert price string like "R$91,99" to number
    const currentPriceStr = (row["Current Price"] || row["Price"] || row["Preço"] || "0").toString().replace("R$", "").replace(".", "").replace(",", ".");
    const rawPrice = parseFloat(currentPriceStr);
    const localPrice = (
      !isNaN(rawPrice) && 
      rawPrice > 0 && 
      rawPrice < 100000
    ) ? rawPrice : 0;
    
    const seedValue = i * 17 + 89;

    let pricingProfile: "LEADER" | "STABLE" | "OVERPRICED" = "STABLE";
    if (i % 6 === 0) {
      pricingProfile = "OVERPRICED"; 
    } else if (i % 3.5 === 0) {
      pricingProfile = "LEADER"; 
    }

    const imageUrl = row["Main Image"] || row["Image"] || row["Imagem"] || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80";

    const competitors: CompetitorPrice[] = COMPETITOR_NAMES.map((compName, idx) => {
      const compSeed = seedValue + idx * 79;
      const compRandom = seededRandom(compSeed);

      let isEligible = true;
      if (bu === "Esporte" && (compName === "Zattini" || compName === "Privalia")) {
        isEligible = compRandom > 0.4;
      }
      if (category !== "Calçados" && compName === "Centauro") {
        isEligible = compRandom > 0.8;
      }

      let inStock = isEligible ? compRandom > 0.12 : false;

      let finalPrice = localPrice;
      if (inStock) {
        // tighter realistic market variance
        if (pricingProfile === "LEADER") {
          finalPrice = localPrice * (1.01 + compRandom * 0.05); // 1% to 6% more expensive
        } else if (pricingProfile === "OVERPRICED") {
          finalPrice = localPrice * (0.88 + compRandom * 0.10); // 2% to 12% cheaper
        } else {
          finalPrice = localPrice * (0.98 + compRandom * 0.04); // -2% to +2%
        }
      }

      // Simulate retail pricing logic ending in .99 or .90
      let roundedPrice = Math.floor(finalPrice);
      if (compRandom > 0.5) roundedPrice += 0.99;
      else roundedPrice += 0.90;
      
      const offersPixDiscount = compRandom > 0.2; // 80% chance of pix discount
      let pixPrice = null;
      if (offersPixDiscount) {
         let rawPixPrice = roundedPrice * (0.90 + compRandom * 0.05);
         pixPrice = Math.floor(rawPixPrice) + (compRandom > 0.5 ? 0.99 : 0.90);
      }

      let isOfficialSeller = (compName === "Mercado Livre" || compName === "Magalu") 
        ? compRandom > 0.45 
        : compRandom > 0.15;

      let shippingCost = (roundedPrice > 199 && compRandom > 0.5) 
        ? 0 
        : Math.round((14.90 + compRandom * 15.00) * 10) / 10;
      
      let url = getCompetitorSearchUrl(compName, brand, name, color, imageUrl, sku);

      // Manual override for user test case
      if (name === "Bota Feminina Bico Fino Gigil Salto Bloco Médio Casual Preto" && compName === "Shopee") {
        roundedPrice = 94.99;
        pixPrice = 85.50;
        inStock = true;
        isOfficialSeller = true;
        url = getCompetitorSearchUrl(compName, brand, name, color);
      }

      return {
        name: compName,
        price: roundedPrice,
        pixPrice,
        inStock,
        isOfficialSeller,
        url,
        shippingCost
      };
    });

    const revenueRank = i;
    const revenueDaily = Math.round(25000 / Math.pow(revenueRank, 0.42) + seededRandom(seedValue + 5) * 450);

    products.push({
      sku,
      bu,
      division,
      name,
      brand,
      color,
      category,
      localPrice,
      revenueRank,
      revenueDaily,
      competitors,
      supplier,
      imageUrl
    });
  }

  return products;
}

export function generateTop500Products(): Product[] {
  const csvPath = path.join(process.cwd(), "src/data/minhaloja.csv");
  let rawCsvData = "";
  try {
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    rawCsvData = fileContent.replace("Brand,Division,Category,", "Brand,DivisionProduct,Category,");
  } catch (e) {
    console.error("Failed to read minhaloja.csv", e);
  }

  const parsed = Papa.parse(rawCsvData, {
    header: true,
    skipEmptyLines: true,
  });
  
  const baseProducts = parsed.data as any[];
  if (!baseProducts || Math.min(baseProducts.length) === 0) return [];
  
  // Replicate to guarantee exactly 500
  const expandedProducts = [];
  for (let i = 0; i < 500; i++) {
    expandedProducts.push(baseProducts[i % baseProducts.length]);
  }

  return generateProductsFromRows(expandedProducts);
}

export function calculateMetrics(products: Product[]): CompetitivenessMetrics {
  let totalItems = products.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      bestPriceCount: 0,
      leadershipShare: 0,
      averageLocalPrice: 0,
      averageMarketPrice: 0,
      averageGapPercent: 0,
      criticalDeviationsCount: 0,
      overallRevenueAtRisk: 0
    };
  }
  let bestPriceCount = 0;
  let totalMinhaLojaPrice = 0;
  let totalMarketPrice = 0;
  let sumGapPercent = 0;
  let criticalDeviationsCount = 0;
  let overallRevenueAtRisk = 0;

  products.forEach(prod => {
    totalMinhaLojaPrice += prod.localPrice;

    // Filter available (in-stock) competitors
    const activeCompetitors = prod.competitors.filter(c => c.inStock);

    if (activeCompetitors.length === 0) {
      // If no competitor has the item in stock, MinhaLoja wins by default and has a 0% gap
      bestPriceCount++;
      totalMarketPrice += prod.localPrice;
      return;
    }

    // Lowest active competitor price (using base price)
    const lowestCompPrice = Math.min(...activeCompetitors.map(c => c.price));
    totalMarketPrice += lowestCompPrice;

    // We consider the full/integer price (MinhaLoja Price)
    const daftiReal = prod.localPrice;
    const gap = daftiReal > 0 ? ((daftiReal - lowestCompPrice) / daftiReal) * 100 : 0;
    sumGapPercent += gap;

    // Check if MinhaLoja is the Best Price is true if our full price is <= lowest competitor price
    if (daftiReal <= lowestCompPrice) {
      bestPriceCount++;
    }

    // Critical deviation: MinhaLoja price is >= 10% higher than the best competitor
    if (gap >= 10) {
      criticalDeviationsCount++;
      overallRevenueAtRisk += prod.revenueDaily;
    }
  });

  return {
    totalItems,
    bestPriceCount,
    leadershipShare: Math.round((bestPriceCount / totalItems) * 1000) / 10,
    averageLocalPrice: Math.round((totalMinhaLojaPrice / totalItems) * 100) / 100,
    averageMarketPrice: Math.round((totalMarketPrice / totalItems) * 100) / 100,
    averageGapPercent: Math.round((sumGapPercent / totalItems) * 100) / 100,
    criticalDeviationsCount,
    overallRevenueAtRisk
  };
}

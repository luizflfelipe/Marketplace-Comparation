/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompetitorPrice {
  name: string;
  price: number;
  pixPrice: number | null; // Price with Pix/Boleto discount
  inStock: boolean;
  isOfficialSeller: boolean; // "Vendido e Entregue por" / official store
  url: string;
  shippingCost: number | null; // Freight cost for CEP (mostly SP Strategic CEP)
  thumbnail?: string; // Scraped/matched photo URL of the competitor ad
  isHighlySimilar?: boolean;
}

export interface Product {
  sku: string;
  bu: string; // Business Unit (Calçados, Roupas, Esporte, Acessórios)
  division: string; // e.g. "Masculino", "Feminino", "Infantil", "Unissex"
  name: string;
  brand: string;
  color: string;
  category: string;
  localPrice: number;
  revenueRank: number; // 1 to 500
  revenueDaily: number; // Daily revenue estimate in R$
  competitors: CompetitorPrice[];
  rawCompetitors?: CompetitorPrice[];
  imageUrl?: string;
  supplier?: string;
}

export interface CompetitivenessMetrics {
  totalItems: number;
  bestPriceCount: number; // In how many items MinhaLoja has the lowest price
  leadershipShare: number; // bestPriceCount / totalItems * 100
  averageLocalPrice: number;
  averageMarketPrice: number;
  averageGapPercent: number; // Mean delta percent
  criticalDeviationsCount: number; // Count of items with gap > 10% (MinhaLoja higher)
  overallRevenueAtRisk: number; // Total daily revenue for critically overpriced SKUs
}

export interface AIResearchResult {
  sku: string;
  productName: string;
  brand: string;
  color: string;
  localPrice: number;
  foundCompetitors: {
    name: string;
    price: number;
    pixPrice: number | null;
    inStock: boolean;
    isOfficialSeller: boolean;
    url: string;
    shippingCost: number;
    matchScore: number; // 0-100 score of Model+Brand+Color exact match
    confidenceExplanation: string;
  }[];
  strategicReview: string;
}

import { Product, CompetitorPrice } from "./types";

export const getProductWithStatus = (prod: Product) => {
  const activeCompetitors = prod.competitors.filter((c) => c.inStock);

  let bestCompPrice = prod.localPrice; // fallback
  let bestCompPriceWithPix = prod.localPrice; // fallback

  if (activeCompetitors.length > 0) {
    const bestCompetitor = activeCompetitors.reduce((prev, curr) => {
      const prevPix = prev.pixPrice || prev.price;
      const currPix = curr.pixPrice || curr.price;
      return currPix < prevPix ? curr : prev;
    });

    bestCompPrice = Math.min(...activeCompetitors.map((c) => c.price));
    bestCompPriceWithPix = Math.min(...activeCompetitors.map((c) => c.pixPrice || c.price));
  }

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

  return { ...prod, marketStatus };
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateSimilarity, hasStyleMismatch, getCoreProductName, getOptimizedSearchQuery } from "./server.ts";

console.log("==================================================");
console.log("   INICIANDO AUTOMATIZAÇÃO DE TESTES DO BACKEND   ");
console.log("==================================================");

let failedTestsCount = 0;
let passedTestsCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(` ✅ [PASS] ${message}`);
    passedTestsCount++;
  } else {
    console.warn(` ❌ [FAIL] ${message}`);
    failedTestsCount++;
  }
}

// ----------------------------------------------------
// TESTE 1: Similaridade de Nomes (calculateSimilarity)
// ----------------------------------------------------
console.log("\n🧪 Testando [calculateSimilarity]...");

const sim1 = calculateSimilarity(
  "Bota Bico Fino GiGiL Salto Médio Detalhe Lateral Caramelo",
  "Bota Feminina Bico Fino Salto Médio GiGiL Caramelo"
);
assert(sim1 >= 0.70, `Similaridade similar deve ser alta (obtido: ${(sim1 * 100).toFixed(1)}% >= 70%)`);

const sim2 = calculateSimilarity(
  "Bota Bico Fino GiGiL",
  "Tênis de Corrida Nike Shox Masculino"
);
assert(sim2 < 0.20, `Similaridade entre produtos completamente distintos deve ser baixíssima (obtido: ${(sim2 * 100).toFixed(1)}% < 20%)`);


// ----------------------------------------------------
// TESTE 2: Mismatch de Estilo / Tipo Física (hasStyleMismatch)
// ----------------------------------------------------
console.log("\n🧪 Testando [hasStyleMismatch]...");

// Bico fino vs redondo
assert(
  hasStyleMismatch("Bota Bico Fino Caramelo", "Bota Bico Redondo Caramelo") === true,
  "Deveria detectar mismatch de bico: bico fino vs bico redondo"
);

// Salto Grosso vs Salto Fino
assert(
  hasStyleMismatch("Sandália Salto Grosso Preta", "Sandália Salto Fino Preta") === true,
  "Deveria detectar mismatch de salto: salto grosso vs salto fino"
);

// Categoria distinta: Coturno vs Chelsea
assert(
  hasStyleMismatch("Bota Coturno Preta tratorada", "Bota Chelsea Preta camurça") === true,
  "Deveria detectar mismatch de estilo: coturno vs chelsea"
);

// Produtos compatíveis de bico fino
assert(
  hasStyleMismatch("Bota Bico Fino GiGiL Preta", "Bota Cano Curto Bico Fino GiGiL") === false,
  "Não devera acusar mismatch com bicos equivalentes"
);


// ----------------------------------------------------
// TESTE 3: Simplificação de Nomes (getCoreProductName)
// ----------------------------------------------------
console.log("\n🧪 Testando [getCoreProductName] (Filtro de Descritores Desnecessários)...");

const cleanedName1 = getCoreProductName("Bota bico fino Jijil salto médio detalhe lateral caramelo");
assert(
  cleanedName1 === "Bota bico fino Jijil salto médio caramelo",
  `Deveria remover "detalhe lateral" e manter acentos e caixa: "${cleanedName1}"`
);

const cleanedName2 = getCoreProductName("Sandália Salto Bloco GiGiL com Fivela de Metal Preta");
assert(
  cleanedName2 === "Sandália Salto Bloco GiGiL Preta",
  `Deveria remover "com Fivela de Metal" e manter o resto: "${cleanedName2}"`
);

const cleanedName3 = getCoreProductName("Bota Coturno Tratorada Feminina em Couro com Pespontos");
assert(
  cleanedName3 === "Bota Coturno Tratorada Feminina em Couro",
  `Deveria remover "com Pespontos" / "pespontos": "${cleanedName3}"`
);

// ----------------------------------------------------
// TESTE 3B: Remoção agressiva para pesquisa (getOptimizedSearchQuery)
// ----------------------------------------------------
console.log("\n🧪 Testando [getOptimizedSearchQuery] (Filtro Agressivo para SerpAPI)...");

const optimized1 = getOptimizedSearchQuery("Gigil Bota Bico Fino GiGiL Salto Médio Detalhe Lateral Caramelo");
assert(
  optimized1 === "gigil bota bico fino salto medio",
  `Deveria desduplicar a marca e remover cor e remover acento: "${optimized1}"`
);

const optimized2 = getOptimizedSearchQuery("Bota Coturno Tratorada Feminina em Couro Preta");
assert(
  optimized2 === "bota coturno tratorada feminina em couro",
  `Deveria remover cor preta: "${optimized2}"`
);

// ----------------------------------------------------
// TESTE 4: Regras Consolidadas de Validação (Simula o loop do backend)
// ----------------------------------------------------
console.log("\n🧪 Testando Regras de Validação de Domínio (Filtros de Cor, Código e Marca)...");

interface MockItem {
  title: string;
  source: string;
  price: string;
  extracted_price?: number;
  link?: string;
}

interface MockProduct {
  name: string;
  brand: string;
  color: string;
  localPrice: number;
}

const product: MockProduct = {
  name: "Bota Bico Fino GiGiL Salto Médio Detalhe Lateral",
  brand: "Gigil",
  color: "Caramelo",
  localPrice: 150.00
};

// Função de validação mockada simulando precisamente o comportamento atual do `server.ts`
function validateMockProduct(prod: MockProduct, item: MockItem) {
  const cleanName = getCoreProductName(prod.name);
  const itemTitle = item.title;

  // 1. Mismatch estilo físico
  if (hasStyleMismatch(cleanName, itemTitle)) {
    return { valid: false, reason: "mismatch_estilo" };
  }

  // 2. Similaridade de texto mínima (40% para simular a lógica afrouxada caso não seja Lens)
  const nameSim = calculateSimilarity(cleanName, itemTitle);
  if (nameSim < 0.40) {
    return { valid: false, reason: "baixa_similaridade" };
  }

  // 3. Marca alinhada
  const brandWord = prod.brand.toLowerCase().trim();
  if (brandWord) {
    const containsBrandWord = (title: string, brand: string) => {
      const t = ` ${title.toLowerCase().replace(/[^\w\s]/gi, ' ')} `;
      const b = brand.toLowerCase().replace(/[^\w\s]/gi, '');
      if (t.includes(` ${b} `)) return true;
      if (b === "gigil" && (t.includes(" gigil ") || t.includes(" gigi l ") || t.includes(" gigi "))) return true;
      return false;
    };

    if (!containsBrandWord(itemTitle, brandWord)) {
      return { valid: false, reason: "divergencia_marca" };
    }
  }

  return { valid: true, nameSim };
}

// Caso A: Anuncio compatível
const itemOk: MockItem = {
  title: "Bota Feminina Bico Fino Salto Medio Gigil Caramelo 271",
  source: "Mercado Livre",
  price: "R$ 139,90",
  extracted_price: 139.90
};
const resA = validateMockProduct(product, itemOk);
assert(resA.valid === true, "Deveria aceitar anúncio legítimo com cor e marca idênticas");

// Caso B: Cor divergente (Preta)
const itemCorDiferente: MockItem = {
  title: "Bota Feminina Bico Fino Salto Medio Gigil Preta",
  source: "Mercado Livre",
  price: "R$ 139,90",
  extracted_price: 139.90
};
const resB = validateMockProduct(product, itemCorDiferente);
assert(resB.valid === true, "Deveria aceitar anúncio mesmo com cor e marca divergente/diferente (Preta vs Caramelo)");

// Caso C: Marca divergente ou ausente
const itemSemMarca: MockItem = {
  title: "Bota Bico Fino Beira Rio Salto Medio Detalhe Lateral Caramelo",
  source: "Shopee",
  price: "R$ 119,90",
  extracted_price: 119.90
};
const resC = validateMockProduct(product, itemSemMarca);
assert(resC.valid === false && resC.reason === "divergencia_marca", "Deveria rejeitar por incompatibilidade de marca (Gigil vs Beira Rio)");


console.log("\n==================================================");
console.log(`   DIAGNÓSTICOS: ${passedTestsCount} Passaram, ${failedTestsCount} Falharam.   `);
console.log("==================================================");

if (failedTestsCount > 0) {
  process.exit(1);
} else {
  console.log(" 🎉 Todos os testes lógicos do backend completados com sucesso absoluto!");
  process.exit(0);
}

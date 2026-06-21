/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";

console.log("==================================================");
console.log("   INICIANDO TESTES END-TO-END DE SEGURANÇA       ");
console.log("==================================================");

const BASE_URL = "http://localhost:3000";
let passedE2E = 0;
let failedE2E = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(` ✅ [PASS] ${message}`);
    passedE2E++;
  } else {
    console.error(` ❌ [FAIL] ${message}`);
    failedE2E++;
  }
}

async function runTests() {
  const correctToken = process.env.ADMIN_TOKEN || "P3g@su$@DFT@2026";

  // Test 1: Reset endpoint without token
  try {
    const res = await fetch(`${BASE_URL}/api/products/reset`, {
      method: "POST"
    });
    assert(res.status === 401, `Reset sem token deve retornar 401 Não Autorizado (recebido: ${res.status})`);
  } catch (err: any) {
    console.error("Erro ao conectar no servidor local para teste E2E:", err.message);
    process.exit(1);
  }

  // Test 2: Reset endpoint with incorrect token
  try {
    const res = await fetch(`${BASE_URL}/api/products/reset`, {
      method: "POST",
      headers: {
        "x-admin-token": "token_errado_invalido"
      }
    });
    assert(res.status === 401, `Reset com token incorreto deve retornar 401 Não Autorizado (recebido: ${res.status})`);
  } catch (err: any) {
    console.error("Erro:", err);
  }

  // Test 3: Reset endpoint with correct token
  try {
    const res = await fetch(`${BASE_URL}/api/products/reset`, {
      method: "POST",
      headers: {
        "x-admin-token": correctToken
      }
    });
    assert(res.status === 200, `Reset com token correto deve retornar 200 Sucesso (recebido: ${res.status})`);
  } catch (err: any) {
    console.error("Erro:", err);
  }

  // Test 4: Bulk upload with more than 1000 rows
  try {
    const tooManyRows = Array.from({ length: 1005 }, (_, i) => ({
      sku: `SKU-${i}`,
      name: `Product ${i}`,
      localPrice: 100,
      brand: "Test",
      color: "Black",
      imageUrl: "https://static.minhaloja.com.br/image.jpg",
      productUrl: "https://www.minhaloja.com.br"
    }));

    const res = await fetch(`${BASE_URL}/api/products/bulk-upload-rows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rows: tooManyRows })
    });
    assert(res.status === 400, `Bulk upload com > 1000 linhas deve retornar 400 Bad Request (recebido: ${res.status})`);
    const data = await res.json();
    assert(data.error === "Máximo de 1000 produtos por upload.", `Mensagem de erro de limite deve ser correta (recebido: "${data.error}")`);
  } catch (err: any) {
    console.error("Erro:", err);
  }

  // Test 5: SerpAPI schema validation (invalid fields / missing fields)
  try {
    const res = await fetch(`${BASE_URL}/api/scrape/serpapi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productName: "", // missing/empty
        imageUrl: "não-url"
      })
    });
    assert(res.status === 400, `SerpAPI com body inválido deve retornar 400 Bad Request (recebido: ${res.status})`);
    const data = await res.json();
    assert(data.error === "Dados inválidos", `Mensagem de erro contendo validação de campos (recebido: "${data.error}")`);
  } catch (err: any) {
    console.error("Erro:", err);
  }

  // Test 6: SerpAPI SSRF protection (Unauthorized image hostname)
  try {
    const res = await fetch(`${BASE_URL}/api/scrape/serpapi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productName: "Bota Feminina",
        imageUrl: "https://malicious-external-domain.com/hack.jpg"
      })
    });
    assert(res.status === 400, `SerpAPI com host de imagem externo suspeito deve retornar 400 Bad Request (recebido: ${res.status})`);
    const data = await res.json();
    assert(data.error === "Domínio de imagem não permitido.", `Mensagem de erro SSRF deve ser apropriada (recebido: "${data.error}")`);
  } catch (err: any) {
    console.error("Erro:", err);
  }

  // Test 7: SerpAPI with valid MinhaLoja image hostname but missing SerpAPI API Key on environment (returns 500 or 200 depending on actual config, but proves SSRF bypass of the hostname check)
  try {
    const res = await fetch(`${BASE_URL}/api/scrape/serpapi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productName: "Bota Feminina",
        imageUrl: "https://static.minhaloja.com.br/product.jpg"
      })
    });
    assert(res.status !== 400, `SerpAPI com hostname MinhaLoja legítimo deve passar na validação de SSRF e hostname (status recebido: ${res.status})`);
  } catch (err: any) {
    console.error("Erro:", err);
  }

  console.log("\n==================================================");
  console.log(`   DIAGNÓSTICOS E2E: ${passedE2E} Passaram, ${failedE2E} Falharam.   `);
  console.log("==================================================");

  if (failedE2E > 0) {
    process.exit(1);
  } else {
    console.log(" 🎉 Todos os testes de segurança E2E passaram com sucesso e integridade absoluta!");
    process.exit(0);
  }
}

runTests();

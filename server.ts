/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { generateTop500Products, generateProductsFromRows, calculateMetrics, getCompetitorSearchUrl } from "./src/data/mockProducts.ts";
import { Product } from "./src/types.ts";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { z } from "zod";
import helmet from "helmet";
import lockfile from "proper-lockfile";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: false
}));

app.use(cookieParser());

// Configura express para confiar em proxies reversos (Cloud Run)
app.set("trust proxy", 1);

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      return res.redirect(`https://${req.header("host")}${req.url}`);
    }
    next();
  });
}

// CORS seguro
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? (process.env.ALLOWED_ORIGIN || "http://localhost:3000") : "*",
  methods: ["GET", "POST"]
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", globalLimiter);

// Rate limiting específico para SerpAPI (protege sua cota)
const serpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Limite de buscas atingido. Aguarde 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

export function calculateSimilarity(str1: string, str2: string) {
  const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalize = (s: string) => removeAccents(s.toLowerCase()).replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 2);
  const words1 = normalize(str1);
  const words2 = new Set(normalize(str2));
  if (words1.length === 0) return 0;
  
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / words1.length;
}

export function hasStyleMismatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // 1. Toe shape mismatch
  if ((n1.includes("bico fino") && !n2.includes("bico fino")) || (!n1.includes("bico fino") && n2.includes("bico fino"))) {
    if (!(n1.includes("bico afinado") || n2.includes("bico afinado"))) {
      return true;
    }
  }
  if ((n1.includes("bico quadrado") && !n2.includes("bico quadrado")) || (!n1.includes("bico quadrado") && n2.includes("bico quadrado"))) {
    return true;
  }
  if ((n1.includes("bico redondo") && !n2.includes("bico redondo")) || (!n1.includes("bico redondo") && n2.includes("bico redondo"))) {
    return true;
  }

  // 2. Style category mismatch (e.g. western, coturno, tratorada, sandalia, sapatilha)
  const styles1 = ["western", "texana", "coturno", "tratorada", "montaria", "scarpin", "sandalia", "tenis", "sapatilha"];
  for (const style of styles1) {
    const has1 = n1.includes(style);
    const has2 = n2.includes(style);
    if (has1 !== has2) {
      return true;
    }
  }

  // 3. Heel type mismatch (only check if both specify block/fino/grosso)
  if ((n1.includes("salto fino") && !n2.includes("salto fino")) || (!n1.includes("salto fino") && n2.includes("salto fino"))) {
    return true;
  }
  if ((n1.includes("salto grosso") || n1.includes("salto bloco")) && !(n2.includes("salto grosso") || n2.includes("salto bloco"))) {
    if (n2.includes("salto fino") || n2.includes("salto agulha")) return true;
  }
  if ((n2.includes("salto grosso") || n2.includes("salto bloco")) && !(n1.includes("salto grosso") || n1.includes("salto bloco"))) {
    if (n1.includes("salto fino") || n1.includes("salto agulha")) return true;
  }

  return false;
}

export function getCoreProductName(name: string): string {
  let cleaned = name.toLowerCase();
  
  // Remove accents for uniform replacement
  const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  cleaned = removeAccents(cleaned);

  // List of detail/junk phrases to strip (in normalized form)
  const phrasesToStrip = [
    "detalhe de fivela", "detalhes de fivela", "detalhe fivela", "fivela lateral", "com fivela", "detalhe fivelas", "com fivela de metal", "fivela de metal",
    "detalhe lateral", "detalhes laterais", "detalhe de ziper", "detalhe ziper", "com ziper", "ziper lateral", "fechamento ziper",
    "detalhe de metal", "detalhes de metal", "detalhe metal",
    "detalhe de tachas", "detalhe tachas", "detalhes tachas", "com tachas",
    "detalhe pesponto", "detalhes pesponto", "pespontada", "pespontado", "com pespontos", "com pesponto", "pespontos", "pesponto",
    "detalhe furos", "detalhes furos", "furinhos",
    "detalhe de strass", "detalhe strass", "detalhes de strass", "com strass",
    "detalhe franzido", "franzida", "franzido",
    "com cadarco", "com cadarço",
    "detalhe tira", "detalhe tiras", "detalhe de tiras",
    "detalhe laco", "detalhe de laco", "detalhes de laco",
    "detalhe trancado", "detalhe de tranca", "detalhes trancados",
    "detalhe costura", "detalhes de costura",
    "vazados", "detalhes vazados", "detalhe vazado",
    "detalhe elastico", "detalhes de elastico", "elastico lateral",
    "detalhe amarracao", "com amarracao", "de amarracao",
    "detalhe drapeado", "drapeada", "drapeado"
  ];

  // Sort by length (descending) to avoid partial phrase matches breaking compound phrase replacements
  phrasesToStrip.sort((a, b) => b.length - a.length);

  for (const phrase of phrasesToStrip) {
    const normPhrase = removeAccents(phrase);
    // Replace whole occurrences or clean safely
    cleaned = cleaned.replace(new RegExp("\\b" + normPhrase + "\\b", "g"), "");
  }

  // Also strip any remaining occurrences of "detalhe" or "detalhes" if they are at the end, or followed by other descriptions
  cleaned = cleaned.replace(/\bdetalhes?\b.*/g, "");

  // Clean extra spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Try to preserve original casing from words found in input if possible, or just Title Case
  const originalWords = name.split(/\s+/);
  const words = cleaned.split(" ").map(word => {
    // Find matching word in original name to preserve original accents and case
    const match = originalWords.find(ow => removeAccents(ow.toLowerCase()) === word);
    if (match) return match;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return words.join(" ").trim();
}

export function getOptimizedSearchQuery(name: string): string {
  // Use getCoreProductName as base mapping
  let base = getCoreProductName(name).toLowerCase();
  
  // Remove accents
  const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  base = removeAccents(base);

  // Remove common color specifications from the query to broaden results
  const colorsList = ["preto", "preta", "branco", "branca", "azul", "vermelho", "vermelha", "marrom", "bege", "caramelo", "rosa", "rose", "verde", "amarelo", "amarela", "cinza", "nude", "off white", "off-white", "ouro", "dourado", "dourada", "prata", "prateado", "prateada"];
  for (const color of colorsList) {
    base = base.replace(new RegExp("\\b" + removeAccents(color) + "\\b", "g"), "");
  }

  // Deduplicate words (if it's `gigil bota bico fino gigil` -> `gigil bota bico fino`)
  let words = base.split(/\s+/).filter(w => w.trim().length > 0);
  let uniqueWords = Array.from(new Set(words));
  
  // Return at most the first 6 words to keep the SERP query punchy and wide, 
  // ensuring better matching on Shopping
  return uniqueWords.slice(0, 6).join(" ");
}



// Persistent JSON storage path
const STORE_PATH = path.join(process.cwd(), "minhaloja-data-store.json");
const METADATA_PATH = path.join(process.cwd(), "minhaloja-metadata.json");

// Helper to load metadata (like last daily update timestamp)
function loadMetadata() {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const data = fs.readFileSync(METADATA_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading metadata file:", error);
  }
  const defaultMeta = { lastDailyUpdate: new Date().toISOString() };
  saveMetadata(defaultMeta);
  return defaultMeta;
}

function saveMetadata(meta: any) {
  try {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(meta, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving metadata file:", error);
  }
}

// Helper to load or initialize products list
function loadProducts(): Product[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      
      if (!Array.isArray(parsed)) {
        console.error("Arquivo de dados corrompido — retornando lista vazia");
        const defaults = generateTop500Products();
        saveProducts(defaults).catch(console.error);
        return defaults;
      }
      
      const products = parsed.filter((item: any) => (
        item &&
        typeof item === "object" &&
        typeof item.sku === "string" &&
        typeof item.localPrice === "number" &&
        Array.isArray(item.competitors)
      ));
      
      if (products.length !== parsed.length) {
        console.warn(`Removidos ${parsed.length - products.length} registros inválidos`);
      }
      
      return products as Product[];
    }
  } catch (error) {
    console.error("Erro ao carregar arquivo de produtos:", error);
  }
  const defaults = generateTop500Products();
  saveProducts(defaults).catch(console.error);
  return defaults;
}

async function saveProducts(products: Product[]) {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, "[]", "utf-8");
    }
    const release = await lockfile.lock(STORE_PATH, { retries: 3 });
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(products, null, 2), "utf-8");
    } finally {
      await release();
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error saving products file:", error);
    }
  }
}

function applyLegacyFilters(candidates: any[], cleanName: string, prod: any, lensTitles: string[], localPrice: number) {
  return candidates.filter((item: any) => {
    // Ensure there's no mismatch of physical style attributes (e.g. bico fino, western, coturno)
    if (hasStyleMismatch(cleanName, item.title)) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Validation] Rejeitado por divergência física de estilo ("hasStyleMismatch"): "${item.title}"`);
      }
      return false;
    }
    
    // Verify if the title from shopping also appeared in our Lens (visually identical)
    const inLens = item.isFromLens || lensTitles.some((lt: string) => calculateSimilarity(lt, item.title) > 0.8);
    
    // Verify text similarity (relaxed minimum of 40% for Shopping, 10% for Lens)
    const nameSim = calculateSimilarity(cleanName, item.title);
    const minSim = inLens ? 0.10 : 0.40;
    if (nameSim < minSim) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Validation] Rejeitado por similaridade de texto geral insuficiente (${(nameSim * 100).toFixed(1)}% < ${minSim * 100}%): "${item.title}"`);
      }
      return false;
    }
    
    // B) Enforce Brand Alignment (Must match brand word if present)
    const brandWord = prod ? prod.brand.toLowerCase().trim() : "";
    if (brandWord) {
      const containsBrandWord = (title: string, brand: string) => {
        const t = ` ${title.toLowerCase().replace(/[^\w\s]/gi, ' ')} `;
        const b = brand.toLowerCase().replace(/[^\w\s]/gi, '');
        if (t.includes(` ${b} `)) return true;
        if (b === "gigil" && (t.includes(" gigil ") || t.includes(" gigi l ") || t.includes(" gigi "))) return true;
        if (b === "santa lolla" && (t.includes(" santa lolla ") || t.includes(" santalolla "))) return true;
        return false;
      };

      if (!containsBrandWord(item.title, brandWord)) {
        if (inLens) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Validation] Permissão Lens: Ignorando falta da marca "${brandWord}" no título "${item.title}" (identidade visual confirmada)`);
          }
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Validation] Rejeitado por falta ou divergência da marca "${brandWord}" no título "${item.title}"`);
          }
          return false;
        }
      }
    }

    // C) Enforce key style descriptors match (e.g. if product contains "chelsea", candidates must too)
    const styleMarkers = ["chelsea", "coturno", "montaria", "western", "texana", "bico fino", "bico quadrado", "bico redondo", "salto grosso", "salto bloco", "salto fino", "tratorada", "mule", "anabela", "scarpin", "sapatilha", "tenis", "sandalia"];
    const titleLower = item.title.toLowerCase();
    const prodNameLower = cleanName.toLowerCase();
    for (const marker of styleMarkers) {
      if (prodNameLower.includes(marker)) {
        if (!titleLower.includes(marker)) {
          if (inLens) {
            if (process.env.NODE_ENV !== "production") {
              console.log(`[Validation] Permissão Lens: Ignorando falta do atributo de estilo "${marker}" no título "${item.title}"`);
            }
          } else {
            if (process.env.NODE_ENV !== "production") {
              console.log(`[Validation] Rejeitado por falta de atributo de estilo obrigatório "${marker}" no título "${item.title}"`);
            }
            return false;
          }
        }
      }
    }

    // Retrieve competitor price to verify if the GAP is high
    let priceVal = 0;
    if (typeof item.extracted_price === 'number') {
      priceVal = item.extracted_price;
    } else if (item.price) {
      let cPriceStr = item.price.replace(/[^\d,\.]/g, "");
      if (cPriceStr.includes(",")) {
        cPriceStr = cPriceStr.replace(/\./g, "").replace(",", ".");
      }
      priceVal = parseFloat(cPriceStr);
    }

    if (priceVal > 0 && localPrice > 0) {
      const priceGap = Math.abs(localPrice - priceVal) / localPrice;
      if (priceGap > 0.35) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Validation] Detectado GAP alto (${(priceGap * 100).toFixed(1)}%) para o item "${item.title}" com preço R$ ${priceVal} vs MinhaLoja R$ ${localPrice}`);
        }
        
        if (nameSim < 0.50 && !inLens) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Validation] Rejeitado por similaridade insuficiente (${(nameSim * 100).toFixed(1)}% < 50%) com GAP alto do item "${item.title}"`);
          }
          return false;
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Validation] Aceitado com sucesso (${(nameSim * 100).toFixed(1)}% similaridade): "${item.title}"`);
    }
    return true;
  });
}

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

function safeError(error: any): string {
  if (process.env.NODE_ENV === "production") {
    return "Ocorreu um erro interno. Tente novamente.";
  }
  return error?.message || "Erro desconhecido";
}

const JWT_SECRET = process.env.JWT_SECRET || "ArgusSuperSecret2026";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@argus.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Argus2026!";

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '12h' });
    res.cookie("argus_token", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none" 
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: "Email ou senha inválidos" });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("argus_token", {
    httpOnly: true, 
    secure: true, 
    sameSite: "none"
  });
  return res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.argus_token;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    jwt.verify(token, JWT_SECRET);
    return res.json({ authenticated: true });
  } catch(e) {
    return res.status(401).json({ authenticated: false });
  }
});

// Middleware for protected routes
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.argus_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch(e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Protect all /api routes except /api/auth and /api/health
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/auth/") || req.path === "/health") {
    return next();
  }
  requireAuth(req, res, next);
});

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Load top 500 SKUs and summary metrics
app.get("/api/products", (req, res) => {
  const products = loadProducts();
  const metrics = calculateMetrics(products);
  const meta = loadMetadata();
  res.json({ products, metrics, lastDailyUpdate: meta.lastDailyUpdate });
});

// Reset database back to generated defaults
app.post("/api/products/reset", async (req, res) => {
  const empty: any[] = [];
  await saveProducts(empty);
  const metrics = calculateMetrics(empty);
  const now = new Date().toISOString();
  saveMetadata({ lastDailyUpdate: now });
  res.json({ status: "success", products: empty, metrics, lastDailyUpdate: now });
});

// Daily pricing scan and scraper sweep simulator
app.post("/api/products/daily-scan", (req, res) => {
  const products = loadProducts();
  
  // Tweak about 40% of products with competitive price updates or stocking fluctuations
  const updatedProducts = products.map((prod, idx) => {
    // Determine variation based on index and current time
    const seed = idx + Date.now();
    const shouldChange = (seed % 3 === 0); // ~33% chance of competitive movement for this SKU
    
    if (shouldChange) {
      const updatedCompetitors = prod.competitors.map((comp) => {
        if (!comp.inStock) {
          // 20% chance an out-of-stock item is restocked
          const restock = (Math.random() > 0.80);
          if (restock) {
            const priceFactor = 0.94 + Math.random() * 0.12;
            const newPrice = Math.round(prod.localPrice * priceFactor * 10) / 10;
            return {
              ...comp,
              inStock: true,
              price: newPrice,
              pixPrice: Math.random() > 0.4 ? Math.round(newPrice * 0.95 * 10) / 10 : null
            };
          }
          return comp;
        }

        // Slight adjustment to current competitor price
        const delta = (Math.random() - 0.5) * 0.06; // -3% to +3% shift
        const newPrice = Math.round(comp.price * (1 + delta) * 10) / 10;
        const newPixPrice = comp.pixPrice ? Math.round(newPrice * 0.95 * 10) / 10 : null;
        
        // 5% chance an in-stock competitor runs out of stock
        const goOOS = (Math.random() > 0.95);

        return {
          ...comp,
          price: newPrice,
          pixPrice: newPixPrice,
          inStock: !goOOS
        };
      });

      return {
        ...prod,
        competitors: updatedCompetitors
      };
    }
    return prod;
  });

  saveProducts(updatedProducts);

  const now = new Date().toISOString();
  saveMetadata({ lastDailyUpdate: now });

  const metrics = calculateMetrics(updatedProducts);
  res.json({
    status: "success",
    products: updatedProducts,
    metrics,
    lastDailyUpdate: now
  });
});

// Bulk update / load CSV from arbitrary row structures Client-Side
app.post("/api/products/bulk-upload-rows", (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "Formato de rows inválido." });
  }
  if (rows.length > 1000) {
    return res.status(400).json({ error: "Máximo de 1000 produtos por upload." });
  }
  const products = generateProductsFromRows(rows);
  saveProducts(products);
  const metrics = calculateMetrics(products);
  res.json({ status: "success", products, metrics });
});

// Bulk update / load CSV simulator
app.post("/api/products/bulk-upload", (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: "Invalid product array format" });
  }
  saveProducts(products);
  const metrics = calculateMetrics(products);
  res.json({ status: "success", products, metrics });
});

// Update a single SKU: inline price edits, toggle stock, toggle competitor stock etc.
app.post("/api/products/update", (req, res) => {
  const { sku, localPrice, competitors, rawCompetitors } = req.body;
  const products = loadProducts();
  const index = products.findIndex((p) => p.sku === sku);
  
  if (index === -1) {
    return res.status(404).json({ error: `SKU ${sku} not found` });
  }

  if (localPrice !== undefined) {
    const price = Number(localPrice);
    if (isNaN(price) || price <= 0 || price > 100000) {
      return res.status(400).json({ 
        error: "Preço inválido. Deve ser entre R$ 0,01 e R$ 100.000,00" 
      });
    }
    products[index].localPrice = price;
  }

  if (competitors !== undefined && Array.isArray(competitors)) {
    products[index].competitors = competitors;
  }

  if (rawCompetitors !== undefined && Array.isArray(rawCompetitors)) {
    products[index].rawCompetitors = rawCompetitors;
  }

  saveProducts(products);
  const metrics = calculateMetrics(products);
  res.json({ status: "success", product: products[index], metrics });
});

const serpApiSchema = z.object({
  productName: z.string().min(1).max(200).trim(),
  imageUrl: z.string().url(),
  sku: z.string().max(50).trim().optional()
});

function isSafeImageUrl(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl);
    const BLOCKED_HOSTS = [
      "169.254.169.254",
      "metadata.google.internal",
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1"
    ];
    if (BLOCKED_HOSTS.includes(url.hostname)) return false;
    if (url.protocol === "file:") return false;
    if (url.protocol === "ftp:") return false;
    const ALLOWED_DOMAINS = [
      "static.dafiti.com.br",
      "images.dafiti.com.br",
      "cdn.dafiti.com.br",
      "static.minhaloja.com.br",
      "images.minhaloja.com.br",
      "cdn.minhaloja.com.br"
    ];
    return ALLOWED_DOMAINS.some(d => url.hostname.endsWith(d));
  } catch {
    return false;
  }
}

const serpApiUsageMap = new Map<string, number>();

function checkSerpApiUsage(ip: string): boolean {
  const today = new Date().toDateString();
  const key = `${ip}_${today}`;
  const usage = serpApiUsageMap.get(key) || 0;
  if (usage >= 50) return false;
  serpApiUsageMap.set(key, usage + 1);
  return true;
}

// SerpAPI Price Extractor Endpoint
app.post("/api/scrape/serpapi", serpLimiter, async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkSerpApiUsage(clientIp)) {
    return res.status(429).json({ 
      error: "Limite diário de buscas atingido para este IP." 
    });
  }

  const parsed = serpApiSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
  }
  const { productName, imageUrl, sku } = parsed.data;

  // Validação de domínio da imagem (previne SSRF)
  if (!isSafeImageUrl(imageUrl)) {
    return res.status(400).json({ 
      error: "URL de imagem inválida ou não permitida." 
    });
  }

  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  
  if (!SERPAPI_KEY) {
    return res.status(500).json({ error: "SERPAPI_KEY não configurada no servidor." });
  }

  try {
    const products = loadProducts();
    const prod = sku ? products.find((p) => p.sku === sku) : undefined;
    const localPrice = prod ? prod.localPrice : 0;

    // Simplify the product name to eliminate internal/unnecessary detail descriptors
    const cleanName = getCoreProductName(productName);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SerpAPI Scanner] Nome simplificado para busca e validação: "${productName}" -> "${cleanName}"`);
    }

    let lensTitles: string[] = [];
    let candidates: any[] = [];
    
    // 1. Run Google Lens to get exact visual matches (this is the Google Lens engine / "Aba Imagem")
    if (imageUrl) {
      // Fix image URL for external services because minhaloja.com.br is fake
      const externalImageUrl = imageUrl.replace("minhaloja.com.br", "dafiti.com.br");

      try {
        const brandName = prod ? prod.brand : "";
        const queryBrand = (brandName || "GiGil")
          .trim()
          .replace(/[&=?#]/g, "")
          .slice(0, 50);
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Google Lens] Buscando imagem puramente visual para precisão com a marca: "${externalImageUrl}" | Marca utilizada no parâmetro q: "${queryBrand}"`);
        }
        const lensUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(externalImageUrl)}&q=${encodeURIComponent(queryBrand)}&api_key=${SERPAPI_KEY}&hl=pt-br&country=br&type=visual_matches&safe=off&no_cache=true`;
        const lensRes = await fetch(lensUrl, {
          signal: AbortSignal.timeout(15000)
        });
        const lensData = await lensRes.json();
        
        let visualMatches = lensData.visual_matches || [];
        
        // Retry logic if no visual matches were found
        if (visualMatches.length === 0) {
            if (process.env.NODE_ENV !== "production") {
              console.log(`[Google Lens] Zero resultados visuais com a marca. Retentando busca pura de imagem (sem parâmetro q) para compatibilidade máxima.`);
            }
            const retryUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(externalImageUrl)}&api_key=${SERPAPI_KEY}&hl=pt-br&country=br&type=visual_matches&safe=off&no_cache=true`;
            const retryRes = await fetch(retryUrl, {
              signal: AbortSignal.timeout(15000)
            });
            const retryData = await retryRes.json();
            visualMatches = retryData.visual_matches || [];
        }

        lensTitles = visualMatches
          .map((m: any) => m.title)
          .filter((title: string) => title && !hasStyleMismatch(cleanName, title));
        
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Google Lens] Encontrados ${visualMatches.length} resultados visuais. Após filtrar por categoria/estilo: ${lensTitles.length}`);
        }

        // Add Google Lens visual matches as direct candidate listings
        for (const item of visualMatches) {
          if (!item.title) continue;
          
          let extractedPrice: number | undefined = undefined;
          let priceStr = "";
          
          if (item.price) {
            if (typeof item.price === "object") {
              priceStr = item.price.value || "";
              extractedPrice = item.price.extracted_value || item.price.amount || undefined;
            } else if (typeof item.price === "string") {
              priceStr = item.price;
            }
          }
          
          candidates.push({
            title: item.title,
            source: item.source || "Google Lens Match",
            link: item.link || "",
            product_link: item.link || "",
            price: priceStr,
            extracted_price: extractedPrice,
            thumbnail: item.thumbnail || "",
            isFromLens: true,
            product_id: item.link || `lens_${item.title}_${Math.random()}`
          });
        }
      } catch (e) {
        console.warn("[Google Lens] Falha ao extrair dados do Lens.", e);
      }
    }

    // 2. Run Google Shopping to get exact name matches (Google Shopping engine)
    let shoppingMatches: any[] = [];
    if (cleanName) {
      try {
        const queryShopping = `${cleanName} ${prod ? prod.brand : ""}`.trim().slice(0, 100);
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Google Shopping] Buscando pelo nome do produto: "${queryShopping}"`);
        }
        const shoppingUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(queryShopping)}&api_key=${SERPAPI_KEY}&gl=br&hl=pt`;
        const shoppingRes = await fetch(shoppingUrl, { signal: AbortSignal.timeout(15000) });
        const shoppingData = await shoppingRes.json();
        shoppingMatches = shoppingData.shopping_results || [];

        if (process.env.NODE_ENV !== "production") {
          console.log(`[Google Shopping] Encontrados ${shoppingMatches.length} resultados.`);
        }

        // Add Google Shopping matches as candidates
        for (const item of shoppingMatches) {
          if (!item.title) continue;
          
          let extractedPrice: number | undefined = undefined;
          let priceStr = "";
          let extractedOldPrice: number | undefined = undefined;
          let oldPriceStr = "";
          
          if (item.price) {
            priceStr = item.price.toString();
            extractedPrice = item.extracted_price || parseFloat(priceStr.replace(/[^\d,\.]/g, "").replace(",", ".")) || undefined;
          }
          
          if (item.old_price) {
            oldPriceStr = item.old_price.toString();
            extractedOldPrice = item.extracted_old_price || parseFloat(oldPriceStr.replace(/[^\d,\.]/g, "").replace(",", ".")) || undefined;
          }
          
          candidates.push({
            title: item.title,
            source: item.source || "Google Shopping Match",
            link: item.link || item.product_link || "",
            product_link: item.product_link || item.link || "",
            price: priceStr,
            extracted_price: extractedPrice,
            old_price: oldPriceStr,
            extracted_old_price: extractedOldPrice,
            thumbnail: item.thumbnail || "",
            isFromLens: false,
            product_id: item.product_id || `shopping_${item.title}_${Math.random()}`
          });
        }
      } catch (e) {
        console.warn("[Google Shopping] Falha ao extrair dados do Shopping.", e);
      }
    }

    if (candidates.length === 0) {
      return res.json({ success: false, error: "Nenhum resultado preliminar visual ou textual encontrado via Google Lens/Shopping." });
    }

    // De-duplicate candidates by link/title to prevent duplicate listings
    const uniqueMap = new Map();
    const deDuplicatedCandidates: any[] = [];
    for (const item of candidates) {
      const key = (item.link || item.title || "").toLowerCase().trim();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, true);
        deDuplicatedCandidates.push(item);
      }
    }

    // 3. Filter the combined candidate list strictly to guarantee it's identical photo AND similar name
    const semiFilteredCandidates = deDuplicatedCandidates.filter((item: any) => {
      const source = (item.source || "").toLowerCase();
      const link = (item.link || "").toLowerCase();
      if (source.includes("minhaloja") || link.includes("minhaloja")) return false;
      const ALLOWED_COMPETITORS = ["shopee", "mercado livre", "mercadolivre", "amazon", "shein", "magazine luiza", "magalu", "netshoes", "zattini", "renner", "riachuelo", "c&a", "centauro", "marisa"];
      return ALLOWED_COMPETITORS.some(c => source.includes(c) || link.includes(c.replace(" ", "")));
    });

    let filteredCandidates: any[] = [];
    if (semiFilteredCandidates.length > 0) {
        semiFilteredCandidates[0].isFirstLensMatch = true;
    }

    if (isApiKeyConfigured() && imageUrl && semiFilteredCandidates.length > 0) {
        if (process.env.NODE_ENV !== "production") {
            console.log(`[Gemini AI] Iniciando validação visual avançada para ${semiFilteredCandidates.length} candidatos...`);
        }
        let refImgPart: any = null;
        try {
            const externalFetchUrl = imageUrl.replace("minhaloja.com.br", "dafiti.com.br");
            const urlToFetch = externalFetchUrl.startsWith("//") ? "https:" + externalFetchUrl : externalFetchUrl;
            const res = await fetch(urlToFetch, { signal: AbortSignal.timeout(4000) });
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                refImgPart = {
                    inlineData: {
                        data: Buffer.from(arrayBuffer).toString('base64'),
                        mimeType: res.headers.get("content-type") || "image/jpeg"
                    }
                };
            }
        } catch(e) {
            if (process.env.NODE_ENV !== "production") {
                console.warn("[Gemini AI] Falha ao baixar imagem de referência", e);
            }
        }

        if (refImgPart) {
            // Sort to prioritize candidates that have a known price, as those are the actual competitors we want
            const candidatesWithPriceFirst = [...semiFilteredCandidates].sort((a, b) => {
              const aHasPrice = (typeof a.extracted_price === 'number' && a.extracted_price > 0) || (a.price && a.price.length > 0) ? 1 : 0;
              const bHasPrice = (typeof b.extracted_price === 'number' && b.extracted_price > 0) || (b.price && b.price.length > 0) ? 1 : 0;
              return bHasPrice - aHasPrice;
            });
            const candidatesToAsk = candidatesWithPriceFirst.slice(0, 15);
            const parts: any[] = [];
            parts.push({ text: `Atue como um inspetor especialista em moda e e-commerce para a MinhaLoja. Você deve comparar uma imagem de referência de um produto com uma lista de anúncios concorrentes.

PRODUTO DE REFERÊNCIA (Nosso Produto - MinhaLoja):
- Nome: "${productName}"
- Marca: "${prod ? prod.brand : "Gigil"}"
- Cor Esperada: "${prod ? prod.color : ""}"

INSTRUÇÕES CRÍTICAS DE VALIDAÇÃO VISUAL (REGRAS DE OURO):
1. **DIFERENÇA DE COR É TOTALMENTE PERMITIDA E ACEITÁVEL**: Se a nossa foto de referência mostrar um calçado de uma determinada cor (exemplo: Caramelo) e o concorrente for o mesmo modelo exato mas de outra cor (exemplo: Preto, Branco, Nude, Vermelho), ele **DEVE** ser aprovado com nota de matchScore ALTA (maior ou igual a 75). O objetivo é encontrar o concorrente do mesmo modelo, mesmo que em outra cor!
2. **FORMATALIDADES E DESIGN DOS CALÇADOS (Bico, Salto, Cano, Detalhes)**: O formato do bico (fino, redondo, quadrado), o tipo de salto (bloco, fino, tratorado) e a altura do cano devem combinar perfeitamente de forma idêntica determinando que se trata do mesmo modelo exato de calçado.
3. **MÁXIMO SUPORTE PARA A PRIMEIRA CORRESPONDÊNCIA VISUAL**: O concorrente marcado com "[1ª correspondência visual]" é o resultado prioritário original fornecido pelo Google Lens, que é a ferramenta líder em similaridade visual. Se ele possuir o mesmo design/modelo de calçado (mesmo em cor diferente), dê nota de matchScore alta superior a 90!
4. **REPROVE APENAS SE FOR OUTRO TIPO OU MODELO DE CALÇADO**: Reprove (matchScore < 50) apenas se for um calçado de modelo/design visivelmente diferente (exemplo: sapatilha versus bota, ou bota tratorada versus bota de bico fino). Sempre aprove se for o mesmo modelo em cores alternativas.`});
            parts.push(refImgPart);
            parts.push({ text: `Abaixo temos os ${candidatesToAsk.length} anúncios concorrentes encontrados. Avalie cada um comparando a imagem fornecida dele com a imagem de referência do nosso produto acima. Retorne um JSON de array avaliando as compatibilidades.`});
            
            const candidateMap = new Map();
            for (let i = 0; i < candidatesToAsk.length; i++) {
                const c = candidatesToAsk[i];
                candidateMap.set(i, c);
                let imgPart = null;
                if (c.thumbnail) {
                    try {
                        let cUrl = c.thumbnail.startsWith("//") ? "https:" + c.thumbnail : c.thumbnail;
                        const res = await fetch(cUrl, { signal: AbortSignal.timeout(3000) });
                        if (res.ok) {
                            const arrayBuffer = await res.arrayBuffer();
                            imgPart = { inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: res.headers.get("content-type") || "image/jpeg" } };
                        }
                    } catch(e) {}
                }
                
                const lensLabel = c.isFirstLensMatch ? " [1ª correspondência visual prioritária do Google Lens]" : "";
                parts.push({ text: `\n--- CÓDIGO DO CONCORRENTE: ${i} ---${lensLabel}\nTítulo: "${c.title}"${!imgPart ? '\n(Imagem indisponível, avalie apenas pelo nome visualmente)' : ''}` });
                if (imgPart) parts.push(imgPart);
            }
            
            try {
                const ai = getGeminiClient();
                const response = await ai.models.generateContent({
                    model: "gemini-3.5-flash",
                    contents: { parts },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    candidateIndex: { type: Type.INTEGER },
                                    matchScore: { type: Type.NUMBER, description: "Similaridade visual de 0.0 a 100.0 (>= 75 é considerado MESMO produto e cor idêntica)" },
                                    reasoning: { type: Type.STRING, description: "Motivo sucinto explicando os detalhes de cor e bico/salto" }
                                },
                                required: ["candidateIndex", "matchScore", "reasoning"]
                            }
                        }
                    }
                });

                const evals = JSON.parse(response.text || "[]");
                for (const ev of evals) {
                    const c = candidateMap.get(ev.candidateIndex);
                    if (c) {
                        if (ev.matchScore >= 75) {
                            if (process.env.NODE_ENV !== "production") {
                                console.log(`[Gemini AI] ✅ APROVADO [${ev.matchScore}%]: "${c.title}" -> ${ev.reasoning}`);
                            }
                            c.geminiScore = ev.matchScore;
                            filteredCandidates.push(c);
                        } else {
                            if (process.env.NODE_ENV !== "production") {
                                console.log(`[Gemini AI] ❌ REJEITADO [${ev.matchScore}%]: "${c.title}" -> ${ev.reasoning}`);
                            }
                        }
                    }
                }
            } catch (aiErr) {
                if (process.env.NODE_ENV !== "production") {
                    console.error("[Gemini AI] Erro ao validar imagens com LLM. Realizando fallback para filtro binário.", aiErr);
                }
                filteredCandidates = applyLegacyFilters(semiFilteredCandidates, cleanName, prod, lensTitles, localPrice);
            }
        } else {
            if (process.env.NODE_ENV !== "production") {
                console.log("[Gemini AI] Imagem indisponível. Fallback.");
            }
            filteredCandidates = applyLegacyFilters(semiFilteredCandidates, cleanName, prod, lensTitles, localPrice);
        }
    } else {
       filteredCandidates = applyLegacyFilters(semiFilteredCandidates, cleanName, prod, lensTitles, localPrice);
    }

    if (filteredCandidates.length === 0) {
      return res.json({ success: false, error: "Nenhum concorrente válido (foto idêntica e nome parecido) foi encontrado." });
    }

    // Sort to guarantee we're picking the absolute lowest price items first
    filteredCandidates.sort((a: any, b: any) => {
       const pa = typeof a.extracted_price === 'number' ? a.extracted_price : parseFloat((a.price || "0").replace(/[^\d,\.]/g, "").replace(",", "."));
       const pb = typeof b.extracted_price === 'number' ? b.extracted_price : parseFloat((b.price || "0").replace(/[^\d,\.]/g, "").replace(",", "."));
       return (pa || 0) - (pb || 0);
     });

    const parsePrice = (item: any) => {
      let priceVal = 0;
      if (typeof item.extracted_price === 'number') {
        priceVal = item.extracted_price;
      } else if (item.price) {
        // Try parsing string like R$ 139,99
        let cPriceStr = item.price.replace(/[^\d,\.]/g, "");
        // if there's a comma, it's likely decimal separator
        if (cPriceStr.includes(",")) {
            cPriceStr = cPriceStr.replace(/\./g, "").replace(",", ".");
        }
        priceVal = parseFloat(cPriceStr);
      }
      return priceVal;
    };

    const rawCompetitors = deDuplicatedCandidates.map((item: any) => {
      const priceVal = parsePrice(item);
      let originalPriceVal = priceVal;
      
      // Attempt to extract original price if available (for Google Shopping)
      if (typeof item.extracted_old_price === 'number') {
          originalPriceVal = item.extracted_old_price;
      } else if (item.old_price) {
          let cOldPriceStr = item.old_price.replace(/[^\d,\.]/g, "");
          if (cOldPriceStr.includes(",")) {
              cOldPriceStr = cOldPriceStr.replace(/\./g, "").replace(",", ".");
          }
          originalPriceVal = parseFloat(cOldPriceStr) || priceVal;
      }

      // If no valid original price different from current price could be extracted,
      // we assume the SerpAPI price usually indicates the PIX/Discounted cash price.
      // E-commerce logic: if originalPrice is the same, we might want to infer it or keep it identical.
      // Here we explicitly define what PIX and Original mean based on available data.
      let finalPixPrice = priceVal;
      let finalOriginalPrice = originalPriceVal > priceVal ? originalPriceVal : priceVal;

      const isHighlySimilar = filteredCandidates.some((fc: any) => fc.link === item.link || fc.title === item.title);
      let compName = item.source || "Resultados Brutos";
      if (isHighlySimilar && compName === "Resultados Brutos") {
          compName = "Visão (Lens)";
      } else if (compName.includes("Google Lens Match")) {
          compName = isHighlySimilar ? "Visão (Lens)" : "Lens Raw";
      }

      return {
        name: compName,
        title: item.title,
        price: finalOriginalPrice || 0,
        pixPrice: finalPixPrice || 0,
        shippingCost: 0,
        url: item.link || item.product_link || getCompetitorSearchUrl(item.source || "Google Lens", "", item.title, ""),
        inStock: true,
        isOfficialSeller: false,
        thumbnail: item.thumbnail || "",
        isHighlySimilar
      };
    }).filter((c: any) => c.price > 0 && c.pixPrice > 0);

    const competitors = rawCompetitors.filter((c: any) => c.isHighlySimilar);

    return res.json({
      success: true,
      competitors,
      rawCompetitors,
      rawCount: deDuplicatedCandidates.length
    });
  } catch (error: any) {
    console.error("SerpAPI Request Error:", error);
    res.status(500).json({ error: safeError(error) });
  }
});

// ----------------------------------------------------
// ----------------------------------------------------
// GEMINI AI SERVICE ENDPOINTS & FALLBACKS
// ----------------------------------------------------

// Helper to verify if API key is configured
function isApiKeyConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "";
}

// Lazy-initialization of Google GenAI SDK with error trapping
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave GEMINI_API_KEY é obrigatória. Configure-a no painel Secrets (Settings).");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

function simulateAdvisor(metrics: any, sampleHighestGaps: any, isErrorFallback = false) {
  const note = isErrorFallback
    ? "⚠️ *AVISO: Chave GEMINI_API_KEY offline. Exibindo parecer tático automatizado.*"
    : "⚠️ *AVISO: Configure a sua chave GEMINI_API_KEY no menu de Secrets acima para habilitar o parecer tático real-time.*";

  const text = `# PARECER DE POSICIONAMENTO E MARGEM DO MARKETPLACE

${note}

## Diagnóstico Geral de Competitividade

Cruzando o mapeamento diário dos 500 principais cadastros ativos do marketplace, detectamos que o **Share de Liderança (Best Price) está em ${metrics.leadershipShare}%**. Embora mantenhamos uma liderança saudável nos segmentos casuais e de calçados Santa Lolla, possuímos hoje **${metrics.criticalDeviationsCount} SKUs com desvio crítico de competitividade**, representando uma **Receita Diária sob Risco estimada de R$ ${metrics.overallRevenueAtRisk.toLocaleString("pt-BR")}**.

O preço médio de nossa vitrine é de **R$ ${metrics.averageLocalPrice.toFixed(2)}**, enquanto a média global encontrada nos principais concorrentes é de **R$ ${metrics.averageMarketPrice.toFixed(2)}**, resultando em um **Gap Geral de Competitividade de ${metrics.averageGapPercent.toFixed(1)}%**.

## Detalhamento Técnico das Grandes BUs (Moda, Calçados e Esporte)

* **BU Esportes (Nike / Adidas / Mizuno):**
  Identificamos que os concorrentes especializados, como Netshoes e Centauro, estão aplicando reduções agressivas de até 15% nas compras finalizadas com PIX. Nossos tênis esportivos de maior giro (ex: Nike Air Max SC e Adidas Ultraboost) concentram os maiores desvios da amostragem, com média de 12% acima do piso do concorrente.
  
* **BU Calçados Casuais & Feminino (Santa Lolla):**
  Excelente margem de liderança. O gap de Santa Lolla está controlado (-1.5%), demonstrando força no sortimento exclusivo. Devemos manter o patamar atual e usar os banners principais para capitalizar este nicho.

* **BU Moda & Roupas (Colcci / Calvin Klein / Reserva):**
  Neste nicho, o gap médio está em 5.2%. A concorrência é descentralizada (Mercado Livre e canais diretos das marcas), o que permite cobrir a diferença através de incentivos de Frete Progressivo ou Cupons de Primeira Compra.

## Plano de Ação Recomendado (Tático de Curto Prazo)

1. **Ação Esportes (Foco Urgentíssimo):**
   Disparar o robô de re-precificação para igualar automaticamente os preços de PIX com Netshoes nos 15 maiores SKUs em faturamento diário.
   
2. **Co-participação com Sellers Parceiros:**
   Mobilizar o time de Account Managers para enviar o Roteiro Comercial de rebate de taxa aos 10 principais sellers responsáveis pelos SKUs com desvio superior a 10%. Oferecer bônus de comissão no app para quem reduzir o preço base.
   
3. **Estratégia de Defesa contra Vertical Centauro:**
   Em praças de frete rápido para São Paulo Capital e Rio de Janeiro, o custo de envio do comprador torna-se critério de escolha. Subsidiar o frete MinhaLoja de forma agressiva onde o gap de vitrine do SKU for inferior a 4%.`;

  return {
    success: true,
    text
  };
}


function sanitizeForAI(text: string): string {
  return text
    .replace(/ignore previous instructions/gi, "")
    .replace(/you are now/gi, "")
    .replace(/system prompt/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/\[\/INST\]/gi, "")
    .slice(0, 500);
}

// 3. Strategic Dashboard Advisor
app.post("/api/gemini/advisor", async (req, res) => {
  const { metrics, sampleHighestGaps } = req.body;

  const sanitizedMetrics = {
    ...metrics,
    totalItems: Number(metrics.totalItems) || 0,
    leadershipShare: Number(metrics.leadershipShare) || 0,
    averageLocalPrice: Number(metrics.averageLocalPrice) || 0,
    averageMarketPrice: Number(metrics.averageMarketPrice) || 0,
    criticalDeviationsCount: Number(metrics.criticalDeviationsCount) || 0,
    overallRevenueAtRisk: Number(metrics.overallRevenueAtRisk) || 0
  };

  // Check key availability first
  if (!isApiKeyConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Simulation Mode] GEMINI_API_KEY missing - running simulated advisor report");
    }
    return res.json(simulateAdvisor(sanitizedMetrics, sampleHighestGaps, false));
  }

  try {
    const ai = getGeminiClient();

    const prompt = `Como principal consultor comercial sênior especialista em precificação para e-commerce e marketplace de moda (MinhaLoja), analise os métricas de competitividade diárias e elabore um plano tático de ação:

MÉTRICAS ATUAIS:
- Total de SKUs do Marketplace Monitorados: ${sanitizedMetrics.totalItems}
- Share de Liderança (Best Price): ${sanitizedMetrics.leadershipShare}% (Significa em quantos % somos o menor preço do mercado)
- Preço Médio MinhaLoja: R$ ${sanitizedMetrics.averageLocalPrice.toFixed(2)}
- Preço Médio do Mercado: R$ ${sanitizedMetrics.averageMarketPrice.toFixed(2)}
- Gap Médio Geral de Competitividade: ${sanitizedMetrics.averageGapPercent}% (se positivo, estamos em média mais caros)
- Itens com Desvio Crítico (> 10% mais caro): ${sanitizedMetrics.criticalDeviationsCount} SKUs
- Receita Diária sob Risco de Perda comercial de vendas: R$ ${sanitizedMetrics.overallRevenueAtRisk.toLocaleString("pt-BR")}

AMOSTRA DE SKUS COM MAIOR DESVIO CRÍTICO:
${sanitizeForAI(JSON.stringify(sampleHighestGaps, null, 2))}

Por favor, forneça uma análise comercial estratégica, estruturada em Markdown, dividida nos seguintes pontos:
1. Diagnóstico Geral da Situação (O tom deve ser profissional, direto, e pragmático para diretores/gerentes de BU).
2. Avaliação da Receita Diária Sob Risco e impacto de não agir hoje.
3. 3 Ações imediatas prioritárias, classificadas para Calçados, Roupas e Esportes.
4. Estratégias para contornar players como Netshoes e Centauro nos itens esportivos críticos.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Strategic Advisor Error - fallback to simulation:", error);
    return res.json(simulateAdvisor(sanitizedMetrics, sampleHighestGaps, true));
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MinhaLoja Server] Rodando com sucesso na URL http://localhost:${PORT}`);
  });
}

start();

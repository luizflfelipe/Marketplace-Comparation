# Arquitetura

## Visão Geral

Argus Pricing é uma aplicação full-stack em um único projeto Node.js. O Express serve a API e, em desenvolvimento, injeta o Vite como middleware. Em produção, o frontend React é compilado para `dist/` e servido pelo mesmo processo Node.

```text
Browser React
  | fetch /api/*
Express server.ts
  | JSON local + lockfile
  | SerpAPI Google Lens/Shopping
  | Gemini advisor/validação visual
Arquivo minhaloja-data-store.json
Arquivo minhaloja-metadata.json
```

## Stack

- Runtime: Node.js 20+.
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React, Motion.
- Backend: Express 4, Zod, Helmet, CORS, cookie-parser, jsonwebtoken, express-rate-limit, Winston, proper-lockfile.
- Dados e relatórios: PapaParse, ExcelJS, jsPDF.
- Integrações externas: SerpAPI e Google Gemini via `@google/genai`.

## Componentes

### Frontend

- `src/main.tsx`: bootstrap React.
- `src/App.tsx`: autenticação, carregamento de produtos, upload, exportação, reset, varredura diária e roteamento de abas.
- `src/components/Login.tsx`: formulário de login em `/api/auth/login`.
- `src/components/DashboardStats.tsx`: KPIs executivos e acionamento do Strategic Advisor.
- `src/components/ProductTable.tsx`: tabela paginada, filtros, ordenação, edição e busca de concorrentes por SKU.
- `src/components/StatusDashboardView.tsx`: visão agregada por status R2/S2.
- `src/components/StrategicAdvisor.tsx`: modal de análise via `/api/gemini/advisor`.
- `src/utils/pdfGenerator.ts`: exportação PDF.
- `src/utils.ts`: status de preço e sanitização de links externos no cliente.

### Backend

- `server.ts`: API HTTP, autenticação, validação, persistência, scraping, IA e Vite middleware.
- `src/data/importMapper.ts`: detecção e normalização de colunas de planilha.
- `src/data/mockProducts.ts`: geração de base demonstrativa, URLs de busca e cálculo de métricas.
- `src/types.ts`: contratos `Product`, `CompetitorPrice`, `CompetitivenessMetrics` e `AIResearchResult`.

## Fluxos Principais

### Login

1. Frontend chama `POST /api/auth/login`.
2. Backend valida `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
3. Backend cria JWT de 12h e grava cookie `argus_token`.
4. Frontend usa `GET /api/auth/me` para restaurar sessão.

### Carregamento do Painel

1. `App.tsx` chama `GET /api/products`.
2. `server.ts` lê `minhaloja-data-store.json`.
3. Se o arquivo não existir ou estiver inválido, `generateTop500Products()` cria base a partir de `src/data/minhaloja.csv`.
4. `calculateMetrics()` calcula KPIs e retorna produtos, métricas e `lastDailyUpdate`.

### Importação de Planilha

1. Usuário seleciona `.csv` ou `.xlsx`.
2. Frontend parseia arquivo com PapaParse ou ExcelJS.
3. Frontend envia linhas cruas para `POST /api/products/bulk-upload-rows`.
4. Backend detecta colunas com `detectImportMapping()`.
5. Se campos obrigatórios estiverem confiáveis, importa direto.
6. Se faltar SKU, produto ou preço, ou houver ambiguidade, retorna `needs_review`.
7. Frontend abre modal de revisão de colunas e reenvia com `mapping`.
8. Backend normaliza linhas e persiste produtos gerados.

### Busca de Concorrentes

1. Usuário aciona busca na linha do produto.
2. Frontend chama `POST /api/scrape/serpapi` com `productName`, `imageUrl` e `sku`.
3. Backend valida URL da imagem contra allowlist e proteção SSRF.
4. Backend chama Google Lens e Google Shopping via SerpAPI.
5. Candidatos são deduplicados, filtrados por marketplace permitido e removem a própria MinhaLoja.
6. Se `GEMINI_API_KEY` existir, Gemini valida visualmente os melhores candidatos.
7. Se Gemini falhar ou não houver imagem, filtros legados por similaridade textual entram.
8. Resposta separa `competitors` aprovados e `rawCompetitors` brutos.

### Strategic Advisor

1. `StrategicAdvisor.tsx` monta amostra de maiores gaps.
2. Frontend chama `POST /api/gemini/advisor`.
3. Se `GEMINI_API_KEY` estiver ausente, backend retorna análise simulada.
4. Se a chave existir, Gemini gera parecer em Markdown.

## Persistência

Arquivos gerados na raiz:

- `minhaloja-data-store.json`: lista completa de produtos e concorrentes.
- `minhaloja-metadata.json`: metadados, hoje `lastDailyUpdate`.

`saveProducts()` usa `proper-lockfile` para reduzir risco de escrita concorrente em instância única. Este armazenamento não é adequado para múltiplas instâncias simultâneas; para escala horizontal, migrar para banco compartilhado.

## Decisões Técnicas

- Backend e frontend no mesmo processo simplificam deploy em VPS única.
- Chaves externas ficam no servidor, nunca no navegador.
- Importação faz parsing no cliente e validação final no servidor.
- JSON local prioriza operação simples e portabilidade.
- SerpAPI fica protegido por autenticação, rate limit, limite diário por IP e allowlist de imagem.
- Gemini é opcional no advisor; busca visual continua com fallback textual.

## Limites Conhecidos

- Não há migração de esquema para o JSON local.
- `serpApiUsageMap` fica em memória e reinicia com processo.
- `minhaloja-data-store.json` não deve ser compartilhado por múltiplos processos.
- Testes E2E exigem servidor já rodando em `http://localhost:3000`.
- O nome do package ainda é `react-example` em `package.json`, embora produto e docs usem Argus Pricing.

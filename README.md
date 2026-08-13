<div align="center">

# 🔍 Argus Pricing — Marketplace Intelligence

**Plataforma open source de inteligência de preços para sellers de marketplace brasileiro.**

Encontra concorrentes automaticamente por imagem e nome do produto, calcula o gap de competitividade e gera análises estratégicas com IA.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/Licença-Apache%202.0-blue?style=flat-square)](LICENSE)

</div>

---

## 🧠 O que é

**Argus Pricing** é uma ferramenta de monitoramento de preços que usa **busca visual por imagem** (Google Lens via SerpAPI) combinada com **validação por IA** (Google Gemini) para encontrar os seus concorrentes diretos nos principais marketplaces brasileiros — Mercado Livre, Shopee, Magalu, Netshoes e outros.

## 📚 Documentação Técnica

A documentação operacional completa fica em [`docs/README.md`](docs/README.md):

- Arquitetura e fluxos: [`docs/architecture.md`](docs/architecture.md)
- Contratos de API: [`docs/api.md`](docs/api.md)
- Importação de planilhas: [`docs/data-import.md`](docs/data-import.md)
- Runbook de operação: [`docs/runbook.md`](docs/runbook.md)
- Testes e cobertura: [`docs/testing.md`](docs/testing.md)
- Segurança: [`docs/security.md`](docs/security.md)

Diferente das ferramentas tradicionais que fazem matching por EAN ou SKU, o Argus Pricing usa a **foto do seu anúncio** como vetor de busca, garantindo resultados visualmente compatíveis com o seu produto real.

---

## ✨ Funcionalidades

- 📤 **Upload de planilha** — importe seus produtos via `.csv` ou `.xlsx`
- 🔍 **Matching visual** — busca concorrentes pela imagem + nome do produto
- 🎯 **Score de compatibilidade** — cada resultado é validado por similaridade antes de ser exibido
- 📊 **Painel de auditoria** — gap de preço, status de competitividade e melhor concorrente por SKU
- 🔄 **Varredura diária** — atualize as cotações do mercado com um clique
- 📥 **Exportação Excel** — relatório completo com links diretos para os anúncios
- 📈 **Dashboard de status** — gráficos de distribuição por status e divisão

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express |
| Busca visual | Google Lens via SerpAPI |
| Validação IA | Google Gemini (gemini-2.5-flash) |
| Gráficos | Recharts |
| Planilhas | ExcelJS + PapaParse |
| Segurança | Helmet + express-rate-limit + Zod |

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js 20+**
- Conta na [SerpAPI](https://serpapi.com) — plano gratuito tem 250 buscas/mês
- Chave da [Google Gemini API](https://ai.google.dev) — opcional, ativa o Advisor IA

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/luizflfelipe/Marketplace-Comparation
cd Marketplace-Comparation

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Abra o .env e preencha suas chaves

# 4. Rode
npm run dev
```

Acesse em **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Configuração

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SERPAPI_KEY` | ✅ Sim | Chave da SerpAPI para busca por imagem |
| `GEMINI_API_KEY` | ⬜ Opcional | Ativa o Advisor IA com Gemini |
| `ADMIN_TOKEN` | ✅ Sim | Token seguro para o endpoint de reset |
| `ALLOWED_ORIGIN` | ✅ Sim | Domínio permitido no CORS |
| `NODE_ENV` | ⬜ Opcional | `development` ou `production` |

> ⚠️ **Nunca commite o arquivo `.env`** — ele já está no `.gitignore`

---

## 📋 Como usar

### 1. Prepare sua planilha

O sistema aceita `.csv` ou `.xlsx` com as colunas abaixo. Nomes alternativos em português também são reconhecidos.

| Coluna | Alternativas | Descrição |
|---|---|---|
| `Sku Config` | `SKU`, `sku` | Código único do produto |
| `Product Name` | `Nome`, `Produto` | Nome completo |
| `Brand` | `Marca` | Marca do produto |
| `Color` | `Cor` | Cor |
| `Current Price` | `Preço`, `Price` | Preço atual (ex: `R$91,99`) |
| `Division` | `Divisão` | Ex: Feminino, Masculino |
| `Category` | `Categoria` | Ex: Bota, Tênis, Camiseta |
| `Main Image` | `Imagem`, `Image` | URL da imagem do produto |

### 2. Importe e busque concorrentes

1. Clique em **IMPORTAR** e selecione sua planilha
2. Na tabela, clique em **Buscar Preços Web** em qualquer produto
3. O sistema busca visualmente, valida por nome e marca, e retorna os concorrentes com maior compatibilidade

### 3. Analise os resultados

| Indicador | Significado |
|---|---|
| 🟢 Melhor Preço | Seu preço é menor que todos os concorrentes |
| 🔵 Melhor Preço a Prazo | Você perde no PIX mas ganha no preço à vista |
| 🟡 Igual ao Mercado | Preço empatado com o concorrente |
| 🔴 Perde Preço | Concorrente está mais barato |
| ⚫ Sem Concorrentes | Nenhum concorrente encontrado em estoque |

Produtos com **gap acima de 10%** são marcados como desvio crítico.

## 🔒 Segurança

- CORS restrito por origem configurável
- Rate limiting global (200 req/15min) e por endpoint de busca (20 req/min)
- Validação de todos os inputs com Zod
- Proteção contra SSRF — URLs de imagem são validadas por lista de domínios permitidos
- Headers de segurança via Helmet (CSP, HSTS, X-Frame-Options)
- Token obrigatório para operações administrativas
- File locking para evitar race conditions ao salvar dados

---

## 🧪 Testes

```bash
# Testes unitários de lógica do backend
npx tsx test-backend.ts

# Testes E2E de segurança (requer servidor rodando em localhost:3000)
npx tsx test-security-e2e.ts
```

Cobertura dos testes:

- Algoritmo de similaridade de nomes (`calculateSimilarity`)
- Detecção de mismatch físico de produto (`hasStyleMismatch`)
- Limpeza de nome para busca (`getCoreProductName`, `getOptimizedSearchQuery`)
- Autenticação do endpoint de reset (401 sem token, 200 com token correto)
- Limite de 1.000 produtos por upload
- Proteção SSRF no endpoint de scraping

---

## 📁 Estrutura

```
/
├── server.ts                # API Express + lógica de busca e validação
├── App.tsx                  # Layout principal e orquestração de estado
├── types.ts                 # Interfaces TypeScript
├── utils.ts                 # Cálculo de status de competitividade
├── index.css                # Tema e estilos globais
├── mockProducts.ts          # Gerador de dados + cálculo de métricas
├── DashboardStats.tsx       # Cards de KPIs
├── ProductTable.tsx         # Tabela de auditoria de SKUs
├── StrategicAdvisor.tsx     # Modal do Advisor IA
├── StatusDashboardView.tsx  # Dashboard com gráficos Recharts
├── ChartsView.tsx           # Gráficos de análise por BU
├── test-backend.ts          # Testes unitários
├── test-security-e2e.ts     # Testes E2E de segurança
└── .env.example             # Template de variáveis de ambiente
```

---

## 🗺️ Roadmap

- [ ] Arquitetura multi-tenant para atender múltiplos clientes
- [ ] Importação de planilha em formato livre (qualquer plataforma de e-commerce)
- [ ] Histórico de preços por SKU com gráfico de evolução temporal
- [ ] Alertas automáticos por e-mail quando gap crítico é detectado
- [ ] Integração nativa com API do Mercado Livre e Shopee
- [ ] Reprecificação automática com regras configuráveis por categoria
- [ ] Painel administrativo para gestão de planos e clientes (SaaS)
- [ ] Suporte a EAN/GTIN para matching complementar ao visual

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Abra uma issue descrevendo o problema ou a funcionalidade, ou envie um pull request diretamente.

```bash
# Fork → Clone → Branch → Commit → Pull Request
git checkout -b feature/minha-funcionalidade
git commit -m "feat: descrição da funcionalidade"
git push origin feature/minha-funcionalidade
```

---

## 📄 Licença

Distribuído sob a licença **Apache 2.0**. Veja o arquivo [LICENSE](LICENSE) para os termos completos.

---

<div align="center">

Desenvolvido de forma independente por uma seller de marketplace brasileira 🇧🇷

</div>

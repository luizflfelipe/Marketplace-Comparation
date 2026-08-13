# API

Base local: `http://localhost:3000`.

Todas as rotas `/api/*`, exceto `/api/auth/*` e `/api/health`, exigem cookie `argus_token`. Métodos mutáveis também passam por validação de origem em `Origin` ou `Referer`.

## Autenticação

### `POST /api/auth/login`

Autentica usuário administrativo.

Request:

```json
{
  "email": "admin@argus.com",
  "password": "senha"
}
```

Sucesso `200`:

```json
{
  "success": true
}
```

Efeito: define cookie HTTP-only `argus_token` com JWT de 12h.

Falha comum:

- `401`: credenciais inválidas.

### `POST /api/auth/logout`

Remove cookie de sessão.

Sucesso `200`:

```json
{
  "success": true
}
```

### `GET /api/auth/me`

Verifica sessão atual.

Sucesso autenticado:

```json
{
  "authenticated": true,
  "email": "admin@argus.com"
}
```

Sem sessão:

```json
{
  "authenticated": false
}
```

## Saúde

### `GET /api/health`

Resposta:

```json
{
  "status": "ok"
}
```

## Produtos

### `GET /api/products`

Lista produtos, métricas e última atualização.

Resposta:

```json
{
  "products": [],
  "metrics": {
    "totalItems": 0,
    "bestPriceCount": 0,
    "leadershipShare": 0,
    "averageLocalPrice": 0,
    "averageMarketPrice": 0,
    "averageGapPercent": 0,
    "criticalDeviationsCount": 0,
    "overallRevenueAtRisk": 0
  },
  "lastDailyUpdate": "2026-08-13T17:00:00.000Z"
}
```

### `POST /api/products/reset`

Limpa a base persistida.

Resposta:

```json
{
  "status": "success",
  "products": [],
  "metrics": {},
  "lastDailyUpdate": "2026-08-13T17:00:00.000Z"
}
```

### `POST /api/products/daily-scan`

Simula variação diária de preços e estoque dos concorrentes.

Resposta:

```json
{
  "status": "success",
  "products": [],
  "metrics": {},
  "lastDailyUpdate": "2026-08-13T17:00:00.000Z"
}
```

### `POST /api/products/add`

Cria produto manual.

Request mínimo:

```json
{
  "sku": "SKU-001",
  "name": "Bota Feminina",
  "brand": "Gigil",
  "color": "Preto",
  "category": "Bota",
  "localPrice": 199.9
}
```

Campos opcionais:

```json
{
  "division": "Feminino",
  "bu": "Calçados",
  "imageUrl": "https://static.minhaloja.com.br/product.jpg"
}
```

Sucesso `200`:

```json
{
  "status": "success",
  "product": {},
  "products": [],
  "metrics": {}
}
```

Falhas comuns:

- `400`: payload inválido.
- `409`: SKU duplicado.

### `POST /api/products/update`

Atualiza preço local e listas de concorrentes de um SKU.

Request:

```json
{
  "sku": "SKU-001",
  "localPrice": 189.9,
  "competitors": [
    {
      "name": "Mercado Livre",
      "price": 179.9,
      "pixPrice": 170.9,
      "inStock": true,
      "isOfficialSeller": false,
      "url": "https://produto.example/anuncio",
      "shippingCost": 0,
      "isHighlySimilar": true
    }
  ],
  "rawCompetitors": []
}
```

Sucesso:

```json
{
  "status": "success",
  "product": {},
  "metrics": {}
}
```

Falhas comuns:

- `400`: payload inválido.
- `404`: SKU não encontrado.

## Importação

### `POST /api/products/bulk-upload-rows`

Entrada preferida para importação de `.csv` e `.xlsx` já parseados no frontend.

Request sem mapeamento:

```json
{
  "rows": [
    {
      "Código": "SKU-1",
      "Descrição": "Tênis Alias",
      "Valor Venda": "R$ 129,90"
    }
  ]
}
```

Sucesso direto:

```json
{
  "status": "success",
  "needsReview": false,
  "products": [],
  "metrics": {}
}
```

Revisão necessária:

```json
{
  "status": "needs_review",
  "needsReview": true,
  "mapping": {},
  "detectedMapping": {},
  "missingFields": ["localPrice"],
  "requiredFields": ["sku", "name", "localPrice"],
  "headers": ["Código", "Descrição"],
  "message": "Revise o mapeamento das colunas antes de importar."
}
```

Request com mapeamento confirmado:

```json
{
  "rows": [
    {
      "Código": "SKU-1",
      "Descrição": "Tênis Alias",
      "Valor Venda": "R$ 129,90"
    }
  ],
  "mapping": {
    "sku": "Código",
    "name": "Descrição",
    "localPrice": "Valor Venda"
  }
}
```

Falhas comuns:

- `400`: `rows` inválido.
- `400`: mais de 1000 linhas.
- `400`: mapeamento obrigatório incompleto.

### `POST /api/products/bulk-upload`

Entrada legada para array de `Product` já normalizado.

Request:

```json
{
  "products": [
    {
      "sku": "SKU-1",
      "bu": "Calçados",
      "division": "Feminino",
      "name": "Bota",
      "brand": "Gigil",
      "color": "Preto",
      "category": "Bota",
      "localPrice": 100,
      "revenueRank": 1,
      "revenueDaily": 0,
      "competitors": []
    }
  ]
}
```

## Scraping

### `POST /api/scrape/serpapi`

Busca concorrentes via Google Lens e Google Shopping.

Request:

```json
{
  "productName": "Bota Feminina Bico Fino Gigil Preto",
  "imageUrl": "https://static.minhaloja.com.br/product.jpg",
  "sku": "SKU-001"
}
```

Sucesso:

```json
{
  "success": true,
  "competitors": [],
  "rawCompetitors": [],
  "rawCount": 0
}
```

Sem match válido:

```json
{
  "success": false,
  "error": "Nenhum concorrente válido (foto idêntica e nome parecido) foi encontrado."
}
```

Falhas comuns:

- `400`: payload inválido.
- `400`: URL de imagem fora da allowlist.
- `429`: limite de busca atingido.
- `500`: `SERPAPI_KEY` ausente ou falha externa.

## IA

### `POST /api/gemini/advisor`

Gera parecer executivo. Sem `GEMINI_API_KEY`, retorna texto simulado.

Request:

```json
{
  "metrics": {
    "totalItems": 100,
    "leadershipShare": 70,
    "averageLocalPrice": 100,
    "averageMarketPrice": 95,
    "averageGapPercent": 5,
    "criticalDeviationsCount": 8,
    "overallRevenueAtRisk": 12000
  },
  "sampleHighestGaps": []
}
```

Resposta:

```json
{
  "success": true,
  "text": "# PARECER DE POSICIONAMENTO E MARGEM DO MARKETPLACE\n..."
}
```

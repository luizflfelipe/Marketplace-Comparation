# Testes

## Comandos

Type-check:

```bash
npm run lint
```

Testes lógicos de backend:

```bash
npm test
```

Testes E2E de segurança:

```bash
npm run dev
npm run test:e2e
```

Build:

```bash
npm run build
```

## Cobertura Existente

### `test-backend.ts`

Cobre:

- `calculateSimilarity()`.
- `hasStyleMismatch()`.
- `getCoreProductName()`.
- `getOptimizedSearchQuery()`.
- Regras simuladas de validação de domínio, marca e similaridade.
- `detectImportMapping()`.
- `normalizeImportedRows()`.
- `isSafeImageUrl()`.
- `isSafeExternalHttpUrl()`.
- `sanitizeExternalHref()`.
- `getCanonicalHttpsRedirect()`.
- `resolveRequiredEnv()`.

Execução não inicia servidor porque define:

```ts
process.env.ARGUS_SKIP_SERVER_START = "true";
```

### `test-security-e2e.ts`

Cobre rotas reais contra `http://localhost:3000`:

- Reset sem token.
- Reset com cookie inválido.
- Login com credenciais corretas.
- Bloqueio de Origin cross-site.
- Reset autenticado.
- Bulk upload com aliases.
- Bulk upload incompleto com `needs_review`.
- Mapping confirmado incompleto com `400`.
- Cadastro válido.
- SKU duplicado.
- Preço inválido.
- Limite de 1000 linhas.
- URL externa insegura em bulk upload legado.
- Validação de payload SerpAPI.
- Bloqueio SSRF por hostname de imagem.
- Aceite de hostname MinhaLoja permitido.

## Lacunas Recomendadas

### Frontend

Adicionar testes de componentes para:

- Login: sucesso, falha e loading.
- Modal de revisão de colunas: campos obrigatórios, botão bloqueado, envio com mapping.
- `ProductTable`: filtros, paginação, ordenação, expansão e chamada de scraping.
- Exportação: botão Excel bloqueia quando não há produtos.

### Backend

Adicionar testes unitários para:

- `calculateMetrics()` com produto sem concorrente ativo.
- `calculateMetrics()` com `pixPrice` menor que `price`.
- `generateProductsFromRows()` com preço brasileiro `"R$ 1.299,90"`.
- `saveProducts()` e `loadProducts()` com JSON corrompido usando diretório temporário.
- Rate limit diário de `checkSerpApiUsage()`.

### Contratos

Adicionar testes de schema para:

- `addProductSchema`.
- `productSchema`.
- `updateProductSchema`.
- `serpApiSchema`.

### Integrações Externas

Mockar `fetch` para:

- SerpAPI Lens com resultados vazios e retry.
- SerpAPI Shopping com preço em string e preço extraído.
- Gemini com resposta JSON válida.
- Gemini indisponível acionando fallback legado.

## Critério de Pronto

Antes de publicar:

```bash
npm run lint
npm test
npm run build
```

Antes de aceitar mudanças em autenticação, importação ou scraping:

```bash
npm run dev
npm run test:e2e
```

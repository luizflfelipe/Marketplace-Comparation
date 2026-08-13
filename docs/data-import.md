# Importação de Dados

## Formatos Aceitos

- `.csv`: parseado no frontend com PapaParse.
- `.xlsx`: parseado no frontend com ExcelJS, usando a primeira aba e a primeira linha como cabeçalho.

Limite no backend: 1000 linhas por upload.

## Campos Canônicos

Campos obrigatórios:

- `sku`
- `name`
- `localPrice`

Campos opcionais:

- `brand`
- `color`
- `category`
- `imageUrl`
- `division`
- `bu`
- `supplier`

## Cabeçalhos Reconhecidos

| Campo | Cabeçalhos exatos | Aliases |
| --- | --- | --- |
| `sku` | `sku`, `sku config` | `codigo`, `código`, `codigo sku`, `código sku`, `referencia`, `referência`, `id produto`, `product id`, `seller sku` |
| `name` | `product name`, `name`, `nome`, `produto` | `descricao`, `descrição`, `nome produto`, `titulo`, `título`, `title` |
| `localPrice` | `current price`, `price`, `preco`, `preço` | `preco atual`, `preço atual`, `valor`, `valor venda`, `sale price`, `selling price` |
| `brand` | `brand`, `marca` | `fabricante` |
| `color` | `color`, `cor`, `colour` | nenhum |
| `category` | `category`, `categoria` | `tipo`, `departamento` |
| `imageUrl` | `main image`, `image`, `imagem` | `foto`, `url imagem`, `imagem principal`, `image url`, `photo url` |
| `division` | `division`, `divisionproduct`, `divisao`, `divisão` | `gender`, `genero`, `gênero` |
| `bu` | `bu` | `business unit`, `unidade negocio`, `unidade de negocio` |
| `supplier` | `supplier/seller`, `seller`, `supplier` | `fornecedor`, `lojista` |

## Fluxo de Decisão

`detectImportMapping()` normaliza cabeçalhos removendo acentos, caixa, pontuação e espaços repetidos.

Resultado direto:

- Cada campo obrigatório tem uma coluna única.
- Confiança de obrigatório não é `missing`, `ambiguous` ou `weak`.

Resultado com revisão:

- Campo obrigatório ausente.
- Mais de uma coluna candidata para o mesmo campo obrigatório.
- Match fraco em campo obrigatório.

## Exemplo CSV Mínimo

```csv
Código,Descrição,Valor Venda,Foto
SKU-1,Bota Feminina,R$ 129,90,https://static.minhaloja.com.br/product.jpg
```

Para evitar quebra por vírgula decimal em CSV, prefira aspas no preço:

```csv
Código,Descrição,Valor Venda,Foto
SKU-1,Bota Feminina,"R$ 129,90",https://static.minhaloja.com.br/product.jpg
```

## Normalização para Produto

Depois do mapeamento, `normalizeImportedRows()` converte campos para os cabeçalhos usados por `generateProductsFromRows()`:

- `sku` vira `Sku Config`.
- `name` vira `Product Name`.
- `localPrice` vira `Current Price`.
- `brand` vira `Brand`.
- `color` vira `Color`.
- `category` vira `Category`.
- `imageUrl` vira `Main Image`.
- `division` vira `Division`.
- `bu` vira `BU`.
- `supplier` vira `Supplier/Seller`.

## Geração de Produto

`generateProductsFromRows()` cria `Product[]` com:

- SKU da linha importada.
- Nome, marca, cor, categoria e preço da linha.
- Defaults quando campos opcionais não existem.
- Concorrentes simulados iniciais.
- `revenueRank` sequencial.
- `revenueDaily` estimado.

## Checklist de Operação

1. Conferir se planilha tem SKU, produto e preço.
2. Usar URLs de imagem em `static.minhaloja.com.br`, `images.minhaloja.com.br`, `cdn.minhaloja.com.br` ou domínios Dafiti equivalentes se quiser usar SerpAPI.
3. Importar arquivo pela ação `IMPORTAR`.
4. Se modal abrir, mapear pelo menos SKU, Produto e Preço Atual.
5. Conferir contagem de produtos no painel.
6. Rodar uma busca de concorrente em SKU conhecido.
7. Exportar Excel para validar links e gaps.

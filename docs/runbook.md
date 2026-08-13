# Runbook

## Instalação Local

```bash
npm install
cp .env.example .env
npm run dev
```

Aplicação: `http://localhost:3000`.

## Variáveis de Ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `NODE_ENV` | não | `development` ou `production`. |
| `PORT` | não | Porta do Express. Default: `3000`. |
| `ALLOWED_ORIGIN` | sim para browser fora de localhost | Origem permitida para CORS e validação de origem. |
| `PUBLIC_ORIGIN` | recomendada em produção | Origem pública canônica para redirects HTTPS e origem confiável. |
| `JWT_SECRET` | sim | Assinatura do cookie JWT. |
| `ADMIN_EMAIL` | sim | Login administrativo. |
| `ADMIN_PASSWORD` | sim | Senha administrativa. |
| `SERPAPI_KEY` | sim para busca real | Google Lens/Shopping via SerpAPI. |
| `GEMINI_API_KEY` | não | Advisor real e validação visual avançada; sem ela há fallback. |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:e2e
npm run clean
```

Uso:

- `dev`: roda `tsx server.ts`, com Vite middleware.
- `build`: compila frontend com Vite e empacota `server.ts` em `dist/server.cjs`.
- `start`: roda build em produção.
- `lint`: executa `tsc --noEmit`.
- `test`: roda testes lógicos de backend.
- `test:e2e`: roda testes HTTP contra servidor já ativo.
- `clean`: remove `dist` e `minhaloja-data-store.json`.

## Produção em VPS Única

```bash
npm ci
npm run build
NODE_ENV=production npm run start
```

Configurar no ambiente real:

```env
NODE_ENV=production
PORT=3000
PUBLIC_ORIGIN=https://seu-dominio.example
ALLOWED_ORIGIN=https://seu-dominio.example
JWT_SECRET=valor-longo-aleatorio
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=senha-forte
SERPAPI_KEY=chave-serpapi
GEMINI_API_KEY=chave-gemini
```

## Backup e Restauração

Arquivos persistidos:

- `minhaloja-data-store.json`
- `minhaloja-metadata.json`

Backup:

```bash
cp minhaloja-data-store.json /tmp/minhaloja-data-store.backup.json
cp minhaloja-metadata.json /tmp/minhaloja-metadata.backup.json
```

Restauração:

```bash
cp /tmp/minhaloja-data-store.backup.json minhaloja-data-store.json
cp /tmp/minhaloja-metadata.backup.json minhaloja-metadata.json
```

Depois reinicie o processo Node.

## Rotina Operacional

1. Entrar no painel.
2. Importar planilha atualizada.
3. Revisar colunas se o modal aparecer.
4. Rodar `ATUALIZAR PREÇOS` para simulação diária ou buscar concorrentes por SKU com SerpAPI.
5. Abrir `Strategic Advisor IA` para análise.
6. Exportar Excel ou PDF.
7. Fazer backup dos JSONs após importações relevantes.

## Troubleshooting

### Login falha

Verificar:

- `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`.
- `JWT_SECRET` definido.
- Cookie não bloqueado pelo navegador.

### `GET /api/products` retorna erro

Verificar se `minhaloja-data-store.json` existe e é JSON válido. Se estiver corrompido, mover para backup e reiniciar; o backend tenta gerar base padrão.

### Importação pede revisão

Motivos esperados:

- Preço ausente.
- SKU ausente.
- Nome ausente.
- Duas colunas parecidas com o mesmo campo.
- Cabeçalho reconhecido apenas como match fraco.

### SerpAPI retorna `SERPAPI_KEY não configurada no servidor.`

Definir `SERPAPI_KEY` no `.env` e reiniciar `npm run dev`.

### SerpAPI retorna `URL de imagem inválida ou não permitida.`

Usar imagens em:

- `static.dafiti.com.br`
- `images.dafiti.com.br`
- `cdn.dafiti.com.br`
- `static.minhaloja.com.br`
- `images.minhaloja.com.br`
- `cdn.minhaloja.com.br`

### Advisor retorna texto simulado

Definir `GEMINI_API_KEY` e reiniciar servidor.

### `npm run test:e2e` não conecta

Antes, em outro terminal:

```bash
npm run dev
```

Depois rode:

```bash
npm run test:e2e
```

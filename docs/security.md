# Segurança

## Superfícies de Ataque

- Login administrativo.
- Cookies JWT.
- Rotas `/api/products/*`.
- Upload de linhas de planilha.
- URLs externas de imagens e concorrentes.
- Chamadas SerpAPI e Gemini.
- Persistência em JSON local.

## Controles Implementados

### Autenticação

- `POST /api/auth/login` valida credenciais contra `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
- Cookie `argus_token` é HTTP-only.
- JWT expira em 12h.
- Todas as rotas `/api` exceto `/api/auth/*` e `/api/health` exigem autenticação.

### Origem Confiável

- Métodos mutáveis passam por `requireTrustedOrigin`.
- Origens aceitas vêm de `PUBLIC_ORIGIN`, `ALLOWED_ORIGIN`, origin do request e host local.
- Cross-site `Origin` não permitido retorna `403`.

### Headers

- `helmet()` remove e adiciona headers de proteção.
- `app.disable("x-powered-by")` remove assinatura Express.

### Rate Limit

- Limite global em `/api/`.
- Limite específico em SerpAPI.
- `checkSerpApiUsage()` limita buscas SerpAPI por IP/dia em memória.

### Validação

- Zod valida payloads principais.
- Bulk upload limita 1000 produtos.
- Produto limita preço máximo, tamanho de strings, arrays de concorrentes e URLs.

### SSRF e URL Safety

- `isSafeExternalHttpUrl()` bloqueia protocolos não HTTP(S), localhost e IPv4 privado.
- `isSafeImageUrl()` exige domínios de imagem permitidos.
- `sanitizeExternalHref()` neutraliza links externos inseguros, incluindo `javascript:`.
- Thumbnails baixados para Gemini passam por validação HTTP(S) e limite de 2 MB.

### Segredos

- `SERPAPI_KEY` e `GEMINI_API_KEY` ficam só no backend.
- `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` vêm de ambiente.
- `resolveRequiredEnv()` rejeita env ausente sem fallback hardcoded.

## Riscos Residuais

- `checkSerpApiUsage()` é memória local; reinício zera limite.
- JSON local não oferece controle de acesso granular nem auditoria.
- VPS multi-instância pode causar divergência de arquivo mesmo com lock local.
- Não há rotação automática de JWT_SECRET.
- Não há refresh token ou revogação server-side por sessão.
- Não há proteção antivirus ou content sniffing profundo para arquivos importados; o app lê apenas dados tabulares parseados.

## Regras de Produção

1. Usar `NODE_ENV=production`.
2. Definir `PUBLIC_ORIGIN` e `ALLOWED_ORIGIN` com HTTPS real.
3. Usar `JWT_SECRET` longo e aleatório.
4. Trocar `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
5. Nunca versionar `.env`, `minhaloja-data-store.json` com dados reais ou chaves.
6. Proteger VPS com firewall e TLS no proxy reverso.
7. Fazer backup dos JSONs antes de deploy.
8. Migrar persistência para banco antes de rodar mais de uma instância.

## Checklist de Revisão

- `npm run lint`
- `npm test`
- `npm run build`
- Servidor local rodando para `npm run test:e2e`
- Testar login/logout no navegador
- Testar bloqueio de Origin cross-site
- Testar SerpAPI com imagem permitida e imagem bloqueada

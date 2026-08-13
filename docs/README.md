# Documentação Argus Pricing

Este diretório é a arquitetura de informação operacional do projeto. Use o `README.md` da raiz para visão comercial e execução rápida; use estes documentos para manter, operar, testar e evoluir o sistema.

## Mapa de Conhecimento

1. [Arquitetura](./architecture.md): limites do sistema, componentes, fluxos, dados e decisões técnicas.
2. [API](./api.md): contrato das rotas HTTP, autenticação, payloads e respostas.
3. [Importação de Dados](./data-import.md): formato aceito, mapeamento de colunas, validações e fluxo de revisão.
4. [Runbook](./runbook.md): instalação, execução, build, produção, backup e troubleshooting.
5. [Testes](./testing.md): comandos, cobertura existente e lacunas recomendadas.
6. [Segurança](./security.md): controles implementados, variáveis sensíveis, SSRF, CSRF, cookies e riscos residuais.

## Público

- Pessoa de produto: entender o fluxo de auditoria de preços.
- Pessoa de engenharia: manter frontend, backend, importação, scraping e IA.
- Pessoa de operação: rodar localmente, publicar em VPS única, diagnosticar falhas.
- Pessoa de segurança: revisar chaves, autenticação, origens, URLs externas e limites de consumo.

## Entrada Rápida

```bash
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:3000`, faça login com `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidos no `.env`, importe `.csv` ou `.xlsx`, depois rode auditoria por SKU ou exporte relatórios.

## Fontes de Verdade

- Modelos TypeScript: `src/types.ts`.
- Backend e rotas: `server.ts`.
- Orquestração frontend: `src/App.tsx`.
- Importação híbrida: `src/data/importMapper.ts`.
- Dados demonstrativos e métricas: `src/data/mockProducts.ts`.
- Testes lógicos: `test-backend.ts`.
- Testes E2E de segurança: `test-security-e2e.ts`.

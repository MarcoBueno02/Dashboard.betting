# Dashboard de Controle de Trading Esportivo

Dashboard pessoal para registrar e acompanhar apostas esportivas EV+ em múltiplas casas: bancas, histórico de entradas, segmentação por competição × mercado, travas mecânicas e evolução de banca.

Uso pessoal, single-user, protegido por senha única.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- Tailwind CSS + shadcn/ui (Base UI)
- Recharts
- Deploy: Vercel

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure o `.env` com sua conexão Postgres e a senha do app:

   ```
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/dashboard_betting?schema=public"
   APP_PASSWORD="sua-senha-aqui"
   ```

3. Rode as migrations:

   ```bash
   npx prisma migrate dev
   ```

4. (Opcional) Popule o banco com os dados iniciais (casas, apostas pendentes, trava e histórico segmentado):

   ```bash
   npm run db:seed
   ```

5. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

Acesse `http://localhost:3000` e entre com a senha definida em `APP_PASSWORD`.

## Variáveis de ambiente

| Variável       | Descrição                                              |
| -------------- | -------------------------------------------------------- |
| `DATABASE_URL` | Connection string do Postgres                            |
| `APP_PASSWORD` | Senha única para acessar o dashboard (sessão por cookie) |
| `API_TOKEN`    | Token da API de automação (`Authorization: Bearer`), separado do login. Gere um novo com `openssl rand -hex 32`. |
| `MCP_CLIENT_ID` | Identificador do cliente OAuth pré-registrado do servidor MCP (Fase 2) — um nome fixo, não precisa ser secreto. |
| `MCP_CLIENT_SECRET` | Segredo do cliente OAuth do servidor MCP. Gere com `openssl rand -hex 32`. |
| `MCP_OAUTH_SECRET` | Chave de assinatura dos tokens de acesso/refresh emitidos pelo servidor MCP. Gere com `openssl rand -hex 32`. |
| `MCP_REDIRECT_URI` | Redirect URI aceito pelo `/authorize` do servidor MCP. Para o conector do Claude.ai: `https://claude.ai/api/mcp/auth_callback`. |

## Estrutura

- `/` — Dashboard principal
- `/apostas` — Histórico completo com filtros e exportação CSV
- `/apostas/nova` — Registro rápido de aposta
- `/apostas/lote` — Registro em lote (colar múltiplas apostas)
- `/apostas/pendentes` — Fila de resolução rápida
- `/bancas` — Saldo por casa e evolução da banca
- `/segmentado` — Performance por competição × mercado
- `/travas` — Travas mecânicas ativas/removidas
- `/analises` — ROI por risco, calibração, ROI por casa, streaks

## Escopo não implementado (v1)

- Calibração e ROI por risco assumem que os campos opcionais (P_justa, EV%, risco) foram preenchidos na aposta — apostas sem esses dados não entram nesses cálculos.
- Sem integração com as casas de apostas: todo registro é manual, por design.

## API de automação (`/api/**`)

Via HTTP, autenticada por token — separada do login por senha do site. Pensada
pra ser chamada por um agente (ex: uma IA por chat) que lê o estado do
dashboard e escreve resultados de rodada sem passar pela UI.

### Autenticação

Toda rota abaixo (exceto `/api/health`) exige o header:

```
Authorization: Bearer <API_TOKEN>
```

Sem o header, ou com token errado, toda rota responde igual — `401` com
`{"error":"unauthorized"}` — pra não dar pista de força bruta. O token nunca
aparece em log, resposta de erro, ou em nenhuma rota de leitura.

Pra gerar (ou trocar) o token:

```bash
openssl rand -hex 32
```

Cole o resultado na variável de ambiente `API_TOKEN` (local: `.env`; produção:
Project Settings → Environment Variables no Vercel, depois faça um redeploy).

Essa API é logicamente separada do cookie de sessão (`APP_PASSWORD`) — uma
não dá acesso à outra. A única rota pré-existente do dashboard sob `/api/`
(`/api/apostas/export`, o botão "Exportar CSV" do Histórico) continua exigindo
sessão de navegador como sempre exigiu; ela não faz parte desta API por token.

> Rate limiting não foi implementado (uso é de um único usuário) — se algum
> dia isso mudar, o ponto certo pra adicionar é dentro de
> `requireApiToken()` em `src/lib/api-auth.ts`.

### Rotas

| Método  | Rota                          | Descrição                                            |
| ------- | ------------------------------ | ----------------------------------------------------- |
| GET     | `/api/health`                  | `{"status":"ok"}` — não exige token                   |
| GET     | `/api/bancas`                  | Casas ativas, banca total, unidade atual              |
| POST    | `/api/bancas/:nomeOuId/atualizar` | Registra novo saldo pra uma casa (snapshot + atualização) |
| POST    | `/api/casas`                   | Cria uma casa nova                                    |
| GET     | `/api/apostas`                 | Lista apostas (filtros: `competicao`, `mercado`, `status`, `de`, `ate`) |
| POST    | `/api/apostas`                 | Cria uma ou várias apostas (objeto único ou array)     |
| GET     | `/api/apostas/pendentes`       | Apostas com `status = PENDENTE`, ordenadas por data    |
| GET     | `/api/apostas/buscar`          | Busca por `jogo` (parcial) e/ou `data` (YYYY-MM-DD)    |
| PATCH   | `/api/apostas/:id/resultado`   | Atualiza status + retorno real de uma aposta           |
| GET     | `/api/segmentado`              | Agregado Green/Red por competição × mercado            |
| GET     | `/api/travas`                  | Lista travas (filtro opcional `status=ATIVA\|REMOVIDA`) |
| POST    | `/api/travas`                  | Cria uma trava nova                                    |
| PATCH   | `/api/travas/:id`              | Atualiza trava (status, teto, motivo, rodadas positivas) |

`casa`, `competicao` e `mercado` em `POST /api/apostas` (e `competicao`/
`mercado` em `POST /api/travas`) podem vir como nome — se não existir um
registro com esse nome exato, é criado automaticamente. Datas aceitam
`"YYYY-MM-DD"` ou `"YYYY-MM-DDTHH:mm"`, sempre interpretadas como horário de
Brasília.

### Exemplos (`curl`)

```bash
export API_TOKEN="cole-seu-token-aqui"
export BASE="https://dashboardbetting.vercel.app"

# Saúde da API (sem token)
curl "$BASE/api/health"

# Bancas
curl -H "Authorization: Bearer $API_TOKEN" "$BASE/api/bancas"

# Atualizar saldo de uma casa
curl -X POST -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"saldo": 32.85}' \
  "$BASE/api/bancas/Betano/atualizar"

# Criar uma casa
curl -X POST -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"nome": "NovaCasa", "saldoAtual": 20}' \
  "$BASE/api/casas"

# Criar apostas (aceita objeto único ou array)
curl -X POST -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '[{
        "data": "2026-09-03",
        "competicao": "Copa do Brasil",
        "jogo": "Grêmio x Internacional",
        "mercado": "Escanteios O/U",
        "entrada": "Over 8.5 Escanteios",
        "casa": "Superbet",
        "odd": 1.55,
        "stake": 4.47,
        "pJusta": 75.0,
        "evPercentual": 16.25,
        "categoriaRisco": "BAIXO"
      }]' \
  "$BASE/api/apostas"

# Listar pendentes
curl -H "Authorization: Bearer $API_TOKEN" "$BASE/api/apostas/pendentes"

# Buscar por jogo/data
curl -H "Authorization: Bearer $API_TOKEN" "$BASE/api/apostas/buscar?jogo=Gr%C3%AAmio&data=2026-09-03"

# Listar com filtros
curl -H "Authorization: Bearer $API_TOKEN" "$BASE/api/apostas?competicao=Copa%20do%20Brasil&status=PENDENTE"

# Atualizar resultado de uma aposta
curl -X PATCH -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"status": "GREEN", "retornoReal": 6.93}' \
  "$BASE/api/apostas/<id>/resultado"

# Sobrescrever um resultado já registrado
curl -X PATCH -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"status": "RED", "retornoReal": 0, "forcar": true}' \
  "$BASE/api/apostas/<id>/resultado"

# Segmentado
curl -H "Authorization: Bearer $API_TOKEN" "$BASE/api/segmentado"

# Travas ativas
curl -H "Authorization: Bearer $API_TOKEN" "$BASE/api/travas?status=ATIVA"

# Criar trava
curl -X POST -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"competicao": "Brasileirão Série B", "mercado": "Cartões O/U", "tetoRisco": "MEDIO_ALTO", "motivoAtivacao": "2 rodadas seguidas negativas"}' \
  "$BASE/api/travas"

# Atualizar trava (incrementar rodada positiva, ou remover)
curl -X PATCH -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"incrementarRodadas": true}' \
  "$BASE/api/travas/<id>"

curl -X PATCH -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"status": "REMOVIDA"}' \
  "$BASE/api/travas/<id>"
```

Todas as rotas acima foram testadas manualmente contra um banco Postgres real
(local) antes de subir — incluindo os casos de erro (token ausente/errado,
campo obrigatório faltando, tentativa de sobrescrever resultado sem `forcar`).

## Servidor MCP (Fase 2)

Servidor MCP remoto em `/mcp`, protegido por OAuth 2.1 com PKCE (S256
obrigatório) e um único cliente pré-registrado — não DCR, não CIMD. Cada
ferramenta é um wrapper fino em cima da API REST da Fase 1
(`src/lib/mcp-tools.ts`); a lógica de negócio inteira vive só na API, o MCP
só chama.

### Por que pré-registrado em vez de DCR

O prompt original pedia DCR (Dynamic Client Registration) como o caminho
"mais robusto". Fui checar a documentação atual antes de implementar, como
pedido, e o que valia quando o prompt foi escrito mudou:

- A especificação MCP (revisão `2026-07-28`) **depreciou DCR**. A ordem de
  prioridade atual pra registro de cliente é: credenciais pré-registradas →
  Client ID Metadata Documents (CIMD) → DCR só por compatibilidade
  ([Client Registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)).
- A documentação da própria Anthropic pra conectores customizados
  (`claude.com/docs/connectors/building/authentication`) recomenda
  explicitamente: *"Supplying your own pre-registered client ID (and
  secret...) as static client credentials is a good option [...]: it avoids
  dynamic client registration entirely"* — exatamente pra esse cenário (um
  conector customizado, de uma organização só, não listado num diretório
  público). CIMD faz sentido quando servidor e cliente não se conhecem de
  antemão; aqui eles se conhecem — sou eu configurando os dois lados.
- Isso também elimina toda uma classe de risco: sem endpoint `/register`
  (superfície de DCR) e sem precisar buscar/validar documentos JSON de URLs
  arbitrárias (superfície de SSRF do CIMD).

Então: sem DCR, sem CIMD. `MCP_CLIENT_ID`/`MCP_CLIENT_SECRET` são colados
nos campos "OAuth Client ID" e "OAuth Client Secret" do "Advanced settings"
ao adicionar o conector — é o próprio caminho oficial que o Claude.ai expõe
pra isso.

### Arquitetura

- `/.well-known/oauth-protected-resource` (+ variante `/mcp`) e
  `/.well-known/oauth-authorization-server` — metadados de descoberta
  (RFC 9728 / RFC 8414), servidos via `rewrites()` no `next.config.ts` a
  partir de `src/app/api/oauth/*` (Next.js não trata pastas `.` como rota
  literal de forma documentada, então evitei depender disso).
- `/authorize` — tela de login (senha = `APP_PASSWORD`, a mesma do
  dashboard) com rate limit por IP (mesmo padrão do login do site: 5
  tentativas / 15 min, em memória). Valida `client_id` e `redirect_uri`
  contra os valores configurados **antes** de considerar qualquer redirect
  (evita open redirect); código de autorização de uso único, TTL de 60s,
  guardado em `McpAuthorizationCode` (única tabela nova no schema).
- `/token` — troca o código por tokens (`authorization_code`) e renova
  (`refresh_token`), aceita `client_secret_post` e `client_secret_basic`,
  content-type `application/x-www-form-urlencoded` (exigido pela Anthropic,
  diferente do `/register` que seria JSON). Tokens de acesso e refresh são
  JWTs HS256 autocontidos (`src/lib/mcp-oauth.ts`, assinados com
  `MCP_OAUTH_SECRET`) — sem tabela própria, verificados só por assinatura +
  `iss`/`aud`/`exp`. Refresh token rotaciona a cada uso.
- `/mcp` — endpoint MCP em si (`@modelcontextprotocol/sdk`, transporte
  `WebStandardStreamableHTTPServerTransport`, modo stateless). Valida o
  Bearer token **antes** de repassar pro SDK: sem token válido, responde
  `401` com `WWW-Authenticate: Bearer error="invalid_token",
  resource_metadata="..."` — é esse detalhe (401 de transporte, não um erro
  de ferramenta 200 com `isError:true`) que faz o Claude mostrar o cartão de
  "Connect" em vez de só devolver o erro pro modelo.
- `src/proxy.ts` — essas rotas (mais os `.well-known`) ficam de fora do
  redirect pra `/login` que protege o resto do site; cada uma implementa a
  própria autenticação.

### Ferramentas expostas

`consultar_bancas`, `atualizar_saldo_casa`, `criar_casa`, `criar_aposta`,
`listar_apostas_pendentes`, `buscar_apostas`, `listar_apostas`,
`atualizar_resultado_aposta`, `consultar_segmentado`, `listar_travas`,
`criar_trava`, `atualizar_trava` — uma pra cada rota principal da API da
Fase 1, com descrição em português pra cada uma.

### Testado

Simulei o fluxo OAuth completo com PKCE via script (não dá pra testar DCR
porque não o implementamos, e não dá pra dirigir o Claude.ai a partir daqui
— mas todo o resto é exatamente o que o Claude faria):

- Descoberta: os três documentos de metadados, formato e conteúdo corretos.
- `/authorize`: renderiza o formulário, recusa `client_id`/`redirect_uri`
  errados sem redirecionar (400 direto), recusa senha errada sem
  redirecionar, aceita senha certa e redireciona (**303**, não o 307 padrão
  do Next — importante: 307 preservaria o método POST no redirect pro
  callback do Claude, quebrando o fluxo) com `code` e `state`.
- `/token`: troca o código por tokens, recusa reuso do mesmo código
  (`invalid_grant`), recusa `client_secret` errado (`invalid_client`),
  aceita tanto `client_secret_post` quanto `client_secret_basic`, renova
  com `refresh_token` e rotaciona o refresh token a cada renovação.
- `/mcp`: `401` com `WWW-Authenticate` sem token; `initialize` e
  `tools/list` (as 12 ferramentas aparecem) com token válido; `tools/call`
  de leitura (`consultar_bancas`) e de escrita (`criar_casa`) chegando de
  verdade no Postgres via API_TOKEN.

### Como conectar (passo a passo)

1. No Vercel, confirme que `MCP_CLIENT_ID`, `MCP_CLIENT_SECRET`,
   `MCP_OAUTH_SECRET` e `MCP_REDIRECT_URI` estão configuradas (Production) e
   redeploy.
2. No Claude.ai: **Customize → Connectors → Add custom connector**.
3. URL do servidor: `https://dashboardbetting.vercel.app/mcp`.
4. Em **Advanced settings**, cole o `MCP_CLIENT_ID` em "OAuth Client ID" e o
   `MCP_CLIENT_SECRET` em "OAuth Client Secret".
5. Ao conectar, uma janela abre em `.../authorize` pedindo a senha — é a
   mesma `APP_PASSWORD` do login do dashboard. Depois de autorizar, o
   Claude volta com um token e a conexão fica pronta.
6. Peça pro Claude listar as apostas pendentes ou consultar as bancas pra
   confirmar que as ferramentas respondem.

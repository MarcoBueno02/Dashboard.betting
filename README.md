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
| `ODDSPAPI_API_KEY` | Chave da API da OddsPapi (Fase 3, busca de melhor odd). Plano gratuito: 250 requisições/mês. |

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
| GET     | `/api/odds/melhor`             | Busca a melhor odd real pra uma entrada (Fase 3, ver seção própria abaixo) |

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

# Melhor odd real pra uma entrada (Fase 3)
curl -H "Authorization: Bearer $API_TOKEN" -G "$BASE/api/odds/melhor" \
  --data-urlencode "jogo=EC Juventude x AC Goianiense" \
  --data-urlencode "competicao=Brasileirão Série B" \
  --data-urlencode "mercado=Escanteios O/U" \
  --data-urlencode "entrada=Under 8.5"
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
`criar_trava`, `atualizar_trava`, `consultar_melhor_odd` — uma pra cada rota
principal da API (Fase 1 e Fase 3), com descrição em português pra cada uma.

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

## Busca automática da melhor odd (Fase 3)

`GET /api/odds/melhor?jogo=...&competicao=...&mercado=...&entrada=...` (mesmo
formato de `jogo`/`competicao`/`mercado`/`entrada` usado em `criar_aposta`)
resolve automaticamente o torneio, encontra o jogo, identifica o mercado e a
linha certos, busca as odds nas casas confirmadas via
[OddsPapi](https://oddspapi.io) e devolve a melhor — ou um motivo claro de
não-encontrado. Nunca inventa ou aproxima um valor.

### Resposta

```jsonc
// Encontrado
{
  "encontrado": true,
  "jogo": "EC Juventude x AC Goianiense",
  "entrada": "Under 8.5",
  "melhorOdd": 3,
  "casa": "betano.bet.br",
  "todasAsOdds": [
    { "casa": "betano.bet.br", "odd": 3 },
    { "casa": "estrelabet.bet.br", "odd": null },
    { "casa": "superbet.bet.br", "odd": 2.75 }
  ],
  "atualizadoEm": "2026-09-05T16:34:11.037Z"
}

// Não encontrado — motivo é um dos 5 abaixo
{ "encontrado": false, "motivo": "torneio_nao_mapeado" }
```

`motivo`: `torneio_nao_mapeado` (competição sem correspondência confiável no
catálogo de torneios), `jogo_nao_localizado`, `mercado_nao_suportado`
(padrão de `entrada` não reconhecido, ou explicitamente Cartões — ver
abaixo), `sem_odd_nenhuma_casa` (jogo e mercado achados, nenhuma casa
confirmada tinha essa odd no momento) e `cota_excedida`.

> Nota sobre a Seção 5 do prompt original: ela citava "404 com mensagem
> clara" pro caso de torneio não mapeado, mas o contrato de resposta
> concreto (usado por todos os outros 4 motivos) é um 200 com
> `{"encontrado": false, "motivo": "..."}`. Optei por manter os 5 motivos
> consistentes num único formato — mais fácil de consumir, inclusive pela
> ferramenta MCP — em vez de um HTTP status diferente só pra esse caso.

### Mercados suportados

Gols O/U, Escanteios O/U, Cartões O/U, Ambas Marcam, Resultado (1x2),
Dupla Chance e Escanteios 1x2 — cada um em tempo completo, 1º tempo ou 2º
tempo onde a OddsPapi tiver essa variante. `entrada` precisa seguir um
desses padrões (`src/lib/oddspapi/mercados.ts`):

- **Over/Under** (Gols, Escanteios ou Cartões): `"Over 2.5 Gols"`,
  `"Under 2.5"`, `"Mais de 2.5 gols"`, `"Menos de 8.5 escanteios"` —
  direção (Over/Mais ou Under/Menos) + linha numérica. A direção só é lida
  da **entrada**, nunca do mercado combinado — ver "Bug corrigido" abaixo.
  Escanteios/Cartões vs. gols é decidido por palavra-chave no mercado ou na
  entrada ("escanteio"/"corner", "cartão"), senão assume gols.
- **Ambas Marcam**: `"Sim"` / `"Não"` — precisa ter um dos dois (não os
  dois, nem nenhum).
- **Resultado / Escanteios 1x2**: `"<Time> vence"`, `"Empate"`,
  `"Mandante"`/`"Casa"`, `"Visitante"`/`"Fora"`, ou o token cru `"1"`/`"X"`/
  `"2"`. Quando a entrada cita um nome de time, ele só é resolvido **depois**
  do jogo já ter sido encontrado (é preciso saber quem é `participant1`/
  `participant2` na fixture real pra saber se "Fluminense vence" é `1` ou
  `2`) — nunca assume que um lado é sempre o mesmo outcome.
- **Dupla Chance**: `"<Time> ou Empate"`, `"<Time A> ou <Time B>"`,
  `"Mandante ou Empate"`, `"Visitante ou Empate"`, ou o token cru `"1X"`/
  `"12"`/`"X2"`.
- `"1º tempo"`/`"2º tempo"`/`"HT"` em `mercado` ou `entrada` seleciona o
  período; sem isso, assume tempo completo.

Mercados compostos/exóticos já cadastrados no app mas sem correspondência
1:1 num único mercado da OddsPapi (`"Resultado/DC"`, `"Resultado/DC/DNB"`,
produtos combinados de casa específica) são recusados explicitamente, e
não caem por engano no mercado de Dupla Chance só por conterem "DC" no
nome. Qualquer outra coisa fora desses padrões (handicap asiático, "Vitória
Sem Sofrer" — identificado no catálogo como `wintonil-team1`/`wintonil-team2`
mas ainda não implementado, "Geral", etc.) retorna `mercado_nao_suportado`
sem gastar nenhuma chamada de API.

### Bug corrigido (Fase 3.1): Gols O/U não funcionava com o nome real do mercado

O mercado de gols está cadastrado no app como **`"Over/Under Gols"`** (ver
`prisma/seed.ts`) — meses depois de eu ter testado a Fase 3 original só com
o nome abreviado `"Gols O/U"`. A detecção de direção (Over vs. Under)
buscava as duas palavras no texto combinado de mercado + entrada; como o
nome do mercado já contém as duas palavras ("**Over**/**Under** Gols"), a
checagem "achou Over e Under ao mesmo tempo → ambíguo, recusar" disparava
sempre, e **toda consulta de Gols O/U com o nome real do mercado vinha
retornando `mercado_nao_suportado` desde que a Fase 3 foi ao ar** — sem
gastar API, então nunca gerou nenhum efeito colateral, mas também nunca
funcionou de verdade nesse mercado específico com o nome real. Corrigido:
a direção agora é lida só da `entrada`, nunca do `mercado`. Confirmado com
o mesmo teste (`"Over/Under Gols"` + `"Over 2.5"`) voltando odd real depois
do fix.

### Bug investigado (Fase 3.1): Superbet aparecendo como `null` indevidamente?

Reportado: `consultar_melhor_odd` pra "Ambas Marcam Sim" em Fluminense x
Vasco da Gama devolveu Superbet como `null`, mas o usuário confirmou odd
real de 1,85 direto no app da Superbet no mesmo momento. Investigação (ver
as 3 hipóteses do prompt original):

1. **Estrutura diferente por bookmaker?** Não — a resposta bruta da
   `/v4/odds` (bypassando qualquer cache nossa, chamada direta) mostra que
   a Superbet **não tem o marketId 104** (Ambas Marcam Tempo Completo) na
   lista de ~250 mercados dela pra essa fixture — mas **tem** os dois
   mercados de tempo (1º e 2º) de Ambas Marcam. Não é uma chave/outcome
   diferente escondida em outro lugar: o mercado de tempo completo
   simplesmente não está na resposta da Superbet pra esse jogo específico.
2. **Cache desatualizada?** Não — reproduzido com uma chamada real direta à
   OddsPapi (sem passar pela nossa cache de 5min) minutos depois, mesmo
   resultado. Também testado com `verbosity=1/2/3`: nenhuma diferença.
3. **Erro de parsing silencioso?** Não havia nenhuma exceção sendo
   engolida — o `null` era o reflexo fiel da ausência real do mercado na
   resposta. Ainda assim, implementei a distinção pedida por segurança:
   `extrairOdd()` (`melhor-odd.ts`) agora só devolve `{casa, odd: null}`
   quando a estrutura realmente não tem o mercado/outcome esperado, e
   devolve `{casa, odd: null, erro: "..."}` se o formato vier diferente do
   esperado (ex: campo `price` ausente ou não-numérico) — daqui pra frente,
   um bug de parsing de verdade nunca mais se disfarça de "casa sem odd".

Conclusão: os números de betano (1,82) e estrelabet (1,889) que a
ferramenta retornou batem exatamente com uma chamada direta à API feita
na investigação — confirma que a resolução de mercado/linha estava
correta. O motivo real é que a própria OddsPapi não tinha esse mercado
específico da Superbet pra esse jogo no momento consultado (provável
lacuna de cobertura pontual da Superbet nessa aposta, não um bug nosso) —
a odd de 1,85 que o usuário viu no app da Superbet pode ter aparecido
depois da consulta, ou a OddsPapi simplesmente não capturou aquele
mercado específico pra essa fixture. Não é algo que o código consiga
corrigir; o tratamento correto (distinguir erro de ausência) já estava
certo e ficou mais explícito.

### Casas confirmadas

`betano.bet.br`, `estrelabet.bet.br`, `superbet.bet.br`
(`src/lib/oddspapi/melhor-odd.ts`, `BOOKMAKERS_CONFIRMADAS`).

**`betnacional` testado e descartado**: o slug `betnacional.bet.br` sugerido
no prompt **não existe** na lista de bookmakers da assinatura (conferido via
`GET /v4/account` — a lista completa de ~370 bookmakers não tem essa
variante, só o slug simples `betnacional`). E o slug simples, testado contra
dois jogos reais do Brasileirão Série B (incluindo um dos dois maiores da
rodada), **não retornou nenhum dado** — nem sequer aparece na resposta de
`/v4/odds`, diferente de betano/estrela/superbet que sempre aparecem. Ou
seja: não é falta de teste, é um bookmaker que essa integração não cobre pra
essas ligas. Fica de fora da lista até algum teste futuro mostrar o
contrário.

### Mapeamento de torneios

`TorneioMapeamento` (tabela nova) guarda `nomeInterno → tournamentId` da
OddsPapi. Seedada com as duas competições já confirmadas manualmente
(`Brasileirão Série B` → 390, `Primera División Argentina` → 155 —
"Liga Profissional" no catálogo deles; os nomes não batem nem por
aproximação, por isso essas duas *precisam* do seed manual). Pra qualquer
outra competição, a resolução é dinâmica: busca `GET
/v4/tournaments?sportId=10&language=pt` (cacheado 24h) e só vincula
automaticamente se o nome bater de forma inequívoca (igual normalizado, ou
contido um no outro, contanto que seja candidato único) — caso contrário
retorna `torneio_nao_mapeado` em vez de arriscar um vínculo errado.

### Cache e cota

Cota gratuita: 250 requisições/mês. `/v4/account` é sempre isento (nunca
conta, mesmo com a cota esgotada) e `/v4/historical-odds` é sempre grátis —
mas, ao contrário do que o prompt original assumia, **`/v4/languages` conta
normalmente** pra cota (só não é usado nesta integração, então não faz
diferença na prática). Fonte: página oficial "Requests & Quota" da
documentação da OddsPapi.

Odds por fixture e a lista de fixtures por torneio ficam em cache
(`OddsCacheEntry`, tabela nova) por 5 minutos; a lista de torneios por 24h.
Um 429 com `code: "REQUEST_LIMIT_EXCEEDED"` vira `{"encontrado": false,
"motivo": "cota_excedida"}` — nunca um erro genérico.

### Ferramenta MCP

`consultar_melhor_odd` — mesmos 4 parâmetros do endpoint. Testada de verdade
com um cliente MCP real (`Client`/`InMemoryTransport` do próprio SDK) contra
o servidor construído por `buildMcpServer`, não só contra o endpoint REST por
baixo.

### Testado

- Fluxo completo (torneio → jogo → mercado → odds → melhor) contra jogos
  reais do Brasileirão Série A e Série B, em todos os mercados suportados:
  Gols O/U (incluindo o nome real `"Over/Under Gols"`, pós-fix), Escanteios
  O/U, **Cartões O/U (odd real confirmada nas 3 casas — ver "Cartões"
  abaixo)**, Ambas Marcam, Resultado 1x2 (mandante, visitante e empate,
  cada um batendo com o time certo), Dupla Chance (as 3 formas: `<Time> ou
  Empate`, token cru `"12"`, `"Visitante ou Empate"`) e Escanteios 1x2.
- `"Resultado Mandante"` — exemplo que a Fase 3 original listava como
  *não suportado* — agora resolve corretamente pra `1` (mandante), porque
  Resultado passou a ser um mercado suportado nesta fase.
- Mercados compostos (`"Resultado/DC"`, `"Resultado/DC/DNB"`) e nomes de
  time inexistentes continuam corretamente recusados como
  `mercado_nao_suportado`, sem cair por engano em Dupla Chance ou Resultado.
- Os 4 motivos de não-encontrado, cada um confirmado sem gastar chamada de
  API além do estritamente necessário.
- `consultar_melhor_odd` via cliente MCP real, inclusive num dos novos
  mercados (Resultado).
- Cache confirmado por medição direta de cota antes/depois de cada bateria
  de testes (via `GET /v4/account`, chamada isenta): todas as variações de
  mercado testadas contra a mesma fixture reaproveitaram a mesma entrada de
  cache de odds — só a primeira consulta a uma fixture nova custa 1
  chamada real de `/v4/odds`.

**Cartões (`totals-bookings`) — teste real pedido na Fase 3.1**: testado
contra Fluminense x Vasco da Gama (Brasileirão Série A), `"Over 4.5"`.
Resultado: **as 3 casas confirmadas têm odd real** — betano 1,40, estrelabet
1,40, superbet 1,34. Diferente do que aconteceu com a Betnacional, esse
mercado funciona de verdade nas casas já confirmadas, pelo menos pra essa
liga/jogo. Vale testar de novo eventualmente noutra liga antes de confiar
cegamente, mas deixou de ser "desconhecido" — passa a fazer parte dos
mercados normalmente suportados.

**Chamadas reais de API gastas**: Fase 3 original: 8. Fase 3.1 (bug do
Superbet + ampliação de mercados): mais 8 (`/v4/fixtures` ×2, `/v4/odds`
×6, sendo 3 delas só pra investigar o caso Superbet com `verbosity`
diferente). Total acumulado: 16. Cota usada ao final: 35/250 (`/v4/account`,
sempre isento, não conta nesse total) — 215 restantes.

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

### Fase 2 (servidor MCP) — não implementada nesta etapa

O prompt original também pedia, como próximo passo opcional, um servidor MCP
expondo essas operações como ferramentas. Não construí isso agora: expor um
transporte MCP correto (schemas de ferramenta, autenticação interna contra o
`API_TOKEN`, transporte HTTP) é um subsistema à parte, e testá-lo de verdade
exige um cliente MCP real conversando com ele — algo que não dá pra validar
com confiança no mesmo nível que os testes de `curl` acima. Prefiro entregar
a Fase 1 já testada contra o banco real a entregar as duas fases com a
segunda sem verificação de ponta a ponta. Avise quando quiser que eu monte a
Fase 2 em cima dessa API.

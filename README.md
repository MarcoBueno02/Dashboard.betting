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
| `APP_PASSWORD` | Senha única para acessar o dashboard                     |

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

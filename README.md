# Wardfy

> **A camada social da sua música no Discord.**
>
> Wardfy conecta Spotify + Discord para transformar sessões individuais em presença ao vivo, evolução, descobertas e competição saudável dentro de uma comunidade.

![Status](https://img.shields.io/badge/status-MVP%20funcional-9d78ff?style=flat-square) ![Node](https://img.shields.io/badge/node-%3E%3D20-8cc84b?style=flat-square) ![Discord.js](https://img.shields.io/badge/discord.js-v14%20Components%20V2-5865f2?style=flat-square)

## O que está pronto

- **Painel web React/Vite responsivo**, com dashboard, atividade ao vivo, ranking, DNA musical, desafios, Wrapped contínuo, heatmap e administração de servidor.
- **API Fastify tipada**, com modo demonstração utilizável sem credenciais e endpoints para dashboard, atividade SSE, ranking, desafios, compatibilidade e configurações.
- **Fluxos OAuth2 para Spotify e Discord** com state assinado, cookie `HttpOnly`, proteção contra open redirect, tokens Spotify criptografados com AES-256-GCM e refresh automático.
- **Bot Discord.js v14**, slash commands, publicação de atividade sem spam e cartões ricos usando **Discord Components V2** (containers, sections, thumbnails, text displays e modals com labels).
- **Modelo Prisma/PostgreSQL** para usuários, contas Spotify, guilds, configurações, escutas, agregados diários, conquistas, desafios, mensagens de atividade e auditoria.
- **Fundação operacional**: Redis cache, rate limit, CORS restritivo, healthcheck, documentação OpenAPI, Dockerfiles e Docker Compose.

> O projeto abre em **modo demonstração** por padrão (`DEMO_MODE=true`). Isso permite validar toda a experiência visual e os endpoints locais antes de cadastrar aplicativos Discord/Spotify.

---

## Visual rápido

```bash
cp .env.example .env
npm install
npm run dev
```

- Dashboard: `http://localhost:5173`
- API: `http://localhost:3001`
- Saúde: `http://localhost:3001/health`
- OpenAPI / Swagger: `http://localhost:3001/docs`

`npm run dev` inicia API e painel. O bot exige credenciais reais, então é iniciado separadamente:

```bash
npm run dev:bot
# ou API + painel + bot, quando as variáveis Discord existirem:
npm run dev:full
```

> O arquivo **`.env` na raiz do repositório** é carregado automaticamente pela API, pelo bot e pela configuração do Vite — inclusive quando o npm executa scripts dentro de workspaces. Não é necessário copiar credenciais para subpastas. Somente variáveis com prefixo `VITE_` são expostas ao browser.

---

## Arquitetura

```text
                         ┌──────────────────────────┐
                         │        Discord Bot        │
                         │ discord.js v14 / CV2 UI   │
                         └────────────┬─────────────┘
                                      │ service API + interactions
┌─────────────────────┐               ▼
│ React + Vite Web    │ ◄───────┌───────────────┐──────────► Spotify OAuth / Web API
│ dashboard do guild  │  SSE    │  Fastify API  │
└─────────────────────┘         └───────┬───────┘
                                         │
                      ┌──────────────────┼──────────────────┐
                      ▼                  ▼                  ▼
                PostgreSQL           Redis cache      Worker / poll planner
                Prisma graph       rate-limit/TTL    sync adaptativo
```

### Monorepo

```text
apps/
  api/       Fastify, Prisma schema, OAuth, cache, SSE e serviços de sync
  bot/       Discord.js, comandos slash, Components V2 e publisher de atividade
  web/       React, Framer Motion, Recharts e painel responsivo
packages/
  shared/    contratos e tipos compartilhados
```

### Fluxo de atividade ao vivo

1. O worker planeja consultas ao endpoint de playback de forma **adaptativa**: usuários pausados esfriam para 120 s e faixas ativas são consultadas em limites úteis de 15–45 s.
2. A API normaliza a faixa, registra a escuta e publica um evento no bus (em produção, Redis Pub/Sub/queue).
3. O painel recebe atualizações em **SSE** em `/v1/activity/stream`.
4. O bot usa `ActivityChannelPublisher` para **editar uma única mensagem por usuário/guild**, evitando spam no canal `#🎧-tocando-agora`.

---

## Configuração real

### 1. Banco e cache

Suba PostgreSQL e Redis localmente:

```bash
docker compose up postgres redis -d
npm run db:generate
npm run db:migrate
```

Defina `DEMO_MODE=false` na `.env` depois de provisionar o banco. O schema está em `apps/api/prisma/schema.prisma`.

### 2. Spotify

No [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), crie uma app e cadastre exatamente:

```text
http://localhost:3001/v1/auth/spotify/callback
```

Preencha:

```dotenv
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3001/v1/auth/spotify/callback
```

Scopes solicitados pelo Wardfy:

- `user-read-private`, `user-read-email`
- `user-read-recently-played`, `user-top-read`
- `user-read-playback-state`, `user-read-currently-playing`
- `playlist-read-private`, `playlist-read-collaborative`

### 3. Discord

No [Discord Developer Portal](https://discord.com/developers/applications):

1. Configure o callback `http://localhost:3001/v1/auth/discord/callback`.
2. Crie o bot, habilite-o para `applications.commands` e convide-o com escopos `bot applications.commands`.
3. Preencha as variáveis `DISCORD_*` na `.env`. No portal do Discord, **Client ID** e **Application ID** são o mesmo valor; o bot aceita `DISCORD_APPLICATION_ID` ou usa `DISCORD_CLIENT_ID` como fallback.
4. Registre os comandos:

```bash
npm run bot:register
npm run dev:bot
```

Use `DISCORD_DEV_GUILD_ID` durante o desenvolvimento para registrar comandos instantaneamente em um único servidor. Sem ela, os comandos são globais e podem levar tempo para propagar.

### 4. Chaves obrigatórias em produção

```bash
openssl rand -base64 32  # TOKEN_ENCRYPTION_KEY
openssl rand -hex 32    # OAUTH_STATE_SECRET
```

Nunca use as chaves de exemplo em produção.

---

## Comandos do bot

| Comando                                     | Resultado                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `/perfil [usuario]`                         | Perfil, XP, nível, sequência e resumo musical.                         |
| `/ranking [metrica]`                        | Ranking semanal por minutos, faixas, artistas, gêneros ou descobertas. |
| `/compatibilidade usuario`                  | Afinidade, artistas/gêneros em comum e CTA para recomendação.          |
| `/desafio`                                  | Missão ativa, progresso e recompensa.                                  |
| `/agora`                                    | Card de atividade e atualização do canal configurado.                  |
| `/configurar [canal_atividade] [intervalo]` | Configuração administrativa do Wardfy no guild.                        |

### Discord Components V2

O bot não usa embeds clássicos para os cards ricos. `apps/bot/src/ui/components-v2.ts` compõe cada mensagem com:

- `ContainerBuilder` com `MessageFlags.IsComponentsV2`;
- `TextDisplayBuilder`, `SectionBuilder`, `ThumbnailBuilder` e `SeparatorBuilder`;
- action rows dentro do container;
- `LabelBuilder` + `TextInputBuilder` + `TextDisplayBuilder` para o modal de recomendação.

Isso mantém mensagens organizadas e possibilita layouts modernos sem misturar `content`/`embeds` com Components V2.

---

## API principal

| Método      | Rota                                               | Uso                            |
| ----------- | -------------------------------------------------- | ------------------------------ |
| `GET`       | `/health`                                          | Liveness check.                |
| `GET`       | `/docs`                                            | Swagger UI.                    |
| `GET`       | `/v1/dashboard`                                    | Snapshot do painel.            |
| `GET`       | `/v1/activity`                                     | Quem está ouvindo.             |
| `GET`       | `/v1/activity/stream`                              | Stream SSE de presença.        |
| `GET`       | `/v1/rankings?period=week&metric=listeningMinutes` | Ranking agregado.              |
| `GET`       | `/v1/challenges`                                   | Desafios ativos.               |
| `GET`       | `/v1/compatibility/:left/:right`                   | Compatibilidade musical.       |
| `GET/PATCH` | `/v1/guilds/:guildId/settings`                     | Preferências do servidor.      |
| `POST`      | `/v1/events/listening`                             | Entrada interna do bot/worker. |
| `GET`       | `/v1/auth/spotify/start`                           | Inicia conexão Spotify.        |
| `GET`       | `/v1/auth/discord/start`                           | Inicia login Discord.          |

`POST /v1/events/listening` é protegido por `x-wardfy-bot-token` fora do demo. Defina `BOT_API_TOKEN` longo e aleatório.

---

## Dados e produto

O schema já separa dados brutos de agregados (`ListeningEvent` e `UserDailyStat`) para que ranking e Wrapped não precisem reprocessar o histórico inteiro. Ele também prevê:

- XP, nível, títulos e badges;
- desafios por guild ou globais;
- mensagens de atividade persistidas;
- cache de rankings;
- log de auditoria de configurações, conexão e tokens;
- campos de audio features para BPM, energia, danceability, valence, acústica e instrumentalidade.

### Observação importante sobre Spotify

A API do Spotify fornece playback atual, top items e histórico recente conforme escopos/autorização; ela não libera um histórico completo retroativo ilimitado. Por isso, Wardfy deve registrar novas escutas a partir da conexão e tratar importações disponíveis como backfill. Recursos de audio features/recomendação também variam conforme o tipo e a aprovação da aplicação Spotify: o modelo persiste os dados e permite usar um provedor de enriquecimento quando necessário, em vez de quebrar o produto se um endpoint estiver indisponível.

---

## Segurança e escala

- Tokens Spotify são cifrados com **AES-256-GCM**, IV aleatório e payload versionado.
- OAuth usa state assinado por HMAC, validade de 10 minutos, cookie `HttpOnly` `SameSite=Lax` e retorno apenas para path relativo.
- Session cookie é assinado e expira em 7 dias.
- API aplica rate limit global, CORS por origem, timeout no client Spotify e redaction de cookies/authorization nos logs.
- Redis é um acelerador, não fonte de verdade: uma falha de cache faz recompute, não derruba o request.
- Em múltiplas instâncias, substitua `ActivityBus` local por Redis Pub/Sub e agende `ListeningPoller` com BullMQ/Redis. A interface já isola essas trocas.

---

## Docker

```bash
cp .env.example .env
# preencha as chaves de produção antes de subir o API real
docker compose up --build
# incluir o bot:
docker compose --profile bot up --build
```

O nginx do painel faz proxy de `/api/*` para o serviço API; assim o browser nunca chama `localhost` diretamente em um deployment real.

---

## Qualidade

```bash
npm run typecheck
npm run build
```

Os comandos verificam os três apps e o pacote compartilhado. O build do Prisma depende de baixar o engine compatível na primeira execução de `npm run db:generate`.

---

## Próximos incrementos recomendados

1. Ligar os repositórios Prisma aos agregadores reais e executar a migration inicial versionada no ambiente provisionado.
2. Rodar o polling em fila BullMQ com backoff por `Retry-After` e um orçamento global por token/guild.
3. Persistir o mapeamento de `ActivityMessage` do bot em vez do adaptador em memória.
4. Adicionar autenticação de painel/RBAC por guild e auditoria de todas as mutations.
5. Implementar jobs diários/semanais/mensais para recaps, regras de XP e avaliação de conquistas.
6. Conectar recomendação a um provedor de catálogo/audio-feature compatível com a aprovação Spotify da aplicação.

---

Feito com foco em comunidades que acreditam que **música é conversa, memória e descoberta**.
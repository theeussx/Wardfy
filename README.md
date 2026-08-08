# Wardfy

> **A camada social real da sua música no Discord.**

Wardfy conecta Spotify e Discord para registrar escutas reais, construir um histórico contínuo e transformar servidores em comunidades musicais vivas.

![Node](https://img.shields.io/badge/node-%3E%3D20-38bdf8?style=flat-square) ![Discord.js](https://img.shields.io/badge/discord.js-v14%20Components%20V2-2563eb?style=flat-square) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-0ea5e9?style=flat-square)

## Sem modo de demonstração

O Wardfy não entrega estatísticas fictícias. O painel começa vazio até que uma conta conecte Discord + Spotify; a partir daí, tudo vem de dados persistidos no PostgreSQL e de consultas reais à API Spotify.

- Reproduções atuais são consultadas periodicamente pela API.
- Histórico recente, top tracks e top artists disponíveis na conta são importados no primeiro sync.
- Escutas novas criam eventos, agregados diários, XP, nível, títulos e conquistas.
- Rankings, DNA, heatmap, Wrapped e compatibilidade são derivados desses eventos.
- O bot reconcilia o canal de atividade e **edita** os cards existentes em vez de criar spam.

A interface usa uma paleta **azul-marinho, azul elétrico e ciano**.

---

## Subir o ambiente real

### 1. Preencha o ambiente

```bash
cp .env.example .env
```

Gere as duas chaves obrigatórias:

```bash
openssl rand -base64 32  # TOKEN_ENCRYPTION_KEY
openssl rand -hex 32    # OAUTH_STATE_SECRET
openssl rand -hex 32    # BOT_API_TOKEN
```

Preencha todas as chaves Spotify e Discord em `.env`. `BOT_API_TOKEN` precisa ser idêntico para API e bot.

> O `.env` da raiz é carregado pela API, pelo bot e pelo Vite. Apenas variáveis `VITE_*` podem chegar ao browser.

### 2. Banco, Redis e Prisma

```bash
docker compose up postgres redis -d
npm install
npm run db:generate
npm run db:deploy
```

O schema e as migrations estão em `apps/api/prisma`. A migration `20260806100000_recommendations` adiciona recomendações musicais persistidas.

### 3. Inicie API e painel

```bash
npm run dev
# ou API + painel + bot:
npm run dev:full
```

`dev:api` agora verifica PostgreSQL e Redis antes de iniciar. Se `DATABASE_URL` e `REDIS_URL` apontarem para `localhost`, ele sobe automaticamente os serviços `postgres` e `redis` do Docker Compose, gera o Prisma Client e aplica migrations pendentes. O bot espera o endpoint `/health` da API antes de conectar ao Discord.

- Painel: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001`
- Swagger: `http://127.0.0.1:3001/docs`

> Use `127.0.0.1` (não `localhost`) no desenvolvimento local. O Spotify **não
> aceita** `localhost` como redirect URI desde 2025 — apenas HTTPS ou loopback
> IP explícito (`http://127.0.0.1:PORT`). Manter `127.0.0.1` em toda a cadeia
> (painel, API e callbacks) garante que cookie, redirect e callback compartilhem
> a mesma origem. Em GitHub Codespaces, `APP_ORIGIN`/`API_ORIGIN` são detectados
> automaticamente a partir de `CODESPACE_NAME`.

Comandos auxiliares:

```bash
npm run infra:up      # valida ou sobe PostgreSQL + Redis locais
npm run db:prepare    # prisma generate + prisma migrate deploy
npm run infra:down    # encerra a infraestrutura Docker local
```

### 4. Instale e inicie o bot

No Discord Developer Portal, use os callbacks:

```text
http://127.0.0.1:3001/v1/auth/discord/callback
http://127.0.0.1:3001/v1/auth/spotify/callback
```

> **Em GitHub Codespaces / ambiente remoto**, os callbacks devem apontar para a
> URL pública do painel através do proxy `/api`:
>
> ```text
> https://<codespace>-5173.app.github.dev/api/v1/auth/discord/callback
> https://<codespace>-5173.app.github.dev/api/v1/auth/spotify/callback
> ```
>
> O valor registrado no provider deve ser **exatamente** igual ao `redirect_uri`
> usado pelo fluxo (mesmo path, porta e sem trailing slash extra).

Convide a aplicação para o servidor com os scopes:

```text
bot applications.commands
```

Depois:

```bash
npm run bot:register
npm run dev:bot
```

`DISCORD_DEV_GUILD_ID` deve ser o ID do **servidor**, não de canal ou usuário. Se o registro retornar `Discord 50001 / Missing Access`, o script imprime um link de instalação preconfigurado para a aplicação correta.

---

## Fluxo de dados real

```text
Discord OAuth ──► sessão assinada ──► User PostgreSQL
Spotify OAuth ──► tokens AES-256-GCM ──► SpotifyAccount PostgreSQL

Spotify playback ──► PlaybackSyncService ──► ListeningEvent
                                             ├── UserDailyStat
                                             ├── XP / level / achievements
                                             ├── rankings / DNA / Wrapped
                                             ├── SSE do painel
                                             └── GuildActivitySync do bot ──► Components V2 no Discord
```

A API consulta playback em `PLAYBACK_POLL_INTERVAL_SECONDS` (mínimo de 15 segundos). O bot reconcilia canais em `ACTIVITY_SYNC_INTERVAL_SECONDS`, respeitando também o intervalo configurado por servidor.

---

## Recursos implementados

### Painel web

- Login Discord e conexão Spotify reais.
- Seleção de biblioteca pessoal ou servidor sincronizado pelo bot.
- Agora tocando, gráfico semanal, heatmap, top tracks e atividade ao vivo.
- Rankings por minutos, faixas, artistas e descobertas.
- DNA musical, gêneros, audio features quando disponíveis e compatibilidade real.
- Wrapped contínuo por mês, escutas, descobertas e evolução.
- Configuração persistida de canal, intervalos, notificações e permissões.
- Criação de desafios por administradores e entrada em desafios por membros.

### Bot Discord

| Comando                    | Função real                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `/perfil [usuario]`        | Lê nível, XP, sequência e agregados persistidos.             |
| `/ranking [metrica]`       | Consulta o ranking real do servidor.                         |
| `/compatibilidade usuario` | Calcula afinidade usando escutas dos últimos 90 dias.        |
| `/desafio`                 | Mostra uma missão ativa e permite entrar nela.               |
| `/agora`                   | Força sync do playback atual e atualiza o canal configurado. |
| `/configurar`              | Persiste canal e intervalo de atividade do servidor.         |

Os cards usam **Discord Components V2**: `ContainerBuilder`, `TextDisplayBuilder`, `SectionBuilder`, thumbnails, separadores e modals com `LabelBuilder`.

### Atividade e recomendações

- Uma referência de mensagem é salva em `ActivityMessage` por usuário/guild.
- Após reinício, o bot encontra a mesma mensagem e continua editando-a.
- Uma recomendação enviada no modal é persistida em `Recommendation` e enviada por DM ao destinatário quando a DM está disponível.

---

## API

### Browser autenticado

| Método      | Rota                               | Uso                                                 |
| ----------- | ---------------------------------- | --------------------------------------------------- |
| `GET`       | `/v1/me`                           | Sessão, perfil e guilds disponíveis.                |
| `POST`      | `/v1/me/sync`                      | Importa biblioteca/histórico disponível no Spotify. |
| `GET`       | `/v1/dashboard?guildId=`           | Snapshot real do painel.                            |
| `GET`       | `/v1/activity/stream?guildId=`     | SSE de presença.                                    |
| `GET`       | `/v1/rankings?guildId=&metric=`    | Ranking agregado.                                   |
| `GET`       | `/v1/challenges?guildId=`          | Desafios ativos do usuário.                         |
| `POST`      | `/v1/guilds/:guildId/challenges`   | Cria desafio (administrador).                       |
| `POST`      | `/v1/challenges/:challengeId/join` | Entra em desafio.                                   |
| `GET/PATCH` | `/v1/guilds/:guildId/settings`     | Preferências persistidas.                           |

### Bot interno

As rotas em `/v1/internal/*` exigem `x-wardfy-bot-token`. Elas sincronizam guilds/membros, playback, cards de atividade, rankings, desafios e recomendações sem expor tokens OAuth ao bot.

---

## Segurança

- Tokens Spotify cifrados com **AES-256-GCM**, IV aleatório e payload versionado.
- OAuth state HMAC com expiração e retorno somente para caminhos relativos.
- Sessão `HttpOnly`, `SameSite=Lax` e assinada.
- Rate limit, CORS por origem, redaction de cookies em logs e token interno bot→API.
- PostgreSQL é a fonte de verdade; Redis é cache de curta duração.

---

## Observação sobre Spotify

Spotify não fornece um histórico retroativo ilimitado nem webhooks de playback. Wardfy importa o histórico que a API disponibiliza no momento da conexão e passa a registrar novas escutas continuamente. Audio features dependem da disponibilidade/permissão do endpoint para a aplicação Spotify; quando o catálogo não as disponibiliza, o restante da plataforma continua funcionando.

---

## Verificação

```bash
npm run typecheck
npm run build
npm audit --audit-level=moderate
```
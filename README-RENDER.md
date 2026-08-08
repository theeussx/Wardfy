# Wardfy no Render (Docker + Blueprint)

Este arquivo explica como fazer a aplicação rodar inteira na Render, usando o arquivo `render.yaml` que já está no repositório.

## O que está incluso

- **Postgres** (`postgres`) — banco de dados persistente em Docker com disco.
- **Redis** (`redis`) — cache persistente em Docker com disco.
- **API** (`api`) — servidor Fastify com migrações automáticas no startup.
- **Web** (`web`) — frontend estático servido pelo Nginx com proxy `/api` para o serviço `api`.
- **Bot (Discord)** — **NÃO está na Render** (conforme você pediu). Instruções para rodar externamente estão no final.

## Pré-requisitos

1. Conta na [Render](https://render.com/).
2. Repositório conectado à Render (pode ser este). Ative o deploy automático.
3. Credenciais dos serviços externos (veja seção Segredos abaixo).

## Passo a passo

### 1. Criar o Blueprint

No painel da Render:

- Clique em **New +** → **Blueprint**.
- Selecione este repositório (`theeussx/Wardfy` ou seu fork).
- A Render vai ler `render.yaml` e criar os 4 serviços automaticamente.

**Nota:** os nomes de serviço são `postgres`, `redis`, `api`, `web`. Se já existirem serviços com esses nomes, renomeie no `render.yaml` antes de criar.

### 2. Ajustar URLs públicas (essencial!)

Após o primeiro deploy, copie as URLs reais do Dashboard:

- Serviço `api` → ex: `https://api-xyz.onrender.com`
- Serviço `web` → ex: `https://web-abc.onrender.com`

Depois vá em cada serviço e atualize as variáveis de ambiente:

| Variável | Onde atualizar | Valor correto |
|---|---|---|
| `APP_ORIGIN` | `api` (e `web` se necessário) | `https://<url-do-web>` |
| `API_ORIGIN` | `api` | `https://<url-do-api>` |
| `SPOTIFY_REDIRECT_URI` | `api` | `https://<url-do-web>/api/v1/auth/spotify/callback` |
| `DISCORD_REDIRECT_URI` | `api` | `https://<url-do-web>/api/v1/auth/discord/callback` |

> **Importante:** esses valores precisam ser **exatos** (inclusive barras, portos, `https`). Registre-os também no painel Spotify Developer Dashboard e Discord Developer Portal.

### 3. Definir segredos no Dashboard

No serviço `api`, adicione manualmente (não versione no Git):

- `TOKEN_ENCRYPTION_KEY` — `openssl rand -base64 32`
- `OAUTH_STATE_SECRET` — `openssl rand -hex 32`
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN` (token do bot Discord — só se for usar bot na mesma hospedagem; como você escolheu outro host, pode pular se não usar na API diretamente)
- `DISCORD_APPLICATION_ID`
- `DISCORD_DEV_GUILD_ID`
- `BOT_API_TOKEN` — token que o bot usará para falar com esta API (`openssl rand -hex 32`)

**Regra:** o `BOT_API_TOKEN` precisa ser **idêntico** entre a API e o bot externo.

### 4. Banco de dados (já automático)

O `postgres` sobe com o usuário/senha `wardfy/wardfy`. A API já aponta para `postgresql://wardfy:wardfy@postgres:5432/wardfy?schema=public`. As migrações rodam automaticamente quando a API inicia (via `scripts/render-entry.mjs`).

Se quiser rodar uma migração manualmente, use o Shell do serviço `api` na Render:

```bash
npm run db:deploy --workspace=@wardfy/api
```

### 5. Teste

- Acesse `https://<url-do-web>` → deve carregar o dashboard.
- Tente conectar com Spotify/Discord → deve redirecionar corretamente.
- Verifique os logs do serviço `api` para confirmar que `PostgreSQL is ready.` aparece.

## Sobre o bot (Discord) — host externo

Como você escolheu rodar o bot fora da Render, use uma das opções:

- **Railway / Render (Worker) / VPS / AWS / Hetzner**
- O bot precisa apenas de:
  - `API_ORIGIN=https://<url-do-api>`
  - `BOT_API_TOKEN=<mesmo-da-API>`
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_APPLICATION_ID`
- Ele **não precisa** de banco próprio; ele fala com a API.
- Se precisar de DB próprio (não é obrigatório pelo `config.ts` do bot, mas o `docker-compose.yml` passa `DATABASE_URL`), aponte o bot para o mesmo `postgres` da Render usando o **IP interno** ou expondo o Postgres (não recomendado). A melhor opção é rodar o bot sem `DATABASE_URL`, já que o código não exige.

### Exemplo rápido para rodar bot em outra máquina (Docker)

```bash
docker run -d \
  --env NODE_ENV=production \
  --env API_ORIGIN=https://<url-do-api> \
  --env BOT_API_TOKEN=<token> \
  --env DISCORD_BOT_TOKEN=<token> \
  --env DISCORD_APPLICATION_ID=<id> \
  --env DISCORD_DEV_GUILD_ID=<id> \
  --env ACTIVITY_SYNC_INTERVAL_SECONDS=30 \
  seu-registro/wardfy-bot:latest
```

Ou use `docker-compose.bot.yml` (se criar um) apontando para a API externa.

## Problemas comuns

| Problema | Solução |
|---|---|
| OAuth falha após login | Verifique `APP_ORIGIN` e `SPOTIFY_REDIRECT_URI` / `DISCORD_REDIRECT_URI`. Devem ser https e idênticos aos registrados no Spotify/Discord. |
| `Migration failed` no startup | Certifique-se de que o serviço `postgres` está saudável (verde no Dashboard). A API espera 60s. Se falhar, reinicie o serviço `api`. |
| Bot não conecta | Verifique se `BOT_API_TOKEN` é igual na API e no bot. Verifique se `API_ORIGIN` usa `https://`. |
| Web não carrega `/api` | Verifique se o serviço `api` está rodando. O Nginx faz proxy para `http://api:3001`, que é o nome interno do serviço `api` no Render. |

## Arquivos alterados / criados para a Render

- `render.yaml` — blueprint
- `scripts/render-entry.mjs` — espera DB, roda migração, sobe servidor
- `apps/api/Dockerfile` — copia script e altera `CMD`
- `.env.render` (opcional, modelo) — veja abaixo

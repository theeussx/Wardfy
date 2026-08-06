# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/bot apps/bot
RUN npm run build --workspace=@wardfy/shared && npm run build --workspace=@wardfy/bot

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace=@wardfy/bot --workspace=@wardfy/shared
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/bot/dist apps/bot/dist
CMD ["node", "apps/bot/dist/index.js"]

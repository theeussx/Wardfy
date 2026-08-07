import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { loadConfig, type AppConfig } from './config.js';
import { disconnectPrisma, getPrisma } from './database.js';
import { AppError } from './lib/app-error.js';
import { createCache, type Cache } from './lib/cache.js';
import { SessionSigner } from './lib/session.js';
import { SignedState } from './lib/signed-state.js';
import { TokenCipher } from './lib/token-cipher.js';
import { PrismaSpotifyAccountRepository } from './repositories/prisma-spotify-account.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';
import { accountRoutes } from './routes/account.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { healthRoutes } from './routes/health.js';
import { internalRoutes } from './routes/internal.js';
import { ActivityBus } from './services/activity-bus.js';
import { DiscordOAuthService } from './services/discord-oauth.service.js';
import { PlaybackSyncService } from './services/playback-sync.service.js';
import { SpotifyApiService } from './services/spotify-api.service.js';
import { SpotifyOAuthService } from './services/spotify-oauth.service.js';
import { WardfyDataService } from './services/wardfy-data.service.js';

export interface WardfyApp extends FastifyInstance {
  wardfy: {
    config: AppConfig;
    cache: Cache;
    activityBus: ActivityBus;
    data: WardfyDataService;
    playbackSync: PlaybackSyncService;
  };
}

function hasStatusCode(value: unknown): value is { statusCode: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof value.statusCode === 'number'
  );
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/$/, '');
}

export async function buildApp(config = loadConfig()): Promise<WardfyApp> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'info' : 'warn',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
    requestIdHeader: 'x-request-id',
  }) as unknown as WardfyApp;

  const prisma = getPrisma();
  await prisma.$connect();

  const cache = createCache(config.REDIS_URL);
  const activityBus = new ActivityBus();
  const users = new PrismaUserRepository(prisma);
  const accounts = new PrismaSpotifyAccountRepository(prisma);
  const cipher = new TokenCipher(config.TOKEN_ENCRYPTION_KEY);
  const state = new SignedState(config.OAUTH_STATE_SECRET);
  const sessions = new SessionSigner(config.OAUTH_STATE_SECRET);
  const spotifyOAuth = new SpotifyOAuthService(config, cipher, accounts, users);
  const discord = new DiscordOAuthService(config);
  const spotifyApi = new SpotifyApiService();
  const data = new WardfyDataService(prisma, spotifyOAuth, spotifyApi, activityBus);
  const playbackSync = new PlaybackSyncService(
    prisma,
    data,
    config.PLAYBACK_POLL_INTERVAL_SECONDS * 1_000,
    config.SPOTIFY_SYNC_CONCURRENCY,
  );

  await data.ensureSystemAchievements();
  app.wardfy = { config, cache, activityBus, data, playbackSync };

  const allowedOrigins = new Set([normalizeOrigin(config.APP_ORIGIN)]);
  await app.register(cors, {
    origin(origin, callback) {
      // Browser traffic uses the Vite/nginx relative proxy. Only the configured
      // public dashboard origin is accepted; no Origin is used by bot/internal traffic.
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
      return callback(new Error('Origin is not allowed by Wardfy CORS policy.'), false);
    },
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      error: 'RATE_LIMITED',
      message: 'Muitas solicitações. Tente novamente em instantes.',
    }),
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Wardfy API',
        version: '1.0.0',
        description: 'Production API for real Spotify listening and Discord communities.',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error, request, reply) => {
    const err = error instanceof Error ? error : new Error('Unknown request error');
    const statusFromFastify = hasStatusCode(error) ? error.statusCode : undefined;
    const statusCode =
      error instanceof AppError
        ? error.statusCode
        : error instanceof z.ZodError
          ? 400
          : statusFromFastify && statusFromFastify >= 400
            ? statusFromFastify
            : 500;
    const code =
      error instanceof AppError
        ? error.code
        : error instanceof z.ZodError
          ? 'VALIDATION_ERROR'
          : statusCode >= 500
            ? 'INTERNAL_ERROR'
            : 'REQUEST_ERROR';

    if (statusCode >= 500) request.log.error(error);
    return reply.code(statusCode).send({
      error: code,
      message: statusCode >= 500 ? 'Ocorreu um erro inesperado.' : err.message,
      requestId: request.id,
      ...(error instanceof z.ZodError ? { issues: error.flatten() } : {}),
    });
  });

  await app.register(healthRoutes, { config });
  await app.register(accountRoutes, { prefix: '/v1', sessions, data });
  await app.register(authRoutes, {
    prefix: '/v1/auth',
    config,
    state,
    sessions,
    spotify: spotifyOAuth,
    discord,
    users,
    data,
  });
  await app.register(dashboardRoutes, { prefix: '/v1', sessions, data, cache, activityBus });
  await app.register(internalRoutes, { prefix: '/v1/internal', config, data });

  playbackSync.start();
  app.addHook('onClose', async () => {
    playbackSync.stop();
    await disconnectPrisma();
  });

  return app;
}
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
import {
  MemorySpotifyAccountRepository,
  type SpotifyAccountRepository,
} from './repositories/spotify-account.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';
import { MemoryUserRepository, type UserRepository } from './repositories/user.repository.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { healthRoutes } from './routes/health.js';
import { ActivityBus } from './services/activity-bus.js';
import { DiscordOAuthService } from './services/discord-oauth.service.js';
import { SpotifyOAuthService } from './services/spotify-oauth.service.js';

export interface WardfyApp extends FastifyInstance {
  wardfy: {
    config: AppConfig;
    cache: Cache;
    activityBus: ActivityBus;
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

export async function buildApp(config = loadConfig()): Promise<WardfyApp> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'info' : 'warn',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
    requestIdHeader: 'x-request-id',
  }) as unknown as WardfyApp;

  const cache = createCache(config.REDIS_URL, !config.DEMO_MODE);
  const activityBus = new ActivityBus();
  const users: UserRepository = config.DEMO_MODE
    ? new MemoryUserRepository()
    : new PrismaUserRepository(getPrisma());
  const accounts: SpotifyAccountRepository = config.DEMO_MODE
    ? new MemorySpotifyAccountRepository()
    : new PrismaSpotifyAccountRepository(getPrisma());
  const cipher = new TokenCipher(config.TOKEN_ENCRYPTION_KEY);
  const state = new SignedState(config.OAUTH_STATE_SECRET);
  const sessions = new SessionSigner(config.OAUTH_STATE_SECRET);
  const spotify = new SpotifyOAuthService(config, cipher, accounts, users);
  const discord = new DiscordOAuthService(config);

  app.wardfy = { config, cache, activityBus };

  await app.register(cors, {
    origin(origin, callback) {
      // Server-to-server requests and same-origin previews have no Origin header.
      if (!origin || origin === config.APP_ORIGIN) return callback(null, true);
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
        version: '0.1.0',
        description: 'Social music graph and Discord orchestration API.',
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
  await app.register(authRoutes, {
    prefix: '/v1/auth',
    config,
    state,
    sessions,
    spotify,
    discord,
    users,
  });
  await app.register(dashboardRoutes, { prefix: '/v1', config, cache, activityBus });

  app.addHook('onClose', async () => {
    if (!config.DEMO_MODE) await disconnectPrisma();
  });

  return app;
}

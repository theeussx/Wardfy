import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { AppConfig } from '../config.js';
import type { Cache } from '../lib/cache.js';
import { AppError } from '../lib/app-error.js';
import { ActivityBus, type ActivityUpdate } from '../services/activity-bus.js';
import {
  buildDemoActivity,
  demoCompatibility,
  demoDashboard,
  getDemoLeaderboard,
} from '../services/demo-data.js';

interface DashboardRouteOptions {
  config: AppConfig;
  cache: Cache;
  activityBus: ActivityBus;
}

const periodSchema = z.enum(['day', 'week', 'month', 'year', 'all']).default('week');
const metricSchema = z
  .enum(['listeningMinutes', 'artists', 'tracks', 'discoveries', 'genres', 'sessions'])
  .default('listeningMinutes');

const playbackSchema = z.object({
  guildId: z.string().min(1).max(32).optional(),
  displayName: z.string().min(1).max(80).optional(),
  userId: z.string().min(1).max(64),
  isPlaying: z.boolean(),
  progressMs: z.number().int().min(0),
  deviceName: z.string().max(100).optional(),
  deviceType: z.string().max(50).optional(),
  updatedAt: z.string().datetime(),
  track: z
    .object({
      id: z.string().min(1).max(128),
      title: z.string().min(1).max(256),
      artists: z.array(z.string().min(1).max(256)).max(20),
      album: z.string().min(1).max(256),
      albumArtUrl: z.string().url().optional(),
      spotifyUrl: z.string().url(),
      durationMs: z.number().int().positive(),
      popularity: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
});

const guildSettingsSchema = z.object({
  activityChannelId: z.string().max(32).nullable().optional(),
  activityUpdateSeconds: z.number().int().min(15).max(300).optional(),
  notificationsEnabled: z.boolean().optional(),
  automaticRolesEnabled: z.boolean().optional(),
  allowMemberComparison: z.boolean().optional(),
  locale: z.string().min(2).max(12).optional(),
});

const demoGuildSettings = {
  activityChannelId: '1234567890',
  activityChannelName: '🎧-tocando-agora',
  activityUpdateSeconds: 30,
  notificationsEnabled: true,
  automaticRolesEnabled: false,
  allowMemberComparison: true,
  locale: 'pt-BR',
};

export const dashboardRoutes: FastifyPluginAsync<DashboardRouteOptions> = async (app, options) => {
  app.get('/dashboard', async () => ({
    data: demoDashboard,
    meta: {
      mode: options.config.DEMO_MODE ? 'demo' : 'connected',
      generatedAt: new Date().toISOString(),
    },
  }));

  app.get('/activity', async () => ({ data: buildDemoActivity() }));

  app.get('/activity/stream', async (_request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(`event: snapshot\ndata: ${JSON.stringify(buildDemoActivity())}\n\n`);

    const unsubscribe = options.activityBus.subscribe((update) => {
      reply.raw.write(`event: playback\ndata: ${JSON.stringify(update)}\n\n`);
    });
    const keepAlive = setInterval(() => reply.raw.write(': keepalive\n\n'), 25_000);
    _request.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
      reply.raw.end();
    });
  });

  app.get('/rankings', async (request) => {
    const query = z.object({ period: periodSchema, metric: metricSchema }).parse(request.query);
    const cacheKey = `ranking:${query.period}:${query.metric}`;
    const cached = await cacheGet(options.cache, cacheKey);
    const data = cached ?? getDemoLeaderboard(query.metric);
    if (!cached) void options.cache.set(cacheKey, data, 45).catch(() => undefined);
    return { data, meta: { period: query.period, metric: query.metric } };
  });

  app.get('/challenges', async () => ({ data: demoDashboard.challenges }));

  app.get('/compatibility/:left/:right', async (request) => {
    const params = z
      .object({ left: z.string().min(1), right: z.string().min(1) })
      .parse(request.params);
    return {
      data: demoCompatibility,
      meta: { left: params.left, right: params.right },
    };
  });

  app.get('/guilds/:guildId/settings', async (request) => {
    z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    return { data: demoGuildSettings };
  });

  app.patch('/guilds/:guildId/settings', async (request) => {
    z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    const update = guildSettingsSchema.parse(request.body);
    Object.assign(demoGuildSettings, update);
    return { data: demoGuildSettings };
  });

  app.post('/events/listening', async (request, reply) => {
    assertBotRequest(request.headers['x-wardfy-bot-token'], options.config);
    const update = playbackSchema.parse(request.body) as ActivityUpdate;
    options.activityBus.publish(update);
    return reply.code(202).send({ data: { accepted: true, receivedAt: new Date().toISOString() } });
  });
};

async function cacheGet<T>(cache: Cache, key: string): Promise<T | null> {
  try {
    return await cache.get<T>(key);
  } catch {
    // Cache is an optimisation, never the source of truth.
    return null;
  }
}

function assertBotRequest(token: string | string[] | undefined, config: AppConfig): void {
  if (config.DEMO_MODE && !config.BOT_API_TOKEN) return;
  const candidate = Array.isArray(token) ? token[0] : token;
  if (!candidate || candidate !== config.BOT_API_TOKEN) {
    throw new AppError('This endpoint is reserved for the Wardfy bot.', 401, 'BOT_AUTH_REQUIRED');
  }
}

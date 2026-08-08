import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { AppError } from '../lib/app-error.js';
import type { Cache } from '../lib/cache.js';
import { requireSession } from '../lib/request-auth.js';
import { SessionSigner } from '../lib/session.js';
import { ActivityBus } from '../services/activity-bus.js';
import { WardfyDataService, type DashboardPeriod } from '../services/wardfy-data.service.js';

interface DashboardRouteOptions {
  sessions: SessionSigner;
  data: WardfyDataService;
  cache: Cache;
  activityBus: ActivityBus;
}

const periodSchema = z.enum(['day', 'week', 'month', 'year', 'all']).default('week');
const metricSchema = z
  .enum(['listeningMinutes', 'artists', 'tracks', 'discoveries', 'genres', 'sessions'])
  .default('listeningMinutes');
const guildQuery = z.object({ guildId: z.string().min(1).max(32).optional() });

const guildSettingsSchema = z.object({
  activityChannelId: z.string().max(32).nullable().optional(),
  activityUpdateSeconds: z.number().int().min(1).max(300).optional(),
  notificationsEnabled: z.boolean().optional(),
  automaticRolesEnabled: z.boolean().optional(),
  allowMemberComparison: z.boolean().optional(),
  locale: z.string().min(2).max(12).optional(),
});

const challengeSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().min(3).max(300),
  icon: z.string().min(1).max(12).default('🎯'),
  metric: z.enum([
    'UNIQUE_ARTISTS',
    'UNIQUE_GENRES',
    'UNIQUE_TRACKS',
    'LISTENING_MINUTES',
    'STREAK_DAYS',
    'DISCOVERIES',
  ]),
  target: z.number().int().positive().max(100_000),
  endsAt: z.string().datetime(),
  rewardXp: z.number().int().min(0).max(100_000).default(100),
});

export const dashboardRoutes: FastifyPluginAsync<DashboardRouteOptions> = async (app, options) => {
  app.get('/dashboard', async (request) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = guildQuery.parse(request.query);
    const cacheKey = `dashboard:${session.userId}:${guildId ?? 'personal'}`;
    const cached = await getCached<Awaited<ReturnType<WardfyDataService['getDashboard']>>>(
      options.cache,
      cacheKey,
    );
    if (cached) return { data: cached };
    const data = await options.data.getDashboard(session.userId, guildId);
    void options.cache.set(cacheKey, data, 8).catch(() => undefined);
    return { data };
  });

  app.get('/activity', async (request) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = guildQuery.parse(request.query);
    if (!guildId) {
      const dashboard = await options.data.getDashboard(session.userId);
      return { data: dashboard.nowPlaying.isPlaying ? [dashboard.nowPlaying] : [] };
    }
    // getDashboard verifies membership before activity is exposed.
    await options.data.getDashboard(session.userId, guildId);
    return { data: await options.data.getGuildLiveActivity(guildId) };
  });

  app.get('/activity/stream', async (request, reply) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = guildQuery.parse(request.query);
    const dashboard = await options.data.getDashboard(session.userId, guildId);
    const initial = guildId
      ? await options.data.getGuildLiveActivity(guildId)
      : dashboard.nowPlaying.isPlaying
        ? [dashboard.nowPlaying]
        : [];

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(`event: snapshot\ndata: ${JSON.stringify(initial)}\n\n`);

    const unsubscribe = options.activityBus.subscribe((update) => {
      if ((guildId && update.guildId !== guildId) || (!guildId && update.userId !== session.userId))
        return;
      reply.raw.write(`event: playback\ndata: ${JSON.stringify(update)}\n\n`);
    });
    const keepAlive = setInterval(() => reply.raw.write(': keepalive\n\n'), 25_000);
    request.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
      reply.raw.end();
    });
  });

  app.get('/rankings', async (request) => {
    const session = requireSession(request, options.sessions);
    const query = z
      .object({ guildId: z.string().min(1).max(32), period: periodSchema, metric: metricSchema })
      .parse(request.query);
    const cacheKey = `ranking:${query.guildId}:${query.period}:${query.metric}`;
    const cached = await getCached<Awaited<ReturnType<WardfyDataService['getRankings']>>>(
      options.cache,
      cacheKey,
    );
    const data =
      cached ??
      (await options.data.getRankings(
        session.userId,
        query.guildId,
        query.period as DashboardPeriod,
        query.metric,
      ));
    if (!cached) void options.cache.set(cacheKey, data, 30).catch(() => undefined);
    return { data, meta: { period: query.period, metric: query.metric, guildId: query.guildId } };
  });

  app.get('/challenges', async (request) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = guildQuery.parse(request.query);
    if (guildId) await options.data.getDashboard(session.userId, guildId);
    return { data: await options.data.getChallenges(session.userId, guildId) };
  });

  app.post('/guilds/:guildId/challenges', async (request) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    const input = challengeSchema.parse(request.body);
    return {
      data: await options.data.createChallenge(session.userId, guildId, {
        ...input,
        endsAt: new Date(input.endsAt),
      }),
    };
  });

  app.post('/challenges/:challengeId/join', async (request, reply) => {
    const session = requireSession(request, options.sessions);
    const { challengeId } = z.object({ challengeId: z.string().min(1) }).parse(request.params);
    await options.data.joinChallenge(session.userId, challengeId);
    return reply.code(204).send();
  });

  app.get('/compatibility/:discordId', async (request) => {
    const session = requireSession(request, options.sessions);
    const { discordId } = z.object({ discordId: z.string().min(1).max(32) }).parse(request.params);
    return { data: await options.data.getCompatibility(session.userId, discordId) };
  });

  app.get('/guilds/:guildId/settings', async (request) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    await assertCanManage(options.data, session.userId, guildId);
    return { data: await options.data.getGuildSettings(guildId) };
  });

  app.patch('/guilds/:guildId/settings', async (request) => {
    const session = requireSession(request, options.sessions);
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    await assertCanManage(options.data, session.userId, guildId);
    const update = guildSettingsSchema.parse(request.body);
    return { data: await options.data.updateGuildSettings(guildId, update) };
  });
};

async function getCached<T>(cache: Cache, key: string): Promise<T | null> {
  try {
    return await cache.get<T>(key);
  } catch {
    return null;
  }
}

async function assertCanManage(
  data: WardfyDataService,
  userId: string,
  guildId: string,
): Promise<void> {
  if (!(await data.canManageGuild(userId, guildId))) {
    throw new AppError(
      'Você precisa de permissão de administrador neste servidor.',
      403,
      'GUILD_ADMIN_REQUIRED',
    );
  }
}

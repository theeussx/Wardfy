import { timingSafeEqual } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { AppConfig } from '../config.js';
import { AppError } from '../lib/app-error.js';
import { WardfyDataService } from '../services/wardfy-data.service.js';

interface InternalRouteOptions {
  config: AppConfig;
  data: WardfyDataService;
}

const guildSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  iconUrl: z.string().url().optional(),
  ownerDiscordId: z.string().min(1).max(32).optional(),
});

const memberSchema = z.object({
  discordId: z.string().min(1).max(32),
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['MEMBER', 'ADMIN', 'OWNER']).optional(),
});

const settingsSchema = z.object({
  activityChannelId: z.string().max(32).nullable().optional(),
  activityUpdateSeconds: z.number().int().min(1).max(300).optional(),
  notificationsEnabled: z.boolean().optional(),
  automaticRolesEnabled: z.boolean().optional(),
  allowMemberComparison: z.boolean().optional(),
  locale: z.string().min(2).max(12).optional(),
});

const activityMessageSchema = z.object({
  discordId: z.string().min(1).max(32),
  channelId: z.string().min(1).max(32),
  discordMessageId: z.string().min(1).max(32),
  lastTrackSpotifyId: z.string().max(128).optional(),
});

const recommendationSchema = z.object({
  trackLabel: z.string().min(1).max(240),
  spotifyTrackUrl: z
    .string()
    .url()
    .refine((url) => new URL(url).hostname.endsWith('spotify.com'), 'Use um link do Spotify.'),
  note: z.string().max(600).optional(),
});

export const internalRoutes: FastifyPluginAsync<InternalRouteOptions> = async (app, options) => {
  app.addHook('onRequest', async (request) => {
    assertBotRequest(request.headers['x-wardfy-bot-token'], options.config);
  });

  app.post('/guilds', async (request) => {
    const input = guildSchema.parse(request.body);
    await options.data.upsertGuild(input);
    return { data: { accepted: true } };
  });

  app.post('/guilds/:guildId/members', async (request) => {
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    const input = memberSchema.parse(request.body);
    await options.data.upsertGuildMember({ guildId, ...input });
    return { data: { accepted: true } };
  });

  app.get('/guilds/:guildId/activity', async (request) => {
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    return { data: await options.data.getGuildLiveActivity(guildId) };
  });

  app.get('/guilds/:guildId/rankings', async (request) => {
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    const query = z
      .object({
        period: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
        metric: z
          .enum(['listeningMinutes', 'artists', 'tracks', 'discoveries', 'genres', 'sessions'])
          .default('listeningMinutes'),
      })
      .parse(request.query);
    return { data: await options.data.getGuildRankings(guildId, query.period, query.metric) };
  });

  app.get('/guilds/:guildId/users/:discordId/challenges', async (request) => {
    const { guildId, discordId } = z
      .object({ guildId: z.string().min(1).max(32), discordId: z.string().min(1).max(32) })
      .parse(request.params);
    return { data: await options.data.getChallengesByDiscordId(discordId, guildId) };
  });

  app.post('/users/:discordId/challenges/:challengeId/join', async (request, reply) => {
    const { discordId, challengeId } = z
      .object({ discordId: z.string().min(1).max(32), challengeId: z.string().min(1) })
      .parse(request.params);
    await options.data.joinChallengeByDiscordId(discordId, challengeId);
    return reply.code(204).send();
  });

  app.get('/guilds/:guildId/settings', async (request) => {
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    return { data: await options.data.getGuildSettings(guildId) };
  });

  app.patch('/guilds/:guildId/settings', async (request) => {
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    const input = settingsSchema.parse(request.body);
    return { data: await options.data.updateGuildSettings(guildId, input) };
  });

  app.get('/guilds/:guildId/activity-messages/:discordId', async (request) => {
    const { guildId, discordId } = z
      .object({ guildId: z.string().min(1).max(32), discordId: z.string().min(1).max(32) })
      .parse(request.params);
    return { data: await options.data.getActivityMessage(guildId, discordId) };
  });

  app.put('/guilds/:guildId/activity-messages', async (request) => {
    const { guildId } = z.object({ guildId: z.string().min(1).max(32) }).parse(request.params);
    const input = activityMessageSchema.parse(request.body);
    await options.data.saveActivityMessage({ guildId, ...input });
    return { data: { accepted: true } };
  });

  app.delete('/guilds/:guildId/activity-messages/:discordId', async (request, reply) => {
    const { guildId, discordId } = z
      .object({ guildId: z.string().min(1).max(32), discordId: z.string().min(1).max(32) })
      .parse(request.params);
    await options.data.deleteActivityMessage(guildId, discordId);
    return reply.code(204).send();
  });

  app.post('/users/:discordId/sync-playback', async (request) => {
    const { discordId } = z.object({ discordId: z.string().min(1).max(32) }).parse(request.params);
    return { data: await options.data.syncPlaybackByDiscordId(discordId) };
  });

  app.get('/users/:discordId/profile', async (request) => {
    const { discordId } = z.object({ discordId: z.string().min(1).max(32) }).parse(request.params);
    return { data: await options.data.getProfileByDiscordId(discordId) };
  });

  app.get('/users/:leftDiscordId/compatibility/:rightDiscordId', async (request) => {
    const { leftDiscordId, rightDiscordId } = z
      .object({
        leftDiscordId: z.string().min(1).max(32),
        rightDiscordId: z.string().min(1).max(32),
      })
      .parse(request.params);
    return { data: await options.data.getCompatibilityByDiscordIds(leftDiscordId, rightDiscordId) };
  });

  app.post('/users/:fromDiscordId/recommendations/:toDiscordId', async (request, reply) => {
    const { fromDiscordId, toDiscordId } = z
      .object({ fromDiscordId: z.string().min(1).max(32), toDiscordId: z.string().min(1).max(32) })
      .parse(request.params);
    const input = recommendationSchema.parse(request.body);
    await options.data.createRecommendationByDiscordIds(fromDiscordId, toDiscordId, input);
    return reply.code(201).send({ data: { accepted: true } });
  });
};

function assertBotRequest(token: string | string[] | undefined, config: AppConfig): void {
  const candidate = Array.isArray(token) ? token[0] : token;
  if (!candidate || !safeEquals(candidate, config.BOT_API_TOKEN)) {
    throw new AppError('Este endpoint é reservado ao bot Wardfy.', 401, 'BOT_AUTH_REQUIRED');
  }
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

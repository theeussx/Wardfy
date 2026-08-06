import type { PrismaClient } from '@prisma/client';
import type {
  CompatibilityReport,
  LeaderboardEntry,
  PlaybackSnapshot,
  RankingMetric,
} from '@wardfy/shared';

import { AppError } from '../lib/app-error.js';
import type { ActivityBus } from './activity-bus.js';
import {
  SpotifyApiService,
  type SpotifyAudioFeatures,
  type SpotifyTrack,
} from './spotify-api.service.js';
import { SpotifyOAuthService } from './spotify-oauth.service.js';
import type { DiscordOAuthGuild } from './discord-oauth.service.js';

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export interface WardfyTrack {
  id: string;
  title: string;
  artists: string[];
  album: string;
  albumArtUrl?: string;
  durationMs: number;
  spotifyUrl: string;
  popularity?: number;
}

export interface WardfyDashboard {
  server: { id: string | null; name: string; members: number; icon?: string };
  viewer: {
    id: string;
    discordId?: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    level: number;
    xp: number;
    nextLevelXp: number;
    streak: number;
    title: string;
    spotifyConnected: boolean;
  };
  nowPlaying: PlaybackSnapshot;
  stats: Array<{
    label: string;
    value: string;
    change: string;
    positive: boolean;
    icon: 'clock' | 'sparkles' | 'music' | 'flame';
  }>;
  weeklyMinutes: Array<{ day: string; minutes: number }>;
  genreDna: Array<{ genre: string; value: number }>;
  heatmap: Array<{ day: string; hour: number; value: number }>;
  friends: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
    status: 'playing' | 'idle' | 'offline';
    track?: string;
    artist?: string;
    elapsed?: string;
    albumArtUrl?: string;
  }>;
  topTracks: Array<WardfyTrack & { rank: number; plays: number }>;
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    unlocked: boolean;
    description: string;
    progress: number;
    threshold?: number;
  }>;
  challenges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    progress: number;
    target: number;
    unit: string;
    daysLeft: number;
    rewardXp: number;
  }>;
  audioTraits: Array<{ label: string; value: number; color: string }>;
  history: Array<{ month: string; minutes: number; discoveries: number }>;
}

export interface WardfyProfile {
  id: string;
  discordId?: string;
  name: string;
  avatarUrl?: string;
  title: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  minutes: number;
  artists: number;
  streak: number;
  spotifyConnected: boolean;
}

export interface GuildSummary {
  id: string;
  name: string;
  iconUrl?: string;
  members: number;
  canManage: boolean;
}

export interface CurrentUserResponse {
  authenticated: boolean;
  user?: WardfyProfile;
  guilds: GuildSummary[];
}

export interface LiveActivityItem {
  userId: string;
  discordId?: string;
  displayName: string;
  avatarUrl?: string;
  track: WardfyTrack;
  progressMs: number;
  deviceName?: string;
  deviceType?: string;
  updatedAt: string;
}

const FRIEND_COLORS = ['#2563eb', '#0ea5e9', '#38bdf8', '#1d4ed8', '#0284c7', '#60a5fa'];
/**
 * The production data layer. It only derives views from persisted Spotify
 * events; it never supplies placeholder music, fake rankings or generated
 * listeners to the client.
 */
export class WardfyDataService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly spotifyOAuth: SpotifyOAuthService,
    private readonly spotifyApi: SpotifyApiService,
    private readonly activityBus: ActivityBus,
  ) {}

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        spotifyAccount: { select: { id: true } },
        memberships: {
          include: { guild: { include: { _count: { select: { members: true } } } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!user) return { authenticated: false, guilds: [] };

    return {
      authenticated: true,
      user: await this.profileFromUser(user),
      guilds: user.memberships.map((membership: any) => ({
        id: membership.guild.id,
        name: membership.guild.name,
        iconUrl: membership.guild.iconUrl ?? undefined,
        members: membership.guild._count.members,
        canManage:
          membership.role === 'ADMIN' ||
          membership.role === 'OWNER' ||
          membership.guild.ownerId === user.discordId,
      })),
    };
  }

  async getDashboard(userId: string, guildId?: string): Promise<WardfyDashboard> {
    const user = await this.requireUser(userId);
    const guild = guildId ? await this.requireGuildAccess(userId, guildId) : null;
    const now = new Date();
    const weekStart = startOfPeriod('week', now);
    const previousWeekStart = shiftPeriod(weekStart, 'week', -1);
    const activityStart = new Date(now.getTime() - 90 * DAY_MS);

    const [
      weekEvents,
      previousWeekEvents,
      activityEvents,
      activeEvent,
      liveListeners,
      achievements,
      challenges,
    ] = await Promise.all([
      this.eventsForUser(userId, weekStart, now),
      this.eventsForUser(userId, previousWeekStart, weekStart),
      this.eventsForUser(userId, activityStart, now),
      this.prisma.listeningEvent.findFirst({
        where: { userId, endedAt: null },
        include: { track: true },
        orderBy: { startedAt: 'desc' },
      }),
      guild ? this.getGuildLiveActivity(guild.id) : Promise.resolve([]),
      this.prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { achievement: { name: 'asc' } },
      }),
      this.getChallengesForUser(userId, guild?.id),
    ]);

    const weekMetrics = calculateMetrics(weekEvents);
    const previousMetrics = calculateMetrics(previousWeekEvents);
    const streak = await this.getListeningStreak(userId);
    const genreDna = buildGenreDna(activityEvents);
    const currentTitle = musicalTitle(
      genreDna.map((item) => item.genre),
      genreDna.length,
      activityEvents,
    );
    const history = await this.getHistory(userId, now);
    const viewer = {
      id: user.id,
      discordId: user.discordId ?? undefined,
      name: user.displayName,
      handle: user.discordId
        ? `@${user.displayName.replace(/\s+/g, '').toLowerCase()}`
        : user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      level: user.level,
      xp: user.xp,
      nextLevelXp: nextLevelXp(user.level),
      streak,
      title: user.title ?? currentTitle,
      spotifyConnected: Boolean(user.spotifyAccount),
    };

    return {
      server: guild
        ? {
            id: guild.id,
            name: guild.name,
            members: guild._count.members,
            icon: guild.iconUrl ?? undefined,
          }
        : { id: null, name: 'Sua biblioteca', members: 1 },
      viewer,
      nowPlaying: activeEvent
        ? {
            userId,
            isPlaying: true,
            progressMs: activeEvent.listenedMs,
            deviceName: activeEvent.deviceName ?? undefined,
            updatedAt: activeEvent.createdAt.toISOString(),
            track: toPlaybackTrack(activeEvent.track),
          }
        : {
            userId,
            isPlaying: false,
            progressMs: 0,
            updatedAt: now.toISOString(),
          },
      stats: [
        stat(
          'MINUTOS ESTA SEMANA',
          formatNumber(weekMetrics.minutes),
          weekMetrics.minutes,
          previousMetrics.minutes,
          'clock',
        ),
        stat(
          'ARTISTAS DESCOBERTOS',
          formatNumber(weekMetrics.artists),
          weekMetrics.artists,
          previousMetrics.artists,
          'sparkles',
        ),
        stat(
          'MÚSICAS DIFERENTES',
          formatNumber(weekMetrics.tracks),
          weekMetrics.tracks,
          previousMetrics.tracks,
          'music',
        ),
        {
          label: 'SEQUÊNCIA ATUAL',
          value: `${streak} ${streak === 1 ? 'dia' : 'dias'}`,
          change: streak > 0 ? 'mantenha o ritmo' : 'ouça uma faixa hoje',
          positive: streak > 0,
          icon: 'flame',
        },
      ],
      weeklyMinutes: buildWeeklyMinutes(weekEvents, now),
      genreDna,
      heatmap: buildHeatmap(activityEvents),
      friends: liveListeners
        .filter((item) => item.userId !== userId)
        .map((item, index) => ({
          id: item.userId,
          discordId: item.discordId,
          name: item.displayName,
          initials: initials(item.displayName),
          color: FRIEND_COLORS[index % FRIEND_COLORS.length] ?? '#2563eb',
          status: 'playing' as const,
          track: item.track.title,
          artist: item.track.artists.join(', '),
          elapsed: formatClock(item.progressMs),
          albumArtUrl: item.track.albumArtUrl,
        })),
      topTracks: buildTopTracks(activityEvents),
      achievements: achievements.map((award: any) => ({
        id: award.achievement.id,
        name: award.achievement.name,
        icon: award.achievement.icon,
        unlocked: Boolean(award.unlockedAt),
        description: award.achievement.description,
        progress: award.progress,
        threshold: award.achievement.threshold ?? undefined,
      })),
      challenges,
      audioTraits: buildAudioTraits(activityEvents),
      history,
    };
  }

  async getProfileByDiscordId(discordId: string): Promise<WardfyProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { discordId },
      include: { spotifyAccount: { select: { id: true } } },
    });
    return user ? this.profileFromUser(user) : null;
  }

  async getProfileById(userId: string): Promise<WardfyProfile> {
    const user = await this.requireUser(userId);
    return this.profileFromUser(user);
  }

  async getRankings(
    requesterUserId: string,
    guildId: string,
    period: DashboardPeriod,
    metric: RankingMetric,
  ): Promise<LeaderboardEntry[]> {
    await this.requireGuildAccess(requesterUserId, guildId);
    return this.getGuildRankings(guildId, period, metric, requesterUserId);
  }

  async getGuildRankings(
    guildId: string,
    period: DashboardPeriod,
    metric: RankingMetric,
    currentUserId?: string,
  ): Promise<LeaderboardEntry[]> {
    const start = startOfPeriod(period, new Date());
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: { members: { include: { user: true } } },
    });
    if (!guild) throw new AppError('Servidor não encontrado.', 404, 'GUILD_NOT_FOUND');

    const userIds = guild.members.map((member: any) => member.userId);
    const events = await this.prisma.listeningEvent.findMany({
      where: { userId: { in: userIds }, startedAt: { gte: start } },
      include: { track: true },
    });
    const scores = new Map<string, number>();
    for (const member of guild.members) scores.set(member.userId, 0);

    for (const userId of userIds) {
      const userEvents = events.filter((event: any) => event.userId === userId);
      scores.set(userId, metricValue(calculateMetrics(userEvents), metric));
    }

    return [...guild.members]
      .sort((left, right) => (scores.get(right.userId) ?? 0) - (scores.get(left.userId) ?? 0))
      .map((member, index) => ({
        rank: index + 1,
        userId: member.userId,
        displayName: member.nickname ?? member.user.displayName,
        avatarUrl: member.user.avatarUrl ?? undefined,
        value: scores.get(member.userId) ?? 0,
        isCurrentUser: member.userId === currentUserId,
      }));
  }

  async getCompatibility(
    requesterUserId: string,
    targetDiscordId: string,
  ): Promise<CompatibilityReport> {
    const target = await this.prisma.user.findUnique({ where: { discordId: targetDiscordId } });
    if (!target) {
      throw new AppError(
        'Esse membro ainda não conectou uma conta Spotify ao Wardfy.',
        404,
        'TARGET_NOT_CONNECTED',
      );
    }
    const since = new Date(Date.now() - 90 * DAY_MS);
    const [left, right] = await Promise.all([
      this.eventsForUser(requesterUserId, since, new Date()),
      this.eventsForUser(target.id, since, new Date()),
    ]);

    const leftArtists = countArtists(left);
    const rightArtists = countArtists(right);
    const leftTracks = countTracks(left);
    const rightTracks = countTracks(right);
    const leftGenres = countGenres(left);
    const rightGenres = countGenres(right);
    const artistScore = weightedJaccard(leftArtists, rightArtists);
    const trackScore = weightedJaccard(leftTracks, rightTracks);
    const genreScore = weightedJaccard(leftGenres, rightGenres);
    const score = Math.round(artistScore * 0.45 + trackScore * 0.3 + genreScore * 0.25);

    const sharedArtists = sharedKeys(leftArtists, rightArtists).slice(0, 8);
    const sharedTracks = sharedKeys(leftTracks, rightTracks).slice(0, 8);
    const sharedGenres = sharedKeys(leftGenres, rightGenres).slice(0, 8);
    return {
      score,
      sharedArtists,
      sharedTracks,
      sharedGenres,
      sharedPlaylists: 0,
      explanation:
        score > 70
          ? 'Vocês têm uma sintonia forte e várias rotas de descoberta em comum.'
          : score > 35
            ? 'Há pontos de encontro suficientes para uma ótima troca de recomendações.'
            : 'Os gostos são bem diferentes — perfeito para descobrir algo fora da bolha.',
    };
  }

  async getCompatibilityByDiscordIds(
    leftDiscordId: string,
    rightDiscordId: string,
  ): Promise<CompatibilityReport> {
    const left = await this.prisma.user.findUnique({ where: { discordId: leftDiscordId } });
    if (!left) {
      throw new AppError(
        'Conecte sua conta ao Wardfy antes de comparar perfis.',
        404,
        'USER_NOT_FOUND',
      );
    }
    return this.getCompatibility(left.id, rightDiscordId);
  }

  async getChallenges(userId: string, guildId?: string): Promise<WardfyDashboard['challenges']> {
    return this.getChallengesForUser(userId, guildId);
  }

  async createChallenge(
    userId: string,
    guildId: string,
    input: {
      name: string;
      description: string;
      icon: string;
      metric:
        | 'UNIQUE_ARTISTS'
        | 'UNIQUE_GENRES'
        | 'UNIQUE_TRACKS'
        | 'LISTENING_MINUTES'
        | 'STREAK_DAYS'
        | 'DISCOVERIES';
      target: number;
      endsAt: Date;
      rewardXp: number;
    },
  ) {
    if (!(await this.canManageGuild(userId, guildId))) {
      throw new AppError(
        'Você precisa ser administrador para criar desafios.',
        403,
        'GUILD_ADMIN_REQUIRED',
      );
    }
    return this.prisma.challenge.create({
      data: {
        guildId,
        createdById: userId,
        name: input.name,
        description: input.description,
        icon: input.icon,
        metric: input.metric,
        target: input.target,
        rewardXp: input.rewardXp,
        startsAt: new Date(),
        endsAt: input.endsAt,
        status: 'ACTIVE',
      },
    });
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.status !== 'ACTIVE' || challenge.endsAt < new Date()) {
      throw new AppError('Esse desafio não está mais ativo.', 404, 'CHALLENGE_NOT_ACTIVE');
    }
    await this.prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId },
      update: {},
    });
    await this.refreshChallengeProgress(userId);
  }

  async joinChallengeByDiscordId(discordId: string, challengeId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new AppError('Conecte sua conta ao Wardfy primeiro.', 404, 'USER_NOT_FOUND');
    await this.joinChallenge(user.id, challengeId);
  }

  async createRecommendationByDiscordIds(
    fromDiscordId: string,
    toDiscordId: string,
    input: { trackLabel: string; spotifyTrackUrl: string; note?: string },
  ): Promise<void> {
    const [fromUser, toUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { discordId: fromDiscordId },
        include: { spotifyAccount: { select: { id: true } } },
      }),
      this.prisma.user.findUnique({ where: { discordId: toDiscordId } }),
    ]);
    if (!fromUser?.spotifyAccount || !toUser) {
      throw new AppError(
        'Os dois membros precisam ter uma conta Wardfy conectada.',
        404,
        'RECOMMENDATION_UNAVAILABLE',
      );
    }
    await this.prisma.recommendation.create({
      data: {
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        trackLabel: input.trackLabel,
        spotifyTrackUrl: input.spotifyTrackUrl,
        note: input.note,
      },
    });
  }

  async getChallengesByDiscordId(
    discordId: string,
    guildId?: string,
  ): Promise<WardfyDashboard['challenges']> {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user) return [];
    return this.getChallengesForUser(user.id, guildId);
  }

  async getGuildLiveActivity(guildId: string): Promise<LiveActivityItem[]> {
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: { members: { select: { userId: true } } },
    });
    if (!guild) return [];
    const events = await this.prisma.listeningEvent.findMany({
      where: {
        userId: { in: guild.members.map((member: any) => member.userId) },
        endedAt: null,
        startedAt: { gte: cutoff },
      },
      include: { user: true, track: true },
      orderBy: { startedAt: 'desc' },
    });
    return events.map((event: any) => ({
      userId: event.userId,
      discordId: event.user.discordId ?? undefined,
      displayName: event.user.displayName,
      avatarUrl: event.user.avatarUrl ?? undefined,
      track: toWardfyTrack(event.track),
      progressMs: event.listenedMs,
      deviceName: event.deviceName ?? undefined,
      updatedAt: event.createdAt.toISOString(),
    }));
  }

  async syncLibrary(userId: string): Promise<void> {
    const accessToken = await this.spotifyOAuth.accessTokenForUser(userId);
    const [topArtists, topTracks, recent] = await Promise.all([
      this.spotifyApi.topArtists(accessToken),
      this.spotifyApi.topTracks(accessToken),
      this.spotifyApi.recentlyPlayed(accessToken),
    ]);
    const audioFeatures = await this.spotifyApi
      .audioFeatures(
        accessToken,
        topTracks.map((track) => track.id),
      )
      .catch(() => new Map<string, SpotifyAudioFeatures>());
    const genreByArtist = new Map<string, string[]>();
    for (const artist of topArtists)
      genreByArtist.set(artist.id, normalizeGenres(artist.genres ?? []));

    for (const track of topTracks) {
      await this.upsertSpotifyTrack(track, genreByArtist, audioFeatures.get(track.id));
    }
    for (const item of recent) {
      const track = await this.upsertSpotifyTrack(
        item.track,
        genreByArtist,
        audioFeatures.get(item.track.id),
      );
      const playedAt = new Date(item.played_at);
      const existing = await this.prisma.listeningEvent.findFirst({
        where: {
          userId,
          trackId: track.id,
          startedAt: {
            gte: new Date(playedAt.getTime() - 2_000),
            lte: new Date(playedAt.getTime() + 2_000),
          },
        },
      });
      if (!existing) {
        const hasHistory = await this.prisma.listeningEvent.count({
          where: { userId, trackId: track.id },
        });
        await this.prisma.listeningEvent.create({
          data: {
            userId,
            trackId: track.id,
            source: 'IMPORT',
            startedAt: playedAt,
            endedAt: new Date(playedAt.getTime() + track.durationMs),
            listenedMs: track.durationMs,
            isDiscovery: hasHistory === 0,
          },
        });
      }
    }
    await this.rebuildDailyStats(userId, new Date());
    await this.refreshChallengeProgress(userId);
    await this.evaluateAchievements(userId);
    await this.prisma.spotifyAccount.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });
  }

  async syncPlayback(userId: string): Promise<PlaybackSnapshot> {
    const accessToken = await this.spotifyOAuth.accessTokenForUser(userId);
    const playback = await this.spotifyApi.currentlyPlaying(accessToken);
    if (!playback?.item || !playback.isPlaying) {
      await this.closeActiveEvents(userId);
      return { userId, isPlaying: false, progressMs: 0, updatedAt: new Date().toISOString() };
    }

    const track = await this.upsertSpotifyTrack(playback.item);
    const snapshot: PlaybackSnapshot = {
      userId,
      isPlaying: true,
      progressMs: playback.progressMs,
      deviceName: playback.device?.name,
      deviceType: playback.device?.type,
      updatedAt: new Date().toISOString(),
      track: toPlaybackTrack(track),
    };
    await this.recordPlayback(snapshot, track.id);
    await this.prisma.spotifyAccount.update({
      where: { userId },
      data: { lastPlaybackAt: new Date() },
    });
    return snapshot;
  }

  async syncPlaybackByDiscordId(discordId: string): Promise<PlaybackSnapshot> {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user)
      throw new AppError('Conecte o Discord ao painel Wardfy primeiro.', 404, 'USER_NOT_FOUND');
    return this.syncPlayback(user.id);
  }

  async upsertGuild(input: {
    id: string;
    name: string;
    iconUrl?: string;
    ownerDiscordId?: string;
  }): Promise<void> {
    await this.prisma.guild.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        name: input.name,
        iconUrl: input.iconUrl,
        ownerId: input.ownerDiscordId,
        settings: { create: {} },
      },
      update: { name: input.name, iconUrl: input.iconUrl, ownerId: input.ownerDiscordId },
    });
  }

  async upsertGuildMember(input: {
    guildId: string;
    discordId: string;
    displayName: string;
    avatarUrl?: string;
    role?: 'MEMBER' | 'ADMIN' | 'OWNER';
  }): Promise<void> {
    const user = await this.prisma.user.upsert({
      where: { discordId: input.discordId },
      create: {
        discordId: input.discordId,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
      },
      update: { displayName: input.displayName, avatarUrl: input.avatarUrl },
    });
    const guild = await this.prisma.guild.findUnique({ where: { id: input.guildId } });
    if (!guild)
      throw new AppError('O servidor ainda não foi sincronizado pelo bot.', 404, 'GUILD_NOT_FOUND');
    const role = guild.ownerId === input.discordId ? 'OWNER' : (input.role ?? 'MEMBER');
    await this.prisma.guildMember.upsert({
      where: { guildId_userId: { guildId: input.guildId, userId: user.id } },
      create: { guildId: input.guildId, userId: user.id, role },
      update: { role, lastSeenAt: new Date() },
    });
  }

  async canManageGuild(userId: string, guildId: string): Promise<boolean> {
    const membership = await this.prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId } },
      include: { guild: { select: { ownerId: true } }, user: { select: { discordId: true } } },
    });
    return Boolean(
      membership &&
      (membership.role === 'ADMIN' ||
        membership.role === 'OWNER' ||
        membership.guild.ownerId === membership.user.discordId),
    );
  }

  async syncDiscordGuildMemberships(
    userId: string,
    discordId: string,
    oauthGuilds: DiscordOAuthGuild[],
  ): Promise<void> {
    if (oauthGuilds.length === 0) return;
    const knownGuilds = await this.prisma.guild.findMany({
      where: { id: { in: oauthGuilds.map((guild) => guild.id) } },
      select: { id: true, ownerId: true },
    });
    const knownById = new Map<string, { id: string; ownerId: string | null }>(
      (knownGuilds as Array<{ id: string; ownerId: string | null }>).map((guild) => [
        guild.id,
        guild,
      ]),
    );
    await Promise.all(
      oauthGuilds.map(async (oauthGuild) => {
        const knownGuild = knownById.get(oauthGuild.id);
        if (!knownGuild) return;
        const permissions = BigInt(oauthGuild.permissions || '0');
        const isAdmin = oauthGuild.owner || (permissions & BigInt(0x20)) !== BigInt(0);
        await this.prisma.guildMember.upsert({
          where: { guildId_userId: { guildId: oauthGuild.id, userId } },
          create: {
            guildId: oauthGuild.id,
            userId,
            role:
              knownGuild.ownerId === discordId || oauthGuild.owner
                ? 'OWNER'
                : isAdmin
                  ? 'ADMIN'
                  : 'MEMBER',
            lastSeenAt: new Date(),
          },
          update: {
            role:
              knownGuild.ownerId === discordId || oauthGuild.owner
                ? 'OWNER'
                : isAdmin
                  ? 'ADMIN'
                  : 'MEMBER',
            lastSeenAt: new Date(),
          },
        });
      }),
    );
  }

  async getGuildSettings(guildId: string) {
    const settings = await this.prisma.guildSettings.findUnique({ where: { guildId } });
    if (!settings)
      throw new AppError('Configurações do servidor não encontradas.', 404, 'SETTINGS_NOT_FOUND');
    return settings;
  }

  async updateGuildSettings(
    guildId: string,
    update: {
      activityChannelId?: string | null;
      activityUpdateSeconds?: number;
      notificationsEnabled?: boolean;
      automaticRolesEnabled?: boolean;
      allowMemberComparison?: boolean;
      locale?: string;
    },
  ) {
    const settings = await this.prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, ...update },
      update,
    });
    await this.prisma.auditLog.create({
      data: {
        guildId,
        action:
          update.activityChannelId !== undefined
            ? 'ACTIVITY_CHANNEL_UPDATED'
            : 'GUILD_SETTINGS_UPDATED',
        payload: update as never,
      },
    });
    return settings;
  }

  async getActivityMessage(guildId: string, discordId: string) {
    return this.prisma.activityMessage.findFirst({
      where: { guildId, user: { discordId } },
      select: { channelId: true, discordMessageId: true, lastTrackSpotifyId: true },
    });
  }

  async saveActivityMessage(input: {
    guildId: string;
    discordId: string;
    channelId: string;
    discordMessageId: string;
    lastTrackSpotifyId?: string;
  }): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { discordId: input.discordId } });
    if (!user) throw new AppError('Usuário Discord não encontrado.', 404, 'USER_NOT_FOUND');
    await this.prisma.activityMessage.upsert({
      where: { guildId_userId: { guildId: input.guildId, userId: user.id } },
      create: {
        guildId: input.guildId,
        userId: user.id,
        channelId: input.channelId,
        discordMessageId: input.discordMessageId,
        lastTrackSpotifyId: input.lastTrackSpotifyId,
      },
      update: {
        channelId: input.channelId,
        discordMessageId: input.discordMessageId,
        lastTrackSpotifyId: input.lastTrackSpotifyId,
        lastRenderedAt: new Date(),
      },
    });
  }

  async deleteActivityMessage(guildId: string, discordId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user) return;
    await this.prisma.activityMessage.deleteMany({ where: { guildId, userId: user.id } });
  }

  async ensureSystemAchievements(): Promise<void> {
    const definitions = [
      [
        'first-track',
        'Primeira Música',
        'Sua primeira faixa foi registrada.',
        '🎵',
        'collection',
        1,
      ],
      ['songs-100', 'Cem Faixas', 'Registre 100 músicas no Wardfy.', '💿', 'collection', 100],
      ['songs-1000', 'Colecionador', 'Registre 1.000 músicas no Wardfy.', '🏆', 'collection', 1000],
      [
        'artists-500',
        'Mapa de Artistas',
        'Passe por 500 artistas diferentes.',
        '🎸',
        'discovery',
        500,
      ],
      ['genres-50', 'Mundo em Sons', 'Explore 50 gêneros diferentes.', '🌍', 'discovery', 50],
      ['streak-30', 'Ritmo Inabalável', 'Mantenha uma sequência de 30 dias.', '🔥', 'streak', 30],
      ['night-owl', 'Coruja Musical', 'Registre 50 escutas na madrugada.', '🌙', 'habit', 50],
    ] as const;
    await Promise.all(
      definitions.map(([id, name, description, icon, category, threshold]) =>
        this.prisma.achievementDefinition.upsert({
          where: { id },
          create: { id, name, description, icon, category, threshold },
          update: { name, description, icon, category, threshold },
        }),
      ),
    );
  }

  private async recordPlayback(snapshot: PlaybackSnapshot, trackId: string): Promise<void> {
    const now = new Date();
    const active = await this.prisma.listeningEvent.findFirst({
      where: { userId: snapshot.userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    let deltaMs = 0;
    if (active && active.trackId === trackId) {
      const listenedMs = Math.max(active.listenedMs, snapshot.progressMs);
      deltaMs = Math.max(0, listenedMs - active.listenedMs);
      await this.prisma.listeningEvent.update({
        where: { id: active.id },
        data: { listenedMs, deviceName: snapshot.deviceName },
      });
    } else {
      if (active) {
        await this.prisma.listeningEvent.update({
          where: { id: active.id },
          data: { endedAt: now },
        });
      }
      const priorCount = await this.prisma.listeningEvent.count({
        where: { userId: snapshot.userId, trackId },
      });
      await this.prisma.listeningEvent.create({
        data: {
          userId: snapshot.userId,
          trackId,
          source: 'SPOTIFY_POLL',
          deviceName: snapshot.deviceName,
          startedAt: new Date(now.getTime() - snapshot.progressMs),
          listenedMs: snapshot.progressMs,
          isDiscovery: priorCount === 0,
        },
      });
    }

    if (deltaMs > 0) await this.awardListeningXp(snapshot.userId, deltaMs);
    await this.rebuildDailyStats(snapshot.userId, now);
    await this.refreshChallengeProgress(snapshot.userId);
    await this.evaluateAchievements(snapshot.userId);
    await this.publishPlayback(snapshot);
  }

  private async closeActiveEvents(userId: string): Promise<void> {
    const now = new Date();
    const active = await this.prisma.listeningEvent.findMany({
      where: { userId, endedAt: null },
      include: { track: true },
    });
    if (active.length === 0) return;
    await this.prisma.listeningEvent.updateMany({
      where: { id: { in: active.map((event: any) => event.id) } },
      data: { endedAt: now },
    });
    await this.rebuildDailyStats(userId, now);
    const memberships = await this.prisma.guildMember.findMany({
      where: { userId },
      select: { guildId: true },
    });
    this.activityBus.publish({
      userId,
      isPlaying: false,
      progressMs: 0,
      updatedAt: now.toISOString(),
    });
    for (const membership of memberships) {
      this.activityBus.publish({
        guildId: membership.guildId,
        userId,
        isPlaying: false,
        progressMs: 0,
        updatedAt: now.toISOString(),
      });
    }
  }

  private async publishPlayback(snapshot: PlaybackSnapshot): Promise<void> {
    const [user, memberships] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: snapshot.userId },
        select: { displayName: true },
      }),
      this.prisma.guildMember.findMany({
        where: { userId: snapshot.userId },
        select: { guildId: true },
      }),
    ]);
    this.activityBus.publish({ ...snapshot, displayName: user?.displayName });
    for (const membership of memberships) {
      this.activityBus.publish({
        ...snapshot,
        guildId: membership.guildId,
        displayName: user?.displayName,
      });
    }
  }

  private async upsertSpotifyTrack(
    spotifyTrack: SpotifyTrack,
    genreByArtist = new Map<string, string[]>(),
    audioFeatures?: SpotifyAudioFeatures,
  ) {
    const genres = normalizeGenres(
      spotifyTrack.artists?.flatMap((artist) => genreByArtist.get(artist.id) ?? []) ?? [],
    );
    const releaseDate = parseSpotifyDate(spotifyTrack.album?.release_date);
    return this.prisma.track.upsert({
      where: { spotifyId: spotifyTrack.id },
      create: {
        spotifyId: spotifyTrack.id,
        name: spotifyTrack.name,
        albumName: spotifyTrack.album?.name ?? 'Álbum sem nome',
        albumSpotifyId: spotifyTrack.album?.id,
        albumImageUrl: spotifyTrack.album?.images?.[0]?.url,
        artists: (spotifyTrack.artists ?? []).map((artist) => ({
          id: artist.id,
          name: artist.name,
        })) as never,
        genres,
        durationMs: spotifyTrack.duration_ms,
        popularity: spotifyTrack.popularity,
        releaseDate,
        explicit: spotifyTrack.explicit ?? false,
        spotifyUrl:
          spotifyTrack.external_urls?.spotify ??
          `https://open.spotify.com/track/${spotifyTrack.id}`,
        ...(audioFeatures ? { audioFeatures: audioFeatures as never } : {}),
      },
      update: {
        name: spotifyTrack.name,
        albumName: spotifyTrack.album?.name ?? 'Álbum sem nome',
        albumSpotifyId: spotifyTrack.album?.id,
        albumImageUrl: spotifyTrack.album?.images?.[0]?.url,
        artists: (spotifyTrack.artists ?? []).map((artist) => ({
          id: artist.id,
          name: artist.name,
        })) as never,
        genres,
        durationMs: spotifyTrack.duration_ms,
        popularity: spotifyTrack.popularity,
        releaseDate,
        explicit: spotifyTrack.explicit ?? false,
        spotifyUrl:
          spotifyTrack.external_urls?.spotify ??
          `https://open.spotify.com/track/${spotifyTrack.id}`,
        ...(audioFeatures ? { audioFeatures: audioFeatures as never } : {}),
      },
    });
  }

  private async profileFromUser(user: {
    id: string;
    displayName: string;
    discordId: string | null;
    avatarUrl: string | null;
    xp: number;
    level: number;
    title: string | null;
    spotifyAccount?: { id: string } | null;
  }): Promise<WardfyProfile> {
    const [events, streak] = await Promise.all([
      this.eventsForUser(user.id, startOfPeriod('week', new Date()), new Date()),
      this.getListeningStreak(user.id),
    ]);
    const metrics = calculateMetrics(events);
    return {
      id: user.id,
      discordId: user.discordId ?? undefined,
      name: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      title:
        user.title ??
        musicalTitle(
          buildGenreDna(events).map((item) => item.genre),
          0,
          events,
        ),
      level: user.level,
      xp: user.xp,
      nextLevelXp: nextLevelXp(user.level),
      minutes: metrics.minutes,
      artists: metrics.artists,
      streak,
      spotifyConnected: Boolean(user.spotifyAccount),
    };
  }

  private async eventsForUser(userId: string, start: Date, end: Date) {
    return this.prisma.listeningEvent.findMany({
      where: { userId, startedAt: { gte: start, lte: end } },
      include: { track: true },
      orderBy: { startedAt: 'asc' },
    });
  }

  private async getChallengesForUser(userId: string, guildId?: string) {
    const now = new Date();
    const challenges = await this.prisma.challenge.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gte: now },
        ...(guildId ? { OR: [{ guildId }, { guildId: null }] } : { guildId: null }),
      },
      include: { participants: { where: { userId } } },
      orderBy: { endsAt: 'asc' },
    });
    return challenges.map((challenge: any) => {
      const progress = challenge.participants[0]?.progress ?? 0;
      return {
        id: challenge.id,
        name: challenge.name,
        icon: challenge.icon,
        description: challenge.description,
        progress,
        joined: Boolean(challenge.participants[0]),
        target: challenge.target,
        unit:
          challenge.metric === 'LISTENING_MINUTES'
            ? 'min'
            : metricUnitForChallenge(challenge.metric),
        daysLeft: Math.max(0, Math.ceil((challenge.endsAt.getTime() - now.getTime()) / DAY_MS)),
        rewardXp: challenge.rewardXp,
      };
    });
  }

  private async refreshChallengeProgress(userId: string): Promise<void> {
    const participations = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        challenge: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      },
      include: { challenge: true },
    });
    if (participations.length === 0) return;

    for (const participation of participations as any[]) {
      const events = await this.eventsForUser(userId, participation.challenge.startsAt, new Date());
      const metrics = calculateMetrics(events);
      const progress = challengeMetricValue(
        participation.challenge.metric,
        metrics,
        await this.getListeningStreak(userId),
      );
      const completedNow = progress >= participation.challenge.target && !participation.completedAt;
      await this.prisma.userChallenge.update({
        where: { id: participation.id },
        data: { progress, ...(completedNow ? { completedAt: new Date() } : {}) },
      });
      if (completedNow && participation.challenge.rewardXp > 0) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { xp: true },
        });
        if (user) {
          const xp = user.xp + participation.challenge.rewardXp;
          await this.prisma.user.update({
            where: { id: userId },
            data: { xp, level: levelForXp(xp) },
          });
        }
      }
    }
  }

  private async rebuildDailyStats(userId: string, date: Date): Promise<void> {
    const start = startOfDay(date);
    const end = new Date(start.getTime() + DAY_MS);
    const events = await this.eventsForUser(userId, start, end);
    const metrics = calculateMetrics(events);
    await this.prisma.userDailyStat.upsert({
      where: { userId_date: { userId, date: start } },
      create: {
        userId,
        date: start,
        listeningMinutes: metrics.minutes,
        uniqueTracks: metrics.tracks,
        uniqueArtists: metrics.artists,
        uniqueGenres: metrics.genres,
        discoveries: metrics.discoveries,
        sessionCount: metrics.sessions,
      },
      update: {
        listeningMinutes: metrics.minutes,
        uniqueTracks: metrics.tracks,
        uniqueArtists: metrics.artists,
        uniqueGenres: metrics.genres,
        discoveries: metrics.discoveries,
        sessionCount: metrics.sessions,
      },
    });
  }

  private async awardListeningXp(userId: string, deltaMs: number): Promise<void> {
    const deltaXp = Math.floor(deltaMs / 1000);
    if (deltaXp <= 0) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    if (!user) return;
    const xp = user.xp + deltaXp;
    await this.prisma.user.update({
      where: { id: userId },
      data: { xp, level: levelForXp(xp) },
    });
  }

  private async evaluateAchievements(userId: string): Promise<void> {
    const [definitions, events, streak] = await Promise.all([
      this.prisma.achievementDefinition.findMany(),
      this.prisma.listeningEvent.findMany({ where: { userId }, include: { track: true } }),
      this.getListeningStreak(userId),
    ]);
    const metrics = calculateMetrics(events);
    const nightEvents = events.filter((event: any) => {
      const hour = event.startedAt.getHours();
      return hour >= 0 && hour < 5;
    }).length;
    const values: Record<string, number> = {
      'first-track': events.length,
      'songs-100': events.length,
      'songs-1000': events.length,
      'artists-500': metrics.artists,
      'genres-50': metrics.genres,
      'streak-30': streak,
      'night-owl': nightEvents,
    };

    await Promise.all(
      definitions.map(async (definition: any) => {
        const progress = values[definition.id] ?? 0;
        const threshold = definition.threshold ?? 1;
        await this.prisma.userAchievement.upsert({
          where: { userId_achievementId: { userId, achievementId: definition.id } },
          create: {
            userId,
            achievementId: definition.id,
            progress,
            unlockedAt: progress >= threshold ? new Date() : null,
          },
          update: {
            progress,
            ...(progress >= threshold ? { unlockedAt: new Date() } : {}),
          },
        });
      }),
    );
  }

  private async getListeningStreak(userId: string): Promise<number> {
    const stats = await this.prisma.userDailyStat.findMany({
      where: { userId, listeningMinutes: { gt: 0 } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    let expected = startOfDay(new Date());
    let streak = 0;
    for (const stat of stats) {
      const date = startOfDay(stat.date);
      const sameDay = date.getTime() === expected.getTime();
      const yesterday = date.getTime() === expected.getTime() - DAY_MS;
      if (streak === 0 && !sameDay && !yesterday) break;
      if (streak > 0 && !sameDay) break;
      streak += 1;
      expected = new Date(expected.getTime() - DAY_MS);
    }
    return streak;
  }

  private async getHistory(userId: string, now: Date) {
    const history: Array<{ month: string; minutes: number; discoveries: number }> = [];
    for (let offset = 7; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      const events = await this.eventsForUser(userId, date, next);
      const metrics = calculateMetrics(events);
      history.push({
        month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
          .format(date)
          .replace('.', '')
          .replace(/^./, (letter) => letter.toUpperCase()),
        minutes: metrics.minutes,
        discoveries: metrics.discoveries,
      });
    }
    return history;
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { spotifyAccount: { select: { id: true } } },
    });
    if (!user) throw new AppError('Sessão inválida. Entre novamente.', 401, 'INVALID_SESSION');
    return user;
  }

  private async requireGuildAccess(userId: string, guildId: string) {
    const membership = await this.prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId } },
      include: { guild: { include: { _count: { select: { members: true } } } } },
    });
    if (!membership)
      throw new AppError('Você não tem acesso a este servidor.', 403, 'GUILD_ACCESS_DENIED');
    return membership.guild;
  }
}

function calculateMetrics(
  events: Array<{
    id: string;
    listenedMs: number;
    isDiscovery: boolean;
    startedAt: Date;
    track: { id: string; artists: unknown; genres: string[]; audioFeatures: unknown };
  }>,
) {
  const tracks = new Set(events.map((event) => event.track.id));
  const artists = countArtists(events);
  const genres = countGenres(events);
  return {
    minutes: Math.round(events.reduce((sum, event) => sum + event.listenedMs, 0) / 60_000),
    tracks: tracks.size,
    artists: artists.size,
    genres: genres.size,
    discoveries: events.filter((event) => event.isDiscovery).length,
    sessions: countSessions(events),
  };
}

function toWardfyTrack(track: {
  spotifyId: string;
  name: string;
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  spotifyUrl: string;
  popularity: number | null;
  artists: unknown;
}): WardfyTrack {
  return {
    id: track.spotifyId,
    title: track.name,
    artists: artistNames(track.artists),
    album: track.albumName,
    albumArtUrl: track.albumImageUrl ?? undefined,
    durationMs: track.durationMs,
    spotifyUrl: track.spotifyUrl,
    popularity: track.popularity ?? undefined,
  };
}

function toPlaybackTrack(track: Parameters<typeof toWardfyTrack>[0]) {
  return toWardfyTrack(track);
}

function buildTopTracks(
  events: Array<{ track: Parameters<typeof toWardfyTrack>[0] }>,
): Array<WardfyTrack & { rank: number; plays: number }> {
  const byTrack = new Map<string, { track: Parameters<typeof toWardfyTrack>[0]; plays: number }>();
  for (const event of events) {
    const key = event.track.spotifyId;
    const previous = byTrack.get(key);
    byTrack.set(key, { track: event.track, plays: (previous?.plays ?? 0) + 1 });
  }
  return [...byTrack.values()]
    .sort((left, right) => right.plays - left.plays)
    .slice(0, 8)
    .map((item, index) => ({ ...toWardfyTrack(item.track), rank: index + 1, plays: item.plays }));
}

function buildGenreDna(events: Array<{ track: { genres: string[] } }>) {
  const counts = countGenres(events);
  const max = Math.max(...counts.values(), 0);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([genre, value]) => ({ genre, value: max ? Math.round((value / max) * 100) : 0 }));
}

function buildAudioTraits(events: Array<{ track: { audioFeatures: unknown } }>) {
  const featureRows = events
    .map((event) => event.track.audioFeatures)
    .filter(isRecord)
    .filter((features) => typeof features.energy === 'number');
  const average = (key: string) =>
    featureRows.length === 0
      ? 0
      : Math.round(
          (featureRows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0) /
            featureRows.length) *
            100,
        );
  return [
    { label: 'Energia', value: average('energy'), color: 'blue' },
    { label: 'Danceability', value: average('danceability'), color: 'cyan' },
    { label: 'Valence', value: average('valence'), color: 'sky' },
    { label: 'Acústica', value: average('acousticness'), color: 'navy' },
    { label: 'Instrumental', value: average('instrumentalness'), color: 'indigo' },
  ];
}

function buildWeeklyMinutes(
  events: Array<{ listenedMs: number; startedAt: Date }>,
  now: Date,
): Array<{ day: string; minutes: number }> {
  return Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(new Date(now.getTime() - (6 - index) * DAY_MS));
    const next = new Date(date.getTime() + DAY_MS);
    return {
      day: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
        .format(date)
        .replace('.', '')
        .replace(/^./, (letter) => letter.toUpperCase()),
      minutes: Math.round(
        events
          .filter((event) => event.startedAt >= date && event.startedAt < next)
          .reduce((sum, event) => sum + event.listenedMs, 0) / 60_000,
      ),
    };
  });
}

function buildHeatmap(events: Array<{ listenedMs: number; startedAt: Date }>) {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const buckets = new Map<string, number>();
  for (const event of events) {
    const key = `${weekdays[event.startedAt.getDay()] ?? 'Dom'}:${event.startedAt.getHours()}`;
    buckets.set(key, (buckets.get(key) ?? 0) + event.listenedMs);
  }
  const max = Math.max(...buckets.values(), 0);
  return weekdays.flatMap((day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const value = buckets.get(`${day}:${hour}`) ?? 0;
      return { day, hour, value: max ? Math.min(4, Math.ceil((value / max) * 4)) : 0 };
    }),
  );
}

function countArtists(events: Array<{ track: { artists: unknown } }>) {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const artist of artistNames(event.track.artists)) {
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
  }
  return counts;
}

function countTracks(events: Array<{ track: { name: string } }>) {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.track.name, (counts.get(event.track.name) ?? 0) + 1);
  }
  return counts;
}

function countGenres(events: Array<{ track: { genres: string[] } }>) {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const genre of event.track.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return counts;
}

function countSessions(events: Array<{ startedAt: Date }>) {
  if (events.length === 0) return 0;
  const sorted = [...events].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
  );
  return sorted.reduce(
    (sessions, event, index) =>
      index === 0 ||
      event.startedAt.getTime() - (sorted[index - 1]?.startedAt.getTime() ?? 0) > 30 * 60_000
        ? sessions + 1
        : sessions,
    0,
  );
}

function metricValue(metrics: ReturnType<typeof calculateMetrics>, metric: RankingMetric): number {
  switch (metric) {
    case 'artists':
      return metrics.artists;
    case 'tracks':
      return metrics.tracks;
    case 'discoveries':
      return metrics.discoveries;
    case 'genres':
      return metrics.genres;
    case 'sessions':
      return metrics.sessions;
    case 'listeningMinutes':
    default:
      return metrics.minutes;
  }
}

function stat(
  label: string,
  value: string,
  current: number,
  previous: number,
  icon: WardfyDashboard['stats'][number]['icon'],
): WardfyDashboard['stats'][number] {
  const percentage =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  return {
    label,
    value,
    change:
      previous > 0
        ? `${percentage >= 0 ? '+' : ''}${percentage}% vs. período anterior`
        : 'primeiro período registrado',
    positive: percentage >= 0,
    icon,
  };
}

function weightedJaccard(left: Map<string, number>, right: Map<string, number>): number {
  const keys = new Set([...left.keys(), ...right.keys()]);
  if (keys.size === 0) return 0;
  let intersection = 0;
  let union = 0;
  for (const key of keys) {
    const a = left.get(key) ?? 0;
    const b = right.get(key) ?? 0;
    intersection += Math.min(a, b);
    union += Math.max(a, b);
  }
  return union === 0 ? 0 : (intersection / union) * 100;
}

function sharedKeys(left: Map<string, number>, right: Map<string, number>) {
  return [...left.keys()].filter((key) => right.has(key));
}

function artistNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((artist) => {
      if (typeof artist === 'string') return artist;
      if (isRecord(artist) && typeof artist.name === 'string') return artist.name;
      return null;
    })
    .filter((artist): artist is string => Boolean(artist));
}

function normalizeGenres(genres: string[]) {
  return [...new Set(genres.map((genre) => genre.trim()).filter(Boolean))].slice(0, 20);
}

function parseSpotifyDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(
    value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value,
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function challengeMetricValue(
  metric: string,
  metrics: ReturnType<typeof calculateMetrics>,
  streak: number,
): number {
  return (
    {
      UNIQUE_ARTISTS: metrics.artists,
      UNIQUE_GENRES: metrics.genres,
      UNIQUE_TRACKS: metrics.tracks,
      LISTENING_MINUTES: metrics.minutes,
      STREAK_DAYS: streak,
      DISCOVERIES: metrics.discoveries,
    }[metric] ?? 0
  );
}

function metricUnitForChallenge(metric: string): string {
  return (
    {
      UNIQUE_ARTISTS: 'artistas',
      UNIQUE_GENRES: 'gêneros',
      UNIQUE_TRACKS: 'faixas',
      STREAK_DAYS: 'dias',
      DISCOVERIES: 'descobertas',
    }[metric] ?? 'progresso'
  );
}

function musicalTitle(
  topGenres: string[],
  variety: number,
  events: Array<{ startedAt: Date }>,
): string {
  const normalised = topGenres.map((genre) => genre.toLocaleLowerCase('pt-BR'));
  const lateNight = events.length
    ? events.filter((event) => event.startedAt.getHours() < 5).length / events.length
    : 0;
  if (lateNight > 0.4) return 'DJ da Madrugada';
  if (variety >= 18) return 'Explorador Musical';
  if (normalised.some((genre) => genre.includes('metal'))) return 'Mestre do Metal';
  if (normalised.some((genre) => genre.includes('rock'))) return 'Rei do Rock';
  if (normalised.some((genre) => genre.includes('indie'))) return 'Indie Supremo';
  if (normalised.some((genre) => genre.includes('pop'))) return 'Caçador de Hits';
  return 'Curador de Frequências';
}

function levelForXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

function nextLevelXp(level: number) {
  return level * level * 100;
}

function startOfPeriod(period: DashboardPeriod, now: Date): Date {
  if (period === 'all') return new Date(0);
  if (period === 'year') return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  if (period === 'month') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period === 'day') return startOfDay(now);
  const day = now.getUTCDay() || 7;
  const start = startOfDay(now);
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start;
}

function shiftPeriod(date: Date, period: DashboardPeriod, direction: -1 | 1) {
  const shifted = new Date(date);
  if (period === 'week') shifted.setUTCDate(shifted.getUTCDate() + direction * 7);
  if (period === 'month') shifted.setUTCMonth(shifted.getUTCMonth() + direction);
  if (period === 'year') shifted.setUTCFullYear(shifted.getUTCFullYear() + direction);
  if (period === 'day') shifted.setUTCDate(shifted.getUTCDate() + direction);
  return shifted;
}

function startOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatClock(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

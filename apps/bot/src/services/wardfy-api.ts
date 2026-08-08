import type {
  CompatibilityReport,
  LeaderboardEntry,
  PlaybackSnapshot,
  RankingMetric,
} from '@wardfy/shared';

import type { BotConfig } from '../config.js';

interface Envelope<T> {
  data: T;
}

export interface BotProfile {
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

export interface GuildActivity {
  userId: string;
  discordId?: string;
  displayName: string;
  avatarUrl?: string;
  track: {
    id: string;
    title: string;
    artists: string[];
    album: string;
    albumArtUrl?: string;
    durationMs: number;
    spotifyUrl: string;
  };
  progressMs: number;
  deviceName?: string;
  updatedAt: string;
}

export interface ActivityMessageRef {
  channelId: string;
  discordMessageId: string;
  lastTrackSpotifyId?: string | null;
}

export interface GuildSettings {
  activityChannelId: string | null;
  activityUpdateSeconds: number;
  notificationsEnabled: boolean;
  automaticRolesEnabled: boolean;
  allowMemberComparison: boolean;
}

type ConnectedBotConfig = BotConfig & { BOT_API_TOKEN: string };

export class WardfyApi {
  constructor(private readonly config: ConnectedBotConfig) {}

  async registerGuild(input: {
    id: string;
    name: string;
    iconUrl?: string;
    ownerDiscordId?: string;
  }): Promise<void> {
    await this.request('/v1/internal/guilds', { method: 'POST', body: JSON.stringify(input) });
  }

  async registerMember(
    guildId: string,
    input: {
      discordId: string;
      displayName: string;
      avatarUrl?: string;
      role?: 'MEMBER' | 'ADMIN' | 'OWNER';
    },
  ): Promise<void> {
    await this.request(`/v1/internal/guilds/${encodeURIComponent(guildId)}/members`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async leaderboard(guildId: string, metric: RankingMetric): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(
      `/v1/internal/guilds/${encodeURIComponent(guildId)}/rankings?period=week&metric=${metric}`,
    );
  }

  async compatibility(leftDiscordId: string, rightDiscordId: string): Promise<CompatibilityReport> {
    return this.request<CompatibilityReport>(
      `/v1/internal/users/${encodeURIComponent(leftDiscordId)}/compatibility/${encodeURIComponent(rightDiscordId)}`,
    );
  }

  async challenges(
    guildId: string,
    discordId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      icon: string;
      description: string;
      progress: number;
      target: number;
      unit: string;
      daysLeft: number;
      rewardXp: number;
    }>
  > {
    return this.request(
      `/v1/internal/guilds/${encodeURIComponent(guildId)}/users/${encodeURIComponent(discordId)}/challenges`,
    );
  }

  async joinChallenge(discordId: string, challengeId: string): Promise<void> {
    await this.request(
      `/v1/internal/users/${encodeURIComponent(discordId)}/challenges/${encodeURIComponent(challengeId)}/join`,
      { method: 'POST' },
    );
  }

  async recommend(
    fromDiscordId: string,
    toDiscordId: string,
    input: { trackLabel: string; spotifyTrackUrl: string; note?: string },
  ): Promise<void> {
    await this.request(
      `/v1/internal/users/${encodeURIComponent(fromDiscordId)}/recommendations/${encodeURIComponent(toDiscordId)}`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  async profile(discordId: string): Promise<BotProfile | null> {
    return this.request<BotProfile | null>(
      `/v1/internal/users/${encodeURIComponent(discordId)}/profile`,
    );
  }

  async syncPlayback(discordId: string): Promise<PlaybackSnapshot> {
    return this.request(`/v1/internal/users/${encodeURIComponent(discordId)}/sync-playback`, {
      method: 'POST',
    });
  }

  async activity(guildId: string): Promise<GuildActivity[]> {
    return this.request(`/v1/internal/guilds/${encodeURIComponent(guildId)}/activity`);
  }

  async guildSettings(guildId: string): Promise<GuildSettings> {
    return this.request(`/v1/internal/guilds/${encodeURIComponent(guildId)}/settings`);
  }

  async updateGuildSettings(
    guildId: string,
    settings: { activityChannelId?: string | null; activityUpdateSeconds?: number },
  ): Promise<void> {
    await this.request(`/v1/internal/guilds/${encodeURIComponent(guildId)}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async activityMessage(guildId: string, discordId: string): Promise<ActivityMessageRef | null> {
    return this.request(
      `/v1/internal/guilds/${encodeURIComponent(guildId)}/activity-messages/${encodeURIComponent(discordId)}`,
    );
  }

  async saveActivityMessage(
    guildId: string,
    input: ActivityMessageRef & { discordId: string },
  ): Promise<void> {
    await this.request(`/v1/internal/guilds/${encodeURIComponent(guildId)}/activity-messages`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async removeActivityMessage(guildId: string, discordId: string): Promise<void> {
    await this.request(
      `/v1/internal/guilds/${encodeURIComponent(guildId)}/activity-messages/${encodeURIComponent(discordId)}`,
      { method: 'DELETE' },
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.API_ORIGIN}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        'x-wardfy-bot-token': this.config.BOT_API_TOKEN,
        ...init.headers,
      },
      signal: AbortSignal.timeout(1_000),
    });
    if (response.status === 204) return undefined as T;
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wardfy API request ${path} failed (${response.status}): ${error}`);
    }
    const payload = (await response.json()) as Envelope<T>;
    return payload.data;
  }
}

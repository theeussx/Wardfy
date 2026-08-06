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

export class WardfyApi {
  constructor(private readonly config: BotConfig) {}

  async leaderboard(metric: RankingMetric): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/v1/rankings?period=week&metric=${metric}`);
  }

  async compatibility(left: string, right: string): Promise<CompatibilityReport> {
    return this.request<CompatibilityReport>(
      `/v1/compatibility/${encodeURIComponent(left)}/${encodeURIComponent(right)}`,
    );
  }

  async challenges(): Promise<
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
    return this.request('/v1/challenges');
  }

  async guildSettings(guildId: string): Promise<{
    activityChannelId: string | null;
    activityUpdateSeconds: number;
    notificationsEnabled: boolean;
  }> {
    return this.request(`/v1/guilds/${encodeURIComponent(guildId)}/settings`);
  }

  async updateGuildSettings(
    guildId: string,
    settings: { activityChannelId?: string | null; activityUpdateSeconds?: number },
  ): Promise<void> {
    await this.request(`/v1/guilds/${encodeURIComponent(guildId)}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async publishPlayback(
    snapshot: PlaybackSnapshot & { guildId: string; displayName: string },
  ): Promise<void> {
    await this.request('/v1/events/listening', {
      method: 'POST',
      body: JSON.stringify(snapshot),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.API_ORIGIN}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(this.config.BOT_API_TOKEN ? { 'x-wardfy-bot-token': this.config.BOT_API_TOKEN } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wardfy API request ${path} failed (${response.status}): ${error}`);
    }
    const payload = (await response.json()) as Envelope<T>;
    return payload.data;
  }
}

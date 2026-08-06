import type { Client } from 'discord.js';

import { ActivityChannelPublisher } from './activity-channel-publisher.js';
import { WardfyApi } from './wardfy-api.js';

/** Keeps Discord activity channels aligned with the real playback feed from the API. */
export class GuildActivitySync {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly visibleListeners = new Map<string, Map<string, string>>();
  private readonly lastSyncAt = new Map<string, number>();

  constructor(
    private readonly client: Client,
    private readonly api: WardfyApi,
    private readonly publisher: ActivityChannelPublisher,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.timer) return;
    void this.syncAll();
    this.timer = setInterval(() => void this.syncAll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async syncAll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await Promise.all(
        [...this.client.guilds.cache.values()].map((guild) => this.syncGuild(guild.id)),
      );
    } finally {
      this.running = false;
    }
  }

  async syncGuild(guildId: string): Promise<void> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    try {
      const settings = await this.api.guildSettings(guildId);
      if (!settings.activityChannelId) return;
      const now = Date.now();
      const lastSync = this.lastSyncAt.get(guildId) ?? 0;
      if (now - lastSync < settings.activityUpdateSeconds * 1_000) return;
      this.lastSyncAt.set(guildId, now);
      const activity = await this.api.activity(guildId);
      const current = new Map<string, string>();

      for (const listener of activity) {
        if (!listener.discordId) continue;
        current.set(listener.discordId, listener.displayName);
        await this.publisher.renderPlaying({
          guild,
          channelId: settings.activityChannelId,
          discordId: listener.discordId,
          name: listener.displayName,
          track: listener.track.title,
          artist: listener.track.artists.join(', '),
          album: listener.track.album,
          progressMs: listener.progressMs,
          durationMs: listener.track.durationMs,
          device: listener.deviceName,
          spotifyUrl: listener.track.spotifyUrl,
          albumArtUrl: listener.track.albumArtUrl,
          spotifyTrackId: listener.track.id,
        });
      }

      const previous = this.visibleListeners.get(guildId) ?? new Map<string, string>();
      for (const [discordId, name] of previous) {
        if (!current.has(discordId)) await this.publisher.renderStopped(guild, discordId, name);
      }
      this.visibleListeners.set(guildId, current);
    } catch (error) {
      console.error(`Activity sync failed for guild ${guildId}`, error);
    }
  }
}

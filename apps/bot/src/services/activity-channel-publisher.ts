import type { Guild, Message, SendableChannels } from 'discord.js';

import { nowPlayingCard, noticeCard } from '../ui/components-v2.js';
import { WardfyApi, type ActivityMessageRef } from './wardfy-api.js';

/**
 * Persists Discord message references through the API. After a restart the bot
 * fetches and edits the previous card instead of creating duplicate activity
 * messages in the configured channel.
 */
export class ActivityChannelPublisher {
  private readonly messages = new Map<string, ActivityMessageRef>();

  constructor(private readonly api: WardfyApi) {}

  async renderPlaying(input: {
    guild: Guild;
    channelId: string;
    discordId: string;
    name: string;
    track: string;
    artist: string;
    album: string;
    progressMs: number;
    durationMs: number;
    device?: string;
    spotifyUrl: string;
    albumArtUrl?: string;
    spotifyTrackId?: string;
  }): Promise<void> {
    const channel = await this.resolveChannel(input.guild, input.channelId);
    if (!channel) return;
    const key = `${input.guild.id}:${input.discordId}`;
    const card = nowPlayingCard(input);
    const reference =
      this.messages.get(key) ?? (await this.api.activityMessage(input.guild.id, input.discordId));
    const existing = await this.fetchExisting(channel, reference ?? undefined);

    if (existing) {
      await existing.edit({ components: card.components });
      this.messages.set(key, reference!);
      await this.api.saveActivityMessage(input.guild.id, {
        discordId: input.discordId,
        channelId: channel.id,
        discordMessageId: existing.id,
        lastTrackSpotifyId: input.spotifyTrackId,
      });
      return;
    }

    const message = await channel.send(card);
    const nextReference = {
      channelId: channel.id,
      discordMessageId: message.id,
      lastTrackSpotifyId: input.spotifyTrackId,
    };
    this.messages.set(key, nextReference);
    await this.api.saveActivityMessage(input.guild.id, {
      discordId: input.discordId,
      ...nextReference,
    });
  }

  async renderStopped(guild: Guild, discordId: string, name: string): Promise<void> {
    const key = `${guild.id}:${discordId}`;
    const ref = this.messages.get(key) ?? (await this.api.activityMessage(guild.id, discordId));
    if (!ref) return;
    const channel = await this.resolveChannel(guild, ref.channelId);
    const message = channel ? await this.fetchExisting(channel, ref) : null;
    if (message) {
      await message.edit({
        components: noticeCard('Sessão encerrada', `${name} não está ouvindo nada agora.`)
          .components,
      });
    }
    // Keep the reference persisted: the next session edits this exact card instead of creating a new message.
    this.messages.set(key, ref);
    await this.api.saveActivityMessage(guild.id, {
      discordId,
      channelId: ref.channelId,
      discordMessageId: ref.discordMessageId,
      lastTrackSpotifyId: ref.lastTrackSpotifyId ?? undefined,
    });
  }

  private async resolveChannel(guild: Guild, channelId: string): Promise<SendableChannels | null> {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    return channel?.isTextBased() && 'send' in channel ? (channel as SendableChannels) : null;
  }

  private async fetchExisting(
    channel: SendableChannels,
    ref: ActivityMessageRef | undefined,
  ): Promise<Message | null> {
    if (!ref || ref.channelId !== channel.id) return null;
    return channel.messages.fetch(ref.discordMessageId).catch(() => null);
  }
}

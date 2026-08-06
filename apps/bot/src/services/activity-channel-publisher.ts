import type { Guild, Message, SendableChannels } from 'discord.js';

import { nowPlayingCard, noticeCard } from '../ui/components-v2.js';

interface ActivityMessageRef {
  channelId: string;
  messageId: string;
}

/**
 * Maintains one editable Components V2 card per listener in the configured
 * channel. A production deployment can swap this map for the ActivityMessage
 * Prisma table without changing Discord rendering behavior.
 */
export class ActivityChannelPublisher {
  private readonly messages = new Map<string, ActivityMessageRef>();

  async renderPlaying(input: {
    guild: Guild;
    channelId: string;
    userId: string;
    name: string;
    track: string;
    artist: string;
    album: string;
    progressMs: number;
    durationMs: number;
    device?: string;
    spotifyUrl: string;
    albumArtUrl?: string;
  }): Promise<void> {
    const channel = await this.resolveChannel(input.guild, input.channelId);
    if (!channel) return;
    const key = `${input.guild.id}:${input.userId}`;
    const card = nowPlayingCard(input);
    const existing = await this.fetchExisting(channel, this.messages.get(key));

    if (existing) {
      await existing.edit({ components: card.components });
      return;
    }
    const message = await channel.send(card);
    this.messages.set(key, { channelId: channel.id, messageId: message.id });
  }

  async renderStopped(guild: Guild, userId: string, name: string): Promise<void> {
    const key = `${guild.id}:${userId}`;
    const ref = this.messages.get(key);
    if (!ref) return;
    const channel = await this.resolveChannel(guild, ref.channelId);
    const message = channel ? await this.fetchExisting(channel, ref) : null;
    if (message) {
      await message.edit({
        components: noticeCard('Sessão encerrada', `${name} não está ouvindo nada agora.`)
          .components,
      });
    }
    this.messages.delete(key);
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
    return channel.messages.fetch(ref.messageId).catch(() => null);
  }
}

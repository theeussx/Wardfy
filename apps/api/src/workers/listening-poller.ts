import type { PlaybackSnapshot } from '@wardfy/shared';

import { SpotifyApiService } from '../services/spotify-api.service.js';
import { SpotifyOAuthService } from '../services/spotify-oauth.service.js';

export interface ListeningEventWriter {
  record(snapshot: PlaybackSnapshot): Promise<void>;
}

/**
 * Plans adaptive polling instead of polling every connected listener at a fixed
 * rate. Active playback is checked often, paused users are cooled down, and
 * Spotify 429 responses can be pushed back by the queue implementation.
 */
export class ListeningPoller {
  constructor(
    private readonly spotify: SpotifyApiService,
    private readonly oauth: SpotifyOAuthService,
    private readonly writer: ListeningEventWriter,
  ) {}

  nextDelayMs(isPlaying: boolean, progressMs = 0, durationMs = 0): number {
    if (!isPlaying) return 120_000;
    // Poll at the next useful boundary but never more frequently than 15 seconds.
    const remaining = Math.max(0, durationMs - progressMs);
    return Math.max(15_000, Math.min(45_000, remaining + 1_500));
  }

  async poll(userId: string): Promise<number> {
    const accessToken = await this.oauth.accessTokenForUser(userId);
    const playback = await this.spotify.currentlyPlaying(accessToken);
    if (!playback?.item || !playback.isPlaying) return this.nextDelayMs(false);

    const snapshot: PlaybackSnapshot = {
      userId,
      isPlaying: true,
      progressMs: playback.progressMs,
      deviceName: playback.device?.name,
      deviceType: playback.device?.type,
      updatedAt: new Date().toISOString(),
      track: {
        id: playback.item.id,
        title: playback.item.name,
        artists: playback.item.artists?.map((artist) => artist.name) ?? [],
        album: playback.item.album?.name ?? 'Unknown album',
        albumArtUrl: playback.item.album?.images?.[0]?.url,
        spotifyUrl:
          playback.item.external_urls?.spotify ??
          `https://open.spotify.com/track/${playback.item.id}`,
        durationMs: playback.item.duration_ms,
        popularity: playback.item.popularity,
      },
    };
    await this.writer.record(snapshot);
    return this.nextDelayMs(true, snapshot.progressMs, snapshot.track?.durationMs ?? 0);
  }
}

import { AppError } from '../lib/app-error.js';

export interface SpotifyPlayback {
  isPlaying: boolean;
  progressMs: number;
  device?: { name?: string; type?: string; id?: string };
  item?: {
    id: string;
    name: string;
    duration_ms: number;
    external_urls?: { spotify?: string };
    album?: { name?: string; images?: Array<{ url: string }> };
    artists?: Array<{ id: string; name: string }>;
    popularity?: number;
  };
}

/** A thin Spotify client with explicit 204 and rate-limit semantics. */
export class SpotifyApiService {
  async currentlyPlaying(accessToken: string): Promise<SpotifyPlayback | null> {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 204) return null;
    if (response.status === 401)
      throw new AppError('Spotify token has expired.', 401, 'SPOTIFY_TOKEN_EXPIRED');
    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 30);
      throw new AppError(
        `Spotify rate limit reached. Retry in ${retryAfterSeconds} seconds.`,
        429,
        'SPOTIFY_RATE_LIMITED',
      );
    }
    if (!response.ok) {
      throw new AppError(
        `Spotify playback lookup failed (${response.status}).`,
        502,
        'SPOTIFY_PLAYBACK_FAILED',
      );
    }
    return (await response.json()) as SpotifyPlayback;
  }
}

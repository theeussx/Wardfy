import { AppError } from '../lib/app-error.js';

export interface SpotifyArtistRef {
  id: string;
  name: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  external_urls?: { spotify?: string };
  album?: {
    id?: string;
    name?: string;
    release_date?: string;
    images?: Array<{ url: string; width?: number; height?: number }>;
  };
  artists?: SpotifyArtistRef[];
  popularity?: number;
  explicit?: boolean;
}

export interface SpotifyPlayback {
  isPlaying: boolean;
  progressMs: number;
  device?: { name?: string; type?: string; id?: string };
  item?: SpotifyTrack;
}

export interface SpotifyTopArtist extends SpotifyArtistRef {
  genres?: string[];
  images?: Array<{ url: string }>;
  popularity?: number;
}

interface RecentlyPlayedItem {
  played_at: string;
  track: SpotifyTrack;
}

export interface SpotifyAudioFeatures {
  id: string;
  tempo?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  instrumentalness?: number;
  acousticness?: number;
}

/**
 * Spotify's API is isolated behind this client so rate-limit and 204 semantics
 * are handled consistently by the OAuth callback, sync worker and bot paths.
 */
export class SpotifyApiService {
  async currentlyPlaying(accessToken: string): Promise<SpotifyPlayback | null> {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 204) return null;
    await assertSpotifyResponse(response, 'SPOTIFY_PLAYBACK_FAILED');
    const payload = (await response.json()) as {
      is_playing: boolean;
      progress_ms: number | null;
      device?: { name?: string; type?: string; id?: string };
      item?: SpotifyTrack | null;
    };
    return {
      isPlaying: payload.is_playing,
      progressMs: payload.progress_ms ?? 0,
      device: payload.device,
      item: payload.item ?? undefined,
    };
  }

  async topArtists(accessToken: string, limit = 50): Promise<SpotifyTopArtist[]> {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=${Math.min(limit, 50)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    await assertSpotifyResponse(response, 'SPOTIFY_TOP_ARTISTS_FAILED');
    const payload = (await response.json()) as { items?: SpotifyTopArtist[] };
    return payload.items ?? [];
  }

  async topTracks(accessToken: string, limit = 50): Promise<SpotifyTrack[]> {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=${Math.min(limit, 50)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    await assertSpotifyResponse(response, 'SPOTIFY_TOP_TRACKS_FAILED');
    const payload = (await response.json()) as { items?: SpotifyTrack[] };
    return payload.items ?? [];
  }

  async recentlyPlayed(accessToken: string, limit = 50): Promise<RecentlyPlayedItem[]> {
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/recently-played?limit=${Math.min(limit, 50)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    await assertSpotifyResponse(response, 'SPOTIFY_RECENTLY_PLAYED_FAILED');
    const payload = (await response.json()) as { items?: RecentlyPlayedItem[] };
    return payload.items ?? [];
  }

  async audioFeatures(
    accessToken: string,
    trackIds: string[],
  ): Promise<Map<string, SpotifyAudioFeatures>> {
    if (trackIds.length === 0) return new Map();
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(trackIds.slice(0, 100).join(','))}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    // Spotify restricts this endpoint for some application types. The rest of
    // the product remains fully functional when features are unavailable.
    if (response.status === 403 || response.status === 404) return new Map();
    await assertSpotifyResponse(response, 'SPOTIFY_AUDIO_FEATURES_FAILED');
    const payload = (await response.json()) as {
      audio_features?: Array<SpotifyAudioFeatures | null>;
    };
    return new Map(
      (payload.audio_features ?? [])
        .filter((feature): feature is SpotifyAudioFeatures => Boolean(feature?.id))
        .map((feature) => [feature.id, feature]),
    );
  }
}

async function assertSpotifyResponse(response: Response, fallbackCode: string): Promise<void> {
  if (response.status === 401) {
    throw new AppError('Spotify token has expired.', 401, 'SPOTIFY_TOKEN_EXPIRED');
  }
  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 30);
    throw new AppError(
      `Spotify rate limit reached. Retry in ${retryAfterSeconds} seconds.`,
      429,
      'SPOTIFY_RATE_LIMITED',
    );
  }
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new AppError(
      `Spotify request failed (${response.status}). ${details}`.trim(),
      502,
      fallbackCode,
    );
  }
}

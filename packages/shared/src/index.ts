export const WARDIFY_BRAND = {
  name: 'Wardfy',
  accent: 0x8b5cf6,
  spotify: 0x1ed760,
  discord: 0x5865f2,
} as const;

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';
export type RankingMetric =
  'listeningMinutes' | 'artists' | 'tracks' | 'discoveries' | 'genres' | 'sessions';

export interface TrackSnapshot {
  id: string;
  title: string;
  artists: string[];
  album: string;
  albumArtUrl?: string;
  spotifyUrl: string;
  durationMs: number;
  popularity?: number;
  explicit?: boolean;
}

export interface PlaybackSnapshot {
  userId: string;
  isPlaying: boolean;
  progressMs: number;
  deviceName?: string;
  deviceType?: string;
  updatedAt: string;
  track?: TrackSnapshot;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  value: number;
  delta?: number;
  isCurrentUser?: boolean;
}

export interface CompatibilityReport {
  score: number;
  sharedArtists: string[];
  sharedTracks: string[];
  sharedGenres: string[];
  sharedPlaylists: number;
  explanation: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, string | number | boolean | null>;
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
}

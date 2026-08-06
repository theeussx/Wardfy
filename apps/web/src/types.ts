export type ViewKey =
  'inicio' | 'atividade' | 'ranking' | 'dna' | 'desafios' | 'historico' | 'configuracoes';

export interface Track {
  id: string;
  title: string;
  artists: string[];
  album: string;
  durationMs: number;
  spotifyUrl: string;
  popularity?: number;
}

export interface DashboardData {
  server: { id: string; name: string; members: number; icon: string };
  viewer: {
    id: string;
    name: string;
    handle: string;
    level: number;
    xp: number;
    nextLevelXp: number;
    streak: number;
    title: string;
  };
  nowPlaying: {
    userId: string;
    isPlaying: boolean;
    progressMs: number;
    deviceName?: string;
    deviceType?: string;
    updatedAt: string;
    track?: Track;
  };
  stats: Array<{ label: string; value: string; change: string; positive: boolean; icon: string }>;
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
  }>;
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    unlocked: boolean;
    description: string;
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
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
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

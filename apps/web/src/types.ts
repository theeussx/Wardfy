export type ViewKey =
  'inicio' | 'atividade' | 'ranking' | 'dna' | 'desafios' | 'historico' | 'configuracoes';

export interface Track {
  id: string;
  title: string;
  artists: string[];
  album: string;
  albumArtUrl?: string;
  durationMs: number;
  spotifyUrl: string;
  popularity?: number;
}

export interface GuildSummary {
  id: string;
  name: string;
  iconUrl?: string;
  members: number;
  canManage: boolean;
}

export interface Viewer {
  id: string;
  discordId?: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  streak: number;
  title: string;
  spotifyConnected: boolean;
}

export interface FriendActivity {
  id: string;
  discordId?: string;
  name: string;
  initials: string;
  color: string;
  status: 'playing' | 'idle' | 'offline';
  track?: string;
  artist?: string;
  elapsed?: string;
  albumArtUrl?: string;
}

export interface DashboardData {
  server: { id: string | null; name: string; members: number; icon?: string };
  viewer: Viewer;
  nowPlaying: {
    userId: string;
    isPlaying: boolean;
    progressMs: number;
    deviceName?: string;
    deviceType?: string;
    updatedAt: string;
    track?: Track;
  };
  stats: Array<{
    label: string;
    value: string;
    change: string;
    positive: boolean;
    icon: 'clock' | 'sparkles' | 'music' | 'flame';
  }>;
  weeklyMinutes: Array<{ day: string; minutes: number }>;
  genreDna: Array<{ genre: string; value: number }>;
  heatmap: Array<{ day: string; hour: number; value: number }>;
  friends: FriendActivity[];
  topTracks: Array<Track & { rank: number; plays: number }>;
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    unlocked: boolean;
    description: string;
    progress: number;
    threshold?: number;
  }>;
  challenges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    progress: number;
    joined: boolean;
    target: number;
    unit: string;
    daysLeft: number;
    rewardXp: number;
  }>;
  audioTraits: Array<{ label: string; value: number; color: string }>;
  history: Array<{ month: string; minutes: number; discoveries: number }>;
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

export interface CurrentUserResponse {
  authenticated: boolean;
  user?: Pick<
    Viewer,
    | 'id'
    | 'discordId'
    | 'name'
    | 'avatarUrl'
    | 'title'
    | 'level'
    | 'xp'
    | 'nextLevelXp'
    | 'streak'
    | 'spotifyConnected'
  > & { minutes: number; artists: number };
  guilds: GuildSummary[];
}

export interface LiveActivity {
  userId: string;
  discordId?: string;
  displayName: string;
  avatarUrl?: string;
  track: Track;
  progressMs: number;
  deviceName?: string;
  deviceType?: string;
  updatedAt: string;
}

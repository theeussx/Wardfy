import type {
  CompatibilityReport,
  LeaderboardEntry,
  PlaybackSnapshot,
  RankingMetric,
} from '@wardfy/shared';

export interface DashboardSnapshot {
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
    avatarUrl?: string;
  };
  nowPlaying: PlaybackSnapshot;
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

const hourWeights = [0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 4, 5, 6, 7, 5, 6, 7, 8, 7, 6, 5, 4, 3, 1];
const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const demoDashboard: DashboardSnapshot = {
  server: { id: 'wardfy-lab', name: 'Wardfy Lab', members: 248, icon: 'WL' },
  viewer: {
    id: 'mateus',
    name: 'Mateus',
    handle: '@mateus',
    level: 18,
    xp: 3240,
    nextLevelXp: 4000,
    streak: 12,
    title: 'Explorador Musical',
  },
  nowPlaying: {
    userId: 'mateus',
    isPlaying: true,
    progressMs: 109000,
    deviceName: 'MacBook Pro',
    deviceType: 'Computer',
    updatedAt: new Date().toISOString(),
    track: {
      id: 'spotify:track:demo-deftones',
      title: 'Be Quiet and Drive (Far Away)',
      artists: ['Deftones'],
      album: 'Around the Fur',
      durationMs: 301000,
      popularity: 74,
      spotifyUrl: 'https://open.spotify.com/',
    },
  },
  stats: [
    {
      label: 'MINUTOS ESTA SEMANA',
      value: '1.284',
      change: '+18,4%',
      positive: true,
      icon: 'clock',
    },
    {
      label: 'ARTISTAS DESCOBERTOS',
      value: '42',
      change: '+12 esta semana',
      positive: true,
      icon: 'sparkles',
    },
    { label: 'MÚSICAS DIFERENTES', value: '327', change: '+9,1%', positive: true, icon: 'music' },
    {
      label: 'SEQUÊNCIA ATUAL',
      value: '12 dias',
      change: 'seu recorde: 19',
      positive: false,
      icon: 'flame',
    },
  ],
  weeklyMinutes: [
    { day: 'Seg', minutes: 142 },
    { day: 'Ter', minutes: 186 },
    { day: 'Qua', minutes: 128 },
    { day: 'Qui', minutes: 241 },
    { day: 'Sex', minutes: 194 },
    { day: 'Sáb', minutes: 267 },
    { day: 'Dom', minutes: 126 },
  ],
  genreDna: [
    { genre: 'Alternative', value: 96 },
    { genre: 'Shoegaze', value: 78 },
    { genre: 'Indie', value: 65 },
    { genre: 'Rock', value: 82 },
    { genre: 'Dream pop', value: 59 },
    { genre: 'Metal', value: 48 },
  ],
  heatmap: weekdays.flatMap((day, dayIndex) =>
    hourWeights.map((weight, hour) => ({
      day,
      hour,
      value: Math.max(0, Math.min(4, Math.round((weight + ((dayIndex * 3 + hour) % 4) - 1) / 2))),
    })),
  ),
  friends: [
    {
      id: 'lia',
      name: 'Lia',
      initials: 'LI',
      color: '#FF7A59',
      status: 'playing',
      track: 'Hysteria',
      artist: 'Muse',
      elapsed: '1:42',
    },
    {
      id: 'enzo',
      name: 'Enzo',
      initials: 'EZ',
      color: '#5B8CFF',
      status: 'playing',
      track: 'Nikes',
      artist: 'Frank Ocean',
      elapsed: '2:08',
    },
    {
      id: 'maya',
      name: 'Maya',
      initials: 'MY',
      color: '#AF65E9',
      status: 'idle',
      track: 'Última sessão há 18 min',
    },
    { id: 'caio', name: 'Caio', initials: 'CA', color: '#18B6A4', status: 'offline' },
  ],
  achievements: [
    {
      id: 'first-track',
      name: 'Primeira música',
      icon: '🎵',
      unlocked: true,
      description: 'Registrou sua primeira faixa.',
    },
    {
      id: 'collector',
      name: 'Colecionador',
      icon: '💿',
      unlocked: true,
      description: '1.000 faixas registradas.',
    },
    {
      id: 'night-owl',
      name: 'Coruja Musical',
      icon: '🌙',
      unlocked: true,
      description: '50 sessões após meia-noite.',
    },
    {
      id: 'genre-globe',
      name: 'Mundo em sons',
      icon: '🌍',
      unlocked: false,
      description: 'Ouça 50 gêneros diferentes.',
    },
  ],
  challenges: [
    {
      id: 'new-genres',
      name: 'Fora da bolha',
      icon: '✦',
      description: 'Conheça 10 gêneros inéditos esta semana.',
      progress: 7,
      target: 10,
      unit: 'gêneros',
      daysLeft: 2,
      rewardXp: 250,
    },
    {
      id: 'jazz-hours',
      name: 'Noite de Jazz',
      icon: '◌',
      description: 'Ouça 5 horas de Jazz antes de domingo.',
      progress: 214,
      target: 300,
      unit: 'min',
      daysLeft: 2,
      rewardXp: 300,
    },
    {
      id: 'artists-50',
      name: 'Mapa sonoro',
      icon: '◈',
      description: 'Passe por 50 artistas diferentes.',
      progress: 38,
      target: 50,
      unit: 'artistas',
      daysLeft: 2,
      rewardXp: 180,
    },
  ],
};

const leaderboardNames = [
  ['Lia', '#FF7A59'],
  ['Mateus', '#8B5CF6'],
  ['Enzo', '#5B8CFF'],
  ['Maya', '#AF65E9'],
  ['Caio', '#18B6A4'],
  ['Noah', '#E6B55C'],
  ['Sofi', '#EC5D92'],
] as const;

const metricValues: Record<RankingMetric, number[]> = {
  listeningMinutes: [1790, 1284, 1148, 987, 862, 794, 691],
  artists: [136, 102, 98, 86, 73, 65, 58],
  tracks: [418, 327, 302, 291, 251, 219, 186],
  discoveries: [57, 42, 38, 32, 27, 23, 20],
  genres: [24, 19, 18, 16, 15, 13, 11],
  sessions: [38, 32, 29, 26, 25, 20, 19],
};

export function getDemoLeaderboard(metric: RankingMetric): LeaderboardEntry[] {
  return leaderboardNames.map(([displayName], index) => ({
    rank: index + 1,
    userId: displayName.toLowerCase(),
    displayName,
    value: metricValues[metric][index] ?? 0,
    delta: [1, 0, 2, -1, 3, -2, 0][index],
    isCurrentUser: displayName === 'Mateus',
  }));
}

export const demoCompatibility: CompatibilityReport = {
  score: 82,
  sharedArtists: ['Deftones', 'Radiohead', 'Slowdive', 'Tame Impala', 'The Strokes'],
  sharedTracks: ['My Kind of Woman', 'K.', 'No Surprises', 'Sextape'],
  sharedGenres: ['Alternative', 'Indie Rock', 'Dream Pop', 'Shoegaze'],
  sharedPlaylists: 3,
  explanation:
    'Vocês orbitam a mesma constelação alternativa — com bastante espaço para descobrir juntos.',
};

export function buildDemoActivity(): Array<
  PlaybackSnapshot & { displayName: string; initials: string; color: string }
> {
  const friendActivity: Array<
    PlaybackSnapshot & { displayName: string; initials: string; color: string }
  > = demoDashboard.friends
    .filter((friend) => friend.status === 'playing')
    .map((friend, index) => ({
      userId: friend.id,
      displayName: friend.name,
      initials: friend.initials,
      color: friend.color,
      isPlaying: true,
      progressMs: 96000 + index * 43000,
      deviceName: index === 0 ? 'iPhone' : 'Web Player',
      deviceType: index === 0 ? 'Smartphone' : 'Computer',
      updatedAt: new Date().toISOString(),
      track: {
        id: `spotify:track:${friend.id}`,
        title: friend.track ?? 'Faixa desconhecida',
        artists: [friend.artist ?? 'Artista desconhecido'],
        album: index === 0 ? 'Absolution' : 'Blonde',
        durationMs: index === 0 ? 227000 : 309000,
        spotifyUrl: 'https://open.spotify.com/',
      },
    }));

  return [
    ...friendActivity,
    {
      userId: demoDashboard.nowPlaying.userId,
      isPlaying: demoDashboard.nowPlaying.isPlaying,
      progressMs: demoDashboard.nowPlaying.progressMs,
      deviceName: demoDashboard.nowPlaying.deviceName,
      deviceType: demoDashboard.nowPlaying.deviceType,
      updatedAt: new Date().toISOString(),
      track: demoDashboard.nowPlaying.track,
      displayName: demoDashboard.viewer.name,
      initials: 'MT',
      color: '#8B5CF6',
    },
  ];
}

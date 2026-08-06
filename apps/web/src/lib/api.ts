import type {
  CompatibilityReport,
  CurrentUserResponse,
  DashboardData,
  LeaderboardEntry,
} from '../types';

interface ApiEnvelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export class WardfyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'WardfyApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorEnvelope;
    throw new WardfyApiError(
      payload.message ?? 'Não foi possível concluir esta ação.',
      response.status,
      payload.error,
    );
  }
  return ((await response.json()) as ApiEnvelope<T>).data;
}

function withGuild(path: string, guildId?: string | null): string {
  return guildId
    ? `${path}${path.includes('?') ? '&' : '?'}guildId=${encodeURIComponent(guildId)}`
    : path;
}

export const wardfyApi = {
  me: () => request<CurrentUserResponse>('/v1/me'),
  dashboard: (guildId?: string | null) =>
    request<DashboardData>(withGuild('/v1/dashboard', guildId)),
  rankings: (guildId: string, metric: string) =>
    request<LeaderboardEntry[]>(
      `/v1/rankings?guildId=${encodeURIComponent(guildId)}&period=week&metric=${encodeURIComponent(metric)}`,
    ),
  challenges: (guildId?: string | null) =>
    request<DashboardData['challenges']>(withGuild('/v1/challenges', guildId)),
  compatibility: (discordId: string) =>
    request<CompatibilityReport>(`/v1/compatibility/${encodeURIComponent(discordId)}`),
  joinChallenge: (challengeId: string) =>
    request<void>(`/v1/challenges/${encodeURIComponent(challengeId)}/join`, { method: 'POST' }),
  createChallenge: (guildId: string, input: Record<string, unknown>) =>
    request(`/v1/guilds/${encodeURIComponent(guildId)}/challenges`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  syncLibrary: () => request<DashboardData>('/v1/me/sync', { method: 'POST' }),
  settings: (guildId: string) =>
    request<Record<string, unknown>>(`/v1/guilds/${encodeURIComponent(guildId)}/settings`),
  updateSettings: (guildId: string, settings: Record<string, unknown>) =>
    request(`/v1/guilds/${encodeURIComponent(guildId)}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  logout: () => request<void>('/v1/auth/logout', { method: 'POST' }),
  connectDiscordUrl: (returnTo = '/') =>
    `/api/v1/auth/discord/start?returnTo=${encodeURIComponent(returnTo)}`,
  connectSpotifyUrl: (returnTo = '/') =>
    `/api/v1/auth/spotify/start?returnTo=${encodeURIComponent(returnTo)}`,
};

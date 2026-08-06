import { demoCompatibility, demoDashboard, demoLeaderboard } from '../data/demo';
import type { CompatibilityReport, DashboardData, LeaderboardEntry } from '../types';

interface ApiEnvelope<T> {
  data: T;
}

async function request<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`/api${path}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return fallback;
    return ((await response.json()) as ApiEnvelope<T>).data;
  } catch {
    // The interface intentionally remains useful without credentials or local API.
    return fallback;
  }
}

export const wardfyApi = {
  dashboard: () => request<DashboardData>('/v1/dashboard', demoDashboard),
  rankings: (metric: string) =>
    request<LeaderboardEntry[]>(
      `/v1/rankings?period=week&metric=${metric}`,
      demoLeaderboard(metric),
    ),
  challenges: () =>
    request<DashboardData['challenges']>('/v1/challenges', demoDashboard.challenges),
  compatibility: (left: string, right: string) =>
    request<CompatibilityReport>(
      `/v1/compatibility/${encodeURIComponent(left)}/${encodeURIComponent(right)}`,
      demoCompatibility,
    ),
  updateSettings: (guildId: string, settings: Record<string, unknown>) =>
    fetch(`/api/v1/guilds/${encodeURIComponent(guildId)}/settings`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),
};

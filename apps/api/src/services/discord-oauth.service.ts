import { AppError } from '../lib/app-error.js';
import type { AppConfig } from '../config.js';

export interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string;
  avatar: string | null;
  locale?: string;
}

export interface DiscordOAuthGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordOAuthResult {
  profile: DiscordProfile;
  guilds: DiscordOAuthGuild[];
}

export class DiscordOAuthService {
  constructor(private readonly config: AppConfig) {}

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.DISCORD_CLIENT_ID,
      redirect_uri: this.config.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
      state,
      prompt: 'none',
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<DiscordOAuthResult> {
    const body = new URLSearchParams({
      client_id: this.config.DISCORD_CLIENT_ID,
      client_secret: this.config.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.DISCORD_REDIRECT_URI,
    });
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenResponse.ok) {
      throw new AppError('Discord token exchange failed.', 502, 'DISCORD_TOKEN_EXCHANGE_FAILED');
    }
    const token = (await tokenResponse.json()) as { access_token: string };
    const headers = { Authorization: `Bearer ${token.access_token}` };
    const [profileResponse, guildsResponse] = await Promise.all([
      fetch('https://discord.com/api/v10/users/@me', { headers }),
      fetch('https://discord.com/api/v10/users/@me/guilds', { headers }),
    ]);
    if (!profileResponse.ok || !guildsResponse.ok) {
      throw new AppError('Discord profile lookup failed.', 502, 'DISCORD_PROFILE_LOOKUP_FAILED');
    }
    return {
      profile: (await profileResponse.json()) as DiscordProfile,
      guilds: (await guildsResponse.json()) as DiscordOAuthGuild[],
    };
  }
}

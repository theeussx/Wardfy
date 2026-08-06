import { AppError } from '../lib/app-error.js';
import { TokenCipher } from '../lib/token-cipher.js';
import type { AppConfig } from '../config.js';
import type { SpotifyAccountRepository } from '../repositories/spotify-account.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';

export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-recently-played',
  'user-top-read',
  'user-read-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
] as const;

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: 'Bearer';
}

interface SpotifyProfile {
  id: string;
  display_name?: string;
  images?: Array<{ url: string }>;
  country?: string;
  product?: string;
}

export class SpotifyOAuthService {
  constructor(
    private readonly config: AppConfig,
    private readonly cipher: TokenCipher,
    private readonly accounts: SpotifyAccountRepository,
    private readonly users: UserRepository,
  ) {}

  buildAuthorizeUrl(state: string): string {
    if (!this.config.SPOTIFY_CLIENT_ID) {
      throw new AppError(
        'Spotify OAuth is not configured on this environment.',
        503,
        'SPOTIFY_NOT_CONFIGURED',
      );
    }

    const params = new URLSearchParams({
      client_id: this.config.SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: this.config.SPOTIFY_REDIRECT_URI,
      state,
      scope: SPOTIFY_SCOPES.join(' '),
      show_dialog: 'false',
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeAndStore(code: string, wardfyUserId: string): Promise<SpotifyProfile> {
    this.assertConfigured();
    const token = await this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.SPOTIFY_REDIRECT_URI,
    });
    const profile = await this.fetchProfile(token.access_token);
    await this.users.linkSpotify(
      wardfyUserId,
      profile.id,
      profile.display_name,
      profile.images?.[0]?.url,
    );

    const existing = await this.accounts.findByUserId(wardfyUserId);
    const refreshToken =
      token.refresh_token ??
      (existing ? this.cipher.decrypt(existing.refreshTokenCiphertext) : undefined);
    if (!refreshToken) {
      throw new AppError(
        'Spotify did not return a refresh token. Reconnect your account.',
        502,
        'MISSING_REFRESH_TOKEN',
      );
    }

    await this.accounts.upsert({
      userId: wardfyUserId,
      spotifyUserId: profile.id,
      accessTokenCiphertext: this.cipher.encrypt(token.access_token),
      refreshTokenCiphertext: this.cipher.encrypt(refreshToken),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scopes: (token.scope ?? SPOTIFY_SCOPES.join(' ')).split(' ').filter(Boolean),
      profile: profile as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    });
    return profile;
  }

  async accessTokenForUser(userId: string): Promise<string> {
    const account = await this.accounts.findByUserId(userId);
    if (!account)
      throw new AppError('No Spotify account is connected.', 404, 'SPOTIFY_NOT_CONNECTED');
    // Keep a one-minute safety margin so an in-flight Spotify request never starts with an expired token.
    if (account.expiresAt.getTime() > Date.now() + 60_000) {
      return this.cipher.decrypt(account.accessTokenCiphertext);
    }
    return this.refreshForUser(userId);
  }

  async refreshForUser(userId: string): Promise<string> {
    this.assertConfigured();
    const account = await this.accounts.findByUserId(userId);
    if (!account)
      throw new AppError('No Spotify account is connected.', 404, 'SPOTIFY_NOT_CONNECTED');

    const token = await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: this.cipher.decrypt(account.refreshTokenCiphertext),
    });
    await this.accounts.upsert({
      ...account,
      accessTokenCiphertext: this.cipher.encrypt(token.access_token),
      refreshTokenCiphertext: this.cipher.encrypt(
        token.refresh_token ?? this.cipher.decrypt(account.refreshTokenCiphertext),
      ),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scopes: (token.scope ?? account.scopes.join(' ')).split(' ').filter(Boolean),
      updatedAt: new Date(),
    });
    return token.access_token;
  }

  private async requestToken(payload: Record<string, string>): Promise<SpotifyTokenResponse> {
    const credentials = Buffer.from(
      `${this.config.SPOTIFY_CLIENT_ID}:${this.config.SPOTIFY_CLIENT_SECRET}`,
    ).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new AppError(
        `Spotify token exchange failed (${response.status}). ${detail}`,
        502,
        'SPOTIFY_TOKEN_EXCHANGE_FAILED',
      );
    }
    return (await response.json()) as SpotifyTokenResponse;
  }

  private async fetchProfile(accessToken: string): Promise<SpotifyProfile> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new AppError('Spotify profile lookup failed.', 502, 'SPOTIFY_PROFILE_LOOKUP_FAILED');
    }
    return (await response.json()) as SpotifyProfile;
  }

  private assertConfigured(): asserts this is this {
    if (!this.config.SPOTIFY_CLIENT_ID || !this.config.SPOTIFY_CLIENT_SECRET) {
      throw new AppError(
        'Spotify OAuth is not configured on this environment.',
        503,
        'SPOTIFY_NOT_CONFIGURED',
      );
    }
  }
}

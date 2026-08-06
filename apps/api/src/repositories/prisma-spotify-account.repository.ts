import type { PrismaClient } from '@prisma/client';

import type {
  SpotifyAccountRepository,
  StoredSpotifyAccount,
} from './spotify-account.repository.js';

/** PostgreSQL implementation for encrypted Spotify account storage. */
export class PrismaSpotifyAccountRepository implements SpotifyAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(account: StoredSpotifyAccount): Promise<void> {
    await this.prisma.spotifyAccount.upsert({
      where: { userId: account.userId },
      create: {
        userId: account.userId,
        spotifyUserId: account.spotifyUserId,
        accessTokenCiphertext: account.accessTokenCiphertext,
        refreshTokenCiphertext: account.refreshTokenCiphertext,
        expiresAt: account.expiresAt,
        scopes: account.scopes,
        profile: account.profile,
      },
      update: {
        spotifyUserId: account.spotifyUserId,
        accessTokenCiphertext: account.accessTokenCiphertext,
        refreshTokenCiphertext: account.refreshTokenCiphertext,
        expiresAt: account.expiresAt,
        scopes: account.scopes,
        profile: account.profile,
      },
    });
  }

  async findByUserId(userId: string): Promise<StoredSpotifyAccount | null> {
    const account = await this.prisma.spotifyAccount.findUnique({ where: { userId } });
    if (!account) return null;
    return {
      userId: account.userId,
      spotifyUserId: account.spotifyUserId,
      accessTokenCiphertext: account.accessTokenCiphertext,
      refreshTokenCiphertext: account.refreshTokenCiphertext,
      expiresAt: account.expiresAt,
      scopes: account.scopes,
      profile: (account.profile ?? {}) as Record<string, unknown>,
      updatedAt: account.updatedAt,
    };
  }
}

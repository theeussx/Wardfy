export interface StoredSpotifyAccount {
  userId: string;
  spotifyUserId: string;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  expiresAt: Date;
  scopes: string[];
  profile: Record<string, unknown>;
  updatedAt: Date;
}

export interface SpotifyAccountRepository {
  upsert(account: StoredSpotifyAccount): Promise<void>;
  findByUserId(userId: string): Promise<StoredSpotifyAccount | null>;
}

/**
 * Keeps the OAuth flow executable before PostgreSQL is provisioned. It is not
 * selected in production; production adapters should be backed by Prisma.
 */
export class MemorySpotifyAccountRepository implements SpotifyAccountRepository {
  private readonly records = new Map<string, StoredSpotifyAccount>();

  async upsert(account: StoredSpotifyAccount): Promise<void> {
    this.records.set(account.userId, account);
  }

  async findByUserId(userId: string): Promise<StoredSpotifyAccount | null> {
    return this.records.get(userId) ?? null;
  }
}

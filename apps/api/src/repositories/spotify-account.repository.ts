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

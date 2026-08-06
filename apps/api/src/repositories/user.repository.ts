export interface WardfyUser {
  id: string;
  displayName: string;
  discordId?: string;
  spotifyId?: string;
  avatarUrl?: string;
  locale?: string;
}

export interface UserRepository {
  upsertDiscord(input: Omit<WardfyUser, 'id' | 'spotifyId'>): Promise<WardfyUser>;
  linkSpotify(
    userId: string,
    spotifyId: string,
    displayName?: string,
    avatarUrl?: string,
  ): Promise<void>;
}

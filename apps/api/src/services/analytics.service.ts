export interface FeatureVector {
  artists: Map<string, number>;
  tracks: Map<string, number>;
  genres: Map<string, number>;
  playlists: Set<string>;
}

export interface CompatibilityScore {
  score: number;
  artistScore: number;
  trackScore: number;
  genreScore: number;
  playlistScore: number;
}

/** Weighted Jaccard-based musical affinity score, stable for sparse histories. */
export function calculateCompatibility(
  left: FeatureVector,
  right: FeatureVector,
): CompatibilityScore {
  const artistScore = weightedJaccard(left.artists, right.artists);
  const trackScore = weightedJaccard(left.tracks, right.tracks);
  const genreScore = weightedJaccard(left.genres, right.genres);
  const playlistScore = setJaccard(left.playlists, right.playlists);
  const score = Math.round(
    artistScore * 0.4 + trackScore * 0.25 + genreScore * 0.25 + playlistScore * 0.1,
  );
  return { score, artistScore, trackScore, genreScore, playlistScore };
}

export function musicalTitle(
  topGenres: string[],
  diversity: number,
  lateNightRatio: number,
): string {
  const normalised = topGenres.map((genre) => genre.toLocaleLowerCase('pt-BR'));
  if (lateNightRatio > 0.45) return 'DJ da Madrugada';
  if (diversity > 0.82) return 'Explorador Musical';
  if (normalised.some((genre) => genre.includes('metal'))) return 'Mestre do Metal';
  if (normalised.some((genre) => genre.includes('rock'))) return 'Rei do Rock';
  if (normalised.some((genre) => genre.includes('indie'))) return 'Indie Supremo';
  if (normalised.some((genre) => genre.includes('pop'))) return 'Caçador de Hits';
  return 'Curador de Frequências';
}

function weightedJaccard(left: Map<string, number>, right: Map<string, number>): number {
  const keys = new Set([...left.keys(), ...right.keys()]);
  if (keys.size === 0) return 0;
  let intersection = 0;
  let union = 0;
  for (const key of keys) {
    const a = left.get(key) ?? 0;
    const b = right.get(key) ?? 0;
    intersection += Math.min(a, b);
    union += Math.max(a, b);
  }
  return union === 0 ? 0 : (intersection / union) * 100;
}

function setJaccard(left: Set<string>, right: Set<string>): number {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  let overlap = 0;
  for (const value of left) if (right.has(value)) overlap += 1;
  return (overlap / union.size) * 100;
}

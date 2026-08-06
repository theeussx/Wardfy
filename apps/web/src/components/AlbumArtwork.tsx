import type { CSSProperties } from 'react';

interface AlbumArtworkProps {
  variant?: 'deftones' | 'mbv' | 'cigarettes' | 'slowdive' | 'muse' | 'frank';
  size?: 'tiny' | 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
}

/** Decorative local cover art for demo mode. Production cards use Spotify image URLs. */
export function AlbumArtwork({
  variant = 'deftones',
  size = 'medium',
  className = '',
  label = 'Capa do álbum',
}: AlbumArtworkProps) {
  return (
    <div
      aria-label={label}
      className={`album-art album-art--${variant} album-art--${size} ${className}`}
      role="img"
    >
      <span className="album-art__grain" />
      {variant === 'deftones' && (
        <span className="album-art__wordmark">
          AROUND
          <br />
          THE FUR
        </span>
      )}
      {variant === 'mbv' && (
        <span className="album-art__wordmark album-art__wordmark--blur">loveless</span>
      )}
      {variant === 'cigarettes' && (
        <span className="album-art__wordmark">
          CIGARETTES
          <br />
          AFTER SEX
        </span>
      )}
      {variant === 'slowdive' && <span className="album-art__wordmark">SLOWDIVE</span>}
      {variant === 'muse' && <span className="album-art__wordmark">MUSE</span>}
      {variant === 'frank' && <span className="album-art__wordmark">blonde</span>}
    </div>
  );
}

export function ColorAvatar({
  initials,
  color,
  size = 'medium',
  online,
  style,
}: {
  initials: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
  online?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`color-avatar color-avatar--${size}`}
      style={{ '--avatar-color': color, ...style } as CSSProperties}
    >
      {initials}
      {online !== undefined && (
        <i className={`presence-dot ${online ? 'presence-dot--online' : ''}`} />
      )}
    </span>
  );
}

import type { CSSProperties } from 'react';

interface AlbumArtworkProps {
  variant?: 'deftones' | 'mbv' | 'cigarettes' | 'slowdive' | 'muse' | 'frank';
  size?: 'tiny' | 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
  src?: string;
}

/** Renders Spotify album imagery when available, with a neutral Wardfy fallback. */
export function AlbumArtwork({
  variant = 'deftones',
  size = 'medium',
  className = '',
  label = 'Capa do álbum',
  src,
}: AlbumArtworkProps) {
  return (
    <div
      aria-label={label}
      className={`album-art album-art--${variant} album-art--${size} ${className}`}
      role="img"
    >
      {src ? (
        <img className="album-art__image" src={src} alt="" loading="lazy" />
      ) : (
        <span className="album-art__fallback">♫</span>
      )}
      {!src && <span className="album-art__grain" />}
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

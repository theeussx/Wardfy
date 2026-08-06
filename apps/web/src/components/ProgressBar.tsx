interface ProgressBarProps {
  value: number;
  className?: string;
  showGlow?: boolean;
}

export function ProgressBar({ value, className = '', showGlow = false }: ProgressBarProps) {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress-track ${className}`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progress}
      role="progressbar"
    >
      <span
        className={`progress-fill ${showGlow ? 'progress-fill--glow' : ''}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function formatClock(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

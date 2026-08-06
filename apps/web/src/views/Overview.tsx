import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Disc3,
  Flame,
  Headphones,
  Music2,
  Pause,
  Play,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { AlbumArtwork, ColorAvatar } from '../components/AlbumArtwork';
import { ListeningChart } from '../components/Charts';
import { Heatmap } from '../components/Heatmap';
import { ProgressBar, formatClock } from '../components/ProgressBar';
import type { DashboardData, LeaderboardEntry, ViewKey } from '../types';

interface OverviewProps {
  data: DashboardData;
  rankings: LeaderboardEntry[];
  progressMs: number;
  paused: boolean;
  onTogglePlayback: () => void;
  onChangeView: (view: ViewKey) => void;
  onToast: (text: string) => void;
}

const iconMap = { clock: Clock3, sparkles: Sparkles, music: Music2, flame: Flame };

export function Overview({
  data,
  rankings,
  progressMs,
  paused,
  onTogglePlayback,
  onChangeView,
  onToast,
}: OverviewProps) {
  const track = data.nowPlaying.track;
  const progress = track ? (progressMs / track.durationMs) * 100 : 0;
  const remainingXp = Math.max(0, data.viewer.nextLevelXp - data.viewer.xp);

  return (
    <div className="overview page-stack">
      <section className="hero-grid">
        <motion.article
          className="now-playing-card surface-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
        >
          <div className="now-playing-card__aurora" />
          <div className="now-playing-card__topline">
            <div className="live-label">
              <span className="live-label__waves">
                <i />
                <i />
                <i />
              </span>{' '}
              {data.nowPlaying.isPlaying ? 'TOCANDO AGORA' : 'SEM REPRODUÇÃO ATIVA'}
            </div>
            <button
              className="more-button"
              aria-label="Mais opções"
              onClick={() => onToast('A reprodução é controlada diretamente pelo Spotify.')}
            >
              •••
            </button>
          </div>
          <div className="now-playing-card__body">
            <AlbumArtwork
              src={track?.albumArtUrl}
              className="now-playing-card__cover"
              size="large"
              label={track?.album ?? 'Sem capa'}
            />
            <div className="now-playing-card__info">
              <p className="eyebrow">SUA SESSÃO</p>
              <h2>{track?.title ?? 'Abra o Spotify para começar'}</h2>
              <p className="track-artist">
                {track?.artists.join(', ') ?? 'Wardfy detectará a próxima faixa automaticamente'}
              </p>
              <p className="track-album">
                {track?.album ?? 'A reprodução aparece aqui em até alguns segundos.'}
              </p>
              <div className="player-progress">
                <ProgressBar showGlow value={progress} />
                <div>
                  <span>{formatClock(progressMs)}</span>
                  <span>{track ? formatClock(track.durationMs) : '0:00'}</span>
                </div>
              </div>
              <div className="player-controls">
                <button
                  className="skip-button"
                  aria-label="Controlar no Spotify"
                  onClick={() =>
                    track && window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  ◁
                </button>
                <button
                  className="play-button"
                  aria-label={paused ? 'Retomar contador visual' : 'Pausar contador visual'}
                  onClick={onTogglePlayback}
                >
                  {paused ? (
                    <Play fill="currentColor" size={18} />
                  ) : (
                    <Pause fill="currentColor" size={18} />
                  )}
                </button>
                <button
                  className="skip-button"
                  aria-label="Abrir no Spotify"
                  onClick={() =>
                    track && window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  ▷
                </button>
                <span className="device-pill">
                  <Headphones size={13} /> {data.nowPlaying.deviceName ?? 'Aguardando dispositivo'}
                </span>
              </div>
            </div>
          </div>
          <div className="now-playing-card__footer">
            <span>
              <i className={`status-dot ${data.nowPlaying.isPlaying ? '' : 'status-dot--idle'}`} />{' '}
              {data.nowPlaying.isPlaying ? 'sincronizado com Spotify' : 'aguardando atividade'}
            </span>
            {track && (
              <button
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(track.spotifyUrl)
                    .then(() => onToast('Link do Spotify copiado.'))
                }
              >
                Compartilhar <ArrowRight size={14} />
              </button>
            )}
          </div>
        </motion.article>

        <article className="weekly-card surface-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SEU RITMO</p>
              <h3>Esta semana em ondas</h3>
            </div>
            <span className="stat-chip stat-chip--blue">DADOS REAIS</span>
          </div>
          <div className="weekly-card__stat">
            <strong>{data.stats[0]?.value ?? '0'}</strong>
            <span>minutos em escuta</span>
          </div>
          <ListeningChart data={data.weeklyMinutes} />
          <div className="weekly-card__caption">
            <span>
              {data.weeklyMinutes.some((item) => item.minutes > 0)
                ? 'Seu histórico é atualizado a cada reprodução.'
                : 'Sua primeira sessão aparecerá neste gráfico.'}
            </span>
            <button onClick={() => onChangeView('historico')}>
              Detalhes <ChevronRight size={14} />
            </button>
          </div>
        </article>
      </section>

      <section className="metric-grid">
        {data.stats.map((stat, index) => {
          const Icon = iconMap[stat.icon];
          return (
            <motion.article
              className="metric-card surface-card"
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
            >
              <div className="metric-card__icon">
                <Icon size={18} />
              </div>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span className={stat.positive ? 'metric-card__positive' : ''}>
                {stat.positive && '↗ '}
                {stat.change}
              </span>
            </motion.article>
          );
        })}
      </section>

      <section className="dashboard-grid dashboard-grid--primary">
        <article className="surface-card ranking-preview">
          <div className="card-heading">
            <div>
              <p className="eyebrow">NO SERVIDOR</p>
              <h3>Ranking da semana</h3>
            </div>
            <button className="text-action" onClick={() => onChangeView('ranking')}>
              Ver tudo <ArrowRight size={14} />
            </button>
          </div>
          <div className="ranking-preview__tabs">
            <button className="is-selected">Minutos</button>
            <button onClick={() => onChangeView('ranking')}>Artistas</button>
            <button onClick={() => onChangeView('ranking')}>Descobertas</button>
          </div>
          {rankings.length === 0 ? (
            <EmptyCard text="Conecte membros e escute música para formar o ranking." />
          ) : (
            <ol className="ranking-list">
              {rankings.slice(0, 5).map((entry) => (
                <li
                  className={entry.isCurrentUser ? 'ranking-list__current' : ''}
                  key={entry.userId}
                >
                  <span className="ranking-list__position">
                    {entry.rank < 4 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </span>
                  <ColorAvatar
                    color={
                      ['#2563eb', '#0ea5e9', '#38bdf8', '#1d4ed8', '#0284c7'][entry.rank - 1] ??
                      '#2563eb'
                    }
                    initials={entry.displayName.slice(0, 2).toUpperCase()}
                    size="small"
                  />
                  <span className="ranking-list__name">
                    {entry.displayName}
                    {entry.isCurrentUser && <small>você</small>}
                  </span>
                  <span className="ranking-list__bar">
                    <i style={{ width: `${(entry.value / (rankings[0]?.value || 1)) * 100}%` }} />
                  </span>
                  <strong>{entry.value.toLocaleString('pt-BR')}</strong>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="surface-card friends-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">EM SINTONIA</p>
              <h3>Amigos ouvindo agora</h3>
            </div>
            <span className="online-count">
              <i /> {data.friends.length} ao vivo
            </span>
          </div>
          {data.friends.length === 0 ? (
            <EmptyCard text="Quando alguém do servidor ouvir Spotify, a presença aparece aqui." />
          ) : (
            <div className="friend-list">
              {data.friends.map((friend) => (
                <button
                  className={`friend-row friend-row--${friend.status}`}
                  key={friend.id}
                  onClick={() => onChangeView('atividade')}
                >
                  <ColorAvatar
                    color={friend.color}
                    initials={friend.initials}
                    online={friend.status === 'playing'}
                    size="medium"
                  />
                  <span className="friend-row__details">
                    <b>{friend.name}</b>
                    <small>
                      {friend.track} · {friend.artist}
                    </small>
                  </span>
                  <span className="friend-row__playing">
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
              ))}
            </div>
          )}
          <button className="outline-action" onClick={() => onChangeView('atividade')}>
            <UsersRound size={15} /> Abrir atividade ao vivo
          </button>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--secondary">
        <article className="surface-card top-tracks-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SUAS MAIS OUVIDAS</p>
              <h3>Faixas deste período</h3>
            </div>
            <Disc3 size={19} className="muted-icon" />
          </div>
          {data.topTracks.length === 0 ? (
            <EmptyCard text="Suas faixas mais ouvidas aparecem depois da primeira sincronização." />
          ) : (
            <div className="top-track-list">
              {data.topTracks.map((item) => (
                <button
                  className="top-track"
                  key={item.id}
                  onClick={() => window.open(item.spotifyUrl, '_blank', 'noopener,noreferrer')}
                >
                  <span className="top-track__rank">{String(item.rank).padStart(2, '0')}</span>
                  <AlbumArtwork src={item.albumArtUrl} size="small" />
                  <span className="top-track__meta">
                    <b>{item.title}</b>
                    <small>{item.artists.join(', ')}</small>
                  </span>
                  <span className="top-track__plays">
                    {item.plays} <small>plays</small>
                  </span>
                  <Play size={15} fill="currentColor" />
                </button>
              ))}
            </div>
          )}
        </article>
        <article className="surface-card heatmap-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">MAPA DE ATIVIDADE</p>
              <h3>Quando a música acontece</h3>
            </div>
            <span className="quiet-label">SEU HISTÓRICO</span>
          </div>
          <Heatmap compact data={data.heatmap} />
          <p className="card-footnote">
            <Sparkles size={14} /> O mapa é calculado pelas suas escutas registradas.
          </p>
        </article>
      </section>

      <section className="level-banner">
        <div className="level-banner__orb">{data.viewer.level}</div>
        <div className="level-banner__copy">
          <p>EVOLUÇÃO REAL</p>
          <h3>
            {remainingXp > 0
              ? `${remainingXp} XP para o nível ${data.viewer.level + 1}`
              : 'Novo nível desbloqueado'}
          </h3>
          <ProgressBar value={(data.viewer.xp / data.viewer.nextLevelXp) * 100} />
          <span>XP é concedido a partir do tempo realmente registrado pelo Spotify.</span>
        </div>
        <button onClick={() => onChangeView('desafios')}>
          Ver missões <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="empty-card">
      <Music2 size={18} />
      <span>{text}</span>
    </div>
  );
}

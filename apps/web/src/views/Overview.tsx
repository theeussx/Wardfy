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
  Trophy,
  UsersRound,
} from 'lucide-react';

import { AlbumArtwork, ColorAvatar } from '../components/AlbumArtwork';
import { ListeningChart } from '../components/Charts';
import { Heatmap } from '../components/Heatmap';
import { ProgressBar, formatClock } from '../components/ProgressBar';
import { demoLeaderboard, topTracks } from '../data/demo';
import type { DashboardData, ViewKey } from '../types';

interface OverviewProps {
  data: DashboardData;
  progressMs: number;
  paused: boolean;
  onTogglePlayback: () => void;
  onChangeView: (view: ViewKey) => void;
  onToast: (text: string) => void;
}

const iconMap = {
  clock: Clock3,
  sparkles: Sparkles,
  music: Music2,
  flame: Flame,
};

export function Overview({
  data,
  progressMs,
  paused,
  onTogglePlayback,
  onChangeView,
  onToast,
}: OverviewProps) {
  const track = data.nowPlaying.track;
  const progress = track ? (progressMs / track.durationMs) * 100 : 0;
  const rankings = demoLeaderboard();

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
              TOCANDO AGORA
            </div>
            <button
              className="more-button"
              aria-label="Mais opções"
              onClick={() => onToast('Opções de reprodução disponíveis no Spotify.')}
            >
              •••
            </button>
          </div>
          <div className="now-playing-card__body">
            <AlbumArtwork className="now-playing-card__cover" size="large" />
            <div className="now-playing-card__info">
              <p className="eyebrow">SUA SESSÃO</p>
              <h2>{track?.title ?? 'Nenhuma faixa tocando'}</h2>
              <p className="track-artist">{track?.artists.join(', ')}</p>
              <p className="track-album">{track?.album}</p>
              <div className="player-progress">
                <ProgressBar showGlow value={progress} />
                <div>
                  <span>{formatClock(progressMs)}</span>
                  <span>{track ? formatClock(track.durationMs) : '0:00'}</span>
                </div>
              </div>
              <div className="player-controls">
                <button className="skip-button" aria-label="Faixa anterior">
                  ◁
                </button>
                <button
                  className="play-button"
                  aria-label={paused ? 'Tocar' : 'Pausar'}
                  onClick={onTogglePlayback}
                >
                  {paused ? (
                    <Play fill="currentColor" size={18} />
                  ) : (
                    <Pause fill="currentColor" size={18} />
                  )}
                </button>
                <button className="skip-button" aria-label="Próxima faixa">
                  ▷
                </button>
                <span className="device-pill">
                  <Headphones size={13} /> {data.nowPlaying.deviceName}
                </span>
              </div>
            </div>
          </div>
          <div className="now-playing-card__footer">
            <span>
              <i className="status-dot" /> sincronizado agora
            </span>
            <button onClick={() => onToast('Link copiado para a área de transferência.')}>
              Compartilhar <ArrowRight size={14} />
            </button>
          </div>
        </motion.article>

        <article className="weekly-card surface-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SEU RITMO</p>
              <h3>Esta semana em ondas</h3>
            </div>
            <span className="stat-chip stat-chip--purple">+18,4%</span>
          </div>
          <div className="weekly-card__stat">
            <strong>1.284</strong>
            <span>minutos em escuta</span>
          </div>
          <ListeningChart data={data.weeklyMinutes} />
          <div className="weekly-card__caption">
            <span>
              Seu pico foi <b>sábado, 21h</b>
            </span>
            <button onClick={() => onChangeView('historico')}>
              Detalhes <ChevronRight size={14} />
            </button>
          </div>
        </article>
      </section>

      <section className="metric-grid">
        {data.stats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap];
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
          <ol className="ranking-list">
            {rankings.slice(0, 5).map((entry) => {
              const colors = ['#FF7A59', '#8B5CF6', '#5B8CFF', '#AF65E9', '#18B6A4'];
              return (
                <li
                  className={entry.isCurrentUser ? 'ranking-list__current' : ''}
                  key={entry.userId}
                >
                  <span className="ranking-list__position">
                    {entry.rank < 4 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </span>
                  <ColorAvatar
                    color={colors[entry.rank - 1] ?? '#777'}
                    initials={entry.displayName.slice(0, 2).toUpperCase()}
                    size="small"
                  />
                  <span className="ranking-list__name">
                    {entry.displayName}
                    {entry.isCurrentUser && <small>você</small>}
                  </span>
                  <span className="ranking-list__bar">
                    <i style={{ width: `${(entry.value / rankings[0].value) * 100}%` }} />
                  </span>
                  <strong>{entry.value.toLocaleString('pt-BR')}</strong>
                </li>
              );
            })}
          </ol>
        </article>

        <article className="surface-card friends-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">EM SINTONIA</p>
              <h3>Amigos ouvindo agora</h3>
            </div>
            <span className="online-count">
              <i /> 2 ao vivo
            </span>
          </div>
          <div className="friend-list">
            {data.friends.map((friend) => (
              <button
                className={`friend-row friend-row--${friend.status}`}
                key={friend.id}
                onClick={() =>
                  friend.status === 'playing'
                    ? onChangeView('atividade')
                    : onToast(`${friend.name} ainda não está ouvindo.`)
                }
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
                    {friend.status === 'playing'
                      ? `${friend.track} · ${friend.artist}`
                      : (friend.track ?? 'Offline')}
                  </small>
                </span>
                {friend.status === 'playing' ? (
                  <span className="friend-row__playing">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <span className="friend-row__time">{friend.status === 'idle' ? '18m' : ''}</span>
                )}
              </button>
            ))}
          </div>
          <button className="outline-action" onClick={() => onChangeView('atividade')}>
            <UsersRound size={15} /> Abrir atividade ao vivo
          </button>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--secondary">
        <article className="surface-card top-tracks-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SEU TOP 4</p>
              <h3>Faixas que te encontraram</h3>
            </div>
            <Disc3 size={19} className="muted-icon" />
          </div>
          <div className="top-track-list">
            {topTracks.map((item) => (
              <button
                className="top-track"
                key={item.rank}
                onClick={() => onToast(`Abrindo ${item.title} no Spotify…`)}
              >
                <span className="top-track__rank">0{item.rank}</span>
                <AlbumArtwork
                  variant={item.art as 'deftones' | 'mbv' | 'cigarettes' | 'slowdive'}
                  size="small"
                />
                <span className="top-track__meta">
                  <b>{item.title}</b>
                  <small>{item.artist}</small>
                </span>
                <span className="top-track__plays">
                  {item.plays} <small>plays</small>
                </span>
                <Play size={15} fill="currentColor" />
              </button>
            ))}
          </div>
        </article>

        <article className="surface-card heatmap-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">MAPA DE ATIVIDADE</p>
              <h3>Quando a música acontece</h3>
            </div>
            <span className="quiet-label">UTC−3</span>
          </div>
          <Heatmap compact data={data.heatmap} />
          <p className="card-footnote">
            <Sparkles size={14} /> Você tende a descobrir mais música nas noites de sexta.
          </p>
        </article>
      </section>

      <section className="level-banner">
        <div className="level-banner__orb">18</div>
        <div className="level-banner__copy">
          <p>VOCÊ ESTÁ EVOLUINDO</p>
          <h3>760 XP para o nível 19</h3>
          <ProgressBar value={81} />
          <span>
            Continue explorando para desbloquear a moldura <b>Violeta Cósmico</b>.
          </span>
        </div>
        <button onClick={() => onChangeView('desafios')}>
          Ver missões <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

import {
  Activity as ActivityIcon,
  Hash,
  MonitorUp,
  Music2,
  RadioTower,
  Send,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { AlbumArtwork, ColorAvatar } from '../components/AlbumArtwork';
import { ProgressBar, formatClock } from '../components/ProgressBar';
import type { DashboardData } from '../types';

export function ActivityView({
  data,
  progressMs,
  onToast,
}: {
  data: DashboardData;
  progressMs: number;
  onToast: (text: string) => void;
}) {
  const track = data.nowPlaying.track;
  const listeners = [
    ...(data.nowPlaying.isPlaying && track
      ? [
          {
            id: data.viewer.id,
            discordId: data.viewer.discordId,
            name: data.viewer.name,
            initials: initials(data.viewer.name),
            color: '#2563eb',
            track: track.title,
            artist: track.artists.join(', '),
            album: track.album,
            albumArtUrl: track.albumArtUrl,
            progressMs,
            durationMs: track.durationMs,
            device: data.nowPlaying.deviceName,
            spotifyUrl: track.spotifyUrl,
            current: true,
          },
        ]
      : []),
    ...data.friends
      .filter((friend) => friend.status === 'playing')
      .map((friend) => ({
        id: friend.id,
        discordId: friend.discordId,
        name: friend.name,
        initials: friend.initials,
        color: friend.color,
        track: friend.track ?? 'Faixa sem título',
        artist: friend.artist ?? 'Artista desconhecido',
        album: 'Reprodução ao vivo',
        albumArtUrl: friend.albumArtUrl,
        progressMs: 0,
        durationMs: 1,
        device: 'Spotify',
        spotifyUrl: 'https://open.spotify.com/',
        current: false,
      })),
  ];

  return (
    <div className="page-stack activity-view">
      <section className="live-hero surface-card">
        <div className="live-hero__glow" />
        <div className="live-hero__copy">
          <div className="live-label">
            <span className="live-label__waves">
              <i />
              <i />
              <i />
            </span>{' '}
            PRESENÇA AO VIVO
          </div>
          <h2>
            {listeners.length > 0
              ? `${listeners.length} ${listeners.length === 1 ? 'pessoa está' : 'pessoas estão'} deixando rastros de som.`
              : 'O próximo som vai acender o servidor.'}
          </h2>
          <p>
            Wardfy lê a atividade conectada ao Spotify, atualiza o painel em tempo real e mantém o
            canal do Discord livre de spam.
          </p>
          <div>
            <button
              className="primary-action"
              onClick={() => onToast('Configure o canal com /configurar no Discord.')}
            >
              <RadioTower size={16} /> Configurar canal de atividade
            </button>
          </div>
        </div>
        <div className="live-hero__orbital" aria-hidden="true">
          <span className="orbital-ring orbital-ring--1" />
          <span className="orbital-ring orbital-ring--2" />
          <span className="orbital-core">
            <Music2 size={30} />
          </span>
          {listeners.slice(0, 3).map((item, index) => (
            <ColorAvatar
              key={item.id}
              color={item.color}
              initials={item.initials}
              size={index === 0 ? 'medium' : 'small'}
              style={{
                position: 'absolute',
                top: `${14 + index * 28}%`,
                left: `${18 + index * 26}%`,
              }}
            />
          ))}
        </div>
      </section>

      <section className="activity-grid">
        <article className="surface-card live-list-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">AO VIVO AGORA</p>
              <h3>Quem está na mesma frequência</h3>
            </div>
            <span className="online-count">
              <i /> {listeners.length} ativos
            </span>
          </div>
          {listeners.length === 0 ? (
            <EmptyActivity />
          ) : (
            <div className="live-list">
              {listeners.map((listener) => (
                <LiveListener key={listener.id} {...listener} />
              ))}
            </div>
          )}
        </article>
        <aside className="activity-side-stack">
          <article className="surface-card activity-channel-card">
            <div className="channel-heading">
              <span>
                <Hash size={17} /> atividade-musical
              </span>
              <button onClick={() => onToast('Use /configurar para escolher o canal.')}>•••</button>
            </div>
            <div className="discord-preview">
              <div className="discord-preview__bot">
                <span className="discord-bot-mark">W</span>
                <strong>
                  Wardfy <b>BOT</b>
                </strong>
                <small>em tempo real</small>
              </div>
              <div className="discord-preview__message">
                <b>🎵 Mensagens atualizáveis</b>
                <span>Uma única mensagem por pessoa ouvindo.</span>
                <small>O bot edita o card ao trocar de faixa ou encerrar a sessão.</small>
              </div>
            </div>
            <p>
              <ActivityIcon size={14} /> A atividade é persistida para não duplicar mensagens após
              reinícios.
            </p>
          </article>
          <article className="surface-card activity-insight-card">
            <span className="insight-icon">
              <UsersRound size={20} />
            </span>
            <div>
              <p className="eyebrow">SINTONIA DA COMUNIDADE</p>
              <h3>
                {data.friends.length > 0
                  ? `${data.friends.length} membros com presença ativa.`
                  : 'Convide membros para conectar Spotify e entrar na atividade.'}
              </h3>
              <button
                onClick={() =>
                  onToast('A compatibilidade é calculada no DNA musical dos membros conectados.')
                }
              >
                Como funciona
              </button>
            </div>
          </article>
        </aside>
      </section>

      <section className="activity-timeline surface-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">STATUS DA SINCRONIZAÇÃO</p>
            <h3>Atividade processada pela API Wardfy</h3>
          </div>
        </div>
        <div className="timeline-events">
          <TimelineEvent
            icon={<Send size={15} />}
            color="blue"
            time="agora"
            title="Spotify → Wardfy"
            detail="A reprodução conectada é registrada e agregada."
          />
          <TimelineEvent
            icon={<ActivityIcon size={15} />}
            color="cyan"
            time="contínuo"
            title="Wardfy → Discord"
            detail="O card do canal é atualizado sem spam."
          />
          <TimelineEvent
            icon={<MonitorUp size={15} />}
            color="navy"
            time="a cada ciclo"
            title="Presença → painel"
            detail="O dashboard recebe eventos por streaming SSE."
          />
        </div>
      </section>
    </div>
  );
}

function LiveListener({
  color,
  initials: valueInitials,
  name,
  track,
  artist,
  album,
  albumArtUrl,
  progressMs,
  durationMs,
  device,
  spotifyUrl,
  current,
}: {
  color: string;
  initials: string;
  name: string;
  track: string;
  artist: string;
  album: string;
  albumArtUrl?: string;
  progressMs: number;
  durationMs: number;
  device?: string;
  spotifyUrl: string;
  current: boolean;
}) {
  const progress = durationMs > 1 ? (progressMs / durationMs) * 100 : 0;
  return (
    <div className={`live-listener ${current ? 'live-listener--current' : ''}`}>
      <div className="live-listener__person">
        <ColorAvatar color={color} initials={valueInitials} size="medium" online />
        <span>
          <b>{name}</b>
          <small>
            <MonitorUp size={12} /> {device ?? 'Spotify conectado'}
          </small>
        </span>
      </div>
      <AlbumArtwork src={albumArtUrl} size="small" />
      <div className="live-listener__track">
        <b>{track}</b>
        <small>
          {artist} · {album}
        </small>
        <ProgressBar value={progress} />
      </div>
      <button
        className="live-listener__time"
        onClick={() => window.open(spotifyUrl, '_blank', 'noopener,noreferrer')}
      >
        {durationMs > 1 ? `${formatClock(progressMs)} / ${formatClock(durationMs)}` : 'Spotify'}
      </button>
    </div>
  );
}

function TimelineEvent({
  icon,
  color,
  time,
  title,
  detail,
}: {
  icon: ReactNode;
  color: string;
  time: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="timeline-event">
      <span className={`timeline-event__icon timeline-event__icon--${color}`}>{icon}</span>
      <time>{time}</time>
      <div>
        <b>{title}</b>
        <span>{detail}</span>
      </div>
    </div>
  );
}
function EmptyActivity() {
  return (
    <div className="empty-card">
      <Music2 size={18} />
      <span>Nenhuma reprodução ativa no momento.</span>
    </div>
  );
}
function initials(value: string): string {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

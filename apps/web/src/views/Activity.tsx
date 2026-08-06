import {
  Activity as ActivityIcon,
  BellRing,
  ChevronRight,
  Clock3,
  Hash,
  MonitorUp,
  Music2,
  RadioTower,
  Send,
  Smartphone,
  UsersRound,
} from 'lucide-react';

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
  const activeFriends = data.friends.filter((friend) => friend.status === 'playing');
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
            3 pessoas estão deixando
            <br />
            <em>rastros de som</em> agora.
          </h2>
          <p>
            Uma camada social discreta para acompanhar o ritmo da comunidade sem inundar o chat.
          </p>
          <div>
            <button
              className="primary-action"
              onClick={() => onToast('Canal #🎧-tocando-agora destacado.')}
            >
              {' '}
              <RadioTower size={16} /> Abrir canal de atividade
            </button>
            <button className="ghost-action" onClick={() => onToast('Link da atividade copiado.')}>
              Compartilhar presença
            </button>
          </div>
        </div>
        <div className="live-hero__orbital" aria-hidden="true">
          <span className="orbital-ring orbital-ring--1" />
          <span className="orbital-ring orbital-ring--2" />
          <span className="orbital-core">
            <Music2 size={30} />
          </span>
          <ColorAvatar
            color="#FF7A59"
            initials="LI"
            size="small"
            style={{ position: 'absolute', top: '11%', left: '15%' }}
          />
          <ColorAvatar
            color="#8B5CF6"
            initials="MT"
            size="medium"
            style={{ position: 'absolute', right: '9%', top: '38%' }}
          />
          <ColorAvatar
            color="#5B8CFF"
            initials="EZ"
            size="small"
            style={{ position: 'absolute', bottom: '12%', left: '23%' }}
          />
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
              <i /> 3 ativos
            </span>
          </div>
          <div className="live-list">
            <LiveListener
              artwork="deftones"
              color="#8B5CF6"
              initials="MT"
              name="Mateus"
              track={track?.title ?? 'Be Quiet and Drive'}
              artist={track?.artists.join(', ') ?? 'Deftones'}
              device="MacBook Pro"
              progress={(progressMs / (track?.durationMs ?? 1)) * 100}
              time={`${formatClock(progressMs)} / ${formatClock(track?.durationMs ?? 0)}`}
              current
            />
            {activeFriends.map((friend, index) => (
              <LiveListener
                artwork={index === 0 ? 'muse' : 'frank'}
                color={friend.color}
                initials={friend.initials}
                key={friend.id}
                name={friend.name}
                track={friend.track ?? 'Faixa desconhecida'}
                artist={friend.artist ?? 'Artista desconhecido'}
                device={index === 0 ? 'iPhone' : 'Web Player'}
                progress={index === 0 ? 47 : 39}
                time={index === 0 ? '1:42 / 3:47' : '2:08 / 5:09'}
              />
            ))}
          </div>
        </article>

        <aside className="activity-side-stack">
          <article className="surface-card activity-channel-card">
            <div className="channel-heading">
              <span>
                <Hash size={17} /> tocando-agora
              </span>
              <button onClick={() => onToast('Configurações do canal abertas.')}>•••</button>
            </div>
            <div className="discord-preview">
              <div className="discord-preview__bot">
                <span className="discord-bot-mark">W</span>
                <strong>
                  Wardfy <b>BOT</b>
                </strong>
                <small>Hoje às 21:42</small>
              </div>
              <div className="discord-preview__message">
                <b>🎵 Mateus está ouvindo</b>
                <span>Deftones — Be Quiet and Drive</span>
                <small>Around the Fur · MacBook Pro</small>
              </div>
              <div className="discord-preview__reacts">
                <span>🔥 4</span>
                <span>🖤 2</span>
                <button>+</button>
              </div>
            </div>
            <p>
              <ActivityIcon size={14} /> Mensagens são atualizadas, nunca duplicadas.
            </p>
          </article>
          <article className="surface-card activity-insight-card">
            <span className="insight-icon">
              <UsersRound size={20} />
            </span>
            <div>
              <p className="eyebrow">ENCONTRO SONORO</p>
              <h3>
                Lia e você têm <b>82%</b> de compatibilidade.
              </h3>
              <button onClick={() => onToast('Comparação com Lia carregada.')}>
                Comparar agora <ChevronRight size={14} />
              </button>
            </div>
          </article>
        </aside>
      </section>

      <section className="activity-timeline surface-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">LINHA DO TEMPO</p>
            <h3>O pulso recente da comunidade</h3>
          </div>
          <button className="text-action" onClick={() => onToast('Filtro de atividade aberto.')}>
            Filtrar <ChevronRight size={14} />
          </button>
        </div>
        <div className="timeline-events">
          <TimelineEvent
            icon={<Send size={15} />}
            color="violet"
            time="agora"
            title="Você compartilhou"
            detail="Be Quiet and Drive no canal de atividade."
          />
          <TimelineEvent
            icon={<BellRing size={15} />}
            color="lime"
            time="há 7 min"
            title="Lia desbloqueou"
            detail="a conquista Caçadora de Hits."
          />
          <TimelineEvent
            icon={<Smartphone size={15} />}
            color="orange"
            time="há 18 min"
            title="Enzo iniciou uma sessão"
            detail="no Spotify Web Player."
          />
          <TimelineEvent
            icon={<Clock3 size={15} />}
            color="blue"
            time="há 32 min"
            title="Maya encerrou a sessão"
            detail="com 48 min de música."
          />
        </div>
      </section>
    </div>
  );
}

function LiveListener({
  artwork,
  color,
  initials,
  name,
  track,
  artist,
  device,
  progress,
  time,
  current = false,
}: {
  artwork: 'deftones' | 'muse' | 'frank';
  color: string;
  initials: string;
  name: string;
  track: string;
  artist: string;
  device: string;
  progress: number;
  time: string;
  current?: boolean;
}) {
  return (
    <div className={`live-listener ${current ? 'live-listener--current' : ''}`}>
      <div className="live-listener__person">
        <ColorAvatar color={color} initials={initials} size="medium" online />
        <span>
          <b>{name}</b>
          <small>
            <MonitorUp size={12} /> {device}
          </small>
        </span>
      </div>
      <AlbumArtwork variant={artwork} size="small" />
      <div className="live-listener__track">
        <b>{track}</b>
        <small>{artist}</small>
        <ProgressBar value={progress} />
      </div>
      <span className="live-listener__time">{time}</span>
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
  icon: React.ReactNode;
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

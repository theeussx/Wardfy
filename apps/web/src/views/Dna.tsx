import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CircleGauge,
  Disc3,
  HeartHandshake,
  Sparkles,
  Waves,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { AlbumArtwork } from '../components/AlbumArtwork';
import { DnaRadar } from '../components/Charts';
import { ProgressBar } from '../components/ProgressBar';
import type { CompatibilityReport, DashboardData } from '../types';

export function DnaView({
  data,
  compatibility,
  onToast,
}: {
  data: DashboardData;
  compatibility: CompatibilityReport | null;
  onToast: (text: string) => void;
}) {
  const primaryGenre = data.genreDna[0];
  return (
    <div className="page-stack dna-view">
      <section className="dna-hero surface-card">
        <div className="dna-hero__copy">
          <p className="eyebrow">SEU DNA MUSICAL · CALCULADO PELAS ESCUTAS</p>
          <h2>
            {data.genreDna.length ? (
              <>
                Seu som é <em>{primaryGenre?.genre}</em>, em constante movimento.
              </>
            ) : (
              <>
                Seu DNA aparece quando
                <br />
                <em>você começar a ouvir.</em>
              </>
            )}
          </h2>
          <p>
            Gêneros, energia e padrões são derivados apenas do histórico que Wardfy registrou na sua
            conta conectada.
          </p>
          <div className="dna-title-badge">
            <Sparkles size={15} />
            <span>
              <b>{data.viewer.title}</b>
              <small>título calculado automaticamente</small>
            </span>
          </div>
        </div>
        <div className="dna-hero__radar">
          {data.genreDna.length > 2 ? (
            <DnaRadar data={data.genreDna} />
          ) : (
            <div className="dna-empty-orb">
              <Waves size={31} />
              <span>
                aguardando
                <br />
                escutas
              </span>
            </div>
          )}
          <span className="dna-hero__center">
            DNA<small>{data.viewer.level}</small>
          </span>
        </div>
      </section>

      <section className="dna-stats-grid">
        <DnaStat
          icon={<Waves size={19} />}
          color="blue"
          label="GÊNERO-RAIZ"
          value={primaryGenre?.genre ?? '—'}
          detail={primaryGenre ? `${primaryGenre.value}% de afinidade` : 'sem dados ainda'}
        />
        <DnaStat
          icon={<Disc3 size={19} />}
          color="cyan"
          label="FAIXAS REGISTRADAS"
          value={String(data.topTracks.reduce((sum, track) => sum + track.plays, 0))}
          detail="no período selecionado"
        />
        <DnaStat
          icon={<BrainCircuit size={19} />}
          color="sky"
          label="VARIEDADE MUSICAL"
          value={`${data.genreDna.length}`}
          detail="gêneros no DNA atual"
        />
        <DnaStat
          icon={<CircleGauge size={19} />}
          color="navy"
          label="SESSÕES"
          value={data.stats.find((stat) => stat.label.includes('MÚSICAS'))?.value ?? '0'}
          detail="faixas distintas esta semana"
        />
      </section>

      <section className="dna-content-grid">
        <article className="surface-card trait-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">TEXTURA DO SEU SOM</p>
              <h3>Audio features disponíveis</h3>
            </div>
            <BadgeCheck size={19} className="muted-icon" />
          </div>
          {data.audioTraits.some((trait) => trait.value > 0) ? (
            <div className="trait-list">
              {data.audioTraits.map((trait) => (
                <div className="trait-row" key={trait.label}>
                  <span>{trait.label}</span>
                  <ProgressBar className={`progress-track--${trait.color}`} value={trait.value} />
                  <b>{trait.value}%</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="O Spotify não forneceu audio features para suas faixas ainda. Wardfy exibirá os valores quando estiverem disponíveis." />
          )}
          <p className="card-footnote">
            <Sparkles size={14} /> Os dados dependem da disponibilidade do catálogo Spotify.
          </p>
        </article>
        <article className="surface-card genres-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">CONSTELAÇÃO DE GÊNEROS</p>
              <h3>Onde você mais orbita</h3>
            </div>
          </div>
          {data.genreDna.length ? (
            <>
              <div className="genre-cloud">
                {data.genreDna.map((item, index) => (
                  <button
                    className={`genre-pill genre-pill--${Math.min(index + 1, 3)}`}
                    key={item.genre}
                    onClick={() =>
                      onToast(`${item.genre}: ${item.value}% de afinidade no seu histórico.`)
                    }
                  >
                    {item.genre}
                    <b>{item.value}%</b>
                  </button>
                ))}
              </div>
              <div className="genre-cloud__footer">
                <span>{data.genreDna.length} gêneros com dados</span>
                <button onClick={() => onToast('Gêneros são atualizados durante a sincronização.')}>
                  Atualizar <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <EmptyText text="Sincronize sua biblioteca ou continue ouvindo para formar sua constelação." />
          )}
        </article>
      </section>

      {compatibility ? (
        <section className="compatibility-feature surface-card">
          <div className="compatibility-feature__people">
            <span className="compat-avatar compat-avatar--you">{initials(data.viewer.name)}</span>
            <span className="compat-link">
              <HeartHandshake size={20} />
            </span>
            <span className="compat-avatar compat-avatar--lia">
              {initials(data.friends.find((friend) => friend.discordId)?.name ?? 'AM')}
            </span>
          </div>
          <div className="compatibility-feature__copy">
            <p className="eyebrow">SINTONIA COM MEMBRO ATIVO</p>
            <h3>
              <b>{compatibility.score}%</b> de compatibilidade
            </h3>
            <p>{compatibility.explanation}</p>
            <div>
              {compatibility.sharedArtists.slice(0, 4).map((artist) => (
                <span key={artist}>{artist}</span>
              ))}
            </div>
          </div>
          <div className="compatibility-feature__cover-stack">
            {data.topTracks.slice(0, 2).map((track) => (
              <AlbumArtwork key={track.id} src={track.albumArtUrl} size="small" />
            ))}
          </div>
          <button
            className="outline-action"
            onClick={() =>
              onToast('A compatibilidade é calculada pelos últimos 90 dias de escuta registrada.')
            }
          >
            Entender cálculo <ArrowRight size={14} />
          </button>
        </section>
      ) : (
        <section className="empty-card surface-card">
          <HeartHandshake size={18} />
          <span>
            Quando outro membro conectado estiver ativo, Wardfy calcula a compatibilidade real entre
            vocês.
          </span>
        </section>
      )}
    </div>
  );
}

function DnaStat({
  icon,
  color,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="surface-card dna-stat-card">
      <span className={`dna-stat-card__icon ${color}`}>{icon}</span>
      <p>{label}</p>
      <h3>{value}</h3>
      <span>{detail}</span>
    </article>
  );
}
function EmptyText({ text }: { text: string }) {
  return (
    <div className="empty-card">
      <Waves size={18} />
      <span>{text}</span>
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

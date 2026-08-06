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

import { AlbumArtwork } from '../components/AlbumArtwork';
import { DnaRadar } from '../components/Charts';
import { ProgressBar } from '../components/ProgressBar';
import type { CompatibilityReport, DashboardData } from '../types';

const traits = [
  { label: 'Energia', value: 67, color: 'violet' },
  { label: 'Danceability', value: 42, color: 'blue' },
  { label: 'Valence', value: 38, color: 'orange' },
  { label: 'Acústica', value: 29, color: 'lime' },
  { label: 'Instrumental', value: 18, color: 'pink' },
];

export function DnaView({
  data,
  compatibility,
  onToast,
}: {
  data: DashboardData;
  compatibility: CompatibilityReport;
  onToast: (text: string) => void;
}) {
  return (
    <div className="page-stack dna-view">
      <section className="dna-hero surface-card">
        <div className="dna-hero__copy">
          <p className="eyebrow">SEU DNA MUSICAL · ATUALIZADO HOJE</p>
          <h2>
            Intenso, atmosférico
            <br />e <em>impossível de repetir.</em>
          </h2>
          <p>
            Seu perfil é formado pelos rastros que você deixa em cada sessão, não por um rótulo
            pronto.
          </p>
          <div className="dna-title-badge">
            <Sparkles size={15} />
            <span>
              <b>Explorador Musical</b>
              <small>título equipado</small>
            </span>
            <button onClick={() => onToast('Títulos disponíveis abertos.')}>Trocar</button>
          </div>
        </div>
        <div className="dna-hero__radar">
          <DnaRadar data={data.genreDna} />
          <span className="dna-hero__center">
            DNA<small>18</small>
          </span>
        </div>
      </section>

      <section className="dna-stats-grid">
        <article className="surface-card dna-stat-card">
          <span className="dna-stat-card__icon violet">
            <Waves size={19} />
          </span>
          <p>SEU GÊNERO-RAIZ</p>
          <h3>Alternative</h3>
          <span>96% de afinidade</span>
        </article>
        <article className="surface-card dna-stat-card">
          <span className="dna-stat-card__icon orange">
            <Disc3 size={19} />
          </span>
          <p>FAIXA MAIS RARA</p>
          <h3>0,3%</h3>
          <span>dos ouvintes a repetem</span>
        </article>
        <article className="surface-card dna-stat-card">
          <span className="dna-stat-card__icon lime">
            <BrainCircuit size={19} />
          </span>
          <p>VARIEDADE MUSICAL</p>
          <h3>Alta</h3>
          <span>top 12% do servidor</span>
        </article>
        <article className="surface-card dna-stat-card">
          <span className="dna-stat-card__icon pink">
            <CircleGauge size={19} />
          </span>
          <p>BPM MÉDIO</p>
          <h3>121</h3>
          <span>pulsos por minuto</span>
        </article>
      </section>

      <section className="dna-content-grid">
        <article className="surface-card trait-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">TEXTURA DO SEU SOM</p>
              <h3>Como a sua música se move</h3>
            </div>
            <BadgeCheck size={19} className="muted-icon" />
          </div>
          <div className="trait-list">
            {traits.map((trait) => (
              <div className="trait-row" key={trait.label}>
                <span>{trait.label}</span>
                <ProgressBar className={`progress-track--${trait.color}`} value={trait.value} />
                <b>{trait.value}%</b>
              </div>
            ))}
          </div>
          <p className="card-footnote">
            <Sparkles size={14} /> Seu som ganhou 9% mais energia desde abril.
          </p>
        </article>
        <article className="surface-card genres-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">CONSTELAÇÃO DE GÊNEROS</p>
              <h3>Onde você mais orbita</h3>
            </div>
          </div>
          <div className="genre-cloud">
            {data.genreDna.map((item, index) => (
              <button
                className={`genre-pill genre-pill--${index + 1}`}
                key={item.genre}
                onClick={() => onToast(`${item.genre}: ${item.value}% de afinidade.`)}
              >
                {item.genre}
                <b>{item.value}%</b>
              </button>
            ))}
          </div>
          <div className="genre-cloud__footer">
            <span>19 gêneros explorados</span>
            <button onClick={() => onToast('Explorar recomendações por gênero.')}>
              Explorar <ArrowRight size={14} />
            </button>
          </div>
        </article>
      </section>

      <section className="compatibility-feature surface-card">
        <div className="compatibility-feature__people">
          <span className="compat-avatar compat-avatar--you">MT</span>
          <span className="compat-link">
            <HeartHandshake size={20} />
          </span>
          <span className="compat-avatar compat-avatar--lia">LI</span>
        </div>
        <div className="compatibility-feature__copy">
          <p className="eyebrow">SINTONIA COM LIA</p>
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
          <AlbumArtwork variant="muse" size="small" />
          <AlbumArtwork variant="deftones" size="small" />
        </div>
        <button
          className="outline-action"
          onClick={() => onToast('Comparação detalhada com Lia aberta.')}
        >
          Ver comparação <ArrowRight size={14} />
        </button>
      </section>
    </div>
  );
}

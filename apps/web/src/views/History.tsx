import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Compass,
  Download,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { TimelineChart } from '../components/Charts';
import { Heatmap } from '../components/Heatmap';
import type { DashboardData } from '../types';

export function HistoryView({
  data,
  onToast,
}: {
  data: DashboardData;
  onToast: (text: string) => void;
}) {
  const yearMinutes = data.history.reduce((sum, item) => sum + item.minutes, 0);
  const discoveries = data.history.reduce((sum, item) => sum + item.discoveries, 0);
  const uniqueTracks = Number(
    data.stats.find((stat) => stat.label.includes('MÚSICAS'))?.value.replace(/\D/g, '') ?? 0,
  );
  const peak = [...data.history].sort((left, right) => right.minutes - left.minutes)[0];
  return (
    <div className="page-stack history-view">
      <section className="history-hero surface-card">
        <div>
          <p className="eyebrow">WRAPPED CONTÍNUO</p>
          <h2>
            Não espere dezembro para
            <br />
            <em>entender sua história.</em>
          </h2>
          <p>
            Seu histórico é construído pelas escutas que Spotify disponibiliza e pelas novas sessões
            registradas pelo Wardfy.
          </p>
        </div>
        <div className="history-hero__month">
          <small>PERÍODO</small>
          <b>{data.history.length}</b>
          <span>
            meses com dados
            <br />
            na linha do tempo
          </span>
          <i>↗</i>
        </div>
      </section>
      <section className="history-stat-row">
        <HistoryStat
          icon={<Clock3 size={19} />}
          color="blue"
          label="MINUTOS REGISTRADOS"
          value={yearMinutes.toLocaleString('pt-BR')}
          detail="na sua linha do tempo"
        />
        <HistoryStat
          icon={<Compass size={19} />}
          color="cyan"
          label="GÊNEROS NO DNA"
          value={String(data.genreDna.length)}
          detail="com dados disponíveis"
        />
        <HistoryStat
          icon={<Sparkles size={19} />}
          color="sky"
          label="DESCOBERTAS"
          value={discoveries.toLocaleString('pt-BR')}
          detail="faixas novas registradas"
        />
        <HistoryStat
          icon={<TrendingUp size={19} />}
          color="navy"
          label="FAIXAS DISTINTAS"
          value={uniqueTracks.toLocaleString('pt-BR')}
          detail="nesta semana"
        />
      </section>
      <section className="surface-card history-chart-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">EVOLUÇÃO</p>
            <h3>Minutos que viraram memória</h3>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Minutos
            </span>
          </div>
        </div>
        {data.history.some((item) => item.minutes > 0) ? (
          <TimelineChart data={data.history} />
        ) : (
          <EmptyHistory text="A linha do tempo começa após a primeira sincronização de escutas." />
        )}
        <div className="history-chart-card__footer">
          <span>
            {peak?.minutes ? (
              <>
                <b>{peak.month}</b> é seu mês mais intenso até agora.
              </>
            ) : (
              'Continue ouvindo para descobrir seu período mais intenso.'
            )}
          </span>
          <button
            onClick={() =>
              onToast('Exportação de recap estará disponível quando houver dados suficientes.')
            }
          >
            Exportar <Download size={14} />
          </button>
        </div>
      </section>
      <section className="history-bottom-grid">
        <article className="surface-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ROTINA SEMANAL</p>
              <h3>Seus horários de escuta</h3>
            </div>
            <span className="quiet-label">HISTÓRICO REAL</span>
          </div>
          <Heatmap compact data={data.heatmap} />
          <p className="card-footnote">
            <CalendarDays size={14} /> Intensidade baseada nas sessões registradas.
          </p>
        </article>
        <article className="surface-card evolution-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SEU SOM ATUAL</p>
              <h3>Gêneros mais presentes</h3>
            </div>
          </div>
          {data.genreDna.length ? (
            <div className="evolution-list">
              {data.genreDna.slice(0, 4).map((genre) => (
                <EvolutionRow key={genre.genre} genre={genre.genre} value={genre.value} />
              ))}
            </div>
          ) : (
            <EmptyHistory text="Os gêneros aparecem após a biblioteca ser sincronizada." />
          )}
          <button
            className="outline-action"
            onClick={() => onToast('Seu DNA é recalculado a cada sincronização.')}
          >
            Atualizar DNA
          </button>
        </article>
      </section>
    </div>
  );
}

function HistoryStat({
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
    <article className="surface-card">
      <span className={`history-stat-icon ${color}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <b>{value}</b>
        <span>
          <ArrowUpRight size={13} /> {detail}
        </span>
      </div>
    </article>
  );
}
function EvolutionRow({ genre, value }: { genre: string; value: number }) {
  return (
    <div className="evolution-row">
      <span>{genre}</span>
      <div>
        <b className="evolution-row__to evolution-row__to--blue" style={{ width: `${value}%` }} />
      </div>
      <strong>● {value}%</strong>
    </div>
  );
}
function EmptyHistory({ text }: { text: string }) {
  return (
    <div className="empty-card">
      <Clock3 size={18} />
      <span>{text}</span>
    </div>
  );
}

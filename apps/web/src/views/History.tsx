import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Compass,
  Download,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { TimelineChart } from '../components/Charts';
import { Heatmap } from '../components/Heatmap';
import { historyTimeline } from '../data/demo';
import type { DashboardData } from '../types';

export function HistoryView({
  data,
  onToast,
}: {
  data: DashboardData;
  onToast: (text: string) => void;
}) {
  return (
    <div className="page-stack history-view">
      <section className="history-hero surface-card">
        <div>
          <p className="eyebrow">WRAPPED CONTÍNUO · 2026</p>
          <h2>
            Não espere dezembro para
            <br />
            <em>entender sua história.</em>
          </h2>
          <p>Wardfy transforma sua rotina de escuta em uma memória viva — todos os dias.</p>
        </div>
        <div className="history-hero__month">
          <small>AGOSTO</small>
          <b>04</b>
          <span>
            dias de música
            <br />
            neste mês
          </span>
          <i>↗</i>
        </div>
      </section>

      <section className="history-stat-row">
        <article className="surface-card">
          <span className="history-stat-icon violet">
            <Clock3 size={19} />
          </span>
          <div>
            <p>MINUTOS NO ANO</p>
            <b>27.834</b>
            <span>
              <ArrowUpRight size={13} /> 14% vs. 2025
            </span>
          </div>
        </article>
        <article className="surface-card">
          <span className="history-stat-icon lime">
            <Compass size={19} />
          </span>
          <div>
            <p>ARTISTAS CONHECIDOS</p>
            <b>1.289</b>
            <span>
              <ArrowUpRight size={13} /> 206 novos
            </span>
          </div>
        </article>
        <article className="surface-card">
          <span className="history-stat-icon orange">
            <Sparkles size={19} />
          </span>
          <div>
            <p>DESCOBERTAS</p>
            <b>358</b>
            <span>
              <ArrowUpRight size={13} /> 28 este mês
            </span>
          </div>
        </article>
        <article className="surface-card">
          <span className="history-stat-icon blue">
            <TrendingUp size={19} />
          </span>
          <div>
            <p>SESSÃO MÉDIA</p>
            <b>46 min</b>
            <span>+8 min vs. 2025</span>
          </div>
        </article>
      </section>

      <section className="surface-card history-chart-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">EVOLUÇÃO NO ANO</p>
            <h3>Minutos que viraram memória</h3>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Minutos
            </span>
            <button onClick={() => onToast('Período alterado para 2026.')}>2026 ▾</button>
          </div>
        </div>
        <TimelineChart data={historyTimeline} />
        <div className="history-chart-card__footer">
          <span>
            <b>Junho</b> foi seu mês mais intenso: 4.210 min.
          </span>
          <button onClick={() => onToast('Relatório anual gerado.')}>
            Ver relatório <Download size={14} />
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
            <span className="quiet-label">2026</span>
          </div>
          <Heatmap compact data={data.heatmap} />
          <p className="card-footnote">
            <CalendarDays size={14} /> Você escuta 2,4x mais aos sábados.
          </p>
        </article>
        <article className="surface-card evolution-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SEU SOM MUDOU</p>
              <h3>De janeiro para cá</h3>
            </div>
          </div>
          <div className="evolution-list">
            <EvolutionRow genre="Shoegaze" from={42} to={78} color="violet" />
            <EvolutionRow genre="Jazz" from={12} to={39} color="orange" />
            <EvolutionRow genre="Hyperpop" from={3} to={21} color="pink" />
            <EvolutionRow genre="Indie Rock" from={82} to={65} color="blue" down />
          </div>
          <button
            className="outline-action"
            onClick={() => onToast('Linha do tempo do DNA aberta.')}
          >
            Explorar mudanças
          </button>
        </article>
      </section>

      <section className="monthly-recap">
        <div className="monthly-recap__orb">✦</div>
        <div>
          <p>SEU RESUMO DE AGOSTO ESTÁ CRESCENDO</p>
          <h3>Mais 3 dias e você terá um novo capítulo para guardar.</h3>
          <span>O recap chega automaticamente no primeiro dia do próximo mês.</span>
        </div>
        <button
          onClick={() => onToast('Você receberá uma notificação quando o recap estiver pronto.')}
        >
          Me avise <Sparkles size={15} />
        </button>
      </section>
    </div>
  );
}

function EvolutionRow({
  genre,
  from,
  to,
  color,
  down = false,
}: {
  genre: string;
  from: number;
  to: number;
  color: string;
  down?: boolean;
}) {
  return (
    <div className="evolution-row">
      <span>{genre}</span>
      <div>
        <i style={{ width: `${from}%` }} />
        <b
          className={`evolution-row__to evolution-row__to--${color}`}
          style={{ width: `${to}%` }}
        />
      </div>
      <strong className={down ? 'is-down' : ''}>
        {down ? '↓' : '↑'} {Math.abs(to - from)}%
      </strong>
    </div>
  );
}

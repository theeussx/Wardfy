import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Medal,
  Music2,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

import { AlbumArtwork, ColorAvatar } from '../components/AlbumArtwork';
import type { LeaderboardEntry } from '../types';

const metrics = [
  { id: 'listeningMinutes', label: 'Minutos ouvidos', short: 'Minutos', icon: Music2 },
  { id: 'tracks', label: 'Músicas diferentes', short: 'Faixas', icon: Sparkles },
  { id: 'artists', label: 'Artistas diferentes', short: 'Artistas', icon: Users },
  { id: 'discoveries', label: 'Novas descobertas', short: 'Descobertas', icon: Medal },
];
const colors = ['#2563eb', '#0ea5e9', '#38bdf8', '#1d4ed8', '#0284c7', '#60a5fa', '#0369a1'];

export function RankingsView({
  metric,
  entries,
  loading,
  onMetric,
  onToast,
}: {
  metric: string;
  entries: LeaderboardEntry[];
  loading: boolean;
  onMetric: (metric: string) => void;
  onToast: (text: string) => void;
}) {
  const currentMetric = metrics.find((item) => item.id === metric) ?? metrics[0]!;
  const topThree = [entries[1], entries[0], entries[2]].filter(Boolean) as LeaderboardEntry[];
  const current = entries.find((entry) => entry.isCurrentUser);
  return (
    <div className="page-stack rankings-view">
      <section className="ranking-hero surface-card">
        <div>
          <p className="eyebrow">RANKING SEMANAL</p>
          <h2>
            {entries.length ? (
              <>
                Suba o som. <em>Suba na tabela.</em>
              </>
            ) : (
              <>
                O ranking começa com
                <br />
                <em>a primeira escuta.</em>
              </>
            )}
          </h2>
          <p>
            As posições são calculadas exclusivamente pelas reproduções registradas no servidor
            selecionado.
          </p>
        </div>
        <div className="ranking-hero__score">
          <Crown size={23} />
          <span>
            <b>{current ? `#${current.rank}` : '—'}</b>
            <small>sua posição</small>
          </span>
        </div>
      </section>
      <section className="metric-filter" aria-label="Métrica do ranking">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={metric === item.id ? 'is-selected' : ''}
              key={item.id}
              onClick={() => onMetric(item.id)}
            >
              <Icon size={16} />
              <span>{item.short}</span>
            </button>
          );
        })}
      </section>
      {entries.length ? (
        <>
          <section className="podium-section">
            <div className="podium-section__header">
              <div>
                <p className="eyebrow">HALL DA SEMANA</p>
                <h3>Quem está em outra frequência</h3>
              </div>
              <span className="ranking-live-label">
                <i /> dados registrados
              </span>
            </div>
            <div className="podium">
              {topThree.map((entry, index) => {
                const shownRank = index === 0 ? 2 : index === 1 ? 1 : 3;
                return (
                  <motion.article
                    className={`podium-card podium-card--${shownRank}`}
                    key={entry.userId}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    {shownRank === 1 && <span className="podium-card__crown">♛</span>}
                    <ColorAvatar
                      color={colors[entry.rank - 1] ?? '#2563eb'}
                      initials={entry.displayName.slice(0, 2).toUpperCase()}
                      size="large"
                    />
                    <AlbumArtwork size="tiny" className="podium-card__album" />
                    <b>{entry.displayName}</b>
                    <small>posição #{entry.rank}</small>
                    <strong>
                      {entry.value.toLocaleString('pt-BR')}
                      <span>{metric === 'listeningMinutes' ? ' min' : ''}</span>
                    </strong>
                    <div className="podium-card__base">
                      <span>{shownRank}</span>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>
          <section className="surface-card full-ranking-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">CLASSIFICAÇÃO COMPLETA</p>
                <h3>{currentMetric.label}</h3>
              </div>
              <button
                className="outline-action"
                onClick={() =>
                  onToast('Compartilhamento no Discord estará disponível no canal configurado.')
                }
              >
                Compartilhar ranking
              </button>
            </div>
            <div className="full-ranking-table">
              <div className="full-ranking-table__head">
                <span>#</span>
                <span>OUVINTE</span>
                <span>RITMO</span>
                <span>VARIAÇÃO</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={metric}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {entries.map((entry, index) => {
                    const max = entries[0]?.value || 1;
                    return (
                      <div
                        className={`full-ranking-row ${entry.isCurrentUser ? 'full-ranking-row--you' : ''}`}
                        key={entry.userId}
                      >
                        <span className="full-ranking-row__rank">
                          {entry.rank < 4 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                        </span>
                        <span className="full-ranking-row__person">
                          <ColorAvatar
                            color={colors[index] ?? '#2563eb'}
                            initials={entry.displayName.slice(0, 2).toUpperCase()}
                            size="small"
                          />
                          <b>{entry.displayName}</b>
                          {entry.isCurrentUser && <em>você</em>}
                        </span>
                        <span className="full-ranking-row__score">
                          <i>
                            <b style={{ width: `${(entry.value / max) * 100}%` }} />
                          </i>
                          <strong>
                            {entry.value.toLocaleString('pt-BR')}
                            {metric === 'listeningMinutes' && <small> min</small>}
                          </strong>
                        </span>
                        <span className="rank-delta">
                          {entry.delta ? (
                            <>
                              {entry.delta > 0 ? (
                                <ArrowUpRight size={14} />
                              ) : (
                                <ArrowDownRight size={14} />
                              )}
                              {Math.abs(entry.delta)}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
              {loading && <div className="ranking-loading">Atualizando posições…</div>}
            </div>
          </section>
        </>
      ) : (
        <section className="empty-card surface-card">
          <Trophy size={20} />
          <span>
            Não há escutas suficientes para um ranking ainda. Conecte Spotify e ouça no servidor
            para iniciar a tabela.
          </span>
        </section>
      )}
    </div>
  );
}

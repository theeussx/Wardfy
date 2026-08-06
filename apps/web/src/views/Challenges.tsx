import {
  Award,
  Check,
  ChevronRight,
  Flame,
  Gift,
  LockKeyhole,
  Plus,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

import { ProgressBar } from '../components/ProgressBar';
import { wardfyApi } from '../lib/api';
import type { DashboardData } from '../types';

export function ChallengesView({
  data,
  guildId,
  canManage,
  onCreated,
  onToast,
}: {
  data: DashboardData;
  guildId?: string;
  canManage: boolean;
  onCreated: () => void;
  onToast: (text: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const availableXp = data.challenges.reduce((sum, challenge) => sum + challenge.rewardXp, 0);
  const completed = data.achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <div className="page-stack challenges-view">
      <section className="challenge-hero surface-card">
        <div>
          <p className="eyebrow">MISSÕES DA COMUNIDADE</p>
          <h2>
            {data.challenges.length ? (
              <>
                Faça da próxima música
                <br />
                uma <em>missão.</em>
              </>
            ) : (
              <>
                A próxima missão começa
                <br />
                no <em>seu servidor.</em>
              </>
            )}
          </h2>
          <p>
            Desafios são criados por administradores e o progresso é contado automaticamente pelas
            escutas conectadas.
          </p>
          {canManage && guildId && (
            <button className="primary-action" onClick={() => setCreating(true)}>
              <Plus size={16} /> Criar desafio
            </button>
          )}
        </div>
        <div className="challenge-hero__ticket">
          <span>
            WARD
            <br />
            FY
          </span>
          <b>{String(data.challenges.length).padStart(2, '0')}</b>
          <small>
            MISSÕES
            <br />
            ATIVAS
          </small>
          <i>✦</i>
        </div>
      </section>

      <section className="challenge-summary-grid">
        <Summary
          icon={<Flame size={19} />}
          color="blue"
          label="SEQUÊNCIA ATUAL"
          value={`${data.viewer.streak} dias`}
          detail="registrados de verdade"
        />
        <Summary
          icon={<Gift size={19} />}
          color="cyan"
          label="XP DISPONÍVEL"
          value={`${availableXp} XP`}
          detail="em missões ativas"
        />
        <Summary
          icon={<Award size={19} />}
          color="sky"
          label="CONQUISTAS"
          value={`${completed} / ${data.achievements.length}`}
          detail="já desbloqueadas"
        />
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">SEUS DESAFIOS</p>
            <h3>Em andamento</h3>
          </div>
        </div>
        {data.challenges.length === 0 ? (
          <div className="empty-card surface-card">
            <Target size={19} />
            <span>Nenhuma missão ativa neste servidor.</span>
          </div>
        ) : (
          <div className="challenge-grid">
            {data.challenges.map((challenge, index) => {
              const percent = (challenge.progress / challenge.target) * 100;
              return (
                <motion.article
                  className="challenge-card surface-card"
                  key={challenge.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className="challenge-card__top">
                    <span
                      className={`challenge-symbol challenge-symbol--${Math.min(index + 1, 3)}`}
                    >
                      {challenge.icon}
                    </span>
                    <span>{challenge.daysLeft} dias</span>
                  </div>
                  <h3>{challenge.name}</h3>
                  <p>{challenge.description}</p>
                  <div className="challenge-card__progress">
                    <div>
                      <b>{challenge.progress}</b>
                      <span>
                        {' '}
                        / {challenge.target} {challenge.unit}
                      </span>
                      <strong>{Math.round(percent)}%</strong>
                    </div>
                    <ProgressBar value={percent} />
                  </div>
                  <div className="challenge-card__footer">
                    <span>
                      <Sparkles size={14} /> +{challenge.rewardXp} XP
                    </span>
                    <button
                      onClick={() => {
                        if (challenge.joined) {
                          onToast(
                            'Você já participa desta missão. O progresso é atualizado na próxima sincronização.',
                          );
                          return;
                        }
                        void wardfyApi
                          .joinChallenge(challenge.id)
                          .then(() => {
                            onToast('Você entrou no desafio. Sincronize para ver o progresso.');
                            onCreated();
                          })
                          .catch(() => onToast('Não foi possível entrar no desafio agora.'));
                      }}
                    >
                      {challenge.joined ? 'Participando' : 'Participar'} <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      <section className="achievements-section surface-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">VITRINE DE CONQUISTAS</p>
            <h3>Marcos conquistados no seu histórico</h3>
          </div>
        </div>
        {data.achievements.length === 0 ? (
          <div className="empty-card">
            <Award size={18} />
            <span>Conquistas aparecem após a primeira escuta sincronizada.</span>
          </div>
        ) : (
          <div className="achievement-row">
            {data.achievements.map((achievement) => (
              <button
                className={`achievement-chip ${achievement.unlocked ? 'achievement-chip--unlocked' : ''}`}
                key={achievement.id}
                title={achievement.description}
                onClick={() =>
                  onToast(
                    `${achievement.description} Progresso: ${achievement.progress}${achievement.threshold ? `/${achievement.threshold}` : ''}.`,
                  )
                }
              >
                <span>{achievement.unlocked ? achievement.icon : <LockKeyhole size={18} />}</span>
                <b>{achievement.name}</b>
                {achievement.unlocked && (
                  <i>
                    <Check size={11} />
                  </i>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {creating && guildId && (
        <CreateChallengeModal
          guildId={guildId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            onCreated();
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

function CreateChallengeModal({
  guildId,
  onClose,
  onCreated,
  onToast,
}: {
  guildId: string;
  onClose: () => void;
  onCreated: () => void;
  onToast: (text: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const days = Number(form.get('days') ?? 7);
      await wardfyApi.createChallenge(guildId, {
        name: form.get('name'),
        description: form.get('description'),
        icon: form.get('icon') || '🎯',
        metric: form.get('metric'),
        target: Number(form.get('target')),
        rewardXp: Number(form.get('rewardXp') ?? 100),
        endsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      });
      onToast('Desafio criado e disponível para o servidor.');
      onCreated();
    } catch {
      onToast('Não foi possível criar o desafio. Revise os campos e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="challenge-form surface-card" onSubmit={submit}>
        <button
          type="button"
          className="challenge-form__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
        <p className="eyebrow">NOVA MISSÃO</p>
        <h3>Criar desafio real</h3>
        <label>
          Nome
          <input required name="name" maxLength={80} placeholder="Ex.: Fora da bolha" />
        </label>
        <label>
          Descrição
          <textarea
            required
            name="description"
            maxLength={300}
            placeholder="O que os membros precisam alcançar?"
          />
        </label>
        <div className="challenge-form__grid">
          <label>
            Ícone
            <input name="icon" defaultValue="🎯" maxLength={12} />
          </label>
          <label>
            Métrica
            <select name="metric" defaultValue="UNIQUE_ARTISTS">
              <option value="UNIQUE_ARTISTS">Artistas diferentes</option>
              <option value="UNIQUE_GENRES">Gêneros novos</option>
              <option value="UNIQUE_TRACKS">Faixas diferentes</option>
              <option value="LISTENING_MINUTES">Minutos ouvidos</option>
              <option value="STREAK_DAYS">Dias seguidos</option>
              <option value="DISCOVERIES">Descobertas</option>
            </select>
          </label>
        </div>
        <div className="challenge-form__grid">
          <label>
            Meta
            <input required name="target" type="number" min="1" defaultValue="50" />
          </label>
          <label>
            Duração (dias)
            <input required name="days" type="number" min="1" max="365" defaultValue="7" />
          </label>
          <label>
            XP
            <input required name="rewardXp" type="number" min="0" defaultValue="250" />
          </label>
        </div>
        <button className="primary-action" disabled={submitting}>
          {submitting ? 'Criando…' : 'Publicar desafio'}
        </button>
      </form>
    </div>
  );
}

function Summary({
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
    <article>
      <span className={`summary-orb summary-orb--${color}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <span>{detail}</span>
      </div>
    </article>
  );
}

import {
  Award,
  Check,
  ChevronRight,
  Flame,
  Gift,
  LockKeyhole,
  PartyPopper,
  Sparkles,
  Target,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { ProgressBar } from '../components/ProgressBar';
import type { DashboardData } from '../types';

export function ChallengesView({
  data,
  onToast,
}: {
  data: DashboardData;
  onToast: (text: string) => void;
}) {
  return (
    <div className="page-stack challenges-view">
      <section className="challenge-hero surface-card">
        <div>
          <p className="eyebrow">TEMPORADA 03 · RESTAM 2 DIAS</p>
          <h2>
            Faça da próxima
            <br />
            música uma <em>missão.</em>
          </h2>
          <p>
            Explore fora da bolha, cumpra objetivos com seus amigos e colecione histórias para seu
            Wrapped.
          </p>
          <button
            className="primary-action"
            onClick={() => onToast('Todos os desafios foram adicionados ao seu radar.')}
          >
            <Target size={16} /> Ver meu progresso
          </button>
        </div>
        <div className="challenge-hero__ticket">
          <span>
            WARD
            <br />
            FY
          </span>
          <b>02</b>
          <small>
            MISSÕES
            <br />
            ATIVAS
          </small>
          <i>✦</i>
        </div>
      </section>

      <section className="challenge-summary-grid">
        <article>
          <span className="summary-orb summary-orb--violet">
            <Flame size={19} />
          </span>
          <div>
            <small>SEU MAIOR RITMO</small>
            <b>12 dias</b>
            <span>de sequência atual</span>
          </div>
        </article>
        <article>
          <span className="summary-orb summary-orb--lime">
            <Gift size={19} />
          </span>
          <div>
            <small>XP DISPONÍVEL</small>
            <b>730 XP</b>
            <span>em recompensas</span>
          </div>
        </article>
        <article>
          <span className="summary-orb summary-orb--orange">
            <Award size={19} />
          </span>
          <div>
            <small>CONCLUÍDOS</small>
            <b>4 / 9</b>
            <span>nesta temporada</span>
          </div>
        </article>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">SEUS DESAFIOS</p>
            <h3>Em andamento</h3>
          </div>
          <button className="text-action" onClick={() => onToast('Filtros de desafios abertos.')}>
            Todos <ChevronRight size={14} />
          </button>
        </div>
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
                  <span className={`challenge-symbol challenge-symbol--${index + 1}`}>
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
                  <button onClick={() => onToast(`${challenge.name} fixado no seu perfil.`)}>
                    Detalhes <ChevronRight size={14} />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="achievements-section surface-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">VITRINE DE CONQUISTAS</p>
            <h3>Pequenos marcos, grandes histórias</h3>
          </div>
          <button className="text-action" onClick={() => onToast('Todas as conquistas abertas.')}>
            Ver coleção <ChevronRight size={14} />
          </button>
        </div>
        <div className="achievement-row">
          {data.achievements.map((achievement) => (
            <button
              className={`achievement-chip ${achievement.unlocked ? 'achievement-chip--unlocked' : ''}`}
              key={achievement.id}
              title={achievement.description}
              onClick={() => onToast(achievement.description)}
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
      </section>

      <section className="community-challenge">
        <div className="community-challenge__icon">
          <PartyPopper size={23} />
        </div>
        <div>
          <p>DESAFIO DA COMUNIDADE</p>
          <h3>Faltam 1.482 minutos para o Wardfy Lab desbloquear um tema coletivo.</h3>
          <span>248 membros contribuindo · encerramento domingo, 23:59</span>
        </div>
        <div className="community-challenge__progress">
          <ProgressBar value={71} />
          <b>71%</b>
        </div>
        <button onClick={() => onToast('Seu tempo de escuta já está contribuindo!')}>
          Contribuir <ChevronRight size={15} />
        </button>
      </section>
    </div>
  );
}

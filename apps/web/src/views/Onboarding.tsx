import { Disc3, Link2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface OnboardingProps {
  discordConnected: boolean;
  spotifyConnected: boolean;
}

export function Onboarding({ discordConnected, spotifyConnected }: OnboardingProps) {
  const primaryHref = !discordConnected
    ? '/api/v1/auth/discord/start?returnTo=/'
    : '/api/v1/auth/spotify/start?returnTo=/';
  const primaryLabel = !discordConnected ? 'Conectar Discord' : 'Conectar Spotify';

  return (
    <main className="onboarding-shell">
      <div className="onboarding-shell__grid" />
      <motion.section
        className="onboarding-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="onboarding-brand">
          <span>W</span> wardfy
        </div>
        <p className="eyebrow">MÚSICA, COMUNIDADE E PRESENÇA</p>
        <h1>
          Seu som merece um
          <br />
          <em>lugar real para acontecer.</em>
        </h1>
        <p className="onboarding-card__description">
          Wardfy registra suas escutas reais, cria seu histórico contínuo e conecta sua música às
          comunidades do Discord.
        </p>

        <div className="connection-steps">
          <ConnectionStep
            icon={<ShieldCheck size={18} />}
            label="Discord"
            detail="Identidade e servidores"
            done={discordConnected}
          />
          <ConnectionStep
            icon={<Disc3 size={18} />}
            label="Spotify"
            detail="Escutas e biblioteca"
            done={spotifyConnected}
          />
          <ConnectionStep
            icon={<Sparkles size={18} />}
            label="Wardfy"
            detail="Estatísticas em tempo real"
            done={discordConnected && spotifyConnected}
          />
        </div>

        <a className="onboarding-primary" href={primaryHref}>
          <Link2 size={17} /> {primaryLabel}
        </a>
        <p className="onboarding-card__privacy">
          Tokens são criptografados. Você controla o que compartilha.
        </p>
      </motion.section>
    </main>
  );
}

function ConnectionStep({
  icon,
  label,
  detail,
  done,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  done: boolean;
}) {
  return (
    <div className={`connection-step ${done ? 'connection-step--done' : ''}`}>
      <span>{icon}</span>
      <div>
        <b>{label}</b>
        <small>{done ? 'Conectado' : detail}</small>
      </div>
      <i>{done ? '✓' : '—'}</i>
    </div>
  );
}

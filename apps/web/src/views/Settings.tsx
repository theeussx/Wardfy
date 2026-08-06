import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Crown,
  Hash,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCheck,
} from 'lucide-react';
import { useState } from 'react';

import type { DashboardData } from '../types';

export function SettingsView({
  data,
  onSave,
  onToast,
}: {
  data: DashboardData;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
  onToast: (text: string) => void;
}) {
  const [activityChannel, setActivityChannel] = useState('🎧-tocando-agora');
  const [interval, setIntervalValue] = useState('30 segundos');
  const [notifications, setNotifications] = useState(true);
  const [comparison, setComparison] = useState(true);
  const [roles, setRoles] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave({
      activityChannelId: activityChannel,
      activityUpdateSeconds: Number(interval.split(' ')[0]),
      notificationsEnabled: notifications,
      automaticRolesEnabled: roles,
      allowMemberComparison: comparison,
    });
    setSaving(false);
    onToast('Preferências salvas para o Wardfy Lab.');
  };

  return (
    <div className="page-stack settings-view">
      <section className="settings-intro">
        <div>
          <p className="eyebrow">WARDYFY LAB · 248 MEMBROS</p>
          <h2>
            O ritmo do servidor,
            <br />
            <em>sob seu controle.</em>
          </h2>
          <p>Configure como a comunidade descobre, compete e compartilha música.</p>
        </div>
        <button className="primary-action" disabled={saving} onClick={save}>
          {saving ? (
            'Salvando…'
          ) : (
            <>
              <Check size={16} /> Salvar alterações
            </>
          )}
        </button>
      </section>

      <section className="settings-layout">
        <div className="settings-nav surface-card">
          <button className="is-active">
            <SlidersHorizontal size={16} /> Geral
          </button>
          <button onClick={() => onToast('Canais selecionado.')}>
            <Hash size={16} /> Canais e atividade
          </button>
          <button onClick={() => onToast('Notificações selecionado.')}>
            <Bell size={16} /> Notificações
          </button>
          <button onClick={() => onToast('Cargos selecionado.')}>
            <Crown size={16} /> Cargos e XP
          </button>
          <button onClick={() => onToast('Permissões selecionado.')}>
            <ShieldCheck size={16} /> Permissões
          </button>
        </div>
        <div className="settings-panels">
          <article className="surface-card settings-panel">
            <div className="settings-panel__title">
              <span className="settings-panel__icon violet">
                <Bot size={19} />
              </span>
              <div>
                <h3>Canal de atividade</h3>
                <p>Onde o Wardfy mostra quem está ouvindo agora.</p>
              </div>
            </div>
            <div className="field-grid">
              <label>
                CANAL
                <select
                  value={activityChannel}
                  onChange={(event) => setActivityChannel(event.target.value)}
                >
                  <option>🎧-tocando-agora</option>
                  <option>💬-music-chat</option>
                  <option>🔊-geral</option>
                </select>
                <ChevronDown size={15} />
              </label>
              <label>
                ATUALIZAR A CADA
                <select value={interval} onChange={(event) => setIntervalValue(event.target.value)}>
                  <option>15 segundos</option>
                  <option>30 segundos</option>
                  <option>60 segundos</option>
                  <option>120 segundos</option>
                </select>
                <ChevronDown size={15} />
              </label>
            </div>
            <div className="settings-note">
              <Clock3 size={15} />
              <span>
                Atualizamos a mesma mensagem em vez de criar novas, para manter o canal limpo.
              </span>
            </div>
          </article>

          <article className="surface-card settings-panel">
            <div className="settings-panel__title">
              <span className="settings-panel__icon lime">
                <Bell size={19} />
              </span>
              <div>
                <h3>Experiência social</h3>
                <p>Escolha como os membros interagem com a atividade musical.</p>
              </div>
            </div>
            <div className="toggle-list">
              <Toggle
                title="Notificar novas conquistas"
                detail="Publica um cartão discreto quando alguém desbloqueia uma conquista."
                value={notifications}
                onChange={setNotifications}
              />
              <Toggle
                title="Permitir comparação musical"
                detail="Membros podem usar /compatibilidade entre si."
                value={comparison}
                onChange={setComparison}
              />
              <Toggle
                title="Cargos automáticos"
                detail="Distribui cargos por nível e títulos musicais desbloqueados."
                value={roles}
                onChange={setRoles}
              />
            </div>
          </article>

          <article className="surface-card settings-panel">
            <div className="settings-panel__title">
              <span className="settings-panel__icon orange">
                <LockKeyhole size={19} />
              </span>
              <div>
                <h3>Privacidade e permissões</h3>
                <p>Wardfy só lê a atividade que cada membro escolhe conectar.</p>
              </div>
            </div>
            <div className="privacy-grid">
              <div>
                <UserRoundCheck size={18} />
                <b>Dados individuais</b>
                <span>Visíveis apenas para membros conectados e conforme o perfil escolhido.</span>
              </div>
              <div>
                <ShieldCheck size={18} />
                <b>Tokens protegidos</b>
                <span>Criptografados em repouso e renovados automaticamente.</span>
              </div>
            </div>
            <button
              className="outline-action"
              onClick={() => onToast('Registro de auditoria aberto.')}
            >
              Ver registro de auditoria
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <b>{title}</b>
        <span>{detail}</span>
      </div>
      <button
        aria-checked={value}
        aria-label={title}
        className={`switch ${value ? 'switch--on' : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
      >
        <i />
      </button>
    </div>
  );
}

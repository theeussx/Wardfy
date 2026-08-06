import {
  Bell,
  Bot,
  Check,
  Clock3,
  Crown,
  Hash,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { wardfyApi } from '../lib/api';
import type { DashboardData } from '../types';

interface SettingsState {
  activityChannelId: string;
  activityUpdateSeconds: number;
  notificationsEnabled: boolean;
  automaticRolesEnabled: boolean;
  allowMemberComparison: boolean;
}

export function SettingsView({
  data,
  onSave,
  onToast,
}: {
  data: DashboardData;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
  onToast: (text: string) => void;
}) {
  const [settings, setSettings] = useState<SettingsState>({
    activityChannelId: '',
    activityUpdateSeconds: 30,
    notificationsEnabled: true,
    automaticRolesEnabled: false,
    allowMemberComparison: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void wardfyApi
      .settings(data.server.id!)
      .then((remote) =>
        setSettings({
          activityChannelId: String(remote.activityChannelId ?? ''),
          activityUpdateSeconds: Number(remote.activityUpdateSeconds ?? 30),
          notificationsEnabled: Boolean(remote.notificationsEnabled),
          automaticRolesEnabled: Boolean(remote.automaticRolesEnabled),
          allowMemberComparison: Boolean(remote.allowMemberComparison),
        }),
      )
      .catch(() => onToast('Não foi possível carregar as configurações do servidor.'))
      .finally(() => setLoading(false));
  }, [data.server.id, onToast]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ ...settings, activityChannelId: settings.activityChannelId || null });
      onToast('Preferências salvas para este servidor.');
    } catch {
      onToast('Não foi possível salvar as preferências.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack settings-view">
      <section className="settings-intro">
        <div>
          <p className="eyebrow">{data.server.name.toUpperCase()}</p>
          <h2>
            O ritmo do servidor,
            <br />
            <em>sob seu controle.</em>
          </h2>
          <p>As alterações são persistidas no servidor e usadas diretamente pelo bot Wardfy.</p>
        </div>
        <button className="primary-action" disabled={saving || loading} onClick={save}>
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
          <button>
            <Hash size={16} /> Canais e atividade
          </button>
          <button>
            <Bell size={16} /> Notificações
          </button>
          <button>
            <Crown size={16} /> Cargos e XP
          </button>
          <button>
            <ShieldCheck size={16} /> Permissões
          </button>
        </div>
        <div className="settings-panels">
          <article className="surface-card settings-panel">
            <div className="settings-panel__title">
              <span className="settings-panel__icon blue">
                <Bot size={19} />
              </span>
              <div>
                <h3>Canal de atividade</h3>
                <p>Informe o ID do canal onde Wardfy deve atualizar os cards de presença.</p>
              </div>
            </div>
            <div className="field-grid">
              <label>
                ID DO CANAL
                <input
                  value={settings.activityChannelId}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      activityChannelId: event.target.value,
                    }))
                  }
                  placeholder="Ex.: 123456789012345678"
                />
              </label>
              <label>
                ATUALIZAR A CADA
                <select
                  value={settings.activityUpdateSeconds}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      activityUpdateSeconds: Number(event.target.value),
                    }))
                  }
                >
                  <option value={15}>15 segundos</option>
                  <option value={30}>30 segundos</option>
                  <option value={60}>60 segundos</option>
                  <option value={120}>120 segundos</option>
                </select>
              </label>
            </div>
            <div className="settings-note">
              <Clock3 size={15} />
              <span>
                O bot edita a mesma mensagem de cada ouvinte e restaura essas referências após
                reiniciar.
              </span>
            </div>
          </article>
          <article className="surface-card settings-panel">
            <div className="settings-panel__title">
              <span className="settings-panel__icon cyan">
                <Bell size={19} />
              </span>
              <div>
                <h3>Experiência social</h3>
                <p>Defina como os membros interagem com a atividade musical.</p>
              </div>
            </div>
            <div className="toggle-list">
              <Toggle
                title="Notificar novas conquistas"
                detail="Publica conquistas desbloqueadas no canal configurado."
                value={settings.notificationsEnabled}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, notificationsEnabled: value }))
                }
              />
              <Toggle
                title="Permitir comparação musical"
                detail="Membros podem usar /compatibilidade entre si."
                value={settings.allowMemberComparison}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, allowMemberComparison: value }))
                }
              />
              <Toggle
                title="Cargos automáticos"
                detail="Reservado para regras de nível e títulos configuradas pelo administrador."
                value={settings.automaticRolesEnabled}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, automaticRolesEnabled: value }))
                }
              />
            </div>
          </article>
          <article className="surface-card settings-panel">
            <div className="settings-panel__title">
              <span className="settings-panel__icon sky">
                <LockKeyhole size={19} />
              </span>
              <div>
                <h3>Privacidade e permissões</h3>
                <p>
                  Tokens OAuth são criptografados e permissões do painel seguem seu cargo no
                  Discord.
                </p>
              </div>
            </div>
            <div className="privacy-grid">
              <div>
                <UserRoundCheck size={18} />
                <b>Dados individuais</b>
                <span>Exibidos apenas após a conta Spotify ser conectada voluntariamente.</span>
              </div>
              <div>
                <ShieldCheck size={18} />
                <b>Tokens protegidos</b>
                <span>Armazenados com AES-256-GCM e renovados automaticamente.</span>
              </div>
            </div>
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

import {
  Award,
  BarChart3,
  Compass,
  Crown,
  Headphones,
  History,
  LayoutDashboard,
  Settings2,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

import type { CurrentUserResponse, GuildSummary, ViewKey } from '../types';

const navigation: Array<{ id: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'inicio', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'atividade', label: 'Atividade ao vivo', icon: Headphones },
  { id: 'ranking', label: 'Rankings', icon: Crown },
  { id: 'dna', label: 'DNA musical', icon: Compass },
  { id: 'desafios', label: 'Desafios', icon: Award },
  { id: 'historico', label: 'Histórico', icon: History },
];

interface SidebarProps {
  active: ViewKey;
  onChange: (view: ViewKey) => void;
  open: boolean;
  onClose: () => void;
  identity: CurrentUserResponse;
  guild?: GuildSummary;
  onGuildChange: (guildId: string | null) => void;
}

export function Sidebar({
  active,
  onChange,
  open,
  onClose,
  identity,
  guild,
  onGuildChange,
}: SidebarProps) {
  const user = identity.user;
  const availableGuilds = identity.guilds;
  return (
    <>
      <button
        aria-label="Fechar menu"
        className={`sidebar-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <span>W</span>
          </div>
          <span className="brand-name">
            wardfy<span>.</span>
          </span>
          <button aria-label="Fechar menu" className="sidebar-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-server">
          {guild?.iconUrl ? (
            <img alt="" className="sidebar-server__image" src={guild.iconUrl} />
          ) : (
            <div className="sidebar-server__icon">{guild ? initials(guild.name) : 'EU'}</div>
          )}
          <div>
            <strong>{guild?.name ?? 'Sua biblioteca'}</strong>
            <span>
              <i /> {guild ? `${guild.members} membros` : 'dados pessoais'}
            </span>
          </div>
          <select
            aria-label="Selecionar servidor"
            value={guild?.id ?? ''}
            onChange={(event) => onGuildChange(event.target.value || null)}
          >
            <option value="">Biblioteca pessoal</option>
            {availableGuilds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <p className="nav-label">SEU UNIVERSO</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                className={`nav-item ${selected ? 'nav-item--active' : ''}`}
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  onClose();
                }}
              >
                {selected && (
                  <motion.span
                    className="nav-item__active-pill"
                    layoutId="activeNavigation"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={18} strokeWidth={selected ? 2.3 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="nav-spacer" />
          <button
            className={`nav-item ${active === 'configuracoes' ? 'nav-item--active' : ''}`}
            onClick={() => {
              onChange('configuracoes');
              onClose();
            }}
          >
            {active === 'configuracoes' && (
              <motion.span
                className="nav-item__active-pill"
                layoutId="activeNavigation"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <Settings2 size={18} />
            <span>Configurações</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="mini-profile">
            {user?.avatarUrl ? (
              <img className="mini-profile__image" src={user.avatarUrl} alt="" />
            ) : (
              <div className="mini-profile__avatar">
                {initials(user?.name ?? 'Wardfy')}
                <span />
              </div>
            )}
            <div>
              <strong>{user?.name ?? 'Wardfy'}</strong>
              <small>{user?.title ?? 'Conta não conectada'}</small>
            </div>
            <BarChart3 size={15} />
          </div>
          <div className="sidebar-footer__note">
            <span>●</span> Spotify <b>{user?.spotifyConnected ? 'ON' : 'OFF'}</b>
          </div>
        </div>
      </aside>
    </>
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

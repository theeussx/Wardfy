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

import type { ViewKey } from '../types';

const navigation: Array<{
  id: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}> = [
  { id: 'inicio', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'atividade', label: 'Atividade ao vivo', icon: Headphones, badge: '3' },
  { id: 'ranking', label: 'Rankings', icon: Crown },
  { id: 'dna', label: 'DNA musical', icon: Compass },
  { id: 'desafios', label: 'Desafios', icon: Award, badge: '2' },
  { id: 'historico', label: 'Histórico', icon: History },
];

interface SidebarProps {
  active: ViewKey;
  onChange: (view: ViewKey) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ active, onChange, open, onClose }: SidebarProps) {
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
          <div className="sidebar-server__icon">WL</div>
          <div>
            <strong>Wardfy Lab</strong>
            <span>
              <i /> 248 membros
            </span>
          </div>
          <BarChart3 size={15} />
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
                {item.badge && <b>{item.badge}</b>}
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
            <div className="mini-profile__avatar">
              MT
              <span />
            </div>
            <div>
              <strong>Mateus</strong>
              <small>Explorador Musical</small>
            </div>
            <button aria-label="Abrir perfil">•••</button>
          </div>
          <div className="sidebar-footer__note">
            <span>✦</span> Wardfy Plus <b>Beta</b>
          </div>
        </div>
      </aside>
    </>
  );
}

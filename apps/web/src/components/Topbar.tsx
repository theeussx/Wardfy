import { Bell, ChevronDown, Link2, Menu, RefreshCw } from 'lucide-react';

import type { Viewer, ViewKey } from '../types';

const titles: Record<ViewKey, { eyebrow: string; title: (name: string) => string }> = {
  inicio: { eyebrow: 'SEU RESUMO EM TEMPO REAL', title: (name) => `Olá, ${name}.` },
  atividade: { eyebrow: 'PRESENÇA MUSICAL', title: () => 'O servidor está em movimento.' },
  ranking: { eyebrow: 'COMPETIÇÃO SAUDÁVEL', title: () => 'Quem está no topo?' },
  dna: { eyebrow: 'SUA ASSINATURA SONORA', title: () => 'O que move seu som.' },
  desafios: { eyebrow: 'MISSÕES DA COMUNIDADE', title: () => 'Toda escuta conta.' },
  historico: { eyebrow: 'WRAPPED CONTÍNUO', title: () => 'Sua história em frequências.' },
  configuracoes: { eyebrow: 'CONTROLE DO SERVIDOR', title: () => 'Deixe o Wardfy com a sua cara.' },
};

interface TopbarProps {
  active: ViewKey;
  onMenu: () => void;
  syncing: boolean;
  onSync: () => void;
  viewer: Viewer;
  onConnectSpotify: () => void;
}

export function Topbar({ active, onMenu, syncing, onSync, viewer, onConnectSpotify }: TopbarProps) {
  const page = titles[active];
  return (
    <header className="topbar">
      <button className="mobile-menu-button" aria-label="Abrir menu" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div className="page-title">
        <p>{page.eyebrow}</p>
        <h1>{page.title(viewer.name)}</h1>
      </div>
      <div className="topbar-actions">
        {!viewer.spotifyConnected && (
          <button className="sync-button sync-button--connect" onClick={onConnectSpotify}>
            <Link2 size={15} />
            <span>Conectar Spotify</span>
          </button>
        )}
        <button
          className="sync-button"
          onClick={onSync}
          disabled={syncing || !viewer.spotifyConnected}
        >
          <RefreshCw size={15} className={syncing ? 'is-spinning' : ''} />
          <span>{syncing ? 'Sincronizando' : 'Sincronizar'}</span>
        </button>
        <button className="icon-button notification-button" aria-label="Notificações">
          <Bell size={19} />
        </button>
        <button className="account-button" aria-label="Menu da conta">
          {viewer.avatarUrl ? (
            <img className="account-avatar account-avatar--image" src={viewer.avatarUrl} alt="" />
          ) : (
            <span className="account-avatar">{initials(viewer.name)}</span>
          )}
          <span className="account-name">{viewer.name}</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
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

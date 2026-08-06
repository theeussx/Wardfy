import { Bell, ChevronDown, Menu, Search, Sparkles } from 'lucide-react';

import type { ViewKey } from '../types';

const titles: Record<ViewKey, { eyebrow: string; title: string }> = {
  inicio: { eyebrow: 'SEU RESUMO EM TEMPO REAL', title: 'Boa noite, Mateus.' },
  atividade: { eyebrow: 'PRESENÇA MUSICAL', title: 'O servidor está em movimento.' },
  ranking: { eyebrow: 'COMPETIÇÃO SAUDÁVEL', title: 'Quem está no topo?' },
  dna: { eyebrow: 'SUA ASSINATURA SONORA', title: 'O que move seu som.' },
  desafios: { eyebrow: 'MISSÕES DA COMUNIDADE', title: 'Toda escuta conta.' },
  historico: { eyebrow: 'WRAPPED CONTÍNUO', title: 'Sua história em frequências.' },
  configuracoes: { eyebrow: 'CONTROLE DO SERVIDOR', title: 'Deixe o Wardfy com a sua cara.' },
};

interface TopbarProps {
  active: ViewKey;
  onMenu: () => void;
  syncing: boolean;
  onSync: () => void;
}

export function Topbar({ active, onMenu, syncing, onSync }: TopbarProps) {
  const page = titles[active];
  return (
    <header className="topbar">
      <button className="mobile-menu-button" aria-label="Abrir menu" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div className="page-title">
        <p>{page.eyebrow}</p>
        <h1>{page.title}</h1>
      </div>
      <div className="topbar-actions">
        <button className="sync-button" onClick={onSync} disabled={syncing}>
          <Sparkles size={15} className={syncing ? 'is-spinning' : ''} />
          <span>{syncing ? 'Sincronizando' : 'Sincronizar'}</span>
        </button>
        <button className="icon-button notification-button" aria-label="Notificações">
          <Bell size={19} />
          <i />
        </button>
        <button className="account-button" aria-label="Menu da conta">
          <span className="account-avatar">MT</span>
          <span className="account-name">Mateus</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}

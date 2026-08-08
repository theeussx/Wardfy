import { AnimatePresence, motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { WardfyApiError, wardfyApi } from './lib/api';
import type {
  CompatibilityReport,
  CurrentUserResponse,
  DashboardData,
  LeaderboardEntry,
  ViewKey,
} from './types';
import { ActivityView } from './views/Activity';
import { ChallengesView } from './views/Challenges';
import { DnaView } from './views/Dna';
import { HistoryView } from './views/History';
import { Onboarding } from './views/Onboarding';
import { Overview } from './views/Overview';
import { RankingsView } from './views/Rankings';
import { SettingsView } from './views/Settings';

const EMPTY_IDENTITY: CurrentUserResponse = { authenticated: false, guilds: [] };

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>('inicio');
  const [identity, setIdentity] = useState<CurrentUserResponse | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityReport | null>(null);
  const [progressMs, setProgressMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rankingMetric, setRankingMetric] = useState('listeningMinutes');
  const [rankingEntries, setRankingEntries] = useState<LeaderboardEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  const currentGuild = useMemo(
    () => identity?.guilds.find((guild) => guild.id === selectedGuildId),
    [identity, selectedGuildId],
  );

  const refreshIdentity = useCallback(async () => {
    const current = await wardfyApi.me();
    setIdentity(current);
    setSelectedGuildId((previous) => {
      if (!current.authenticated) return null;
      if (previous && current.guilds.some((guild) => guild.id === previous)) return previous;
      return current.guilds[0]?.id ?? null;
    });
    return current;
  }, []);

  const refreshDashboard = useCallback(
    async (guildId = selectedGuildId) => {
      const snapshot = await wardfyApi.dashboard(guildId);
      setData(snapshot);
      setProgressMs(snapshot.nowPlaying.progressMs);
      return snapshot;
    },
    [selectedGuildId],
  );

  useEffect(() => {
    void (async () => {
      try {
        const current = await refreshIdentity();
        if (current.authenticated && current.user?.spotifyConnected) await refreshDashboard();
      } catch (cause) {
        setError(messageFrom(cause));
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshDashboard, refreshIdentity]);

  // Consume the status the OAuth callbacks append to the return URL
  // (?discord=connected / ?spotify=connected / ?error=...), surface a clear
  // confirmation and remove the params so a refresh doesn't repeat it. The
  // session cookie is already set by the callback, so /v1/me reflects it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('discord') || params.get('spotify');
    const failed = params.get('error');
    if (!state && !failed) return;
    if (params.get('discord') === 'connected' || params.get('spotify') === 'connected') {
      setToast(
        params.get('spotify') === 'connected'
          ? 'Spotify conectado com sucesso.'
          : 'Discord conectado com sucesso.',
      );
    } else if (failed) {
      setToast('Não foi possível concluir a autenticação.');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (!identity?.authenticated || !identity.user?.spotifyConnected) return;
    void refreshDashboard().catch((cause) => setError(messageFrom(cause)));
  }, [
    identity?.authenticated,
    identity?.user?.spotifyConnected,
    selectedGuildId,
    refreshDashboard,
  ]);

  useEffect(() => {
    const duration = data?.nowPlaying.track?.durationMs;
    if (paused || !data?.nowPlaying.isPlaying || !duration) return;
    const timer = window.setInterval(() => {
      setProgressMs((value) => (value + 1000 >= duration ? 0 : value + 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.nowPlaying.isPlaying, data?.nowPlaying.track?.durationMs, paused]);

  useEffect(() => {
    if (!identity?.authenticated || !identity.user?.spotifyConnected) return;
    const suffix = selectedGuildId ? `?guildId=${encodeURIComponent(selectedGuildId)}` : '';
    const stream = new EventSource(`/api/v1/activity/stream${suffix}`);
    const refresh = () => void refreshDashboard().catch(() => undefined);
    stream.addEventListener('playback', refresh);
    return () => stream.close();
  }, [
    identity?.authenticated,
    identity?.user?.spotifyConnected,
    refreshDashboard,
    selectedGuildId,
  ]);

  useEffect(() => {
    const friend = data?.friends.find((item) => item.discordId);
    if (!friend?.discordId) {
      setCompatibility(null);
      return;
    }
    void wardfyApi
      .compatibility(friend.discordId)
      .then(setCompatibility)
      .catch(() => setCompatibility(null));
  }, [data?.friends]);

  useEffect(() => {
    if (!selectedGuildId || !identity?.authenticated) {
      setRankingEntries([]);
      return;
    }
    setRankingLoading(true);
    void wardfyApi
      .rankings(selectedGuildId, rankingMetric)
      .then(setRankingEntries)
      .catch((cause) => setError(messageFrom(cause)))
      .finally(() => setRankingLoading(false));
  }, [identity?.authenticated, rankingMetric, selectedGuildId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const changeMetric = async (metric: string) => {
    if (!selectedGuildId) {
      setToast('Selecione um servidor para ver rankings.');
      return;
    }
    setRankingMetric(metric);
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const snapshot = await wardfyApi.syncLibrary();
      setData(snapshot);
      setProgressMs(snapshot.nowPlaying.progressMs);
      await refreshIdentity();
      setToast('Biblioteca sincronizada com Spotify.');
    } catch (cause) {
      setToast(messageFrom(cause));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!identity?.authenticated)
    return <Onboarding discordConnected={false} spotifyConnected={false} />;
  if (!identity.user?.spotifyConnected)
    return <Onboarding discordConnected spotifyConnected={false} />;
  if (!data) return <LoadingScreen message={error ?? 'Carregando seus dados reais…'} />;

  const renderView = () => {
    switch (activeView) {
      case 'atividade':
        return <ActivityView data={data} progressMs={progressMs} onToast={setToast} />;
      case 'ranking':
        return (
          <RankingsView
            entries={rankingEntries}
            loading={rankingLoading}
            metric={rankingMetric}
            onMetric={changeMetric}
            onToast={setToast}
          />
        );
      case 'dna':
        return <DnaView compatibility={compatibility} data={data} onToast={setToast} />;
      case 'desafios':
        return (
          <ChallengesView
            data={data}
            guildId={data.server.id ?? undefined}
            canManage={Boolean(currentGuild?.canManage)}
            onCreated={() => void refreshDashboard()}
            onToast={setToast}
          />
        );
      case 'historico':
        return <HistoryView data={data} onToast={setToast} />;
      case 'configuracoes':
        return currentGuild?.canManage && data.server.id ? (
          <SettingsView
            data={data}
            onSave={async (settings) => {
              await wardfyApi.updateSettings(data.server.id!, settings);
            }}
            onToast={setToast}
          />
        ) : (
          <PermissionPanel />
        );
      case 'inicio':
      default:
        return (
          <Overview
            data={data}
            rankings={rankingEntries}
            onChangeView={setActiveView}
            onToast={setToast}
            onTogglePlayback={() => setPaused((value) => !value)}
            paused={paused}
            progressMs={progressMs}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient--blue" />
      <div className="ambient ambient--cyan" />
      <div className="noise-layer" />
      <Sidebar
        active={activeView}
        onChange={setActiveView}
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        identity={identity ?? EMPTY_IDENTITY}
        guild={currentGuild}
        onGuildChange={setSelectedGuildId}
      />
      <main className="main-content">
        <Topbar
          active={activeView}
          onMenu={() => setMenuOpen(true)}
          onSync={sync}
          syncing={syncing}
          viewer={data.viewer}
          onConnectSpotify={() => {
            window.location.assign(wardfyApi.connectSpotifyUrl());
          }}
        />
        <div className="connection-strip connection-strip--live">
          <span>
            <Wifi size={13} /> DADOS REAIS
          </span>
          <p>
            {data.server.id
              ? `Sincronizado com ${data.server.name}.`
              : 'Sua biblioteca Spotify conectada.'}
          </p>
          <button onClick={sync}>Atualizar agora</button>
        </div>
        {error && (
          <div className="runtime-error">
            <b>Conexão interrompida.</b> {error}
            <button
              onClick={() => {
                setError(null);
                void refreshDashboard();
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            className="view-container"
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
          >
            <span>●</span>
            {toast}
            <button onClick={() => setToast(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingScreen({ message = 'Conectando ao Wardfy…' }: { message?: string }) {
  return (
    <main className="onboarding-shell">
      <div className="onboarding-shell__grid" />
      <section className="loading-card">
        <span>W</span>
        <p>{message}</p>
      </section>
    </main>
  );
}

function PermissionPanel() {
  return (
    <section className="permission-panel surface-card">
      <p className="eyebrow">CONFIGURAÇÕES PROTEGIDAS</p>
      <h2>Selecione um servidor onde você tenha permissão de administrador.</h2>
      <p>As permissões são sincronizadas pelo bot e respeitam a função do Discord.</p>
    </section>
  );
}

function messageFrom(cause: unknown): string {
  if (cause instanceof WardfyApiError) return cause.message;
  return cause instanceof Error ? cause.message : 'Não foi possível carregar os dados agora.';
}
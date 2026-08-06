import { AnimatePresence, motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { demoCompatibility, demoDashboard, demoLeaderboard } from './data/demo';
import { wardfyApi } from './lib/api';
import type { DashboardData, LeaderboardEntry, ViewKey } from './types';
import { ActivityView } from './views/Activity';
import { ChallengesView } from './views/Challenges';
import { DnaView } from './views/Dna';
import { HistoryView } from './views/History';
import { Overview } from './views/Overview';
import { RankingsView } from './views/Rankings';
import { SettingsView } from './views/Settings';

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>('inicio');
  const [data, setData] = useState<DashboardData>(demoDashboard);
  const [progressMs, setProgressMs] = useState(demoDashboard.nowPlaying.progressMs);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rankingMetric, setRankingMetric] = useState('listeningMinutes');
  const [rankingEntries, setRankingEntries] = useState<LeaderboardEntry[]>(demoLeaderboard());
  const [rankingLoading, setRankingLoading] = useState(false);

  const trackDuration = data.nowPlaying.track?.durationMs ?? 1;
  const compatibility = useMemo(() => demoCompatibility, []);

  useEffect(() => {
    void wardfyApi.dashboard().then((snapshot) => {
      setData(snapshot);
      setProgressMs(snapshot.nowPlaying.progressMs);
    });
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setProgressMs((value) => (value + 1000 >= trackDuration ? 0 : value + 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, trackDuration]);

  useEffect(() => {
    const stream = new EventSource('/api/v1/activity/stream');
    stream.addEventListener('playback', (event) => {
      try {
        const update = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as DashboardData['nowPlaying'];
        if (update.userId === data.viewer.id) {
          setData((current) => ({ ...current, nowPlaying: update }));
          setProgressMs(update.progressMs);
        }
      } catch {
        // Keep rendering local activity if the endpoint sends an invalid update.
      }
    });
    return () => stream.close();
  }, [data.viewer.id]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const changeMetric = async (metric: string) => {
    setRankingMetric(metric);
    setRankingLoading(true);
    const entries = await wardfyApi.rankings(metric);
    setRankingEntries(entries);
    setRankingLoading(false);
  };

  const sync = async () => {
    setSyncing(true);
    const snapshot = await wardfyApi.dashboard();
    setData(snapshot);
    setProgressMs(snapshot.nowPlaying.progressMs);
    window.setTimeout(() => {
      setSyncing(false);
      setToast('Tudo em sintonia — dados atualizados agora.');
    }, 620);
  };

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
        return <ChallengesView data={data} onToast={setToast} />;
      case 'historico':
        return <HistoryView data={data} onToast={setToast} />;
      case 'configuracoes':
        return (
          <SettingsView
            data={data}
            onSave={async (settings) => {
              await wardfyApi.updateSettings(data.server.id, settings);
            }}
            onToast={setToast}
          />
        );
      case 'inicio':
      default:
        return (
          <Overview
            data={data}
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
      <div className="ambient ambient--purple" />
      <div className="ambient ambient--lime" />
      <div className="noise-layer" />
      <Sidebar
        active={activeView}
        onChange={setActiveView}
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
      />
      <main className="main-content">
        <Topbar
          active={activeView}
          onMenu={() => setMenuOpen(true)}
          onSync={sync}
          syncing={syncing}
        />
        <div className="connection-strip">
          <span>
            <Wifi size={13} /> MODO DEMONSTRAÇÃO
          </span>
          <p>Dados de exemplo locais — conecte Spotify e Discord para começar de verdade.</p>
          <button
            onClick={() =>
              setToast('A tela de conexão OAuth está disponível pela API configurada.')
            }
          >
            Conectar contas
          </button>
        </div>
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
            <span>✦</span>
            {toast}
            <button onClick={() => setToast(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

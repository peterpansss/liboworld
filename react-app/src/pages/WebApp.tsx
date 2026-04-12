import { useCallback, useState } from 'react';
import { useAppStore, type Tab } from '../store/useAppStore';
import HomeTab from '../components/HomeTab';
import ExploreTab from '../components/ExploreTab';
import ProgramsTab from '../components/ProgramsTab';
import ProgressTab from '../components/ProgressTab';
import RewardsTab from '../components/RewardsTab';
import WorkoutDetail from '../components/WorkoutDetail';
import WorkoutPlayer from '../components/WorkoutPlayer';
import type { PlayerWorkout } from '../components/WorkoutPlayer';
import CustomBuilder from '../components/CustomBuilder';
import AiGenerator from '../components/AiGenerator';
import './WebApp.css';

const TABS: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'programs', icon: '📅', label: 'Programs' },
  { id: 'explore', icon: '🔍', label: 'Explore' },
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'rewards', icon: '🏆', label: 'Rewards' },
  { id: 'progress', icon: '📊', label: 'Progress' },
];

type Screen = 'tabs' | 'detail' | 'player' | 'builder' | 'ai-gen';

function renderTab(tab: Tab, handlers?: { onOpenBuilder?: () => void; onOpenAiGen?: () => void }) {
  switch (tab) {
    case 'home':
      return <HomeTab />;
    case 'explore':
      return <ExploreTab onOpenBuilder={handlers?.onOpenBuilder} onOpenAiGen={handlers?.onOpenAiGen} />;
    case 'programs':
      return <ProgramsTab />;
    case 'progress':
      return <ProgressTab />;
    case 'rewards':
      return <RewardsTab />;
    default:
      return <HomeTab />;
  }
}

export default function WebApp() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const selectedWorkoutId = useAppStore((s) => s.selectedWorkoutId);

  const [screen, setScreen] = useState<Screen>('tabs');
  const [playerWorkout, setPlayerWorkout] = useState<PlayerWorkout | null>(null);

  const handleTabClick = useCallback(
    (id: Tab) => {
      setTab(id);
    },
    [setTab]
  );

  // When a workout is selected from a tab (Explore/Home), show detail
  const currentScreen: Screen = selectedWorkoutId ? 'detail' : screen;

  const handleCloseSecondary = useCallback(() => {
    setScreen('tabs');
  }, []);

  const handleOpenBuilder = useCallback(() => {
    setScreen('builder');
  }, []);

  const handleOpenAiGen = useCallback(() => {
    setScreen('ai-gen');
  }, []);

  const handleBuilderStart = useCallback((workout: PlayerWorkout) => {
    setPlayerWorkout(workout);
    setScreen('player');
  }, []);

  const handlePlayerClose = useCallback(() => {
    setScreen('tabs');
    setPlayerWorkout(null);
  }, []);

  // Render current screen
  if (currentScreen === 'player' && playerWorkout) {
    return (
      <div className="app-shell">
        <WorkoutPlayer workoutId={playerWorkout.id} initialWorkout={playerWorkout} onClose={handlePlayerClose} />
      </div>
    );
  }

  if (currentScreen === 'detail' && selectedWorkoutId) {
    return (
      <div className="app-shell">
        <div className="app-screen fade-in">
          <WorkoutDetail />
        </div>
      </div>
    );
  }

  if (currentScreen === 'builder') {
    return (
      <div className="app-shell">
        <div className="app-screen fade-in">
          <CustomBuilder
            onClose={handleCloseSecondary}
            onStartWorkout={handleBuilderStart}
          />
        </div>
      </div>
    );
  }

  if (currentScreen === 'ai-gen') {
    return (
      <div className="app-shell">
        <div className="app-screen fade-in">
          <AiGenerator
            onClose={handleCloseSecondary}
            onStartWorkout={handleBuilderStart}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-screen fade-in" key={tab}>
        {renderTab(tab, { onOpenBuilder: handleOpenBuilder, onOpenAiGen: handleOpenAiGen })}
      </div>

      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {TABS.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`nav-item${tab === id ? ' active' : ''}`}
            onClick={() => handleTabClick(id)}
            aria-label={`${label} tab`}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

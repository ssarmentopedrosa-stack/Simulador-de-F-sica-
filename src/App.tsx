import { useState, useEffect, useCallback } from 'react';
import { ModuleId, GuidedExperiment, isValidModuleId } from './types/physics';
import { GUIDED_EXPERIMENTS } from './data/experiments';
import { Header } from './components/common/Header';
import { HomePage } from './components/home/HomePage';
import { SHM3D } from './components/simulations/SHM3D';
import { SpringMass3D } from './components/simulations/SpringMass3D';
import { Pendulum3D } from './components/simulations/Pendulum3D';
import { WaveProgressive3D } from './components/simulations/WaveProgressive3D';
import { Interference3D } from './components/simulations/Interference3D';
import { StandingWaves3D } from './components/simulations/StandingWaves3D';
import { DopplerAcoustics3D } from './components/simulations/DopplerAcoustics3D';
import { WavePhenomena3D } from './components/simulations/WavePhenomena3D';
import { ExperimentModal } from './components/modals/ExperimentModal';
import { EnemBankModal } from './components/modals/EnemBankModal';
import { TestRunnerModal } from './components/modals/TestRunnerModal';
import { TeacherModeModal } from './components/modals/TeacherModeModal';

function resolveInitialModule(): ModuleId | 'home' {
  try {
    // 1. Check URL hash anchor (e.g., #doppler or #pendulum)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, '').trim();
      if (isValidModuleId(hash)) {
        return hash;
      }
    }

    // 2. Check query parameter (?module=...)
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const queryMod = params.get('module');
      if (queryMod && isValidModuleId(queryMod)) {
        return queryMod;
      }
    }

    // 3. Check persistent localStorage with strict validation
    const saved = localStorage.getItem('ondas_lab_last_module');
    if (saved && isValidModuleId(saved)) {
      return saved;
    }
  } catch {
    // Safely ignore storage/security exceptions
  }
  return 'home';
}

function resolveInitialLastActive(): ModuleId {
  try {
    const saved = localStorage.getItem('ondas_lab_last_module');
    if (saved && isValidModuleId(saved)) {
      return saved;
    }
  } catch {
    // Safely ignore
  }
  return 'shm';
}

export default function App() {
  const [currentModuleId, setCurrentModuleId] = useState<ModuleId | 'home'>(resolveInitialModule);
  const [lastActiveModule, setLastActiveModule] = useState<ModuleId>(resolveInitialLastActive);

  const [activeExperiment, setActiveExperiment] = useState<GuidedExperiment | null>(null);
  const [isEnemBankOpen, setIsEnemBankOpen] = useState<boolean>(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState<boolean>(false);
  const [isTeacherModeOpen, setIsTeacherModeOpen] = useState<boolean>(false);

  // Synchronized module selection with localStorage and URL hash
  const handleSelectModule = useCallback((modId: ModuleId | 'home') => {
    if (modId === 'home') {
      setCurrentModuleId('home');
      try {
        localStorage.removeItem('ondas_lab_last_module');
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch {
        // Ignored
      }
    } else if (isValidModuleId(modId)) {
      setCurrentModuleId(modId);
      setLastActiveModule(modId);
      try {
        localStorage.setItem('ondas_lab_last_module', modId);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `#${modId}`);
        }
      } catch {
        // Ignored
      }
    } else {
      // Unrecognized or corrupted module ID: open home without throwing error
      setCurrentModuleId('home');
    }
  }, []);

  // Browser back/forward navigation sync (hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '').trim();
      if (isValidModuleId(hash)) {
        setCurrentModuleId(hash);
        setLastActiveModule(hash);
      } else if (!hash) {
        setCurrentModuleId('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Open guided experiment for current module
  const handleOpenExperimentForCurrent = () => {
    if (currentModuleId === 'home') return;
    const exp = GUIDED_EXPERIMENTS.find((e) => e.moduleId === currentModuleId) || GUIDED_EXPERIMENTS[0];
    setActiveExperiment(exp);
  };

  // Handle switching module from ENEM question test action
  const handleEnemModuleLaunch = (modId: ModuleId) => {
    handleSelectModule(modId);
  };

  // Accessible global keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in an input field or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Escape dismisses any open dialog or modal
      if (e.key === 'Escape') {
        if (activeExperiment) setActiveExperiment(null);
        else if (isEnemBankOpen) setIsEnemBankOpen(false);
        else if (isTestRunnerOpen) setIsTestRunnerOpen(false);
        else if (isTeacherModeOpen) setIsTeacherModeOpen(false);
        return;
      }

      // 'P' toggles Teacher Presentation Mode
      if (key === 'p') {
        setIsTeacherModeOpen((prev) => !prev);
      }
      // 'E' toggles ENEM Question Bank
      else if (key === 'e') {
        setIsEnemBankOpen((prev) => !prev);
      }
      // 'T' toggles Physical Invariants Test Runner
      else if (key === 't') {
        setIsTestRunnerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeExperiment, isEnemBankOpen, isTestRunnerOpen, isTeacherModeOpen]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Bar Header */}
      <Header
        currentModuleId={currentModuleId}
        onSelectModule={handleSelectModule}
        onOpenTeacherMode={() => setIsTeacherModeOpen(true)}
        onOpenEnemBank={() => setIsEnemBankOpen(true)}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
      />

      {/* Main Simulation Viewport or Home Portal */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentModuleId === 'home' && (
          <HomePage
            onSelectModule={handleSelectModule}
            onOpenTeacherMode={() => setIsTeacherModeOpen(true)}
            onOpenEnemBank={() => setIsEnemBankOpen(true)}
            onOpenTestRunner={() => setIsTestRunnerOpen(true)}
            lastModuleId={lastActiveModule}
          />
        )}

        {currentModuleId === 'shm' && (
          <SHM3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'spring_mass' && (
          <SpringMass3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'pendulum' && (
          <Pendulum3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'waves' && (
          <WaveProgressive3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'interference' && (
          <Interference3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'standing_waves' && (
          <StandingWaves3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'doppler' && (
          <DopplerAcoustics3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}

        {currentModuleId === 'phenomena' && (
          <WavePhenomena3D onOpenExperiment={handleOpenExperimentForCurrent} />
        )}
      </main>

      {/* Guided Investigation Modal */}
      {activeExperiment && (
        <ExperimentModal
          experiment={activeExperiment}
          onClose={() => setActiveExperiment(null)}
        />
      )}

      {/* ENEM Question Bank Modal */}
      {isEnemBankOpen && (
        <EnemBankModal
          onClose={() => setIsEnemBankOpen(false)}
          onOpenSimulationModule={handleEnemModuleLaunch}
        />
      )}

      {/* Automated Physical Invariants Test Runner Modal */}
      {isTestRunnerOpen && (
        <TestRunnerModal onClose={() => setIsTestRunnerOpen(false)} />
      )}

      {/* Teacher Presentation Mode Modal */}
      {isTeacherModeOpen && (
        <TeacherModeModal
          currentModuleId={currentModuleId === 'home' ? lastActiveModule : currentModuleId}
          onClose={() => setIsTeacherModeOpen(false)}
          onSwitchModule={(mod) => {
            handleSelectModule(mod);
          }}
        />
      )}
    </div>
  );
}

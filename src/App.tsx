import { useState, useEffect } from 'react';
import { ModuleId, GuidedExperiment } from './types/physics';
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

export default function App() {
  const [currentModuleId, setCurrentModuleId] = useState<ModuleId | 'home'>(() => {
    try {
      const saved = localStorage.getItem('ondas_lab_last_module');
      return (saved as ModuleId) || 'home';
    } catch {
      return 'home';
    }
  });

  const [lastActiveModule, setLastActiveModule] = useState<ModuleId>(() => {
    try {
      const saved = localStorage.getItem('ondas_lab_last_module');
      return (saved as ModuleId) || 'shm';
    } catch {
      return 'shm';
    }
  });

  const [activeExperiment, setActiveExperiment] = useState<GuidedExperiment | null>(null);
  const [isEnemBankOpen, setIsEnemBankOpen] = useState<boolean>(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState<boolean>(false);
  const [isTeacherModeOpen, setIsTeacherModeOpen] = useState<boolean>(false);

  // Save last active module to localStorage
  const handleSelectModule = (modId: ModuleId | 'home') => {
    setCurrentModuleId(modId);
    if (modId !== 'home') {
      setLastActiveModule(modId);
      try {
        localStorage.setItem('ondas_lab_last_module', modId);
      } catch {
        // Ignored
      }
    }
  };

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

  // Keyboard shortcut listener (Space to play/pause or H for HUD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle teacher mode on key 'P' if not typing in input
      if (e.key === 'p' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsTeacherModeOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

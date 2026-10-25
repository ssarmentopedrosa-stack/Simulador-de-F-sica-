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
import { WorkPower3D } from './components/simulations/WorkPower3D';
import { EnergyConservation3D } from './components/simulations/EnergyConservation3D';
import { ImpulseMomentum3D } from './components/simulations/ImpulseMomentum3D';
import { Collisions3D } from './components/simulations/Collisions3D';
import { DensityPressure3D } from './components/simulations/DensityPressure3D';
import { StevinTheorem3D } from './components/simulations/StevinTheorem3D';
import { PascalPrinciple3D } from './components/simulations/PascalPrinciple3D';
import { BuoyancyArchimedes3D } from './components/simulations/BuoyancyArchimedes3D';
import { IdealGas3D } from './components/simulations/IdealGas3D';
import { FirstLawThermodynamics3D } from './components/simulations/FirstLawThermodynamics3D';
import { CarnotHeatEngines3D } from './components/simulations/CarnotHeatEngines3D';
import { Calorimetry3D } from './components/simulations/Calorimetry3D';
import { CoulombLaw3D } from './components/simulations/CoulombLaw3D';
import { ElectricFieldLines3D } from './components/simulations/ElectricFieldLines3D';
import { ElectricPotential3D } from './components/simulations/ElectricPotential3D';
import { ParallelPlateCapacitor3D } from './components/simulations/ParallelPlateCapacitor3D';
import { ExperimentModal } from './components/modals/ExperimentModal';
import { EnemBankModal } from './components/modals/EnemBankModal';
import { TestRunnerModal } from './components/modals/TestRunnerModal';
import { TeacherModeModal } from './components/modals/TeacherModeModal';


import { parseLabUrlState, serializeLabUrlState } from './physics/urlState';

function resolveInitialState(): { moduleId: ModuleId | 'home'; params: Record<string, any> } {
  try {
    if (typeof window !== 'undefined') {
      const parsed = parseLabUrlState(window.location.href);
      if (parsed.moduleId) {
        return { moduleId: parsed.moduleId, params: parsed.params };
      }
    }

    // Check persistent localStorage with strict validation
    const saved = localStorage.getItem('ondas_lab_last_module');
    if (saved && isValidModuleId(saved)) {
      return { moduleId: saved, params: {} };
    }
  } catch {
    // Safely ignore storage/security exceptions
  }
  return { moduleId: 'home', params: {} };
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
  const [initialLoadedState] = useState(resolveInitialState);
  const [currentModuleId, setCurrentModuleId] = useState<ModuleId | 'home'>(initialLoadedState.moduleId);
  const [currentParams, setCurrentParams] = useState<Record<string, any>>(initialLoadedState.params);
  const [lastActiveModule, setLastActiveModule] = useState<ModuleId>(() => {
    if (initialLoadedState.moduleId !== 'home') return initialLoadedState.moduleId;
    return resolveInitialLastActive();
  });

  const [activeExperiment, setActiveExperiment] = useState<GuidedExperiment | null>(null);
  const [isEnemBankOpen, setIsEnemBankOpen] = useState<boolean>(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState<boolean>(false);
  const [isTeacherModeOpen, setIsTeacherModeOpen] = useState<boolean>(false);

  // Synchronized parameter changes with URL hash
  const handleParamsChange = useCallback(
    (params: Record<string, any>) => {
      setCurrentParams(params);
      if (currentModuleId !== 'home') {
        const hashStr = serializeLabUrlState(currentModuleId, params);
        try {
          if (typeof window !== 'undefined') {
            const finalHash = hashStr.startsWith('#') ? hashStr : `#${hashStr}`;
            window.history.replaceState(null, '', finalHash);
          }
        } catch {
          // Ignored
        }
      }
    },
    [currentModuleId]
  );

  // Synchronized module selection with localStorage and URL hash
  const handleSelectModule = useCallback(
    (modId: ModuleId | 'home', initialPresetParams?: Record<string, any>) => {
      if (modId === 'home') {
        setCurrentModuleId('home');
        setCurrentParams({});
        try {
          localStorage.removeItem('ondas_lab_last_module');
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } catch {
          // Ignored
        }
      } else if (isValidModuleId(modId)) {
        setCurrentModuleId(modId);
        setLastActiveModule(modId);
        const nextParams = initialPresetParams || {};
        setCurrentParams(nextParams);
        try {
          localStorage.setItem('ondas_lab_last_module', modId);
          if (typeof window !== 'undefined') {
            const hashStr = serializeLabUrlState(modId, nextParams);
            const finalHash = hashStr.startsWith('#') ? hashStr : `#${hashStr}`;
            window.history.replaceState(null, '', finalHash);
          }
        } catch {
          // Ignored
        }
      } else {
        // Unrecognized or corrupted module ID: open home without throwing error
        setCurrentModuleId('home');
        setCurrentParams({});
      }
    },
    []
  );

  // Browser back/forward navigation sync (hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseLabUrlState(window.location.href);
      if (parsed.moduleId) {
        setCurrentModuleId(parsed.moduleId);
        setLastActiveModule(parsed.moduleId);
        setCurrentParams(parsed.params);
      } else if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#home') {
        setCurrentModuleId('home');
        setCurrentParams({});
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
        currentParams={currentParams}
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
          <SHM3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'spring_mass' && (
          <SpringMass3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'pendulum' && (
          <Pendulum3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'waves' && (
          <WaveProgressive3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'interference' && (
          <Interference3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'standing_waves' && (
          <StandingWaves3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'doppler' && (
          <DopplerAcoustics3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'phenomena' && (
          <WavePhenomena3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'work_power' && (
          <WorkPower3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'energy_conservation' && (
          <EnergyConservation3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'impulse_momentum' && (
          <ImpulseMomentum3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'collisions' && (
          <Collisions3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'density_pressure' && (
          <DensityPressure3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'stevin_theorem' && (
          <StevinTheorem3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'pascal_principle' && (
          <PascalPrinciple3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'buoyancy_archimedes' && (
          <BuoyancyArchimedes3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'ideal_gas' && (
          <IdealGas3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'first_law_thermodynamics' && (
          <FirstLawThermodynamics3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'carnot_heat_engines' && (
          <CarnotHeatEngines3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'calorimetry' && (
          <Calorimetry3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'coulomb_law' && (
          <CoulombLaw3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'electric_field_lines' && (
          <ElectricFieldLines3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'electric_potential' && (
          <ElectricPotential3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
        )}

        {currentModuleId === 'parallel_plate_capacitor' && (
          <ParallelPlateCapacitor3D
            onOpenExperiment={handleOpenExperimentForCurrent}
            initialParams={currentParams}
            onParamsChange={handleParamsChange}
          />
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

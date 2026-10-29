/**
 * ONDAS LAB 3D - Physical Types and Data Models
 */

export type ModuleId =
  | 'shm'
  | 'spring_mass'
  | 'pendulum'
  | 'waves'
  | 'interference'
  | 'standing_waves'
  | 'doppler'
  | 'phenomena'
  | 'work_power'
  | 'energy_conservation'
  | 'impulse_momentum'
  | 'collisions'
  | 'density_pressure'
  | 'stevin_theorem'
  | 'pascal_principle'
  | 'buoyancy_archimedes'
  | 'ideal_gas'
  | 'first_law_thermodynamics'
  | 'carnot_heat_engines'
  | 'calorimetry'
  | 'coulomb_law'
  | 'electric_field_lines'
  | 'electric_potential'
  | 'parallel_plate_capacitor';

export const VALID_MODULE_IDS: readonly ModuleId[] = [
  'shm',
  'spring_mass',
  'pendulum',
  'waves',
  'interference',
  'standing_waves',
  'doppler',
  'phenomena',
  'work_power',
  'energy_conservation',
  'impulse_momentum',
  'collisions',
  'density_pressure',
  'stevin_theorem',
  'pascal_principle',
  'buoyancy_archimedes',
  'ideal_gas',
  'first_law_thermodynamics',
  'carnot_heat_engines',
  'calorimetry',
  'coulomb_law',
  'electric_field_lines',
  'electric_potential',
  'parallel_plate_capacitor',
] as const;

export function isValidModuleId(id: unknown): id is ModuleId {
  return typeof id === 'string' && (VALID_MODULE_IDS as readonly string[]).includes(id);
}

export type ModuleCategory =
  | 'mechanics'
  | 'oscillations'
  | 'mechanical_waves'
  | 'wave_phenomena'
  | 'acoustics'
  | 'hydrostatics'
  | 'thermodynamics'
  | 'electricity';

export interface ModuleInfo {
  id: ModuleId;
  code: string;
  title: string;
  shortDesc: string;
  category: ModuleCategory;
  categoryLabel: string;
  area: 'mechanics' | 'waves' | 'hydrostatics' | 'thermodynamics' | 'electricity';
  areaLabel: string;
  iconName: string;
  equations: string[];
}


export interface SimulationClock {
  time: number;
  dt: number;
  speed: number;
  isRunning: boolean;
  is2DView: boolean;
  showVectors: boolean;
  showTrajectories: boolean;
  showFormulas: boolean;
  showGraphs: boolean;
}

export interface DataPoint {
  t: number;
  [key: string]: number;
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  unit: string;
}

export interface PhysicalQuantity {
  label: string;
  symbol: string;
  value: number;
  unit: string;
  precision?: number;
  highlight?: boolean;
}

export interface GravityPreset {
  name: string;
  g: number;
  description: string;
}

export interface PredictionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface PredictionQuestion {
  question: string;
  options: PredictionOption[];
}

export interface ExperimentCheckpoint {
  id: string;
  text: string;
  tip?: string;
}

export interface ExperimentStepItem {
  id: string;
  num: number;
  title: string;
  subtitle: string;
  instructions: string[];
}

export interface GuidedExperiment {
  id: string;
  moduleId: ModuleId;
  title: string;
  objective: string;
  suggestedParams: Record<string, number | string>;
  predictionQuestion?: PredictionQuestion;
  checkpoints?: (string | ExperimentCheckpoint)[];
  stepList?: ExperimentStepItem[];
  steps: {
    prediction: string;
    experimentation: string;
    analysis: string;
    conclusion: string;
  };
  scientificExplanation: string;
}

export interface EnemQuestion {
  id: string;
  moduleId: ModuleId;
  topic: string;
  yearReference: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  context: string;
  statement: string;
  options: {
    letter: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  formulas: string[];
  testParams?: Record<string, number | string>;
}

export interface AutomatedTestResult {
  id: string;
  name: string;
  module: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  errorMargin?: string;
  details?: string;
}

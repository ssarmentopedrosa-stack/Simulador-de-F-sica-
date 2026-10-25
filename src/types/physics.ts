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
  | 'phenomena';

export const VALID_MODULE_IDS: readonly ModuleId[] = [
  'shm',
  'spring_mass',
  'pendulum',
  'waves',
  'interference',
  'standing_waves',
  'doppler',
  'phenomena',
] as const;

export function isValidModuleId(id: unknown): id is ModuleId {
  return typeof id === 'string' && (VALID_MODULE_IDS as readonly string[]).includes(id);
}

export type ModuleCategory =
  | 'oscillations'
  | 'mechanical_waves'
  | 'wave_phenomena'
  | 'acoustics';

export interface ModuleInfo {
  id: ModuleId;
  code: string;
  title: string;
  shortDesc: string;
  category: ModuleCategory;
  categoryLabel: string;
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

export interface ExperimentStep {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  userPrompt: string;
  defaultAnswer?: string;
}

export interface GuidedExperiment {
  id: string;
  moduleId: ModuleId;
  title: string;
  objective: string;
  suggestedParams: Record<string, number | string>;
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

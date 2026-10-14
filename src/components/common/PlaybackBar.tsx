import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Compass,
  ArrowRightLeft,
  Eye,
  FileCode2,
  Box,
} from 'lucide-react';
import { SimulationClock } from '../../types/physics';

interface PlaybackBarProps {
  clock: SimulationClock;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleVectors: () => void;
  onToggleTrajectories: () => void;
  onToggleFormulas: () => void;
  onToggle2DView: () => void;
  onResetCamera?: () => void;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  clock,
  onTogglePlay,
  onReset,
  onStepForward,
  onChangeSpeed,
  onToggleVectors,
  onToggleTrajectories,
  onToggleFormulas,
  onToggle2DView,
  onResetCamera,
}) => {
  const speeds = [0.25, 0.5, 1.0, 1.5, 2.0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 border border-slate-800 rounded-lg shadow-xl backdrop-blur-md">
      {/* Primary transport buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-sm ${
            clock.isRunning
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold'
          }`}
          title={clock.isRunning ? 'Pausar Simulação (Espaço)' : 'Iniciar Simulação (Espaço)'}
        >
          {clock.isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{clock.isRunning ? 'Pausar' : 'Iniciar'}</span>
        </button>

        <button
          onClick={onStepForward}
          disabled={clock.isRunning}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-200 transition-colors border border-slate-700"
          title="Avançar Passo (+Δt)"
        >
          <StepForward className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Passo</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
          title="Reiniciar Simulação (t = 0)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Reiniciar</span>
        </button>

        {/* Physical Time readout */}
        <div className="ml-2 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-cyan-400">
          <span className="text-slate-500 mr-1">t:</span>
          {clock.time.toFixed(2)}s
        </div>
      </div>

      {/* Speed control segmented buttons */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-md border border-slate-800">
        <span className="text-[10px] text-slate-500 uppercase px-1.5 font-medium">Vel:</span>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onChangeSpeed(s)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
              clock.speed === s
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* View & Visual toggles */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleVectors}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
            clock.showVectors
              ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
              : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Exibir ou ocultar vetores físicos (velocidade, aceleração, forças)"
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span>Vetores</span>
        </button>

        <button
          onClick={onToggleTrajectories}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
            clock.showTrajectories
              ? 'bg-purple-950/50 border-purple-700/60 text-purple-300'
              : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Exibir ou ocultar rastros de trajetória"
        >
          <Eye className="w-3 h-3" />
          <span className="hidden md:inline">Trajetória</span>
        </button>

        <button
          onClick={onToggleFormulas}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
            clock.showFormulas
              ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
              : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Exibir ou ocultar painel de fórmulas matemáticas"
        >
          <FileCode2 className="w-3 h-3" />
          <span className="hidden md:inline">Fórmulas</span>
        </button>

        <button
          onClick={onToggle2DView}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
            clock.is2DView
              ? 'bg-amber-950/50 border-amber-700/60 text-amber-300'
              : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar entre Perspectiva 3D e Projeção Ortogonal 2D"
        >
          <Box className="w-3 h-3" />
          <span>{clock.is2DView ? '2D' : '3D'}</span>
        </button>

        {onResetCamera && (
          <button
            onClick={onResetCamera}
            className="p-1 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-800"
            title="Restaurar posição padrão da câmera"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

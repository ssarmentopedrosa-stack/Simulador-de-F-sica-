import React, { useEffect } from 'react';
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
  Download,
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
  onExportCsv?: () => void;
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
  onExportCsv,
}) => {
  const speeds = [0.25, 0.5, 1.0, 1.5, 2.0];

  // Dedicated keyboard shortcuts for simulation transport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside any form input or editable field
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Space: toggle play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      }
      // ArrowRight: advance one step
      else if (e.key === 'ArrowRight' && !clock.isRunning) {
        e.preventDefault();
        onStepForward();
      }
      // 'R' / 'r': reset simulation
      else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clock.isRunning, onTogglePlay, onStepForward, onReset]);

  return (
    <div
      role="toolbar"
      aria-label="Barra de controle e reprodução da simulação"
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 border border-slate-800 rounded-lg shadow-xl backdrop-blur-md"
    >
      {/* Primary transport buttons */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Controles de tempo">
        <button
          onClick={onTogglePlay}
          aria-label={clock.isRunning ? 'Pausar simulação (Espaço)' : 'Iniciar simulação (Espaço)'}
          aria-pressed={clock.isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-sm cursor-pointer ${
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
          aria-label="Avançar um passo de tempo na simulação (Seta Direita)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-200 transition-colors border border-slate-700 cursor-pointer"
          title="Avançar Passo (+Δt - Seta Direita)"
        >
          <StepForward className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Passo</span>
        </button>

        <button
          onClick={onReset}
          aria-label="Reiniciar simulação para o tempo zero (Tecla R)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700 cursor-pointer"
          title="Reiniciar Simulação (t = 0 - Tecla R)"
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
      <div
        className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-md border border-slate-800"
        role="group"
        aria-label="Velocidade da simulação"
      >
        <span className="text-[10px] text-slate-500 uppercase px-1.5 font-medium">Vel:</span>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onChangeSpeed(s)}
            aria-label={`Velocidade ${s} vezes`}
            aria-pressed={clock.speed === s}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer ${
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
      <div className="flex items-center gap-1.5" role="group" aria-label="Opções visuais e de câmera">
        <button
          onClick={onToggleVectors}
          aria-label="Exibir ou ocultar vetores físicos"
          aria-pressed={clock.showVectors}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border cursor-pointer ${
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
          aria-label="Exibir ou ocultar rastros de trajetória"
          aria-pressed={clock.showTrajectories}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border cursor-pointer ${
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
          aria-label="Exibir ou ocultar painel de fórmulas matemáticas"
          aria-pressed={clock.showFormulas}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border cursor-pointer ${
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
          aria-label={clock.is2DView ? 'Mudar para perspectiva 3D' : 'Mudar para projeção 2D'}
          aria-pressed={clock.is2DView}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border cursor-pointer ${
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
            aria-label="Restaurar posição padrão da câmera 3D"
            className="p-1 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-800 cursor-pointer"
            title="Restaurar posição padrão da câmera"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        )}

        {onExportCsv && (
          <button
            onClick={onExportCsv}
            aria-label="Exportar dados registrados da simulação em CSV"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700 cursor-pointer shadow-xs ml-1"
            title="Exportar CSV (padrão brasileiro: ';' e vírgula decimal)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        )}
      </div>
    </div>
  );
};

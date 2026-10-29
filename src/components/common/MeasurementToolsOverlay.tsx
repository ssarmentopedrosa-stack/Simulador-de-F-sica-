/**
 * ONDAS LAB 3D - Painel e Controles de Ferramentas de Medição Científica
 * - Régua Tridimensional (Distância Euclidiana d = √(Δx² + Δy² + Δz²))
 * - Sonda de Inspeção (Sensor Probe pontual para campo, potencial ou amplitude)
 * - Cotas Dimensionais de Nós e Ventres (λ/2 e λ/4)
 */

import React from 'react';
import { Ruler, Crosshair, HelpCircle, Check, RotateCcw } from 'lucide-react';
import { Point3D, calculateDistance3D } from '../../physics/measurement';

interface MeasurementToolsOverlayProps {
  // Régua
  isRulerActive: boolean;
  onToggleRuler: () => void;
  rulerPointA: Point3D;
  rulerPointB: Point3D;
  onChangePointA?: (p: Point3D) => void;
  onChangePointB?: (p: Point3D) => void;
  rulerMaxRange?: number;

  // Sonda de Inspeção
  isProbeActive?: boolean;
  onToggleProbe?: () => void;
  probeData?: {
    title: string;
    coord: Point3D;
    quantities: { label: string; value: string; unit: string; highlight?: boolean }[];
    status?: string;
  };

  // Ondas Estacionárias: Cotas de Nós e Ventres (λ/2)
  standingWaveSpacing?: {
    wavelength: number;
    nodeToNodeDist: number;             // λ / 2
    antinodeToAntinodeDist: number;     // λ / 2
    nodeToAntinodeDist: number;         // λ / 4
    activeHarmonic: number;
    nodePositions: number[];
    antinodePositions: number[];
  };
  showHarmonicMarkers?: boolean;
  onToggleHarmonicMarkers?: () => void;
}

export const MeasurementToolsOverlay: React.FC<MeasurementToolsOverlayProps> = ({
  isRulerActive,
  onToggleRuler,
  rulerPointA,
  rulerPointB,
  onChangePointA,
  onChangePointB,
  rulerMaxRange = 4.0,
  isProbeActive = false,
  onToggleProbe,
  probeData,
  standingWaveSpacing,
  showHarmonicMarkers = false,
  onToggleHarmonicMarkers,
}) => {
  const measurement = calculateDistance3D(rulerPointA, rulerPointB);

  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Tool Toggles Bar */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-lg backdrop-blur-md shadow-lg">
        {/* Toggle Régua 3D */}
        <button
          onClick={onToggleRuler}
          aria-label={isRulerActive ? 'Desativar régua 3D' : 'Ativar régua de medição 3D'}
          aria-pressed={isRulerActive}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
            isRulerActive
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
              : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/80'
          }`}
          title="Régua 3D: Mede a distância euclidiana exata entre dois pontos da cena"
        >
          <Ruler className="w-3.5 h-3.5 text-cyan-300" />
          <span>Régua</span>
        </button>

        {/* Toggle Sonda de Inspeção (Probe) */}
        {onToggleProbe && (
          <button
            onClick={onToggleProbe}
            aria-label={isProbeActive ? 'Desativar sonda de inspeção' : 'Ativar sonda de inspeção pontual'}
            aria-pressed={isProbeActive}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
              isProbeActive
                ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/80'
            }`}
            title="Sonda de Inspeção (Probe): Mede grandezas físicas pontuais (amplitude, potencial, campo) em tempo real"
          >
            <Crosshair className="w-3.5 h-3.5 text-purple-300" />
            <span>Sonda</span>
          </button>
        )}

        {/* Toggle Marcador de Nós e Ventres (λ/2) nas Ondas Estacionárias */}
        {standingWaveSpacing && onToggleHarmonicMarkers && (
          <button
            onClick={onToggleHarmonicMarkers}
            aria-label={showHarmonicMarkers ? 'Ocultar cotas de nós e ventres' : 'Exibir cotas dimensionais λ/2 entre nós e ventres'}
            aria-pressed={showHarmonicMarkers}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
              showHarmonicMarkers
                ? 'bg-amber-600 text-slate-950 font-bold border-amber-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/80'
            }`}
            title="Cotas de Ressonância: Mostra as cotas espaciais λ/2 entre nós consecutivos e ventres consecutivos"
          >
            <span className="font-mono text-xs">λ/2</span>
            <span>Nós & Ventres</span>
          </button>
        )}
      </div>

      {/* Régua 3D - Painel Ativo */}
      {isRulerActive && (
        <div className="bg-slate-900/95 border border-cyan-800/60 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-2 max-w-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              <span>Régua de Medição 3D</span>
            </span>
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
              d = {measurement.formattedDistance}
            </span>
          </div>

          {/* Distância Euclidiana em Destaque */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Distância Total (d):</span>
            <span className="text-base font-mono font-extrabold text-cyan-300">
              {measurement.formattedDistance}
            </span>
          </div>

          {/* Decomposição cartesiana */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
              <span className="text-[9px] text-slate-500 block">Δx</span>
              <span className="text-slate-200">{measurement.dx.toFixed(2).replace('.', ',')} m</span>
            </div>
            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
              <span className="text-[9px] text-slate-500 block">Δy</span>
              <span className="text-slate-200">{measurement.dy.toFixed(2).replace('.', ',')} m</span>
            </div>
            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
              <span className="text-[9px] text-slate-500 block">Δz</span>
              <span className="text-slate-200">{measurement.dz.toFixed(2).replace('.', ',')} m</span>
            </div>
          </div>

          {/* Controles de Posicionamento da Régua */}
          {onChangePointA && onChangePointB && (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Ponto A (origem):</span>
                  <span className="font-mono text-cyan-300">{rulerPointA.x.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={rulerMaxRange}
                  step="0.05"
                  value={rulerPointA.x}
                  onChange={(e) => onChangePointA({ ...rulerPointA, x: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Ponto B (destino):</span>
                  <span className="font-mono text-cyan-300">{rulerPointB.x.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={rulerMaxRange}
                  step="0.05"
                  value={rulerPointB.x}
                  onChange={(e) => onChangePointB({ ...rulerPointB, x: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sonda de Inspeção (Probe) - Painel Ativo */}
      {isProbeActive && probeData && (
        <div className="bg-slate-900/95 border border-purple-800/60 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-2 max-w-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              <span>{probeData.title}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              x = {probeData.coord.x.toFixed(2)} m
            </span>
          </div>

          {probeData.status && (
            <div className="px-2 py-1 rounded bg-purple-950/40 border border-purple-800/50 text-[11px] text-purple-200 font-medium">
              {probeData.status}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            {probeData.quantities.map((q, idx) => (
              <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{q.label}</span>
                <span className={`font-mono text-xs font-bold ${q.highlight ? 'text-purple-300' : 'text-slate-200'}`}>
                  {q.value} {q.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ondas Estacionárias: Cotas de Nós e Ventres (λ/2) */}
      {showHarmonicMarkers && standingWaveSpacing && (
        <div className="bg-slate-900/95 border border-amber-800/60 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-2 max-w-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>Cotas de Harmônicos (Ressonância)</span>
            </span>
            <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
              n = {standingWaveSpacing.activeHarmonic}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Entre Nós Consecutivos (Δx):</span>
              <span className="font-mono text-amber-300 font-bold">
                λ/2 = {standingWaveSpacing.nodeToNodeDist.toFixed(3).replace('.', ',')} m
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Entre Ventres Consecutivos (Δx):</span>
              <span className="font-mono text-amber-300 font-bold">
                λ/2 = {standingWaveSpacing.antinodeToAntinodeDist.toFixed(3).replace('.', ',')} m
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Entre Nó e Ventre Adjacente:</span>
              <span className="font-mono text-cyan-300 font-semibold">
                λ/4 = {standingWaveSpacing.nodeToAntinodeDist.toFixed(3).replace('.', ',')} m
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80">
            <strong>Condição de Invariância:</strong> Em qualquer onda estacionária, a distância entre nós sucessivos é rigidamente metade do comprimento de onda ($\Delta x = \lambda / 2$).
          </div>
        </div>
      )}
    </div>
  );
};

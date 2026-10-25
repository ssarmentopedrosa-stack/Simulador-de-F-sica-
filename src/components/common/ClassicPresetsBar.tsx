import React, { useState } from 'react';
import { ModuleId } from '../../types/physics';
import { LAB_PRESETS, LabPreset } from '../../data/labPresets';
import { copyShareableSimulationLink } from '../../physics/urlState';
import { Sparkles, Link2, Check } from 'lucide-react';

interface ClassicPresetsBarProps {
  moduleId: ModuleId;
  onApplyPreset: (params: Record<string, any>) => void;
  currentParams?: Record<string, any>;
  className?: string;
  showShareButton?: boolean;
}

export const ClassicPresetsBar: React.FC<ClassicPresetsBarProps> = ({
  moduleId,
  onApplyPreset,
  currentParams,
  className = '',
  showShareButton = true,
}) => {
  const presets = LAB_PRESETS[moduleId] || [];
  const [copied, setCopied] = useState(false);

  if (presets.length === 0) {
    return null;
  }

  const handleCopyLink = async () => {
    const success = await copyShareableSimulationLink(moduleId, currentParams);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  // Helper to determine if currentParams matches this preset
  const isPresetActive = (preset: LabPreset): boolean => {
    if (!currentParams) return false;
    for (const [key, val] of Object.entries(preset.params)) {
      if (currentParams[key] === undefined) return false;
      if (typeof val === 'number') {
        if (Math.abs(currentParams[key] - val) > 0.001) return false;
      } else if (typeof val === 'object' && val !== null) {
        if (JSON.stringify(currentParams[key]) !== JSON.stringify(val)) return false;
      } else if (currentParams[key] !== val) {
        return false;
      }
    }
    return true;
  };

  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2 shrink-0 ${className}`}
    >
      {/* Top Header Row with Title and Copy Link Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Exemplos clássicos</span>
        </div>

        {showShareButton && (
          <button
            onClick={handleCopyLink}
            className={`text-[11px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 cursor-pointer font-medium ${
              copied
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700/80 text-cyan-400 hover:text-cyan-300'
            }`}
            title="Copiar link com parâmetros desta simulação para compartilhar ou salvar"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Link copiado!</span>
              </>
            ) : (
              <>
                <Link2 className="w-3 h-3 text-cyan-400" />
                <span>Copiar link da simulação</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Row of Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => {
          const active = isPresetActive(preset);
          return (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset.params)}
              title={preset.description}
              className={`px-2.5 py-1 text-xs rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300 font-semibold shadow-sm'
                  : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <span>{preset.label}</span>
              {preset.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    active ? 'bg-amber-900/60 text-amber-200' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {preset.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

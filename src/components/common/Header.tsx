import React from 'react';
import { ModuleId } from '../../types/physics';
import { MODULES } from '../../data/modules';
import { Presentation, Award, CheckCircle2, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentModuleId: ModuleId | 'home';
  onSelectModule: (id: ModuleId | 'home') => void;
  onOpenTeacherMode: () => void;
  onOpenEnemBank: () => void;
  onOpenTestRunner: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModuleId,
  onSelectModule,
  onOpenTeacherMode,
  onOpenEnemBank,
  onOpenTestRunner,
}) => {
  return (
    <header className="w-full bg-slate-950 border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-6 z-30">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectModule('home')}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity whitespace-nowrap">
              ONDAS LAB 3D
            </span>
            <span className="hidden sm:inline text-[11px] font-mono text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">
              v2.0
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: Module Selector Dropdown & Quick Navigation */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-300">
        <button
          onClick={() => onSelectModule('home')}
          className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
            currentModuleId === 'home' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Visão Geral
        </button>

        {/* Module quick select */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-200">
            <span className="text-slate-400 font-normal">Módulo:</span>
            <span className="text-cyan-400 font-semibold max-w-[200px] truncate">
              {currentModuleId === 'home'
                ? 'Selecionar Experimento'
                : MODULES.find((m) => m.id === currentModuleId)?.title}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-1 w-72 bg-slate-900/95 border border-slate-800 rounded-lg shadow-2xl p-1.5 hidden group-hover:block backdrop-blur-md z-50">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1">
              Módulos de Simulação
            </div>
            {MODULES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  currentModuleId === mod.id
                    ? 'bg-cyan-950/60 text-cyan-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] text-slate-400">{mod.code}</div>
                  <div className="truncate">{mod.title}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
                  {mod.categoryLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Compact Selector */}
      <div className="flex lg:hidden items-center">
        <select
          value={currentModuleId}
          onChange={(e) => onSelectModule(e.target.value as ModuleId | 'home')}
          className="bg-slate-900 border border-slate-800 text-xs text-cyan-400 rounded px-2 py-1 max-w-[130px] sm:max-w-[170px] truncate focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
        >
          <option value="home">Visão Geral</option>
          {MODULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      {/* Zone 3: Actions (Teacher Mode, ENEM, Tests) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenEnemBank}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-900/50 transition-colors whitespace-nowrap cursor-pointer"
          title="Banco de Questões ENEM (Atalho: E)"
        >
          <Award className="w-3.5 h-3.5" />
          <span>ENEM</span>
          <kbd className="hidden md:inline text-[9px] bg-slate-950 px-1 rounded text-slate-500 border border-slate-800">E</kbd>
        </button>

        <button
          onClick={onOpenTestRunner}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/50 transition-colors whitespace-nowrap cursor-pointer"
          title="Verificação de Modelos Matemáticos e Invariantes Físicas (Atalho: T)"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Testes</span>
          <kbd className="hidden md:inline text-[9px] bg-slate-950 px-1 rounded text-slate-500 border border-slate-800">T</kbd>
        </button>

        <button
          onClick={onOpenTeacherMode}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-sm transition-all whitespace-nowrap cursor-pointer"
          title="Modo Apresentação para Sala de Aula e Projetores (Atalho: P)"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Modo Professor</span>
          <span className="sm:hidden">Professor</span>
          <kbd className="hidden md:inline text-[9px] bg-blue-950/80 px-1 rounded text-blue-200 border border-blue-400/40">P</kbd>
        </button>
      </div>
    </header>
  );
};

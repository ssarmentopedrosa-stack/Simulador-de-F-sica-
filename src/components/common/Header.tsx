import React, { useState } from 'react';
import { ModuleId } from '../../types/physics';
import { MODULES } from '../../data/modules';
import { Presentation, Award, CheckCircle2, ChevronDown, Link2, Check, HelpCircle } from 'lucide-react';
import { copyShareableSimulationLink } from '../../physics/urlState';

interface HeaderProps {
  currentModuleId: ModuleId | 'home';
  currentParams?: Record<string, any>;
  onSelectModule: (id: ModuleId | 'home') => void;
  onOpenTeacherMode: () => void;
  onOpenEnemBank: () => void;
  onOpenTestRunner: () => void;
  onOpenTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModuleId,
  currentParams,
  onSelectModule,
  onOpenTeacherMode,
  onOpenEnemBank,
  onOpenTestRunner,
  onOpenTour,
}) => {
  const [headerCopied, setHeaderCopied] = useState(false);

  const handleCopySimulationLink = async () => {
    if (currentModuleId === 'home') return;
    const ok = await copyShareableSimulationLink(currentModuleId, currentParams);
    if (ok) {
      setHeaderCopied(true);
      setTimeout(() => setHeaderCopied(false), 2200);
    }
  };

  return (
    <header className="w-full bg-slate-950 border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-6 z-30">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectModule('home')}
          aria-label="Ir para a página inicial do Ondas Lab 3D"
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
          <div className="absolute top-full left-0 mt-1 w-80 bg-slate-900/95 border border-slate-800 rounded-lg shadow-2xl p-2 hidden group-hover:block backdrop-blur-md z-50 max-h-[80vh] overflow-y-auto">
            {/* Mechanics Section */}
            <div className="text-[10px] uppercase font-bold text-amber-400 px-2 py-1 flex items-center justify-between border-b border-slate-800/80 mb-1">
              <span>Mecânica Clássica</span>
              <span className="text-slate-500 font-mono">4 Labs</span>
            </div>
            {MODULES.filter((m) => m.area === 'mechanics').map((mod) => (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                  currentModuleId === mod.id
                    ? 'bg-amber-950/60 text-amber-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] text-amber-400/80 font-mono">{mod.code}</div>
                  <div className="truncate">{mod.title}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
                  {mod.categoryLabel}
                </span>
              </button>
            ))}

            {/* Hydrostatics Section */}
            <div className="text-[10px] uppercase font-bold text-sky-400 px-2 py-1 flex items-center justify-between border-b border-slate-800/80 mt-2 mb-1">
              <span>Hidrostática</span>
              <span className="text-slate-500 font-mono">4 Labs</span>
            </div>
            {MODULES.filter((m) => m.area === 'hydrostatics').map((mod) => (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                  currentModuleId === mod.id
                    ? 'bg-sky-950/60 text-sky-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] text-sky-400/80 font-mono">{mod.code}</div>
                  <div className="truncate">{mod.title}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
                  {mod.categoryLabel}
                </span>
              </button>
            ))}

            {/* Thermodynamics Section */}
            <div className="text-[10px] uppercase font-bold text-orange-400 px-2 py-1 flex items-center justify-between border-b border-slate-800/80 mt-2 mb-1">
              <span>Termodinâmica</span>
              <span className="text-slate-500 font-mono">4 Labs</span>
            </div>
            {MODULES.filter((m) => m.area === 'thermodynamics').map((mod) => (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                  currentModuleId === mod.id
                    ? 'bg-orange-950/60 text-orange-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] text-orange-400/80 font-mono">{mod.code}</div>
                  <div className="truncate">{mod.title}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
                  {mod.categoryLabel}
                </span>
              </button>
            ))}

            {/* Waves Section */}
            <div className="text-[10px] uppercase font-bold text-cyan-400 px-2 py-1 flex items-center justify-between border-b border-slate-800/80 mt-2 mb-1">
              <span>Oscilações e Ondas</span>
              <span className="text-slate-500 font-mono">8 Labs</span>
            </div>
            {MODULES.filter((m) => m.area === 'waves').map((mod) => (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                  currentModuleId === mod.id
                    ? 'bg-cyan-950/60 text-cyan-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] text-cyan-400/80 font-mono">{mod.code}</div>
                  <div className="truncate">{mod.title}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
                  {mod.categoryLabel}
                </span>
              </button>
            ))}

            {/* Electricity Section */}
            <div className="text-[10px] uppercase font-bold text-amber-400 px-2 py-1 flex items-center justify-between border-b border-slate-800/80 mt-2 mb-1">
              <span>Eletricidade</span>
              <span className="text-slate-500 font-mono">{MODULES.filter((m) => m.area === 'electricity').length} Labs</span>
            </div>
            {MODULES.filter((m) => m.area === 'electricity').map((mod) => (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                  currentModuleId === mod.id
                    ? 'bg-amber-950/60 text-amber-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] text-amber-400/80 font-mono">{mod.code}</div>
                  <div className="truncate">{mod.title}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
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
          aria-label="Selecionar módulo ou laboratório de Física"
          className="bg-slate-900 border border-slate-800 text-xs text-cyan-400 rounded px-2 py-1 max-w-[130px] sm:max-w-[170px] truncate focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
        >
          <option value="home">Visão Geral</option>
          <optgroup label="Mecânica Clássica">
            {MODULES.filter((m) => m.area === 'mechanics').map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Hidrostática">
            {MODULES.filter((m) => m.area === 'hydrostatics').map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Termodinâmica">
            {MODULES.filter((m) => m.area === 'thermodynamics').map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Oscilações e Ondas">
            {MODULES.filter((m) => m.area === 'waves').map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Eletricidade">
            {MODULES.filter((m) => m.area === 'electricity').map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </optgroup>
        </select>
      </div>


      {/* Zone 3: Actions (Teacher Mode, ENEM, Tests, Share Link, Tour Help) */}
      <div className="flex items-center gap-2 shrink-0">
        {currentModuleId !== 'home' && (
          <button
            onClick={handleCopySimulationLink}
            aria-label="Copiar link compartilhável da simulação com os parâmetros atuais dos sliders"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
              headerCopied
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-cyan-800/60 hover:border-cyan-500'
            }`}
            title="Copiar link compartilhável da simulação com os parâmetros atuais dos sliders"
          >
            {headerCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link copiado!</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Copiar Link</span>
                <span className="sm:hidden">Link</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenEnemBank}
          aria-label="Abrir banco de questões ENEM (Atalho: E)"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-900/50 transition-colors whitespace-nowrap cursor-pointer"
          title="Banco de Questões ENEM (Atalho: E)"
        >
          <Award className="w-3.5 h-3.5" />
          <span>ENEM</span>
          <kbd className="hidden md:inline text-[9px] bg-slate-950 px-1 rounded text-slate-500 border border-slate-800">E</kbd>
        </button>

        <button
          onClick={onOpenTestRunner}
          aria-label="Abrir suíte de testes de invariantes físicas e modelos matemáticos (Atalho: T)"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/50 transition-colors whitespace-nowrap cursor-pointer"
          title="Verificação de Modelos Matemáticos e Invariantes Físicas (Atalho: T)"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Testes</span>
          <kbd className="hidden md:inline text-[9px] bg-slate-950 px-1 rounded text-slate-500 border border-slate-800">T</kbd>
        </button>

        <button
          onClick={onOpenTeacherMode}
          aria-label="Abrir modo de apresentação para sala de aula e projetores (Atalho: P)"
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-sm transition-all whitespace-nowrap cursor-pointer"
          title="Modo Apresentação para Sala de Aula e Projetores (Atalho: P)"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Modo Professor</span>
          <span className="sm:hidden">Professor</span>
          <kbd className="hidden md:inline text-[9px] bg-blue-950/80 px-1 rounded text-blue-200 border border-blue-400/40">P</kbd>
        </button>

        {onOpenTour && (
          <button
            onClick={onOpenTour}
            aria-label="Abrir guia rápido da plataforma e atalhos de teclado (Atalho: ?)"
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md text-xs font-bold bg-slate-900 hover:bg-slate-800 text-purple-400 hover:text-purple-300 border border-purple-900/50 hover:border-purple-500/80 transition-colors cursor-pointer"
            title="Guia Rápido e Atalhos de Teclado (Atalho: ?)"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

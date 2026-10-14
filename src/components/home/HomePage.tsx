import React, { useState, useMemo } from 'react';
import { MODULES } from '../../data/modules';
import { ModuleCategory, ModuleId } from '../../types/physics';
import { Search, ArrowRight, Play, Award, CheckCircle2, Presentation, Activity, Waves, Cpu, Compass, Radio, Sliders, Volume2, Layers } from 'lucide-react';
import { KaTeXMath } from '../common/KaTeXMath';

interface HomePageProps {
  onSelectModule: (id: ModuleId) => void;
  onOpenTeacherMode: () => void;
  onOpenEnemBank: () => void;
  onOpenTestRunner: () => void;
  lastModuleId?: ModuleId;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectModule,
  onOpenTeacherMode,
  onOpenEnemBank,
  onOpenTestRunner,
  lastModuleId = 'shm',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all');

  const categories: { id: ModuleCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos os Módulos' },
    { id: 'oscillations', label: 'Oscilações' },
    { id: 'mechanical_waves', label: 'Ondas Mecânicas' },
    { id: 'wave_phenomena', label: 'Fenômenos Ondulatórios' },
    { id: 'acoustics', label: 'Acústica' },
  ];

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Activity': return <Activity className="w-5 h-5" />;
      case 'Cpu': return <Cpu className="w-5 h-5" />;
      case 'Compass': return <Compass className="w-5 h-5" />;
      case 'Waves': return <Waves className="w-5 h-5" />;
      case 'Radio': return <Radio className="w-5 h-5" />;
      case 'Sliders': return <Sliders className="w-5 h-5" />;
      case 'Volume2': return <Volume2 className="w-5 h-5" />;
      case 'Layers': return <Layers className="w-5 h-5" />;
      default: return <Waves className="w-5 h-5" />;
    }
  };

  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.shortDesc.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  const lastMod = MODULES.find((m) => m.id === lastModuleId) || MODULES[0];

  return (
    <div className="w-full flex-1 overflow-y-auto bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Presentation Section */}
      <section className="relative px-6 py-10 md:py-14 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium w-fit">
              <span>Laboratório Virtual 3D de Física Computacional</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Investigue oscilações e ondas com precisão científica.
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Simulações tridimensionais interativas com Three.js, integração numérica verificada (RK4),
              gráficos sincronizados em tempo real, experimentos com método científico e preparação para o ENEM.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onSelectModule(lastMod.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Simulação: {lastMod.title.split(' ')[0]}</span>
              </button>

              <button
                onClick={onOpenEnemBank}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition-colors"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>Desafios ENEM</span>
              </button>

              <button
                onClick={onOpenTeacherMode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition-colors"
              >
                <Presentation className="w-4 h-4 text-blue-400" />
                <span>Modo Sala de Aula</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics / Teacher Card */}
          <div className="w-full md:w-80 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono uppercase text-slate-400 font-bold">Identidade Acadêmica</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-mono">
                SI Validado
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-white">Prof. Silas Sarmento</div>
              <div className="text-xs text-slate-400">Laboratório de Física & Especialista ENEM</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Módulos 3D</div>
                <div className="font-mono text-cyan-400 font-bold text-lg">8 Labs</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Testes Numéricos</div>
                <div className="font-mono text-emerald-400 font-bold text-lg">10 Invariantes</div>
              </div>
            </div>

            <button
              onClick={onOpenTestRunner}
              className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verificar Suíte de Testes Físicos</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modules Catalog Section */}
      <section className="px-6 py-8 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar conceito, fórmula ou fenômeno (ex: ressonância, doppler, pêndulo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors font-medium border ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredModules.map((mod) => (
            <div
              key={mod.id}
              onClick={() => onSelectModule(mod.id)}
              className="group bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 p-4 rounded-xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">
                    {mod.code}
                  </span>
                  <div className="p-2 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800 group-hover:border-cyan-500/40 transition-colors">
                    {getModuleIcon(mod.iconName)}
                  </div>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                  {mod.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {mod.shortDesc}
                </p>

                {/* Primary formula preview */}
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300">
                  <KaTeXMath math={mod.equations[0]} block />
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Abrir Laboratório</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto px-6 py-4 border-t border-slate-800/80 bg-slate-950 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          ONDAS LAB 3D — Plataforma de Ensino e Investigação Científica em Oscilações e Ondas.
        </div>
        <div className="flex items-center gap-4">
          <span>Sistema Internacional (SI)</span>
          <span>·</span>
          <span>Compatível com Celular, Tablet e Desktop</span>
        </div>
      </footer>
    </div>
  );
};

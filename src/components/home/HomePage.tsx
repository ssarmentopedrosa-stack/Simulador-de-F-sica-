import React, { useState, useMemo } from 'react';
import { MODULES } from '../../data/modules';
import { ModuleCategory, ModuleId } from '../../types/physics';
import { runAllPhysicsTests } from '../../physics/tests';
import {
  Search,
  ArrowRight,
  Play,
  Award,
  CheckCircle2,
  Presentation,
  Activity,
  Waves,
  Cpu,
  Compass,
  Radio,
  Sliders,
  Volume2,
  Layers,
  Zap,
  TrendingUp,
  ShieldAlert,
  Target,
  Orbit,
  Droplets,
  Anchor,
  LifeBuoy,
  Gauge,
  Flame,
  RotateCw,
  Thermometer,
} from 'lucide-react';
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
  lastModuleId = 'ideal_gas',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<'all' | 'mechanics' | 'hydrostatics' | 'thermodynamics' | 'waves' | 'electricity'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all');

  const categories: { id: ModuleCategory | 'all'; label: string; area?: 'mechanics' | 'hydrostatics' | 'thermodynamics' | 'waves' | 'electricity' }[] = [
    { id: 'all', label: 'Todos os Laboratórios' },
    { id: 'mechanics', label: 'Mecânica', area: 'mechanics' },
    { id: 'hydrostatics', label: 'Hidrostática', area: 'hydrostatics' },
    { id: 'thermodynamics', label: 'Termodinâmica', area: 'thermodynamics' },
    { id: 'electricity', label: 'Eletricidade', area: 'electricity' },
    { id: 'oscillations', label: 'Oscilações', area: 'waves' },
    { id: 'mechanical_waves', label: 'Ondas Mecânicas', area: 'waves' },
    { id: 'wave_phenomena', label: 'Fenômenos Ondulatórios', area: 'waves' },
    { id: 'acoustics', label: 'Acústica', area: 'waves' },
  ];

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'RotateCw': return <RotateCw className="w-5 h-5 text-amber-400" />;
      case 'Thermometer': return <Thermometer className="w-5 h-5 text-red-400" />;
      case 'Gauge': return <Gauge className="w-5 h-5 text-sky-400" />;
      case 'Droplets': return <Droplets className="w-5 h-5 text-cyan-400" />;
      case 'Anchor': return <Anchor className="w-5 h-5 text-blue-400" />;
      case 'LifeBuoy': return <LifeBuoy className="w-5 h-5 text-teal-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'Target': return <Target className="w-5 h-5 text-cyan-400" />;
      case 'Activity': return <Activity className="w-5 h-5 text-cyan-400" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-sky-400" />;
      case 'Compass': return <Compass className="w-5 h-5 text-indigo-400" />;
      case 'Waves': return <Waves className="w-5 h-5 text-blue-400" />;
      case 'Radio': return <Radio className="w-5 h-5 text-teal-400" />;
      case 'Sliders': return <Sliders className="w-5 h-5 text-cyan-400" />;
      case 'Volume2': return <Volume2 className="w-5 h-5 text-sky-400" />;
      case 'Layers': return <Layers className="w-5 h-5 text-violet-400" />;
      default: return <Waves className="w-5 h-5 text-cyan-400" />;
    }
  };


  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      // Area filter
      if (selectedArea !== 'all' && m.area !== selectedArea) return false;
      // Category filter
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      // Search text
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.shortDesc.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q) ||
        m.areaLabel.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedArea, selectedCategory]);

  const lastMod = MODULES.find((m) => m.id === lastModuleId) || MODULES[0];

  const mechanicsCount = MODULES.filter((m) => m.area === 'mechanics').length;
  const hydrostaticsCount = MODULES.filter((m) => m.area === 'hydrostatics').length;
  const thermodynamicsCount = MODULES.filter((m) => m.area === 'thermodynamics').length;
  const wavesCount = MODULES.filter((m) => m.area === 'waves').length;
  const electricityCount = MODULES.filter((m) => m.area === 'electricity').length;
  const totalInvariants = useMemo(() => runAllPhysicsTests().length, []);

  return (
    <div className="w-full flex-1 overflow-y-auto bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative px-6 py-10 md:py-14 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium w-fit">
              <Orbit className="w-3.5 h-3.5 text-cyan-400" />
              <span>Plataforma Científica de Física · Mecânica, Hidrostática, Termodinâmica, Ondas e Eletricidade</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Investigue as leis fundamentais da Física com rigor computacional e 3D.
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Explore {MODULES.length} laboratórios tridimensionais interativos em Mecânica Clássica, Hidrostática, Termodinâmica, Oscilações, Ondulatória e Eletricidade.
              Integração numérica verificada, balanços de forças e energia em tempo real, metodologia científica e resolução contextualizada de problemas no padrão ENEM.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onSelectModule(lastMod.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Simulação: {lastMod.title.split(' ')[0]}</span>
              </button>

              <button
                onClick={onOpenEnemBank}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>Desafios ENEM ({MODULES.length} Questões)</span>
              </button>

              <button
                onClick={onOpenTeacherMode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
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
              <div className="text-xs text-slate-400">Laboratório Multidisciplinar de Física & ENEM</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Laboratórios 3D</div>
                <div className="font-mono text-cyan-400 font-bold text-lg">{MODULES.length} Labs</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Testes Numéricos</div>
                <div className="font-mono text-emerald-400 font-bold text-lg">{totalInvariants} Invariantes</div>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between items-center">
                <span>Mecânica Clássica:</span>
                <span className="font-mono text-amber-400 font-semibold">{mechanicsCount} laboratórios</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hidrostática:</span>
                <span className="font-mono text-sky-400 font-semibold">{hydrostaticsCount} laboratórios</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Termodinâmica:</span>
                <span className="font-mono text-orange-400 font-semibold">{thermodynamicsCount} laboratórios</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Oscilações e Ondas:</span>
                <span className="font-mono text-cyan-400 font-semibold">{wavesCount} laboratórios</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Eletricidade:</span>
                <span className="font-mono text-yellow-400 font-semibold">{electricityCount} laboratórios</span>
              </div>
            </div>

            <button
              onClick={onOpenTestRunner}
              className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verificar Suíte de {totalInvariants} Testes Físicos</span>
            </button>
          </div>
        </div>
      </section>

      {/* Areas Highlights Cards */}
      <section className="px-6 pt-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Mechanics Banner Card */}
          <div
            onClick={() => {
              setSelectedArea('mechanics');
              setSelectedCategory('mechanics');
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              selectedArea === 'mechanics'
                ? 'bg-amber-950/40 border-amber-500/70 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">Área 1 · 4 Labs</div>
                <h2 className="text-sm font-bold text-white">Mecânica Clássica</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400">Trabalho, Potência, Conservação da Energia, Impulso e Colisões 1D/2D.</p>
            <span className="text-xs font-semibold text-amber-400">Explorar Área →</span>
          </div>

          {/* Hydrostatics Banner Card */}
          <div
            onClick={() => {
              setSelectedArea('hydrostatics');
              setSelectedCategory('hydrostatics');
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              selectedArea === 'hydrostatics'
                ? 'bg-sky-950/40 border-sky-500/70 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-sky-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-800/60 text-sky-400 shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-sky-400 font-bold">Área 2 · 4 Labs</div>
                <h2 className="text-sm font-bold text-white">Hidrostática</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400">Densidade, Pressão, Teorema de Stevin, Prensa de Pascal e Arquimedes.</p>
            <span className="text-xs font-semibold text-sky-400">Explorar Área →</span>
          </div>

          {/* Thermodynamics Banner Card */}
          <div
            onClick={() => {
              setSelectedArea('thermodynamics');
              setSelectedCategory('thermodynamics');
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              selectedArea === 'thermodynamics'
                ? 'bg-orange-950/40 border-orange-500/70 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-orange-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-950/60 border border-orange-800/60 text-orange-400 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-orange-400 font-bold">Área 3 · 4 Labs</div>
                <h2 className="text-sm font-bold text-white">Termodinâmica</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400">Gases Ideais, 1ª Lei, Ciclo de Carnot (2ª Lei) e Calorimetria de Fase.</p>
            <span className="text-xs font-semibold text-orange-400">Explorar Área →</span>
          </div>

          {/* Waves Banner Card */}
          <div
            onClick={() => {
              setSelectedArea('waves');
              setSelectedCategory('all');
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              selectedArea === 'waves'
                ? 'bg-cyan-950/40 border-cyan-500/70 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 shrink-0">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Área 4 · 8 Labs</div>
                <h2 className="text-sm font-bold text-white">Oscilações e Ondas</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400">MHS, Massa-Mola, Pêndulo, Interferência, Harmônicos e Efeito Doppler.</p>
            <span className="text-xs font-semibold text-cyan-400">Explorar Área →</span>
          </div>

          {/* Electricity Banner Card */}
          <div
            onClick={() => {
              setSelectedArea('electricity');
              setSelectedCategory('electricity');
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              selectedArea === 'electricity'
                ? 'bg-amber-950/40 border-amber-500/70 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">Área 5 · {electricityCount} Labs</div>
                <h2 className="text-sm font-bold text-white">Eletricidade</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400">Lei de Coulomb, Campo Elétrico Vetorial, Linhas 3D, Superfícies Equipotenciais e Capacitores.</p>
            <span className="text-xs font-semibold text-amber-400">Explorar Área →</span>
          </div>
        </div>
      </section>


      {/* Modules Catalog Section */}
      <section className="px-6 py-8 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Search & Category Filter */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar conceito (ex: coulomb, campo, trabalho, energia, colisão, doppler)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Area Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs shrink-0 flex-wrap">
              <button
                onClick={() => {
                  setSelectedArea('all');
                  setSelectedCategory('all');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedArea === 'all'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas as Áreas ({MODULES.length})
              </button>
              <button
                onClick={() => {
                  setSelectedArea('mechanics');
                  setSelectedCategory('mechanics');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedArea === 'mechanics'
                    ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mecânica ({mechanicsCount})
              </button>
              <button
                onClick={() => {
                  setSelectedArea('hydrostatics');
                  setSelectedCategory('hydrostatics');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedArea === 'hydrostatics'
                    ? 'bg-sky-950 text-sky-300 font-semibold border border-sky-800/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hidrostática ({hydrostaticsCount})
              </button>
              <button
                onClick={() => {
                  setSelectedArea('thermodynamics');
                  setSelectedCategory('thermodynamics');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedArea === 'thermodynamics'
                    ? 'bg-orange-950 text-orange-300 font-semibold border border-orange-800/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Termodinâmica ({thermodynamicsCount})
              </button>
              <button
                onClick={() => {
                  setSelectedArea('waves');
                  setSelectedCategory('all');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedArea === 'waves'
                    ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Oscilações & Ondas ({wavesCount})
              </button>
              <button
                onClick={() => {
                  setSelectedArea('electricity');
                  setSelectedCategory('electricity');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedArea === 'electricity'
                    ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Eletricidade ({electricityCount})
              </button>
            </div>
          </div>

          {/* Subcategory Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (cat.area) setSelectedArea(cat.area);
                }}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors font-medium border cursor-pointer ${
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">
                      {mod.code}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {mod.categoryLabel}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-cyan-500/40 transition-colors">
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
          ONDAS LAB 3D — Plataforma Multidisciplinar de Física Computacional (Mecânica, Hidrostática, Termodinâmica, Ondas e Eletricidade).
        </div>
        <div className="flex items-center gap-4">
          <span>Sistema Internacional (SI)</span>
          <span>·</span>
          <span>{MODULES.length} Laboratórios 3D</span>
          <span>·</span>
          <span>{totalInvariants} Invariantes Verificadas</span>
        </div>
      </footer>
    </div>
  );
};

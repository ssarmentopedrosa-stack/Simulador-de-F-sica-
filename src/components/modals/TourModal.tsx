import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sliders,
  Sparkles,
  Link2,
  Keyboard,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Play,
  RotateCcw,
  Maximize2,
  Award,
  Presentation,
  CheckCircle2,
} from 'lucide-react';

interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  id: number;
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  highlight: string;
  content: React.ReactNode;
}

export const TourModal: React.FC<TourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Accessible keyboard navigation for the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStep((prev) => Math.min(5, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((prev) => Math.max(1, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('ondas_lab_tour_completed', 'true');
    } catch {
      // Ignored
    }
    onClose();
  };

  const steps: TourStep[] = [
    {
      id: 1,
      badge: 'Passo 1 de 5 · Navegação',
      title: '5 Grandes Áreas da Física & 24 Laboratórios 3D',
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      description:
        'Explore uma plataforma científica completa cobrindo Mecânica Clássica, Hidrostática, Termodinâmica, Oscilações e Ondas, e Eletricidade. Cada módulo simula equações diferenciais exatas com renderização Three.js em tempo real.',
      highlight:
        'Use o menu no cabeçalho ou volte à Visão Geral clicando no logo a qualquer momento.',
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Mecânica (M1-M4)</span>
            <span className="text-xs text-slate-300">Trabalho, Montanha-Russa, Impulso e Colisões 2D</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-sky-400 font-bold uppercase">Hidrostática (H1-H4)</span>
            <span className="text-xs text-slate-300">Stevin, Tubo em U, Prensa de Pascal e Arquimedes</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-orange-400 font-bold uppercase">Termodinâmica (T1-T4)</span>
            <span className="text-xs text-slate-300">Gás Ideal, 1ª Lei, Ciclo de Carnot e Calorimetria</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">Oscilações & Ondas (O1-O8)</span>
            <span className="text-xs text-slate-300">MHS, Pêndulo Não-Linear, Interferência e Doppler</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Eletricidade (E1-E4)</span>
            <span className="text-xs text-slate-300">Coulomb, Campo Elétrico, Potencial e Capacitor Plano</span>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      badge: 'Passo 2 de 5 · Interatividade',
      title: 'Controles 3D e Painel de Parâmetros',
      icon: <Sliders className="w-5 h-5 text-blue-400" />,
      description:
        'A cena 3D é totalmente interativa: clique e arraste para orbitar a câmera em qualquer ângulo; use o scroll ou gesto de pinça para zoom. No painel lateral, alterne grandezas em tempo real.',
      highlight:
        'A barra inferior permite pausar, avançar passo a passo, alterar a velocidade (0.25x a 2x) e alternar projeção 2D / 3D.',
      content: (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <strong>Mouse / Touch:</strong> Girar câmera 360° e zoom contínuo
            </span>
            <span className="font-mono text-slate-500 text-[11px]">OrbitControls</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <strong>Sliders Numéricos:</strong> Ajuste imediato de massas, tensões, cargas e temperaturas
            </span>
            <span className="font-mono text-slate-500 text-[11px]">Feedback Físico</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>Botão 2D / 3D:</strong> Alterna para projeção ortogonal ideal para diagramas de corpo livre
            </span>
            <span className="font-mono text-slate-500 text-[11px]">Projeção Plana</span>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      badge: 'Passo 3 de 5 · Didática',
      title: 'Exemplos Clássicos em 1 Clique',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      description:
        'Em cada um dos 24 laboratórios, a barra "Exemplos clássicos" reúne de 2 a 4 casos pedagógicos prontos, configurados com base nas questões mais recorrentes em vestibulares e cursos universitários.',
      highlight:
        'O botão do preset ativo acende automaticamente sempre que os sliders atingem a configuração correspondente.',
      content: (
        <div className="p-3 rounded-lg bg-slate-950/90 border border-amber-900/40 flex flex-col gap-2 mt-2">
          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
            Amostra de Presets Didáticos Disponíveis:
          </span>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              Ondas: <strong>2º harmônico</strong> / <strong>3 ventres</strong>
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              Massa-Mola: <strong>Ressonância</strong> / <strong>Com atrito vs Sem atrito</strong>
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              Interferência: <strong>Construtiva</strong> / <strong>Destrutiva</strong>
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              Doppler: <strong>Fonte parada</strong> / <strong>Aproximação</strong> / <strong>Supersônico</strong>
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              Capacitor: <strong>Vácuo</strong> / <strong>Com vidro</strong>
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      badge: 'Passo 4 de 5 · Compartilhamento',
      title: 'Link Compartilhável com Parâmetros',
      icon: <Link2 className="w-5 h-5 text-emerald-400" />,
      description:
        'Precisa enviar um experimento específico para seus alunos ou salvar uma condição de teste? O botão "Copiar link da simulação" serializa o laboratório e os valores de todos os sliders diretamente na URL.',
      highlight:
        'Ao abrir o link em outro navegador ou celular, o laboratório é aberto e todos os parâmetros são restaurados com fidelidade matemática total.',
      content: (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2.5 mt-2">
          <div className="flex items-center gap-2 p-2 rounded bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
            <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">https://ondaslab3d.app/#standing_waves?harmonic=3&length=3&waveSpeed=60</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Funciona tanto pelo botão <strong>Copiar Link</strong> no cabeçalho quanto no topo de cada barra de Exemplos clássicos.
          </p>
        </div>
      ),
    },
    {
      id: 5,
      badge: 'Passo 5 de 5 · Atalhos & Produtividade',
      title: 'Atalhos de Teclado & Telemetria',
      icon: <Keyboard className="w-5 h-5 text-purple-400" />,
      description:
        'Acelere suas demonstrações em aula e estudos com atalhos de teclado rápidos projetados para agilidade em sala de aula ou apresentações com projetor.',
      highlight:
        'Os atalhos são ignorados automaticamente quando você estiver digitando em caixas de texto.',
      content: (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-300">Pausar / Iniciar</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-cyan-300 font-bold">
              Espaço
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs text-slate-300">Avançar 1 Passo</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-sky-300 font-bold">
              Seta →
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-slate-300">Reiniciar Simulação</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-orange-300 font-bold">
              R
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-300">Tela Cheia</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-300 font-bold">
              F
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Presentation className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-slate-300">Modo Professor</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-blue-300 font-bold">
              P
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-300">Banco ENEM</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300 font-bold">
              E
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-300">Suíte de Invariantes</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-300 font-bold">
              T
            </kbd>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-slate-300">Reabrir este Guia</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-purple-300 font-bold">
              ?
            </kbd>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      aria-describedby="tour-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              {currentStepData.icon}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                {currentStepData.badge}
              </span>
              <h2 id="tour-modal-title" className="text-base sm:text-lg font-bold text-white">
                {currentStepData.title}
              </h2>
            </div>
          </div>
          <button
            onClick={handleFinish}
            aria-label="Fechar guia rápido"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-3 overflow-y-auto max-h-[65vh]">
          <p id="tour-modal-description" className="text-sm text-slate-300 leading-relaxed">
            {currentStepData.description}
          </p>

          <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 font-medium">
            💡 {currentStepData.highlight}
          </div>

          {currentStepData.content}
        </div>

        {/* Footer / Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Progresso do Guia">
            {steps.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={currentStep === s.id}
                aria-label={`Ir para ${s.title}`}
                onClick={() => setCurrentStep(s.id)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === s.id
                    ? 'w-6 bg-gradient-to-r from-cyan-400 to-blue-500'
                    : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStep < steps.length ? (
              <button
                onClick={handleFinish}
                aria-label="Pular apresentação do sistema"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Pular
              </button>
            ) : null}

            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
                aria-label="Passo anterior"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                onClick={() => setCurrentStep((p) => Math.min(steps.length, p + 1))}
                aria-label="Próximo passo"
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all shadow-sm font-bold cursor-pointer"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                aria-label="Concluir apresentação e começar a explorar"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                <span>Concluir</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

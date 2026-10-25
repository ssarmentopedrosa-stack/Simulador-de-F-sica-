import React, { useState, useEffect } from 'react';
import { ENEM_QUESTIONS } from '../../data/enemQuestions';
import { EnemQuestion, ModuleId } from '../../types/physics';
import { KaTeXMath } from '../common/KaTeXMath';
import { X, CheckCircle2, XCircle, ArrowRight, ExternalLink, Filter } from 'lucide-react';

interface EnemBankModalProps {
  onClose: () => void;
  onOpenSimulationModule: (moduleId: ModuleId, testParams?: Record<string, number | string>) => void;
}

export const EnemBankModal: React.FC<EnemBankModalProps> = ({ onClose, onOpenSimulationModule }) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [userSelectedOption, setUserSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Performance history saved in localStorage
  const [userAnswers, setUserAnswers] = useState<Record<string, { choice: string; isCorrect: boolean }>>(() => {
    try {
      const data = localStorage.getItem('ondas_lab_enem_answers');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  });

  const filteredQuestions = ENEM_QUESTIONS.filter((q) => {
    if (selectedTopic !== 'all' && q.moduleId !== selectedTopic) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const currentQ: EnemQuestion | undefined = filteredQuestions[selectedQuestionIndex] || filteredQuestions[0];

  useEffect(() => {
    setUserSelectedOption(null);
    setShowExplanation(false);
  }, [selectedQuestionIndex, selectedTopic, selectedDifficulty]);

  const handleSelectOption = (letter: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (showExplanation || !currentQ) return;
    setUserSelectedOption(letter);
    const isCorrect = letter === currentQ.correctAnswer;
    setShowExplanation(true);

    const updated = {
      ...userAnswers,
      [currentQ.id]: { choice: letter, isCorrect },
    };
    setUserAnswers(updated);
    try {
      localStorage.setItem('ondas_lab_enem_answers', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  // Performance metrics
  const totalAttempted = Object.keys(userAnswers).length;
  const totalCorrect = Object.values(userAnswers).filter((v) => v.isCorrect).length;
  const accuracyRate = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
                BANCO DE QUESTÕES & DESAFIOS ENEM
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {totalCorrect}/{totalAttempted} Acertos ({accuracyRate}%)
              </span>
            </div>
            <h2 className="text-base font-bold text-white">Preparatório Científico para o ENEM</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedQuestionIndex(0);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos os Temas ({ENEM_QUESTIONS.length} questões)</option>
              <optgroup label="Mecânica Clássica">
                <option value="work_power">Trabalho & Potência Útil</option>
                <option value="energy_conservation">Conservação de Energia & Looping</option>
                <option value="impulse_momentum">Impulso, Momento & Airbag</option>
                <option value="collisions">Colisões 1D & 2D</option>
              </optgroup>
              <optgroup label="Hidrostática">
                <option value="density_pressure">Densidade & Pressão</option>
                <option value="stevin_theorem">Teorema de Stevin</option>
                <option value="pascal_principle">Prensa Hidráulica de Pascal</option>
                <option value="buoyancy_archimedes">Empuxo & Princípio de Arquimedes</option>
              </optgroup>
              <optgroup label="Termodinâmica">
                <option value="ideal_gas">Gases Ideais & Calibração de Pneus</option>
                <option value="first_law_thermodynamics">1ª Lei & Aerossóis</option>
                <option value="carnot_heat_engines">Ciclo de Carnot & Usinas Térmicas</option>
                <option value="calorimetry">Calorimetria & Fusão do Gelo</option>
              </optgroup>
              <optgroup label="Eletricidade (Eletrostática)">
                <option value="coulomb_law">Lei de Coulomb & Dielétricos</option>
                <option value="electric_field_lines">Campo Elétrico & Linhas 3D</option>
                <option value="electric_potential">Potencial & Equipotenciais</option>
                <option value="parallel_plate_capacitor">Capacitores & Desfibrilador</option>
              </optgroup>
              <optgroup label="Oscilações e Ondas">
                <option value="interference">Interferência & Fones ANC</option>
                <option value="doppler">Acústica & Efeito Doppler</option>
                <option value="standing_waves">Harmônicos & Cordas</option>
                <option value="phenomena">Refração & Difração Wi-Fi</option>
                <option value="pendulum">Pêndulo & Oscilações</option>
              </optgroup>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setSelectedQuestionIndex(0);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas as Dificuldades</option>
              <option value="Fácil">Fácil</option>
              <option value="Médio">Médio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>

          <div className="text-slate-400 font-mono text-[11px]">
            Questão {selectedQuestionIndex + 1} de {filteredQuestions.length}
          </div>
        </div>

        {/* Question Body */}
        {currentQ ? (
          <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
            {/* Meta tags */}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-amber-400">{currentQ.yearReference}</span>
              <span>·</span>
              <span>{currentQ.topic}</span>
              <span>·</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  currentQ.difficulty === 'Fácil'
                    ? 'bg-emerald-950 text-emerald-300'
                    : currentQ.difficulty === 'Médio'
                    ? 'bg-amber-950 text-amber-300'
                    : 'bg-rose-950 text-rose-300'
                }`}
              >
                {currentQ.difficulty}
              </span>
            </div>

            {/* Context Narrative */}
            <div className="p-3.5 bg-slate-950/70 rounded-lg border border-slate-800/80 leading-relaxed text-slate-300">
              {currentQ.context}
            </div>

            {/* Problem Statement */}
            <div className="font-semibold text-white leading-relaxed text-sm">
              {currentQ.statement}
            </div>

            {/* 5 Multiple Choice Options (A, B, C, D, E) */}
            <div className="flex flex-col gap-2 pt-1">
              {currentQ.options.map((opt) => {
                const isSelected = userSelectedOption === opt.letter;
                const isCorrect = opt.letter === currentQ.correctAnswer;

                let btnStyle = 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300';
                if (showExplanation) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-medium';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 font-medium';
                  } else {
                    btnStyle = 'bg-slate-950/40 border-slate-800/50 text-slate-500';
                  }
                }

                return (
                  <button
                    key={opt.letter}
                    onClick={() => handleSelectOption(opt.letter)}
                    disabled={showExplanation}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${btnStyle}`}
                  >
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        showExplanation && isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : showExplanation && isSelected && !isCorrect
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {opt.letter}
                    </span>
                    <span className="leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation & Commented Resolution */}
            {showExplanation && (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {userSelectedOption === currentQ.correctAnswer ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Resposta Correta!
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" /> Resposta Incorreta (Gabarito: {currentQ.correctAnswer})
                      </span>
                    )}
                  </div>

                  {/* Button to run in simulator with parameters */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSimulationModule(currentQ.moduleId, currentQ.testParams);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded text-xs transition-colors"
                  >
                    <span>Testar no Simulador 3D</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>

                {currentQ.formulas.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
                      Fórmulas e Resolução Matemática:
                    </span>
                    {currentQ.formulas.map((form, idx) => (
                      <KaTeXMath key={idx} math={form} block />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            Nenhuma questão encontrada para este filtro.
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => setSelectedQuestionIndex((p) => Math.max(0, p - 1))}
            disabled={selectedQuestionIndex === 0}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-200 transition-colors"
          >
            Questão Anterior
          </button>

          <button
            onClick={() => setSelectedQuestionIndex((p) => Math.min(filteredQuestions.length - 1, p + 1))}
            disabled={selectedQuestionIndex >= filteredQuestions.length - 1}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            <span>Próxima Questão</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

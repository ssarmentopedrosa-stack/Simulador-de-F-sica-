import React, { useState, useEffect, useMemo } from 'react';
import { GuidedExperiment } from '../../types/physics';
import {
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Save,
  Play,
  CheckSquare,
  Square,
  HelpCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ExperimentModalProps {
  experiment: GuidedExperiment;
  onClose: () => void;
  onApplyParams?: (params: Record<string, any>) => void;
}

export const ExperimentModal: React.FC<ExperimentModalProps> = ({
  experiment,
  onClose,
  onApplyParams,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [answers, setAnswers] = useState<{
    prediction: string;
    analysis: string;
    conclusion: string;
  }>({
    prediction: '',
    analysis: '',
    conclusion: '',
  });

  const [selectedPredictionOption, setSelectedPredictionOption] = useState<string | null>(null);
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<Record<string, boolean>>({});
  const [paramsApplied, setParamsApplied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Normalize checkpoints list
  const checkpointItems = useMemo(() => {
    if (experiment.checkpoints && experiment.checkpoints.length > 0) {
      return experiment.checkpoints.map((cp, idx) => {
        if (typeof cp === 'string') {
          return { id: `cp_${idx}`, text: cp };
        }
        return cp;
      });
    }
    // Fallback default checkpoints from steps
    return [
      { id: 'cp_1', text: 'Configurar os parâmetros sugeridos no simulador' },
      { id: 'cp_2', text: 'Executar o protocolo de observação experimental' },
      { id: 'cp_3', text: 'Examinar os gráficos de telemetria e o mostrador numérico' },
      { id: 'cp_4', text: 'Comparar a hipótese inicial com a formulação teórica' },
    ];
  }, [experiment]);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ondas_lab_exp_${experiment.id}`);
      if (saved) {
        setAnswers(JSON.parse(saved));
      }

      const savedOption = localStorage.getItem(`ondas_lab_exp_pred_${experiment.id}`);
      if (savedOption) {
        setSelectedPredictionOption(savedOption);
      }

      const savedChecks = localStorage.getItem(`ondas_lab_exp_checks_${experiment.id}`);
      if (savedChecks) {
        setCheckedCheckpoints(JSON.parse(savedChecks));
      }
    } catch {
      // Ignored
    }
  }, [experiment.id]);

  const saveAnswers = () => {
    try {
      localStorage.setItem(`ondas_lab_exp_${experiment.id}`, JSON.stringify(answers));
      if (selectedPredictionOption) {
        localStorage.setItem(`ondas_lab_exp_pred_${experiment.id}`, selectedPredictionOption);
      }
      localStorage.setItem(`ondas_lab_exp_checks_${experiment.id}`, JSON.stringify(checkedCheckpoints));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      // Ignored
    }
  };

  const toggleCheckpoint = (id: string) => {
    setCheckedCheckpoints((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`ondas_lab_exp_checks_${experiment.id}`, JSON.stringify(updated));
      } catch {
        // Ignored
      }
      return updated;
    });
  };

  const handleSelectPrediction = (optId: string) => {
    setSelectedPredictionOption(optId);
    try {
      localStorage.setItem(`ondas_lab_exp_pred_${experiment.id}`, optId);
    } catch {
      // Ignored
    }
  };

  const handleApplySuggestedParams = () => {
    if (onApplyParams && experiment.suggestedParams) {
      onApplyParams(experiment.suggestedParams);
      setParamsApplied(true);
      setTimeout(() => setParamsApplied(false), 3000);
    }
  };

  // Checkpoints completion progress
  const completedCheckpointsCount = checkpointItems.filter((cp) => checkedCheckpoints[cp.id]).length;
  const progressPercent = Math.round((completedCheckpointsCount / checkpointItems.length) * 100);

  // Prediction feedback lookup
  const selectedOptionData = experiment.predictionQuestion?.options.find(
    (o) => o.id === selectedPredictionOption
  );

  const stepsMeta = [
    { num: 1, title: '1. Previsão', subtitle: 'Hipótese Inicial & Pergunta' },
    { num: 2, title: '2. Experimentação', subtitle: 'Protocolo & Checkpoints' },
    { num: 3, title: '3. Análise', subtitle: 'Medição & Gráficos' },
    { num: 4, title: '4. Conclusão', subtitle: 'Validação Científica' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-experiment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/50">
                Experimento Guiado Interativo
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {completedCheckpointsCount}/{checkpointItems.length} metas concluídas ({progressPercent}%)
              </span>
            </div>
            <h2 id="guided-experiment-title" className="text-base sm:text-lg font-bold text-white mt-1">
              {experiment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar experimento guiado"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Steps Segmented Progress Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40 text-left">
          {stepsMeta.map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              aria-label={`Acessar passo ${s.title}`}
              className={`p-2.5 sm:p-3 border-r last:border-r-0 border-slate-800 transition-colors cursor-pointer ${
                currentStep === s.num
                  ? 'bg-cyan-950/40 text-cyan-300 font-semibold border-b-2 border-b-cyan-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>{s.title}</span>
              </div>
              <div className="text-[10px] text-slate-500 hidden sm:block truncate">{s.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          {/* Scientific Objective Banner */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-cyan-400 block mb-0.5 uppercase tracking-wide">
              Objetivo Científico
            </span>
            <p className="text-slate-300 leading-relaxed">{experiment.objective}</p>
          </div>

          {/* STEP 1: PREDICTION */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-3.5">
              {/* Prediction Question Box */}
              <div className="p-3.5 bg-gradient-to-br from-cyan-950/30 to-blue-950/20 border border-cyan-800/40 rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Pergunta de Previsão:</span>
                </div>
                <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                  {experiment.predictionQuestion?.question || experiment.steps.prediction}
                </p>

                {/* Multiple-Choice Prediction Options */}
                {experiment.predictionQuestion?.options && experiment.predictionQuestion.options.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Selecione sua previsão antes de testar no laboratório:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {experiment.predictionQuestion.options.map((opt) => {
                        const isSelected = selectedPredictionOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectPrediction(opt.id)}
                            className={`p-3 rounded-xl text-left transition-all border cursor-pointer flex items-start gap-2.5 ${
                              isSelected
                                ? opt.isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-sm'
                                  : 'bg-amber-950/30 border-amber-500/80 text-amber-200 shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border text-[10px] font-bold ${
                                isSelected
                                  ? opt.isCorrect
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                    : 'bg-amber-500 border-amber-400 text-slate-950'
                                  : 'border-slate-600'
                              }`}
                            >
                              {isSelected && '✓'}
                            </span>
                            <span className="text-xs leading-relaxed">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Didactic Feedback upon selection */}
              {selectedOptionData && (
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all animate-in fade-in duration-200 ${
                    selectedOptionData.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                      : 'bg-amber-950/30 border-amber-700/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {selectedOptionData.isCorrect ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Excelente previsão!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300">Análise da Previsão:</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {selectedOptionData.explanation}
                  </p>
                </div>
              )}

              {/* Student Personal Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium text-xs">
                  Sua Justificativa / Registro de Hipótese:
                </label>
                <textarea
                  value={answers.prediction}
                  onChange={(e) => setAnswers({ ...answers, prediction: e.target.value })}
                  placeholder="Escreva aqui a fundamentação física por trás da sua previsão..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2: EXPERIMENTATION & CHECKPOINTS */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-3.5">
              {/* Protocol Instructions */}
              <div className="p-3.5 bg-blue-950/20 border border-blue-800/40 rounded-xl">
                <div className="flex items-center gap-1.5 font-semibold text-blue-300 mb-1.5">
                  <Play className="w-4 h-4 text-blue-400" />
                  <span>Protocolo Experimental:</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{experiment.steps.experimentation}</p>
              </div>

              {/* Suggested Parameters & One-Click Apply */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Parâmetros Recomendados para o Teste:
                  </span>
                  {onApplyParams && (
                    <button
                      onClick={handleApplySuggestedParams}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{paramsApplied ? 'Parâmetros Aplicados!' : 'Aplicar no Simulador'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 font-mono">
                  {Object.entries(experiment.suggestedParams).map(([key, val]) => (
                    <div key={key} className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">{key}</span>
                      <span className="text-cyan-400 font-bold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Progress Checkpoints */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">Metas do Experimento (Checkpoints):</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {completedCheckpointsCount} de {checkpointItems.length} concluídas
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {checkpointItems.map((cp) => {
                    const isChecked = !!checkedCheckpoints[cp.id];
                    return (
                      <button
                        key={cp.id}
                        onClick={() => toggleCheckpoint(cp.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors border cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-200'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </span>
                        <span className={`text-xs ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {cp.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ANALYSIS */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-3.5">
              <div className="p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-xl">
                <span className="font-semibold text-purple-300 block mb-1">Roteiro de Análise de Dados:</span>
                <p className="text-slate-200 leading-relaxed">{experiment.steps.analysis}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">Suas Observações e Valores Medidos:</label>
                <textarea
                  value={answers.analysis}
                  onChange={(e) => setAnswers({ ...answers, analysis: e.target.value })}
                  placeholder="Descreva o comportamento dos gráficos, as leituras dos sensores e as correlações numéricas observadas no laboratório..."
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 4: CONCLUSION */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-3.5">
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                <span className="font-semibold text-emerald-300 block mb-1">Síntese e Conclusão:</span>
                <p className="text-slate-200 leading-relaxed">{experiment.steps.conclusion}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">Sua Conclusão Final Fundamentada:</label>
                <textarea
                  value={answers.conclusion}
                  onChange={(e) => setAnswers({ ...answers, conclusion: e.target.value })}
                  placeholder="Escreva sua síntese conclusiva com base nas evidências coletadas e na validação das equações..."
                  className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans text-xs"
                />
              </div>

              {/* Scientific Theory Card */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-cyan-800/60 mt-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>Fundamentação Teórica da Física:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{experiment.scientificExplanation}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={saveAnswers}
              aria-label="Salvar progresso do experimento no armazenamento local"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Salvar Progresso</span>
            </button>
            {savedSuccess && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Salvo com sucesso
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((p) => p - 1)}
                aria-label="Passo anterior do roteiro"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep((p) => p + 1)}
                aria-label="Próximo passo do roteiro"
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  saveAnswers();
                  onClose();
                }}
                aria-label="Concluir roteiro de investigação"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
              >
                <span>Concluir Roteiro</span>
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

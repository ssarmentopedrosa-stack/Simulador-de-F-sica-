import React, { useState, useEffect } from 'react';
import { GuidedExperiment } from '../../types/physics';
import { X, CheckCircle, ArrowRight, ArrowLeft, Lightbulb, Save } from 'lucide-react';

interface ExperimentModalProps {
  experiment: GuidedExperiment;
  onClose: () => void;
}

export const ExperimentModal: React.FC<ExperimentModalProps> = ({ experiment, onClose }) => {
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
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ondas_lab_exp_${experiment.id}`);
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
    } catch {
      // Ignored
    }
  }, [experiment.id]);

  const saveAnswers = () => {
    try {
      localStorage.setItem(`ondas_lab_exp_${experiment.id}`, JSON.stringify(answers));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      // Ignored
    }
  };

  const stepsMeta = [
    { num: 1, title: '1. Previsão', subtitle: 'Hipótese Inicial do Estudante' },
    { num: 2, title: '2. Experimentação', subtitle: 'Execução e Coleta no Simulador' },
    { num: 3, title: '3. Análise', subtitle: 'Interpretação de Gráficos e Dados' },
    { num: 4, title: '4. Conclusão', subtitle: 'Validação Científica e Síntese' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 block">
              Investigação Científica Guiada
            </span>
            <h2 className="text-base font-bold text-white">{experiment.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Steps Segmented Progress Bar */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40">
          {stepsMeta.map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`p-2.5 text-left border-r last:border-r-0 border-slate-800 transition-colors ${
                currentStep === s.num
                  ? 'bg-cyan-950/40 text-cyan-300 font-semibold border-b-2 border-b-cyan-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold">{s.title}</div>
              <div className="text-[10px] text-slate-500 hidden sm:block truncate">{s.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-semibold text-cyan-400 block mb-0.5">Objetivo Científico</span>
            <p className="text-slate-300">{experiment.objective}</p>
          </div>

          {currentStep === 1 && (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-lg">
                <span className="font-semibold text-cyan-300 block mb-1">Questão de Previsão:</span>
                <p className="text-slate-200">{experiment.steps.prediction}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">Sua Hipótese / Registro Prévio:</label>
                <textarea
                  value={answers.prediction}
                  onChange={(e) => setAnswers({ ...answers, prediction: e.target.value })}
                  placeholder="Escreva aqui o que você espera que aconteça antes de alterar os controles..."
                  className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-lg">
                <span className="font-semibold text-blue-300 block mb-1">Protocolo Experimental no Simulador:</span>
                <p className="text-slate-200 leading-relaxed">{experiment.steps.experimentation}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Parâmetros Sugeridos para o Ensaio:
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                  {Object.entries(experiment.suggestedParams).map(([key, val]) => (
                    <div key={key} className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <span className="text-slate-500">{key}: </span>
                      <span className="text-cyan-400 font-bold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg">
                <span className="font-semibold text-purple-300 block mb-1">Roteiro de Análise de Dados:</span>
                <p className="text-slate-200 leading-relaxed">{experiment.steps.analysis}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">Suas Observações e Valores Medidos:</label>
                <textarea
                  value={answers.analysis}
                  onChange={(e) => setAnswers({ ...answers, analysis: e.target.value })}
                  placeholder="Descreva o comportamento dos gráficos, as leituras do sensor e as proporções numéricas encontradas..."
                  className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg">
                <span className="font-semibold text-emerald-300 block mb-1">Síntese e Conclusão:</span>
                <p className="text-slate-200 leading-relaxed">{experiment.steps.conclusion}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">Sua Conclusão Final:</label>
                <textarea
                  value={answers.conclusion}
                  onChange={(e) => setAnswers({ ...answers, conclusion: e.target.value })}
                  placeholder="Escreva sua conclusão fundamentada no que foi observado no laboratório..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                />
              </div>

              {/* Scientific Theory Card */}
              <div className="p-3 bg-slate-950 rounded-lg border border-cyan-800/60 mt-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                  <Lightbulb className="w-4 h-4" />
                  <span>Explicação da Física Teórica:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{experiment.scientificExplanation}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={saveAnswers}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Progresso</span>
            </button>
            {savedSuccess && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Salvo localmente
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((p) => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep((p) => p + 1)}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
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
                className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
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

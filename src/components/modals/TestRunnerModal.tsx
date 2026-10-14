import React, { useState, useEffect } from 'react';
import { runAllPhysicsTests } from '../../physics/tests';
import { AutomatedTestResult } from '../../types/physics';
import { X, CheckCircle2, XCircle, Play, RefreshCw } from 'lucide-react';

interface TestRunnerModalProps {
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ onClose }) => {
  const [tests, setTests] = useState<AutomatedTestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllPhysicsTests();
      setTests(res);
      setIsRunning(false);
    }, 300);
  };

  useEffect(() => {
    executeTests();
  }, []);

  const totalPassed = tests.filter((t) => t.passed).length;
  const allPassed = tests.length > 0 && totalPassed === tests.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                SUÍTE DE VALIDAÇÃO MATEMÁTICA E FÍSICA
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  allPassed ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`}
              >
                {totalPassed}/{tests.length} Aprovados
              </span>
            </div>
            <h2 className="text-base font-bold text-white">Verificação Automática de Invariantes Físicas</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Validação rigorosa de leis de conservação, equações de onda e métodos de integração (RK4).
          </span>
          <button
            onClick={executeTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded transition-colors"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Reexecutar Bateria</span>
          </button>
        </div>

        {/* Tests List */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2.5 text-xs font-mono">
          {tests.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-lg border transition-all flex flex-col gap-1.5 ${
                t.passed ? 'bg-slate-950/60 border-slate-800' : 'bg-rose-950/30 border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-sans font-semibold text-slate-200">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{t.name}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {t.module}
                </span>
              </div>

              <p className="font-sans text-slate-400 text-[11px]">{t.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Esperado:</span>
                  <span className="text-slate-200">{t.expected}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Obtido:</span>
                  <span className={t.passed ? 'text-emerald-400' : 'text-rose-400 font-bold'}>{t.actual}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Tolerância / Margem:</span>
                  <span className="text-cyan-400">{t.errorMargin ?? 'N/A'}</span>
                </div>
              </div>

              {t.details && <div className="text-[10px] text-slate-500">{t.details}</div>}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Critério: Erro numérico relativo &lt; 10⁻⁴ em integradores computacionais.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

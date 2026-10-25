import React, { useState } from 'react';
import { ModuleId } from '../../types/physics';
import { MODULES } from '../../data/modules';
import { KaTeXMath } from '../common/KaTeXMath';
import { X, Maximize2, Minimize2, Play, RotateCcw, MessageSquare, Award, ArrowRight } from 'lucide-react';

interface TeacherModeModalProps {
  currentModuleId: ModuleId;
  onClose: () => void;
  onSwitchModule: (mod: ModuleId) => void;
}

export const TeacherModeModal: React.FC<TeacherModeModalProps> = ({
  currentModuleId,
  onClose,
  onSwitchModule,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentMod = MODULES.find((m) => m.id === currentModuleId) || MODULES[0];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const discussionPrompts: Record<ModuleId, string[]> = {
    shm: [
      'Por que a velocidade é máxima exatamente no ponto onde a força resultante é nula (x = 0)?',
      'Nas extremidades x = ±A, por que a aceleração atinge seu valor máximo enquanto o corpo para instantaneamente?',
      'Como a projeção de uma partícula em MCU sobre o diâmetro gera exatamente a função x(t) = A·cos(ωt + φ)?',
    ],
    spring_mass: [
      'Se a massa quadruplicar e a constante elástica duplicar, o que ocorre com a frequência natural?',
      'No sistema vertical, como diferenciar a deformação estática da oscilação dinâmica?',
      'Qual a consequência física de aplicar uma força externa com frequência igual à frequência natural do sistema (ressonância)?',
    ],
    pendulum: [
      'Por que a massa do prumo do pêndulo não altera o período em pequenas oscilações?',
      'Qual seria a alteração do período de um relógio de pêndulo transportado para a Lua ou Marte?',
      'Para oscilações de 60°, por que a aproximação sen(θ) ≈ θ falha e subestima o período real?',
    ],
    waves: [
      'Uma onda transporta matéria ou apenas energia e quantidade de movimento?',
      'Em uma corda homogênea com tração constante, se a frequência da fonte duplicar, o que acontece com a velocidade e o comprimento de onda?',
      'Como demonstrar que cada ponto da corda realiza apenas MHS transversal sem se deslocar horizontalmente?',
    ],
    interference: [
      'O cancelamento destrutivo de duas ondas em uma linha nodal significa que a energia desapareceu do universo?',
      'Como os fones de cancelamento ativo de ruído aplicam a condição de diferença de fase de 180°?',
      'O que determina o espaçamento entre as franjas de interferência em um tanque de ondas?',
    ],
    standing_waves: [
      'O que diferencia fundamentalmente uma onda estacionária de uma onda progressiva?',
      'Por que os tubos sonoros fechados em uma ponta só emitem harmônicos ímpares?',
      'Como os nós e ventres determinam as notas emitidas por violões, flautas e clarinetes?',
    ],
    doppler: [
      'A velocidade do som no ar é maior à frente de uma ambulância em alta velocidade do que atrás dela?',
      'Por que o efeito Doppler é essencial tanto para radares de trânsito quanto para astrônomos medirem a expansão do universo?',
      'Como surge o fenômeno de batimentos quando tocamos dois diapasões com frequências muito próximas?',
    ],
    phenomena: [
      'Por que a frequência da onda permanece rigorosamente constante ao passar de um meio para outro na refração?',
      'Qual a condição geométrica para que a difração ao redor de um obstáculo seja facilmente observável no cotidiano?',
      'Por que o sinal Wi-Fi de 2,4 GHz contorna melhor as paredes da casa do que o de 5,0 GHz?',
    ],
    work_power: [
      'Por que uma força aplicada a 90° em relação ao deslocamento realiza trabalho nulo, mesmo que sua intensidade seja enorme?',
      'Como o Teorema da Energia Cinética unifica as Leis de Newton com o conceito de energia mecânica?',
      'Qual a distinção física entre a potência média necessária para realizar uma tarefa e a potência instantânea do motor?',
    ],
    energy_conservation: [
      'Por que a altura de largada para completar um looping vertical precisa ser de no mínimo 2,5 vezes o raio da curva sem atrito?',
      'Em que ponto da montanha-russa os passageiros experimentam a maior sensação de peso aparente (maior valor de N)?',
      'Quando há atrito nos trilhos, a energia mecânica desaparece ou é convertida em energia térmica e sonora?',
    ],
    impulse_momentum: [
      'Como o Teorema do Impulso explica por que os carros modernos são projetados para amassar em vez de serem indeformáveis?',
      'Por que o airbag reduz drasticamente as lesões no crânio sem alterar o valor do impulso total transferido ao corpo?',
      'Qual a relação entre a área sob a curva do gráfico Força × tempo e a quantidade de movimento do passageiro?',
    ],
    collisions: [
      'Por que o momento linear total do sistema se conserva sempre em colisões, mas a energia cinética só se conserva no caso elástico?',
      'Em uma colisão perfeitamente inelástica entre dois corpos de massas iguais, por que exatamente 50% da energia cinética é dissipada?',
      'Em mesas de bilhar e choques 2D, como decompor a conservação do momento nas direções normal e tangencial ao impacto?',
    ],
    density_pressure: [
      'Por que uma pessoa de salto alto afunda mais na terra fofa do que um elefante de várias toneladas com patas largas?',
      'Como a pressão mecânica (P = F/A) difere conceitualmente da densidade volumétrica (ρ = m/V)?',
      'Como a distribuição da área de apoio é utilizada na engenharia civil para calcular sapatas e fundações de edifícios?',
    ],
    stevin_theorem: [
      'Por que a pressão no fundo de uma piscina de 3 metros de profundidade é a mesma no meio ou encostado na borda?',
      'Em vasos comunicantes com formatos absurdamente diferentes (cilíndrico, cônico, espiral), por que a água atinge rigorosamente a mesma altura?',
      'Como funciona o tubo em U para determinar experimentalmente a densidade de um óleo desconhecido usando água?',
    ],
    pascal_principle: [
      'Se uma prensa hidráulica multiplica a força aplicada por 20 vezes, por que ela NÃO viola o Princípio da Conservação da Energia?',
      'Como o freio hidráulico de um carro transmite a força do pedal para as quatro rodas simultaneamente?',
      'Qual o papel fundamental da incompressibilidade do fluido na transmissão integral da pressão em circuitos fechados?',
    ],
    buoyancy_archimedes: [
      'Como um navio de aço de 100.000 toneladas flutua no mar enquanto uma pequena agulha de aço de 1 grama afunda de imediato?',
      'Por que a leitura de um dinamômetro conectado a uma pedra diminui quando ela é mergulhada na água (peso aparente)?',
      'Por que um iceberg flutua com aproximadamente 90% do seu volume submerso e apenas 10% visível na superfície?',
    ],
    ideal_gas: [
      'Por que a pressão de um gás em recipiente rígido aumenta quando ele é aquecido, sob o ponto de vista microscópico das colisões moleculares?',
      'Em uma transformação isotérmica, por que a curva P × V é uma hipérbole equilátera e como a energia cinética média das partículas se comporta?',
      'Qual a diferença física entre graus de liberdade translacionais de um gás monoatômico (3) e diatômico (5)?',
    ],
    first_law_thermodynamics: [
      'Ao comprimir bruscamente o ar em uma bomba de bicicleta ou pistão de fogo (compressão adiabática), por que a temperatura do gás sobe sem receber calor?',
      'Em uma expansão isobárica, por que o calor absorvido é dividido entre realizar trabalho mecânico externo e elevar a temperatura interna?',
      'Por que em qualquer ciclo termodinâmico fechado a variação total de energia interna é nula (ΔU = 0)?',
    ],
    carnot_heat_engines: [
      'Por que é impossível construir uma máquina térmica com 100% de rendimento, mesmo sem qualquer atrito mecânico (Enunciado de Kelvin-Planck da 2ª Lei)?',
      'Qual a razão matemática de o Ciclo de Carnot operar estritamente entre duas isotérmicas reversíveis e duas adiabáticas reversíveis?',
      'Como a Segunda Lei da Termodinâmica fundamenta a seta do tempo e o conceito de entropia universal?',
    ],
    calorimetry: [
      'Por que a temperatura de uma mistura de gelo e água permanece rigorosamente em 0 °C durante toda a fusão, mesmo recebendo calor constante da chama?',
      'Como o elevado calor específico da água (1 cal/g·°C) modera o clima costeiro e impede variações térmicas bruscas em seres vivos?',
      'Qual o papel do vaso de Dewar (vácuo e paredes espelhadas) em anular as três formas de propagação de calor: condução, convecção e irradiação?',
    ],
    coulomb_law: [
      'Por que a força eletrostática entre duas cargas obedece à 3ª Lei de Newton (par ação-reação) mesmo quando uma das cargas é 1.000 vezes maior que a outra?',
      'Se a distância entre duas cargas for duplicada, por que a força cai para um quarto e não para a metade (lei do inverso do quadrado)?',
      'Como a presença de um meio dielétrico (água, óleo, vácuo) altera a constante eletrostática efetiva k = 1/(4πε)?',
    ],
    electric_field_lines: [
      'Por que duas linhas de campo elétrico NUNCA podem se cruzar no espaço?',
      'Qual a relação entre a densidade espacial das linhas de campo e a intensidade do vetor campo elétrico |E|?',
      'Como demonstrar que o campo elétrico no ponto médio de duas cargas positivas iguais é estritamente nulo?',
    ],
    electric_potential: [
      'Por que o trabalho elétrico sobre uma carga ao longo de uma superfície equipotencial fechada é rigorosamente zero?',
      'Qual a diferença conceitual entre potencial elétrico V (grandeza escalar em Volts) e campo elétrico E (grandeza vetorial em N/C)?',
      'Como demonstrar que o vetor campo elétrico é sempre perpendicular às superfícies equipotenciais e aponta no sentido do potencial decrescente?',
    ],
    parallel_plate_capacitor: [
      'Por que a inserção de um material dielétrico com κ > 1 aumenta a capacitância do capacitor mantendo as dimensões geométricas idênticas?',
      'Se o capacitor for desconectado da fonte antes de afastar as placas, o que ocorre com a carga Q, a tensão V e a energia armazenada U?',
      'Por que o campo elétrico é uniforme no interior das placas paralelas, exceto pelas bordas (efeito de borda)?',
    ],
  };


  const prompts = discussionPrompts[currentMod.id] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Attribution Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase font-bold text-cyan-300">
                Professor Silas Sarmento — Laboratório Virtual de Física
              </div>
              <h1 className="text-lg md:text-xl font-extrabold text-white">
                Modo Apresentação Didática em Sala de Aula
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Tela Cheia para Projetor"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Module Switcher Strip */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => onSwitchModule(m.id)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors border ${
                m.id === currentMod.id
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {m.code}: {m.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Content Deck */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-slate-200">
          {/* Active Module Header */}
          <div className="flex flex-col gap-1 border-b border-slate-800 pb-3">
            <span className="text-xs font-mono uppercase text-cyan-400 font-bold">{currentMod.code}</span>
            <h2 className="text-xl md:text-2xl font-black text-white">{currentMod.title}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{currentMod.shortDesc}</p>
          </div>

          {/* Large Equations Display for Projector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3 shadow-inner">
            <span className="text-xs font-mono uppercase font-bold text-slate-400">
              Formulação Matemática para Projeção
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base">
              {currentMod.equations.map((eq, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-center justify-center">
                  <KaTeXMath math={eq} block />
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Discussion Prompts */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <MessageSquare className="w-4 h-4" />
              <span>Questões e Desafios para Debate Coletivo com os Alunos:</span>
            </div>
            <div className="flex flex-col gap-2">
              {prompts.map((prompt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-slate-950/70 border border-amber-900/40 text-sm leading-relaxed text-slate-200 flex items-start gap-3"
                >
                  <span className="font-mono font-bold text-amber-400 text-base">{idx + 1}.</span>
                  <span>{prompt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Presentation Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400 hidden sm:block">
            Dica: Pressione F11 para tela cheia nativa do navegador ao projetar na sala de aula.
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-lg text-sm shadow-lg transition-all"
          >
            <span>Retornar ao Experimento 3D</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import { GuidedExperiment } from '../types/physics';

export const GUIDED_EXPERIMENTS: GuidedExperiment[] = [
  {
    id: 'exp_spring_mass_dependence',
    moduleId: 'spring_mass',
    title: 'Investigação da Dependência do Período com a Massa no Oscilador Harmônico',
    objective: 'Verificar experimentalmente se dobrar a massa quadruplica, dobra ou altera o período por um fator √2.',
    suggestedParams: {
      mass: 1.0,
      springK: 40,
      dampingCoeff: 0,
      amplitude: 0.3,
    },
    steps: {
      prediction: 'Se a massa do bloco for aumentada de 1,0 kg para 4,0 kg (fator 4), o que você espera que aconteça com o período de oscilação T? Ele irá dobrar, quadruplicar ou permanecer o mesmo?',
      experimentation: 'Configure k = 40 N/m. Meça o período T para m = 1,0 kg. Em seguida, altere a massa para 4,0 kg e meça o novo período com a ferramenta de leitura instantânea.',
      analysis: 'Compare a razão T(4kg) / T(1kg). Verifique a relação matemática T = 2π√(m/k). O valor medido se aproxima de 2,0?',
      conclusion: 'A constante elástica impõe a força restauradora. Como T ∝ √m, quadruplicar a massa duplica o período. O estudante valida a dependência sublinear com a inércia.',
    },
    scientificExplanation: 'A segunda lei de Newton aplicada à força restauradora elástica F = -kx resulta na equação diferencial m·d²x/dt² + kx = 0, cuja frequência angular é ω = √(k/m). Como T = 2π/ω, temos T = 2π√(m/k). Portanto, o período cresce com a raiz quadrada da massa.',
  },
  {
    id: 'exp_pendulum_length',
    moduleId: 'pendulum',
    title: 'Influência do Comprimento e da Gravidade no Pêndulo Simples',
    objective: 'Investigar por que relógios de pêndulo se atrasam ou adiantam ao variar o comprimento da haste ou ao mudar de planeta.',
    suggestedParams: {
      length: 1.0,
      mass: 0.5,
      theta0Deg: 15,
      gravity: 9.8,
    },
    steps: {
      prediction: 'Um astronauta leva um relógio de pêndulo da Terra (g = 9,8 m/s²) para a Lua (g = 1,62 m/s²). O relógio irá bater mais rápido (período menor) ou mais devagar (período maior)?',
      experimentation: 'Defina L = 1,0 m e observe o período na Terra. Em seguida, selecione o preset gravitacional da Lua (g = 1,62 m/s²) e observe a oscilação mais lenta e o novo período.',
      analysis: 'Analise os gráficos de velocidade angular e energia. Como a aceleração restauradora g·sen(θ) é menor na Lua, a força resultante tangencial é drasticamente reduzida.',
      conclusion: 'O período do pêndulo é inversamente proporcional à raiz de g (T ∝ 1/√g). Na Lua, onde a gravidade é ~6 vezes menor, o período é ~2,46 vezes maior (o pêndulo oscila mais lentamente).',
    },
    scientificExplanation: 'Para pequenas oscilações, a restauração é promovida pela componente tangencial do peso P_t = m·g·sen(θ) ≈ m·g·θ. A equação do movimento é d²θ/dt² + (g/L)θ = 0. Note que a massa m cancela-se de ambos os lados, demonstrando que o período independe da massa do pêndulo.',
  },
  {
    id: 'exp_wave_freq_wavelength',
    moduleId: 'waves',
    title: 'Relação Entre Frequência e Comprimento de Onda em Meio Homogêneo',
    objective: 'Demonstrar que aumentar a frequência reduz o comprimento de onda sem alterar a velocidade do meio.',
    suggestedParams: {
      frequency: 2.0,
      wavelength: 2.0,
      amplitude: 0.3,
    },
    steps: {
      prediction: 'Se a velocidade de propagação de uma onda depende exclusivamente das propriedades do meio físico (tensão e densidade linear), o que ocorre com o comprimento de onda λ quando duplicamos a frequência de oscilação da fonte?',
      experimentation: 'Com v = 4,0 m/s mantida fixa, ajuste f = 1,0 Hz e congele a onda para medir λ entre duas cristas consecutivas. Depois, aumente f para 2,0 Hz e torne a medir.',
      analysis: 'Observe como as cristas se aproximam no espaço. Verifique o produto λ · f em ambos os casos.',
      conclusion: 'Em um meio não dispersivo, a velocidade é constante. Pela equação fundamental v = λ·f, o comprimento de onda λ é inversamente proporcional à frequência f.',
    },
    scientificExplanation: 'A velocidade de uma onda mecânica em uma corda é determinada pela fórmula de Taylor: v = √(T_t / μ), dependendo apenas da força tensora e da densidade linear de massa. A fonte determina a frequência f. O meio se adapta ajustando o espaçamento espacial entre perturbações sucessivas (λ = v/f).',
  },
  {
    id: 'exp_interference_phase',
    moduleId: 'interference',
    title: 'Interferência Construtiva e Destrutiva por Diferença de Fase e Caminho',
    objective: 'Compreender o princípio físico dos fones com cancelamento de ruído e as franjas de interferência.',
    suggestedParams: {
      freq: 2.0,
      phaseDiffDeg: 0,
    },
    steps: {
      prediction: 'Se duas caixas acústicas idênticas emitem o mesmo tom puro, mas uma delas está invertida em fase em 180° (π rad), o que um ouvinte localizado exatamente na mediatriz (distâncias iguais) irá escutar?',
      experimentation: 'No simulador de interferência, posicione o cursor de inspeção no centro (Δr = 0). Alterne a fase relativa da fonte 2 de 0° para 180° e observe a amplitude resultante.',
      analysis: 'Note as linhas nodais escuras (superfície plana, cancelamento) versus as regiões de cristas amplificadas.',
      conclusion: 'Quando a diferença de fase é π rad com caminhos iguais, as ondas chegam com crista sobre vale, produzindo interferência totalmente destrutiva (cancelamento acústico).',
    },
    scientificExplanation: 'O princípio da superposição estabelece que o deslocamento resultante é y_res = y1 + y2. Para fontes harmônicas, a amplitude resultante é A_res = 2A·|cos(δ/2)|, onde δ = k·Δr + Δφ. Se δ = (2n+1)π, cos(δ/2) = 0 e a amplitude é nula.',
  },
  {
    id: 'exp_standing_waves_harmonics',
    moduleId: 'standing_waves',
    title: 'Formação de Nós, Ventres e Ressonância de Harmônicos',
    objective: 'Identificar a formação de harmônicos em cordas de violão e tubos sonoros.',
    suggestedParams: {
      n: 1,
      length: 2.0,
      waveSpeed: 40,
    },
    steps: {
      prediction: 'Quantos nós (pontos de deslocamento permanentemente nulo) surgirão em uma corda de extremidades presas quando excitada no 3º harmônico?',
      experimentation: 'Selecione o 1º harmônico (fundamental) e observe 2 nós nas extremidades e 1 ventre central. Mude para n = 3 e conte os nós e ventres.',
      analysis: 'Verifique a regra geral: para o harmônico n em corda presa, o número de nós é n + 1 e o de ventres é n. Calcule λ_n = 2L/n.',
      conclusion: 'A onda estacionária resulta da superposição de duas ondas progressivas idênticas propagando-se em sentidos opostos, confinadas pela reflexão nas extremidades fixas.',
    },
    scientificExplanation: 'As condições de contorno fixas y(0,t) = 0 e y(L,t) = 0 impõem que sen(kL) = 0, o que restringe os números de onda permitidos a k_n = nπ/L. Isso quantiza os comprimentos de onda em λ_n = 2L/n e as frequências naturais em f_n = n·v/(2L).',
  },
  {
    id: 'exp_doppler_velocity',
    moduleId: 'doppler',
    title: 'Efeito Doppler e a Compressão Espacial das Frentes de Onda',
    objective: 'Demonstrar visual e matematicamente por que a sirene de uma ambulância parece mais aguda ao se aproximar e mais grave ao se afastar.',
    suggestedParams: {
      sourceSpeed: 30,
      sourceFreq: 440,
      observerSpeed: 0,
    },
    steps: {
      prediction: 'Quando uma fonte sonora se desloca no ar em direção a um observador parado, a velocidade do som no ar aumenta?',
      experimentation: 'Inicie a simulação com velocidade da fonte v_f = 40 m/s. Observe as frentes de onda circulares concêntricas descentralizadas.',
      analysis: 'Meça a distância entre as frentes de onda à frente da fonte (λ_frente = (v_som - v_f)/f) e atrás da fonte (λ_atras = (v_som + v_f)/f). A velocidade do som no ar permaneceu a mesma!',
      conclusion: 'A velocidade do som no meio NÃO se altera com o movimento da fonte. O que varia é a distância entre as cristas sucessivas emitidas, fazendo com que o observador receba mais frentes de onda por segundo (frequência percebida maior).',
    },
    scientificExplanation: 'Como a fonte se move entre a emissão de cada pulso de onda, a distância entre frentes sucessivas na direção do movimento é λ\' = λ0 - v_f·T0 = (v - v_f)/f0. A frequência percebida pelo observador é f\' = v / λ\' = f0 · [v / (v - v_f)].',
  },
];

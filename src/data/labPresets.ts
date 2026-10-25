/**
 * ONDAS LAB 3D - Didactic Classic Presets Repository
 * Centralized, easily editable presets for every 3D physics laboratory.
 * Provides 2 to 4 didactic benchmark scenarios per lab to accelerate
 * classroom demonstration, self-directed exploration, and exam study.
 */

import { ModuleId } from '../types/physics';

export interface LabPreset {
  id: string;
  label: string;
  description: string;
  badge?: string;
  params: Record<string, any>;
}

export const LAB_PRESETS: Record<ModuleId, LabPreset[]> = {
  // =========================================================================
  // ÁREA 1: MECÂNICA CLÁSSICA
  // =========================================================================
  work_power: [
    {
      id: 'work_parallel',
      label: 'Força e Deslocamento Paralelos (θ = 0°)',
      description: 'Trabalho motor máximo com força perfeitamente alinhada ao movimento sem atrito.',
      badge: 'Trabalho Motor',
      params: { force: 60.0, distance: 15.0, angleDeg: 0, frictionCoeff: 0.0, mass: 5.0, initialSpeed: 0.0 },
    },
    {
      id: 'work_friction',
      label: 'Com Atrito Dissipativo',
      description: 'Trabalho da força resultante reduzido pelo trabalho resistente do atrito.',
      badge: 'Dissipativo',
      params: { force: 50.0, distance: 12.0, angleDeg: 25.0, frictionCoeff: 0.25, mass: 5.0, initialSpeed: 0.0 },
    },
    {
      id: 'work_orthogonal',
      label: 'Força Perpendicular (θ = 90°)',
      description: 'cos(90°) = 0: a força não realiza trabalho mecânico sobre o corpo em movimento.',
      badge: 'Trabalho Nulo',
      params: { force: 60.0, distance: 15.0, angleDeg: 90.0, frictionCoeff: 0.0, mass: 5.0, initialSpeed: 4.0 },
    },
  ],

  energy_conservation: [
    {
      id: 'energy_loop_conservative',
      label: 'Looping Conservativo (Sem Atrito)',
      description: 'Conservação integral da energia mecânica (Em = Ec + Ep = cte) com velocidade no topo.',
      badge: 'Conservativo',
      params: { initialHeight: 8.5, loopRadius: 2.5, mass: 2.0, frictionCoeff: 0.0 },
    },
    {
      id: 'energy_critical_loop',
      label: 'Velocidade Crítica no Topo (h = 2,5 R)',
      description: 'Altura mínima exata para completar o looping sem descolamento dos trilhos (Normal = 0).',
      badge: 'Crítico',
      params: { initialHeight: 6.25, loopRadius: 2.5, mass: 2.0, frictionCoeff: 0.0 },
    },
    {
      id: 'energy_friction_dissipation',
      label: 'Dissipação por Atrito',
      description: 'Perda gradual de energia mecânica convertida em energia térmica ao longo do trajeto.',
      badge: 'Dissipativo',
      params: { initialHeight: 9.0, loopRadius: 2.0, mass: 2.0, frictionCoeff: 0.12 },
    },
  ],

  impulse_momentum: [
    {
      id: 'impulse_airbag',
      label: 'Atenuação com Airbag',
      description: 'Aumento expressivo no tempo de colisão (Δt) que reduz drasticamente a força de pico.',
      badge: 'Proteção',
      params: { speedKmH: 60.0, mass: 75.0, device: 'airbag' },
    },
    {
      id: 'impulse_rigid_wall',
      label: 'Impacto em Barreira Rígida (Sem Amortecimento)',
      description: 'Colisão com tempo infinitesimal resultando em força de pico destrutiva extrema.',
      badge: 'Risco Crítico',
      params: { speedKmH: 60.0, mass: 75.0, device: 'rigid_wall' },
    },
    {
      id: 'impulse_helmet',
      label: 'Capacete de Proteção',
      description: 'Deformação programada da carcaça e polímero absorvedor atenuando a desaceleração.',
      badge: 'Segurança',
      params: { speedKmH: 45.0, mass: 75.0, device: 'helmet' },
    },
  ],

  collisions: [
    {
      id: 'collision_elastic_1d',
      label: 'Choque Perfeitamente Elástico 1D (e = 1)',
      description: 'Conservação total tanto da quantidade de movimento quanto da energia cinética.',
      badge: 'Elástica',
      params: { dimension: '1D', restitution: 1.0, m1: 3.0, m2: 2.0, v1i: 4.0, v2i: -2.0, impactAngle2D: 0 },
    },
    {
      id: 'collision_inelastic_1d',
      label: 'Choque Perfeitamente Inelástico (e = 0)',
      description: 'Os corpos saem grudados com a mesma velocidade final e máxima dissipação de Ec.',
      badge: 'Inelástica',
      params: { dimension: '1D', restitution: 0.0, m1: 4.0, m2: 2.0, v1i: 5.0, v2i: 0.0, impactAngle2D: 0 },
    },
    {
      id: 'collision_elastic_2d',
      label: 'Colisão Oblíqua em Mesa 2D',
      description: 'Espalhamento bidimensional conservando o vetor momento nas coordenadas x e z.',
      badge: '2D Vetorial',
      params: { dimension: '2D', restitution: 0.9, m1: 3.0, m2: 3.0, v1i: 4.0, v2i: 0.0, impactAngle2D: 35.0 },
    },
  ],

  // =========================================================================
  // ÁREA 2: HIDROSTÁTICA
  // =========================================================================
  density_pressure: [
    {
      id: 'density_contact_large',
      label: 'Maior Área de Apoio (Menor Pressão)',
      description: 'O mesmo peso distribuído sobre a face maior gera menor afundamento na superfície.',
      badge: 'Face Larga',
      params: { mode: 'contact_block', solidMaterial: 'iron', supportFace: 'large', blockDimL: 0.4, blockDimW: 0.2, blockDimH: 0.1 },
    },
    {
      id: 'density_contact_small',
      label: 'Menor Área de Apoio (Maior Pressão)',
      description: 'Apoiado sobre a face menor, a pressão mecânica multiplica por 4 vezes.',
      badge: 'Alta Pressão',
      params: { mode: 'contact_block', solidMaterial: 'iron', supportFace: 'small', blockDimL: 0.4, blockDimW: 0.2, blockDimH: 0.1 },
    },
    {
      id: 'density_fluid_column',
      label: 'Coluna de Água em Profundidade',
      description: 'Pressão hidrostática pura P = ρ·g·h adicionada à pressão atmosférica de 1 atm.',
      badge: 'Hidrostática',
      params: { mode: 'fluid_column', fluidType: 'water', fluidDepth: 3.0 },
    },
  ],

  stevin_theorem: [
    {
      id: 'stevin_communicating',
      label: 'Vasos Comunicantes (Mesmo Nível)',
      description: 'O nível do líquido independe da geometria ou do volume de cada ramo interligado.',
      badge: 'Equiprecisão',
      params: { mode: 'communicating_vessels', vesselFluid: 'water', vesselLiquidHeight: 1.2, probeDepth: 0.8 },
    },
    {
      id: 'stevin_utube_water_oil',
      label: 'Tubo em U: Água e Óleo',
      description: 'Líquidos imiscíveis: a coluna de óleo (menor densidade) fica mais alta que a de água.',
      badge: 'Imiscíveis',
      params: { mode: 'u_tube', uTubeLiquid1: 'water', uTubeLiquid2: 'oil', uTubeH1: 0.15 },
    },
    {
      id: 'stevin_utube_mercury',
      label: 'Tubo em U: Água e Mercúrio',
      description: 'Devido à alta densidade do mercúrio (13,6 g/cm³), uma pequena coluna equilibra muita água.',
      badge: 'Densidade Extrema',
      params: { mode: 'u_tube', uTubeLiquid1: 'water', uTubeLiquid2: 'mercury', uTubeH1: 0.2 },
    },
  ],

  pascal_principle: [
    {
      id: 'pascal_multiplication_10x',
      label: 'Multiplicação de Força 25x',
      description: 'Relação de raios r₂/r₁ = 5 gera amplificação de força de 25 vezes com menor deslocamento.',
      badge: '25x Amplificação',
      params: { force1: 150.0, radius1: 0.05, radius2: 0.25, displacement1: 0.25, efficiency: 1.0 },
    },
    {
      id: 'pascal_equal_pistons',
      label: 'Êmbolos de Áreas Iguais (1:1)',
      description: 'Sem amplificação mecânica: força aplicada é integralmente transmitida na mesma magnitude.',
      badge: 'Simétrico',
      params: { force1: 200.0, radius1: 0.1, radius2: 0.1, displacement1: 0.2, efficiency: 1.0 },
    },
    {
      id: 'pascal_high_load',
      label: 'Elevação de Carga Pesada (100x)',
      description: 'Prensa industrial com êmbolo de saída 10x maior em raio, multiplicando a força em 100x.',
      badge: 'Carga Pesada',
      params: { force1: 80.0, radius1: 0.03, radius2: 0.3, displacement1: 0.3, efficiency: 0.95 },
    },
  ],

  buoyancy_archimedes: [
    {
      id: 'buoyancy_floating_wood',
      label: 'Madeira Flutuando (60% Submerso)',
      description: 'Equilíbrio estático estável com Empuxo igual ao Peso (ρ_corpo / ρ_líquido = 0,60).',
      badge: 'Flutuação',
      params: { bodyMaterial: 'wood', bodyVolumeLiters: 2.0, fluidType: 'water', mode: 'free_floating' },
    },
    {
      id: 'buoyancy_iceberg',
      label: 'Gelo na Água (~92% Submerso)',
      description: 'Fração submersa igual à razão de densidades (917 / 1000 = 91,7%), modelo do iceberg.',
      badge: 'Iceberg',
      params: { bodyMaterial: 'ice', bodyVolumeLiters: 2.5, fluidType: 'water', mode: 'free_floating' },
    },
    {
      id: 'buoyancy_sinking_metal',
      label: 'Alumínio Afundando (Peso Aparente)',
      description: 'Corpo mais denso que o líquido afunda; a balança registra peso aparente P_ap = P - E.',
      badge: 'Afundamento',
      params: { bodyMaterial: 'aluminum', bodyVolumeLiters: 2.0, fluidType: 'water', mode: 'forced_immersion', immersionPercentage: 100 },
    },
  ],

  // =========================================================================
  // ÁREA 3: TERMODINÂMICA
  // =========================================================================
  ideal_gas: [
    {
      id: 'gas_isothermal',
      label: 'Transformação Isotérmica (Lei de Boyle)',
      description: 'Temperatura constante T = 300 K: o produto P·V permanece invariante.',
      badge: 'T = cte',
      params: { transformType: 'isothermal', pressure: 101325, volume: 0.024, moles: 1.0 },
    },
    {
      id: 'gas_isobaric',
      label: 'Transformação Isobárica (Lei de Charles)',
      description: 'Pressão constante P = 1 atm: o volume expande proporcionalmente à temperatura absoluta.',
      badge: 'P = cte',
      params: { transformType: 'isobaric', pressure: 101325, volume: 0.02, moles: 1.0 },
    },
    {
      id: 'gas_isochoric',
      label: 'Transformação Isocórica (Gay-Lussac)',
      description: 'Volume rígido constante: aumento de temperatura eleva diretamente a pressão contra as paredes.',
      badge: 'V = cte',
      params: { transformType: 'isochoric', pressure: 101325, volume: 0.024, moles: 1.0 },
    },
  ],

  first_law_thermodynamics: [
    {
      id: 'firstlaw_adiabatic',
      label: 'Expansão Adiabática (Q = 0)',
      description: 'Sem troca de calor: o gás realiza trabalho às custas da energia interna (dU = -dW = -P dV).',
      badge: 'Q = 0',
      params: { modePreset: 'adiabatic', heatQ: 0, workW: 160, initialU: 1500 },
    },
    {
      id: 'firstlaw_isothermal',
      label: 'Isotérmica (ΔU = 0, Q = W)',
      description: 'Todo o calor absorvido é integralmente convertido em trabalho mecânico de expansão.',
      badge: 'ΔU = 0',
      params: { modePreset: 'isothermal', heatQ: 250, workW: 250, initialU: 1500 },
    },
    {
      id: 'firstlaw_isochoric',
      label: 'Isocórica (W = 0, ΔU = Q)',
      description: 'Sem variação de volume: nenhum trabalho é realizado, todo o calor vira energia interna.',
      badge: 'W = 0',
      params: { modePreset: 'isochoric', heatQ: 320, workW: 0, initialU: 1500 },
    },
  ],

  carnot_heat_engines: [
    {
      id: 'carnot_high_efficiency',
      label: 'Ciclo Carnot de Alto Rendimento (η = 50%)',
      description: 'Fonte quente Th = 600 K e fonte fria Tc = 300 K: rendimento termodinâmico máximo de 50%.',
      badge: 'η = 50%',
      params: { tHot: 600, tCold: 300, moles: 1.0, engineIrreversibility: 1.0 },
    },
    {
      id: 'carnot_real_engine',
      label: 'Motor Térmico Real com Irreversibilidade',
      description: 'Máquina real operando com atrito e perdas térmicas (70% do limite teórico de Carnot).',
      badge: 'Motor Real',
      params: { tHot: 500, tCold: 320, moles: 1.0, engineIrreversibility: 0.7 },
    },
    {
      id: 'carnot_small_gradient',
      label: 'Pequeno Gradiente Térmico (η = 15%)',
      description: 'Th = 380 K e Tc = 320 K: pequena diferença de temperatura limita severamente o rendimento.',
      badge: 'Baixo Salto',
      params: { tHot: 380, tCold: 320, moles: 1.0, engineIrreversibility: 1.0 },
    },
  ],

  calorimetry: [
    {
      id: 'calorimetry_water_water',
      label: 'Mistura Água Fria + Água Quente',
      description: 'Troca de calor sem mudança de fase entre duas massas de água em temperaturas distintas.',
      badge: 'Líquido-Líquido',
      params: { liquidType: 'water', liquidMass: 0.3, liquidTemp: 20, solidType: 'copper', solidMass: 0.15, solidTemp: 90 },
    },
    {
      id: 'calorimetry_ice_melting',
      label: 'Fusão do Gelo a 0°C',
      description: 'Gelo a 0°C absorve calor latente de fusão (L = 80 cal/g) até se transformar em água líquida.',
      badge: 'Mudança de Fase',
      params: { liquidType: 'water', liquidMass: 0.25, liquidTemp: 55, solidType: 'ice', solidMass: 0.05, solidTemp: 0 },
    },
    {
      id: 'calorimetry_aluminum_cooling',
      label: 'Bloco de Alumínio Aquecido',
      description: 'Alumínio de alto calor específico resfriando dentro de um banho de água.',
      badge: 'Metal-Água',
      params: { liquidType: 'water', liquidMass: 0.2, liquidTemp: 25, solidType: 'aluminum', solidMass: 0.12, solidTemp: 85 },
    },
  ],

  // =========================================================================
  // ÁREA 4: OSCILAÇÕES E ONDAS
  // =========================================================================
  shm: [
    {
      id: 'shm_standard',
      label: 'Oscilador Padrão',
      description: 'Movimento harmônico simples clássico com amplitude moderada e frequência natural de 0,8 Hz.',
      badge: 'Padrão',
      params: { amplitude: 1.2, frequency: 0.8, initialPhaseDeg: 0, compareSecond: false },
    },
    {
      id: 'shm_high_freq',
      label: 'Alta Frequência',
      description: 'Oscilações rápidas com grande aceleração máxima proporcional a ω².',
      badge: 'Alta Freq',
      params: { amplitude: 0.8, frequency: 2.0, initialPhaseDeg: 0, compareSecond: false },
    },
    {
      id: 'shm_quadrature',
      label: 'Em Quadratura (90°)',
      description: 'Dois osciladores com diferença de fase de 90°: um está no pico quando o outro passa pelo zero.',
      badge: 'Fase 90°',
      params: { amplitude: 1.2, frequency: 0.8, initialPhaseDeg: 0, compareSecond: true, phaseDiffDeg: 90 },
    },
    {
      id: 'shm_opposite_phase',
      label: 'Em Oposição de Fase (180°)',
      description: 'Dois osciladores em anti-fase exata: movimentos em direções opostas a cada instante.',
      badge: 'Fase 180°',
      params: { amplitude: 1.2, frequency: 0.8, initialPhaseDeg: 0, compareSecond: true, phaseDiffDeg: 180 },
    },
  ],

  spring_mass: [
    {
      id: 'spring_resonance',
      label: 'Ressonância',
      description: 'Força excitadora sintonizada na frequência natural do sistema (f_ext ≈ f₀), maximizando a amplitude.',
      badge: 'Ressonância',
      params: { mass: 1.5, springK: 45.0, amplitude: 0.5, dampingCoeff: 0.12, externalForceAmp: 8.0, externalFreq: 0.87, isVertical: false },
    },
    {
      id: 'spring_frictionless',
      label: 'Sem atrito (Conservativo)',
      description: 'Oscilador ideal harmônico sem perdas: a energia mecânica total permanece rigorosamente constante.',
      badge: 'Conservativo',
      params: { mass: 1.5, springK: 45.0, amplitude: 1.2, dampingCoeff: 0.0, externalForceAmp: 0.0, externalFreq: 0.8, isVertical: false },
    },
    {
      id: 'spring_damped',
      label: 'Com atrito (Subamortecido)',
      description: 'Amortecimento viscoso moderado com decaimento exponencial gradual da amplitude de oscilação.',
      badge: 'Subamortecido',
      params: { mass: 1.5, springK: 45.0, amplitude: 1.4, dampingCoeff: 0.55, externalForceAmp: 0.0, externalFreq: 0.8, isVertical: false },
    },
    {
      id: 'spring_overdamped',
      label: 'Superamortecido',
      description: 'Forte atrito viscoso sem oscilação: a massa retorna lentamente ao equilíbrio sem ultrapassá-lo.',
      badge: 'Superamortecido',
      params: { mass: 1.0, springK: 20.0, amplitude: 1.2, dampingCoeff: 3.2, externalForceAmp: 0.0, externalFreq: 0.8, isVertical: false },
    },
  ],

  pendulum: [
    {
      id: 'pendulum_linear_small',
      label: 'Pequenas Oscilações (Linear θ₀ = 8°)',
      description: 'Aproximação linear do MHS (sen θ ≈ θ): o período coincide com a fórmula simples T = 2π√(L/g).',
      badge: 'Linear',
      params: { length: 2.0, mass: 1.0, theta0Deg: 8, gravity: 9.8, damping: 0.0 },
    },
    {
      id: 'pendulum_nonlinear_large',
      label: 'Grandes Oscilações (Não Linear θ₀ = 65°)',
      description: 'O período real calculado por integrais elípticas K(k) afasta-se significativamente do modelo simples.',
      badge: 'Não Linear',
      params: { length: 2.0, mass: 1.0, theta0Deg: 65, gravity: 9.8, damping: 0.0 },
    },
    {
      id: 'pendulum_moon_gravity',
      label: 'Gravidade Lunar (g = 1,62 m/s²)',
      description: 'Aceleração gravitacional da Lua: oscilação em câmera lenta com período muito mais longo.',
      badge: 'Lua',
      params: { length: 1.5, mass: 1.0, theta0Deg: 25, gravity: 1.62, damping: 0.0 },
    },
  ],

  waves: [
    {
      id: 'wave_standard',
      label: 'Onda Harmônica Padrão',
      description: 'Propagação progressiva com comprimento de onda de 2,4 m e velocidade v = λ·f = 2,88 m/s.',
      badge: 'Padrão',
      params: { waveMode: 'transverse', amplitude: 0.8, frequency: 1.2, wavelength: 2.4 },
    },
    {
      id: 'wave_high_freq',
      label: 'Alta Frequência / Ondas Curtas',
      description: 'Frequência elevada com frentes de onda cerradas e transporte contínuo de energia.',
      badge: 'Alta Freq',
      params: { waveMode: 'transverse', amplitude: 0.5, frequency: 2.5, wavelength: 1.2 },
    },
    {
      id: 'wave_longitudinal',
      label: 'Onda Longitudinal (Compressão)',
      description: 'Perturbação na mesma direção de propagação, modelando ondas acústicas de pressão.',
      badge: 'Longitudinal',
      params: { waveMode: 'longitudinal', amplitude: 0.7, frequency: 1.2, wavelength: 2.0 },
    },
  ],

  interference: [
    {
      id: 'interference_constructive',
      label: 'Construtiva',
      description: 'Fontes em fase (Δφ = 0°): ao longo da mediatriz as cristas somam-se em amplitude máxima.',
      badge: 'Construtiva',
      params: { sourceDistance: 3.0, frequency: 1.2, amplitude: 0.6, phaseDiffDeg: 0, probePos: { x: 0.0, y: 2.0 } },
    },
    {
      id: 'interference_destructive',
      label: 'Destrutiva',
      description: 'Fontes em anti-fase (Δφ = 180°): na mediatriz uma crista anula um vale, gerando nodo estático.',
      badge: 'Destrutiva',
      params: { sourceDistance: 3.0, frequency: 1.2, amplitude: 0.6, phaseDiffDeg: 180, probePos: { x: 0.0, y: 2.0 } },
    },
    {
      id: 'interference_quadrature',
      label: 'Fontes Desfasadas (90°)',
      description: 'Defasagem intermediária de 90° gerando padrão assimétrico de máximos e mínimos.',
      badge: 'Fase 90°',
      params: { sourceDistance: 3.0, frequency: 1.2, amplitude: 0.6, phaseDiffDeg: 90, probePos: { x: 1.5, y: 2.0 } },
    },
  ],

  standing_waves: [
    {
      id: 'standing_2nd_harmonic',
      label: '2º harmônico',
      description: 'Dois ventres de oscilação e um nó central em corda fixa de 3 metros.',
      badge: 'n = 2',
      params: { boundary: 'both_fixed', harmonic: 2, length: 3.0, waveSpeed: 60.0, amplitude: 0.7 },
    },
    {
      id: 'standing_3_ventres',
      label: '3 ventres',
      description: 'Três ventres de oscilação correspondentes ao 3º harmônico (n = 3) com 2 nós internos.',
      badge: '3 Ventres',
      params: { boundary: 'both_fixed', harmonic: 3, length: 3.0, waveSpeed: 60.0, amplitude: 0.7 },
    },
    {
      id: 'standing_closed_pipe',
      label: 'Tubo Fechado (3º Harmônico)',
      description: 'Tubo acústico com nó na extremidade fechada e ventre na aberta; apenas modos ímpares.',
      badge: 'Tubo Fechado',
      params: { boundary: 'pipe_closed_open', harmonic: 3, length: 2.5, waveSpeed: 60.0, amplitude: 0.6 },
    },
    {
      id: 'standing_fundamental',
      label: 'Modo Fundamental (1º Harmônico)',
      description: 'Menor frequência de ressonância com apenas 1 ventre central e comprimento λ = 2L.',
      badge: 'Fundamental',
      params: { boundary: 'both_fixed', harmonic: 1, length: 3.0, waveSpeed: 60.0, amplitude: 0.8 },
    },
  ],

  doppler: [
    {
      id: 'doppler_stationary',
      label: 'Fonte parada',
      description: 'Fonte e observador em repouso mútuo: frentes de onda perfeitamente concêntricas e f_obs = f₀.',
      badge: 'Repouso',
      params: { sourceSpeed: 0.0, observerSpeed: 0.0, sourceFreq: 440.0, isBeatsMode: false },
    },
    {
      id: 'doppler_approaching',
      label: 'Fonte se aproximando',
      description: 'Aproximação subsônica: compressão frontal das frentes de onda elevando a frequência percebida.',
      badge: 'Aproximação',
      params: { sourceSpeed: 50.0, observerSpeed: 0.0, sourceFreq: 440.0, isBeatsMode: false },
    },
    {
      id: 'doppler_supersonic',
      label: 'Supersônico',
      description: 'Velocidade da fonte superior à do som (Mach > 1, vs = 360 m/s), formando cone de choque de Mach.',
      badge: 'Mach > 1',
      params: { sourceSpeed: 360.0, observerSpeed: 0.0, sourceFreq: 440.0, isBeatsMode: false },
    },
    {
      id: 'doppler_observer_moving',
      label: 'Observador em fuga',
      description: 'Observador se afastando da fonte estacionária, percebendo som com tom mais grave.',
      badge: 'Observador Móvel',
      params: { sourceSpeed: 0.0, observerSpeed: -45.0, sourceFreq: 440.0, isBeatsMode: false },
    },
  ],

  phenomena: [
    {
      id: 'phenom_water_glass',
      label: 'Refração Água -> Vidro',
      description: 'Mudança de meio com redução na velocidade e no comprimento de onda, mantendo frequência invariante.',
      badge: 'Refração',
      params: { phenomenon: 'refraction', v1: 4.0, v2: 2.0, refractFreq: 1.0 },
    },
    {
      id: 'phenom_diffraction',
      label: 'Difração em Fenda Estreita',
      description: 'Dispersão de frentes de onda ao contornar fenda com largura da ordem do comprimento de onda.',
      badge: 'Difração',
      params: { phenomenon: 'diffraction', slitWidth: 1.0, diffractWavelength: 1.0 },
    },
    {
      id: 'phenom_fixed_reflection',
      label: 'Reflexão com Extremidade Fixa',
      description: 'Inversão de fase de 180° no pulso refletido na fronteira rígida.',
      badge: 'Reflexão',
      params: { phenomenon: 'reflection', isFixedEnd: true },
    },
  ],

  // =========================================================================
  // ÁREA 5: ELETRICIDADE E ELETROMAGNETISMO
  // =========================================================================
  coulomb_law: [
    {
      id: 'coulomb_attraction',
      label: 'Atração Eletrostática (+q e -q)',
      description: 'Cargas de sinais opostos sofrem força de atração mútua proporcional a 1/r².',
      badge: 'Atração',
      params: { q1MicroC: 3.0, q2MicroC: -4.0, distanceM: 0.8, medium: 'vacuum' },
    },
    {
      id: 'coulomb_repulsion_strong',
      label: 'Repulsão Intensa (+q e +q)',
      description: 'Cargas de mesmo sinal com curta distância gerando elevada força repulsiva.',
      badge: 'Repulsão',
      params: { q1MicroC: 5.0, q2MicroC: 5.0, distanceM: 0.5, medium: 'vacuum' },
    },
    {
      id: 'coulomb_water_shielding',
      label: 'Blindagem em Água (ε_r = 80)',
      description: 'A constante dielétrica da água reduz a força eletrostática entre as cargas em 80 vezes.',
      badge: 'Dielétrico',
      params: { q1MicroC: 4.0, q2MicroC: -4.0, distanceM: 0.6, medium: 'water' },
    },
  ],

  electric_field_lines: [
    {
      id: 'field_dipole',
      label: 'Dipolo Elétrico (+q e -q)',
      description: 'Linhas contínuas que nascem na carga positiva e convergem simetricamente na carga negativa.',
      badge: 'Dipolo',
      params: { mode: 'two_charges', q1MicroC: 4.0, q2MicroC: -4.0, separationM: 0.9, lineDensity: 18 },
    },
    {
      id: 'field_repulsion',
      label: 'Cargas Positivas Repulsivas (+q e +q)',
      description: 'Linhas divergem de ambas as cargas, criando um ponto de campo nulo exatamente no centro.',
      badge: 'E = 0 no Centro',
      params: { mode: 'two_charges', q1MicroC: 4.0, q2MicroC: 4.0, separationM: 0.9, lineDensity: 18 },
    },
    {
      id: 'field_single_charge',
      label: 'Carga Pontual Isolada',
      description: 'Campo radial esfericamente simétrico com decaimento quadrático E = k·q/r².',
      badge: 'Radial',
      params: { mode: 'single_charge', q1MicroC: 4.0, lineDensity: 18 },
    },
  ],

  electric_potential: [
    {
      id: 'potential_single',
      label: 'Superfícies de Carga Positiva',
      description: 'Superfícies equipotenciais esféricas concêntricas onde o potencial decresce com 1/r.',
      badge: 'Esférico',
      params: { mode: 'single_charge', q1MicroC: 4.0, q0MicroC: 1.0, posB: { x: 0.0, y: 0.6, z: 0.0 } },
    },
    {
      id: 'potential_dipole',
      label: 'Dipolo e Linha V = 0',
      description: 'Plano mediatriz entre as cargas tem potencial nulo (V = 0) e trabalho zero ao longo dele.',
      badge: 'V = 0 Mediatriz',
      params: { mode: 'two_charges', q1MicroC: 4.0, q2MicroC: -4.0, separationM: 0.8, q0MicroC: 1.0, posB: { x: 0.0, y: 0.5, z: 0.0 } },
    },
    {
      id: 'potential_same_charges',
      label: 'Cargas Positivas Repulsivas (+ e +)',
      description: 'Poço de potencial central onde o gradiente elétrico anula o campo no ponto médio.',
      badge: 'Simétrico',
      params: { mode: 'two_charges', q1MicroC: 3.0, q2MicroC: 3.0, separationM: 0.8, q0MicroC: 1.0, posB: { x: 0.0, y: 0.0, z: 0.0 } },
    },
  ],

  parallel_plate_capacitor: [
    {
      id: 'capacitor_vacuum',
      label: 'Vácuo',
      description: 'Capacitor de placas no vácuo (κ = 1): modelo base de referência para capacitância C = ε₀·A/d.',
      badge: 'Vácuo (κ = 1)',
      params: { areaM2: 0.04, distanceMm: 12.0, voltageV: 20.0, dielectric: 'vacuum' },
    },
    {
      id: 'capacitor_glass',
      label: 'Com vidro',
      description: 'Inserção de lâmina de vidro (κ = 5): a capacitância e a energia armazenada quintuplicam para a mesma ddp.',
      badge: 'Vidro (κ = 5)',
      params: { areaM2: 0.04, distanceMm: 12.0, voltageV: 20.0, dielectric: 'glass' },
    },
    {
      id: 'capacitor_high_voltage',
      label: 'Alta Tensão e Vidro',
      description: 'Placas próximas (8 mm) a 50 Volts com vidro, demonstrando grande carga acumulada Q = C·V.',
      badge: 'Alta Ddp',
      params: { areaM2: 0.05, distanceMm: 8.0, voltageV: 50.0, dielectric: 'glass' },
    },
    {
      id: 'capacitor_ceramic',
      label: 'Supercapacitância (Cerâmica)',
      description: 'Dielétrico de cerâmica (κ = 10) e distância mínima (4 mm): máxima densidade volumétrica de energia.',
      badge: 'Cerâmica (κ = 10)',
      params: { areaM2: 0.08, distanceMm: 4.0, voltageV: 24.0, dielectric: 'ceramic' },
    },
  ],
};

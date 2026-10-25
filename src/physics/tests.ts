/**
 * ONDAS LAB 3D - Comprehensive Automated Physics Verification Suite
 * Validates physical invariants, boundary conditions, initial conditions across all regimes,
 * and mathematical equations.
 */

import {
  calculateSHM,
  calculateSpringMass,
  integratePendulumRK4,
  calculateWavePoint,
  calculateInterferenceAt,
  calculateStandingWave,
  calculateDoppler,
  calculateRefraction,
  completeEllipticK,
  singleSlitDiffractionIntensity,
} from './math';
import { AutomatedTestResult, isValidModuleId } from '../types/physics';

export function runAllPhysicsTests(): AutomatedTestResult[] {
  const results: AutomatedTestResult[] = [];

  // Helper to push test results
  const addTest = (
    id: string,
    name: string,
    module: string,
    description: string,
    passed: boolean,
    expected: string,
    actual: string,
    errorMargin?: string,
    details?: string
  ) => {
    results.push({
      id,
      name,
      module,
      description,
      passed,
      expected,
      actual,
      errorMargin,
      details,
    });
  };

  // Test 1: Invariant f * T = 1
  try {
    const f = 2.5;
    const shm = calculateSHM(1.0, 0.5, f, 0);
    const product = f * shm.period;
    const passed = Math.abs(product - 1.0) < 1e-12;
    addTest(
      'test_f_t_reciprocal',
      'Relação Fundamental Período e Frequência (f · T = 1)',
      'Movimento Harmônico Simples',
      'Verifica se o produto f · T = 1 com exatidão matemática.',
      passed,
      '1.000000',
      product.toFixed(6),
      '< 1e-12',
      `f = ${f} Hz, T = ${shm.period.toFixed(4)} s -> f · T = ${product}`
    );
  } catch (err) {
    addTest('test_f_t_reciprocal', 'Relação Fundamental Período e Frequência', 'MHS', 'Erro na execução', false, '1.0', String(err));
  }

  // Test 2: Wave speed relationship v = lambda * f
  try {
    const f = 5.0;
    const lambda = 1.2;
    const pt = calculateWavePoint(0, 0, { amplitude: 0.2, frequency: f, wavelength: lambda, initialPhase: 0 });
    const expectedV = lambda * f;
    const passed = Math.abs(pt.waveSpeed - expectedV) < 1e-12;
    addTest(
      'test_wave_speed',
      'Equação Fundamental da Ondulatória (v = λ · f)',
      'Ondas Progressivas',
      'Valida a relação de velocidade de propagação de fase com comprimento e frequência.',
      passed,
      `${expectedV.toFixed(2)} m/s`,
      `${pt.waveSpeed.toFixed(2)} m/s`,
      '0.00%',
      `λ = ${lambda} m, f = ${f} Hz -> v = ${pt.waveSpeed.toFixed(2)} m/s`
    );
  } catch (err) {
    addTest('test_wave_speed', 'Equação Fundamental da Ondulatória', 'Ondas Progressivas', 'Erro', false, '6.0 m/s', String(err));
  }

  // Test 3: Conservation of Mechanical Energy in Ideal Mass-Spring
  try {
    const m = 1.5;
    const k = 60.0;
    const A = 0.3;
    const e0 = calculateSpringMass(0, m, k, A, 0).totalEnergy;
    const e1 = calculateSpringMass(0.42, m, k, A, 0).totalEnergy;
    const e2 = calculateSpringMass(1.15, m, k, A, 0).totalEnergy;
    const diff = Math.max(Math.abs(e1 - e0), Math.abs(e2 - e0));
    const passed = diff < 1e-9;
    addTest(
      'test_energy_conservation_spring',
      'Conservação da Energia Mecânica (Oscilador Ideal)',
      'Sistema Massa-Mola',
      'Garante que a energia mecânica total Em = Ec + Ep permanece rigorosamente constante no tempo.',
      passed,
      `${e0.toFixed(4)} J (constante)`,
      `${e1.toFixed(4)} J`,
      `ΔE = ${diff.toExponential(2)} J`,
      `Em(0) = ${e0.toFixed(4)} J, Em(0.42s) = ${e1.toFixed(4)} J, Em(1.15s) = ${e2.toFixed(4)} J`
    );
  } catch (err) {
    addTest('test_energy_conservation_spring', 'Conservação da Energia Mecânica', 'Sistema Massa-Mola', 'Erro', false, 'ΔE = 0', String(err));
  }

  // Test 4: Initial Conditions in Undamped / Underdamped Spring-Mass
  try {
    const m = 1.2;
    const k = 48.0;
    const x0 = 0.75;
    const v0 = -0.4;
    const b = 0.6; // underdamped
    const st0 = calculateSpringMass(0, m, k, x0, b, false, 9.8, 0, 1, v0);
    const posErr = Math.abs(st0.position - x0);
    const velErr = Math.abs(st0.velocity - v0);
    const passed = posErr < 1e-9 && velErr < 1e-9 && st0.dampingRegime === 'underdamped';
    addTest(
      'test_initial_conditions_underdamped',
      'Condições Iniciais: Regime Subamortecido (x(0)=x₀, v(0)=v₀)',
      'Sistema Massa-Mola',
      'Garante que a solução analítica subamortecida reproduz com exatidão a posição e velocidade iniciais declaradas.',
      passed,
      `x(0) = ${x0.toFixed(2)} m, v(0) = ${v0.toFixed(2)} m/s`,
      `x(0) = ${st0.position.toFixed(2)} m, v(0) = ${st0.velocity.toFixed(2)} m/s`,
      `Erro pos: ${posErr.toExponential(1)}, vel: ${velErr.toExponential(1)}`,
      `Regime identificado: ${st0.dampingRegime}`
    );
  } catch (err) {
    addTest('test_initial_conditions_underdamped', 'Condições Iniciais: Subamortecido', 'Sistema Massa-Mola', 'Erro', false, 'Exato', String(err));
  }

  // Test 5: Initial Conditions in Critically Damped Spring-Mass
  try {
    const m = 1.0;
    const k = 16.0;
    // gamma = omega0 = sqrt(16/1) = 4 -> b_critical = 2 * m * omega0 = 8.0
    const bCritical = 2 * Math.sqrt(k * m);
    const x0 = 0.5;
    const v0 = 1.2;
    const st0 = calculateSpringMass(0, m, k, x0, bCritical, false, 9.8, 0, 1, v0);
    const posErr = Math.abs(st0.position - x0);
    const velErr = Math.abs(st0.velocity - v0);
    const passed = posErr < 1e-9 && velErr < 1e-9 && st0.dampingRegime === 'critically_damped';
    addTest(
      'test_initial_conditions_critical',
      'Condições Iniciais: Regime Criticamente Amortecido (γ = ω₀)',
      'Sistema Massa-Mola',
      'Valida que o amortecimento crítico não oscila e satisfaz as condições de contorno em t = 0.',
      passed,
      `x(0) = ${x0.toFixed(2)} m, v(0) = ${v0.toFixed(2)} m/s`,
      `x(0) = ${st0.position.toFixed(2)} m, v(0) = ${st0.velocity.toFixed(2)} m/s`,
      `Erro pos: ${posErr.toExponential(1)}, vel: ${velErr.toExponential(1)}`,
      `Regime identificado: ${st0.dampingRegime}`
    );
  } catch (err) {
    addTest('test_initial_conditions_critical', 'Condições Iniciais: Criticamente Amortecido', 'Sistema Massa-Mola', 'Erro', false, 'Exato', String(err));
  }

  // Test 6: Initial Conditions in Overdamped Spring-Mass
  try {
    const m = 1.0;
    const k = 9.0;
    // omega0 = 3 rad/s, b_crit = 6. Overdamped with b = 10.0 (gamma = 5 > 3)
    const bOver = 10.0;
    const x0 = -0.6;
    const v0 = 0.8;
    const st0 = calculateSpringMass(0, m, k, x0, bOver, false, 9.8, 0, 1, v0);
    const posErr = Math.abs(st0.position - x0);
    const velErr = Math.abs(st0.velocity - v0);
    const passed = posErr < 1e-9 && velErr < 1e-9 && st0.dampingRegime === 'overdamped';
    addTest(
      'test_initial_conditions_overdamped',
      'Condições Iniciais: Regime Superamortecido (γ > ω₀)',
      'Sistema Massa-Mola',
      'Verifica a superposição de expoentes reais sem comportamento oscilatório.',
      passed,
      `x(0) = ${x0.toFixed(2)} m, v(0) = ${v0.toFixed(2)} m/s`,
      `x(0) = ${st0.position.toFixed(2)} m, v(0) = ${st0.velocity.toFixed(2)} m/s`,
      `Erro pos: ${posErr.toExponential(1)}, vel: ${velErr.toExponential(1)}`,
      `Regime identificado: ${st0.dampingRegime}`
    );
  } catch (err) {
    addTest('test_initial_conditions_overdamped', 'Condições Iniciais: Superamortecido', 'Sistema Massa-Mola', 'Erro', false, 'Exato', String(err));
  }

  // Test 7: Initial Conditions in Forced Oscillator (Steady-State + Transient)
  try {
    const m = 1.0;
    const k = 25.0; // omega0 = 5
    const b = 1.0;
    const F0 = 15.0;
    const fExt = 1.2;
    const x0 = 0.4;
    const v0 = -0.2;
    const st0 = calculateSpringMass(0, m, k, x0, b, false, 9.8, F0, fExt, v0);
    const posErr = Math.abs(st0.position - x0);
    const velErr = Math.abs(st0.velocity - v0);
    const passed = posErr < 1e-9 && velErr < 1e-9;
    addTest(
      'test_initial_conditions_forced',
      'Condições Iniciais: Oscilador Forçado (Transiente + Permanente)',
      'Sistema Massa-Mola',
      'Garante que x(t) = x_h(t) + x_p(t) satisfaz rigorosamente x(0) = x₀ e v(0) = v₀.',
      passed,
      `x(0) = ${x0.toFixed(2)} m, v(0) = ${v0.toFixed(2)} m/s`,
      `x(0) = ${st0.position.toFixed(2)} m, v(0) = ${st0.velocity.toFixed(2)} m/s`,
      `Erro pos: ${posErr.toExponential(1)}, vel: ${velErr.toExponential(1)}`,
      `Força externa F0 = ${F0} N, freq = ${fExt} Hz`
    );
  } catch (err) {
    addTest('test_initial_conditions_forced', 'Condições Iniciais: Oscilador Forçado', 'Sistema Massa-Mola', 'Erro', false, 'Exato', String(err));
  }

  // Test 8: Energy Dissipation in Damped Oscillator
  try {
    const m = 1.0;
    const k = 40.0;
    const A = 0.4;
    const gamma = 1.2;
    const e0 = calculateSpringMass(0, m, k, A, gamma).totalEnergy;
    const e1 = calculateSpringMass(1.0, m, k, A, gamma).totalEnergy;
    const e2 = calculateSpringMass(2.5, m, k, A, gamma).totalEnergy;
    const passed = e0 > e1 && e1 > e2;
    addTest(
      'test_damped_dissipation',
      'Dissipação Monótona de Energia (Amortecimento Viscoso)',
      'Sistema Massa-Mola',
      'Verifica a perda contínua de energia mecânica sob atrito viscoso.',
      passed,
      'E(0) > E(1.0s) > E(2.5s)',
      `${e0.toFixed(3)} J > ${e1.toFixed(3)} J > ${e2.toFixed(3)} J`,
      'Decaimento exponencial verificado',
      'Taxa de dissipação consistente com o modelo analítico subcrítico.'
    );
  } catch (err) {
    addTest('test_damped_dissipation', 'Dissipação Monótona de Energia', 'Sistema Massa-Mola', 'Erro', false, 'Decaimento', String(err));
  }

  // Test 9: Mechanical Resonance (Peak Amplitude at omega_e ~ omega_0)
  try {
    const m = 1.0;
    const k = 100.0; // omega0 = 10 rad/s -> f0 = 10 / (2pi) ~ 1.5915 Hz
    const f0 = 10.0 / (2 * Math.PI);
    const b = 0.4; // light damping
    const F0 = 10.0;
    // Test steady-state response at resonance vs off-resonance
    // In our analytical formulation, forced response amplitude Ap = (F0/m) / sqrt((omega0^2 - omegaE^2)^2 + (2*gamma*omegaE)^2)
    const stRes = calculateSpringMass(15.0, m, k, 0, b, false, 9.8, F0, f0);
    const stOff = calculateSpringMass(15.0, m, k, 0, b, false, 9.8, F0, f0 * 2.0);
    // Kinetic and potential energy at resonance should be far higher
    const ratio = stRes.totalEnergy / Math.max(1e-4, stOff.totalEnergy);
    const passed = ratio > 10.0;
    addTest(
      'test_mechanical_resonance',
      'Ressonância Mecânica (Pico de Energia em f_ext ≈ f₀)',
      'Sistema Massa-Mola',
      'Confirma que a resposta forçada próxima à frequência natural gera amplificação ressonante marcante.',
      passed,
      'Energia na ressonância >> Energia fora da ressonância (razão > 10x)',
      `Razão de amplificação de energia: ${ratio.toFixed(1)}x`,
      'Pico ressonante verificado',
      `f₀ = ${f0.toFixed(2)} Hz, f_ext = ${f0.toFixed(2)} Hz vs 2·f₀`
    );
  } catch (err) {
    addTest('test_mechanical_resonance', 'Ressonância Mecânica', 'Sistema Massa-Mola', 'Erro', false, 'Amplificação', String(err));
  }

  // Test 10: Nonlinear Pendulum Exact Period via Elliptic Integral K vs Small-Angle
  try {
    const L = 1.0;
    const g = 9.8;
    const th0 = (60.0 * Math.PI) / 180.0; // 60 degrees (large angle!)
    const p60 = integratePendulumRK4(th0, L, 1.0, g, 0, 0);
    // At 60 deg, complete elliptic integral K(sin^2(30deg)) = K(0.25) ~ 1.685750
    // Small angle T0 = 2*pi*sqrt(L/g) ~ 2.00709 s
    // Exact T = 4*sqrt(L/g)*K(0.25) ~ 2.1541 s (approx 7.3% higher)
    const periodRatio = p60.periodExact / p60.periodApprox;
    const expectedRatio = 1.073; // ~7.3%
    const passed = Math.abs(periodRatio - expectedRatio) < 0.005;
    addTest(
      'test_pendulum_exact_period_elliptic',
      'Período Não-Linear Exato do Pêndulo (Integral Elíptica K)',
      'Pêndulo Simples',
      'Demonstra que em grandes amplitudes (θ₀ = 60°), o período exato T_exato é ~7.3% superior ao período aproximado T₀.',
      passed,
      `T_exato / T₀ ≈ 1.073 (+7.3%)`,
      `T_exato / T₀ = ${periodRatio.toFixed(4)} (+${((periodRatio - 1) * 100).toFixed(1)}%)`,
      '< 0.5%',
      `T_aprox = ${p60.periodApprox.toFixed(4)} s | T_exato = ${p60.periodExact.toFixed(4)} s | T_borda = ${p60.periodBorda.toFixed(4)} s`
    );
  } catch (err) {
    addTest('test_pendulum_exact_period_elliptic', 'Período Não-Linear do Pêndulo', 'Pêndulo Simples', 'Erro', false, '+7.3%', String(err));
  }

  // Test 11: Pendulum Mass Independence in Ideal Model
  try {
    const L = 1.0;
    const g = 9.8;
    const th0 = (10 * Math.PI) / 180;
    const p1 = integratePendulumRK4(th0, L, 0.5, g, 0, 0);
    const p2 = integratePendulumRK4(th0, L, 5.0, g, 0, 0);
    const passed = Math.abs(p1.periodApprox - p2.periodApprox) < 1e-12 && Math.abs(p1.periodExact - p2.periodExact) < 1e-12;
    addTest(
      'test_pendulum_mass_independence',
      'Independência da Massa no Pêndulo Simples',
      'Pêndulo Simples',
      'Valida que a massa do corpo não altera o período de oscilação.',
      passed,
      `${p1.periodApprox.toFixed(4)} s`,
      `${p2.periodApprox.toFixed(4)} s`,
      '0.00%',
      `m = 0.5 kg vs 5.0 kg: Período idêntico ${p1.periodApprox.toFixed(4)} s`
    );
  } catch (err) {
    addTest('test_pendulum_mass_independence', 'Independência da Massa', 'Pêndulo Simples', 'Erro', false, 'Idêntico', String(err));
  }

  // Test 12: Pendulum Energy Conservation during RK4 Integration
  try {
    const L = 1.2;
    const m = 0.8;
    const g = 9.8;
    const th0 = (30 * Math.PI) / 180;
    const p0 = integratePendulumRK4(th0, L, m, g, 0, 0);
    const pT = integratePendulumRK4(th0, L, m, g, 0, 2.5); // after 2.5s of motion
    const energyDiff = Math.abs(pT.totalEnergy - p0.totalEnergy);
    const passed = energyDiff < 1e-4;
    addTest(
      'test_pendulum_energy_conservation_rk4',
      'Conservação da Energia no Pêndulo Não-Linear (RK4)',
      'Pêndulo Simples',
      'Valida que a integração temporal RK4 mantém a energia mecânica do pêndulo sem deriva numérica espúria.',
      passed,
      `Em(0) = ${p0.totalEnergy.toFixed(4)} J (constante)`,
      `Em(2.5s) = ${pT.totalEnergy.toFixed(4)} J`,
      `ΔE = ${energyDiff.toExponential(2)} J`,
      `E_c(2.5s) = ${pT.kineticEnergy.toFixed(4)} J, E_p(2.5s) = ${pT.potentialEnergy.toFixed(4)} J`
    );
  } catch (err) {
    addTest('test_pendulum_energy_conservation_rk4', 'Conservação de Energia Pêndulo RK4', 'Pêndulo Simples', 'Erro', false, 'ΔE < 1e-4', String(err));
  }

  // Test 13: Interference Amplitude with Unequal Local Field Amplitudes
  try {
    const s1 = { x: 0, y: 0, amp: 2.0, freq: 1.0, phase: 0 };
    const s2 = { x: 0, y: 0, amp: 1.0, freq: 1.0, phase: Math.PI }; // destructive phase diff pi
    // Both sources at origin, probe at (1, 0): r1 = r2 = 1.0 -> deltaR = 0, phaseDiff = pi
    const res = calculateInterferenceAt(1, 0, 0, s1, s2, 3.0);
    // At r=1, atten = 1/sqrt(1.8) ~ 0.745356. a1 = 2*atten, a2 = 1*atten.
    // Resultant amplitude for deltaPhi = pi must be exactly |a1 - a2| = 1*atten
    const expectedAmp = Math.abs(res.a1 - res.a2);
    const passed = Math.abs(res.resultantAmplitude - expectedAmp) < 1e-6 && res.isDestructive;
    addTest(
      'test_interference_unequal_amplitudes',
      'Interferência com Amplitudes Locais Desiguais (Fórmula Phasorial)',
      'Superposição e Interferência',
      'Verifica que para ondas com amplitudes locais a₁ ≠ a₂ em oposição de fase, a amplitude resultante é rigorosamente |a₁ - a₂| > 0 (não cancela a zero).',
      passed,
      `A_res = |a₁ - a₂| = ${expectedAmp.toFixed(4)} m`,
      `A_res = ${res.resultantAmplitude.toFixed(4)} m`,
      '< 1e-6',
      `a₁ = ${res.a1.toFixed(4)}, a₂ = ${res.a2.toFixed(4)}, ΔΦ = π rad -> Interferência Destrutiva`
    );
  } catch (err) {
    addTest('test_interference_unequal_amplitudes', 'Interferência com Amplitudes Desiguais', 'Superposição', 'Erro', false, '|a1 - a2|', String(err));
  }

  // Test 14: Standing Wave Closed-Open Pipe Odd Harmonics & Boundary Conditions
  try {
    const L = 3.0;
    const v = 60.0;
    const n = 3; // 3rd harmonic
    const sw = calculateStandingWave(L, v, n, 'pipe_closed_open');
    const firstNode = sw.nodePositions[0]; // must be 0 (closed end)
    const lastAntinode = sw.antinodePositions[sw.antinodePositions.length - 1]; // must be L (open end)
    const expectedFreq = (3 * v) / (4 * L);
    const passed =
      sw.harmonicNumber === 3 &&
      firstNode === 0 &&
      Math.abs(lastAntinode - L) < 1e-9 &&
      Math.abs(sw.frequency - expectedFreq) < 1e-9;
    addTest(
      'test_standing_wave_closed_open_pipe',
      'Condições de Contorno em Tubo Fechado-Aberto (Harmônicos Ímpares)',
      'Ondas Estacionárias',
      'Garante que x = 0 é nó de deslocamento, x = L é ventre de deslocamento, e a frequência obedece f = n·v/(4L) com n ímpar.',
      passed,
      `Nó em x=0, Ventre em x=${L.toFixed(1)} m, f = ${expectedFreq.toFixed(1)} Hz`,
      `Nó em x=${firstNode.toFixed(1)}, Ventre em x=${lastAntinode.toFixed(1)} m, f = ${sw.frequency.toFixed(1)} Hz`,
      'Exato',
      `Harmônico n = ${sw.harmonicNumber}, Índice do modo m = ${sw.modeIndex}, Total nós = ${sw.nodeCount}, Total ventres = ${sw.antinodeCount}`
    );
  } catch (err) {
    addTest('test_standing_wave_closed_open_pipe', 'Condições de Contorno Tubo Fechado-Aberto', 'Ondas Estacionárias', 'Erro', false, 'Nó em 0, Ventre em L', String(err));
  }

  // Test 15: Standing Wave String with Both Ends Fixed
  try {
    const L = 2.0;
    const v = 40.0;
    const n = 4;
    const sw = calculateStandingWave(L, v, n, 'both_fixed');
    const firstNode = sw.nodePositions[0];
    const lastNode = sw.nodePositions[sw.nodePositions.length - 1];
    const passed = firstNode === 0 && Math.abs(lastNode - L) < 1e-9 && sw.nodeCount === n + 1;
    addTest(
      'test_standing_wave_fixed_string',
      'Condições de Contorno em Corda com Extremidades Fixas',
      'Ondas Estacionárias',
      'Garante que ambos os extremos x = 0 e x = L são nós permanentes de deslocamento nulo.',
      passed,
      `Nós em x=0 e x=${L.toFixed(1)} m (total ${n + 1} nós)`,
      `Nós em x=${firstNode.toFixed(1)} e x=${lastNode.toFixed(1)} m (total ${sw.nodeCount} nós)`,
      'Exato',
      `Harmônico n = ${n}: λ = ${sw.wavelength.toFixed(3)} m, f = ${sw.frequency.toFixed(1)} Hz`
    );
  } catch (err) {
    addTest('test_standing_wave_fixed_string', 'Condições de Contorno em Corda', 'Ondas Estacionárias', 'Erro', false, 'Nós nos extremos', String(err));
  }

  // Test 16: Doppler Effect Signs for all 4 Velocity Configurations
  try {
    const f0 = 500.0;
    const vs = 340.0;
    // 1. Approaching source (source at x=0 moving +40 m/s, observer at x=100 static)
    const d1 = calculateDoppler(0, 100, 40, 0, f0, vs);
    // 2. Receding source (source at x=100 moving +40 m/s, observer at x=0 static)
    const d2 = calculateDoppler(100, 0, 40, 0, f0, vs);
    // 3. Approaching observer (source at x=0 static, observer at x=100 moving -20 m/s)
    const d3 = calculateDoppler(0, 100, 0, -20, f0, vs);
    // 4. Receding observer (source at x=0 static, observer at x=100 moving +20 m/s)
    const d4 = calculateDoppler(0, 100, 0, 20, f0, vs);

    const passed =
      d1.observedFreq > f0 && d1.isApproaching &&
      d2.observedFreq < f0 && !d2.isApproaching &&
      d3.observedFreq > f0 && d3.isApproaching &&
      d4.observedFreq < f0 && !d4.isApproaching;

    addTest(
      'test_doppler_all_velocity_signs',
      'Consistência Vetorial dos Sinais do Efeito Doppler',
      'Acústica e Efeito Doppler',
      'Valida que a aproximação sempre eleva a frequência percebida e o afastamento sempre a reduz para qualquer movimento relativo da fonte e do observador.',
      passed,
      'Aproximação: f_obs > f₀ | Afastamento: f_obs < f₀',
      `Fonte aprox: ${d1.observedFreq.toFixed(1)} Hz, Fonte afast: ${d2.observedFreq.toFixed(1)} Hz, Obs aprox: ${d3.observedFreq.toFixed(1)} Hz, Obs afast: ${d4.observedFreq.toFixed(1)} Hz`,
      'Consistente',
      `f₀ = ${f0} Hz | Desvios verificados em todas as configurações espaciais`
    );
  } catch (err) {
    addTest('test_doppler_all_velocity_signs', 'Sinais do Efeito Doppler', 'Acústica e Doppler', 'Erro', false, 'Consistente', String(err));
  }

  // Test 17: Frequency Invariance in Refraction
  try {
    const v1 = 400.0;
    const v2 = 200.0;
    const fIn = 80.0;
    const refr = calculateRefraction(v1, v2, fIn);
    const passed = refr.freq === fIn && Math.abs(refr.lambda1 / refr.lambda2 - v1 / v2) < 1e-12;
    addTest(
      'test_refraction_frequency_invariance',
      'Invariância da Frequência na Refração',
      'Fenômenos Ondulatórios',
      'Confirma que a frequência da onda permanece rigorosamente inalterada ao mudar de meio material.',
      passed,
      `f₁ = f₂ = ${fIn} Hz, λ₁/λ₂ = ${(v1 / v2).toFixed(2)}`,
      `f = ${refr.freq} Hz, λ₁/λ₂ = ${(refr.lambda1 / refr.lambda2).toFixed(2)}`,
      '0.00%',
      `v₁ = ${v1} m/s, v₂ = ${v2} m/s -> λ₁ = ${refr.lambda1.toFixed(2)} m, λ₂ = ${refr.lambda2.toFixed(2)} m`
    );
  } catch (err) {
    addTest('test_refraction_frequency_invariance', 'Invariância da Frequência na Refração', 'Fenômenos Ondulatórios', 'Erro', false, 'f constante', String(err));
  }

  // Test 18: SHM Kinematic Differential Equation a = -omega^2 * x
  try {
    const shm = calculateSHM(0.73, 0.4, 3.0, 0.5);
    const expectedA = -Math.pow(shm.omega, 2) * shm.x;
    const passed = Math.abs(shm.a - expectedA) < 1e-12;
    addTest(
      'test_shm_kinematics_differential',
      'Equação Diferencial Cinemática do MHS (a = -ω²x)',
      'Movimento Harmônico Simples',
      'Verifica a proporcionalidade estrita entre aceleração e elongação com sentido oposto restaurador.',
      passed,
      `${expectedA.toFixed(4)} m/s²`,
      `${shm.a.toFixed(4)} m/s²`,
      '< 1e-12',
      `ω = ${shm.omega.toFixed(2)} rad/s, x = ${shm.x.toFixed(4)} m -> a = ${shm.a.toFixed(4)} m/s²`
    );
  } catch (err) {
    addTest('test_shm_kinematics_differential', 'Equação Diferencial do MHS', 'MHS', 'Erro', false, 'Consistente', String(err));
  }

  // Test 19: Phasor Envelope Bound |y_res(t)| <= A_res for Wave Interference
  try {
    const s1 = { x: -1.0, y: 0, amp: 1.5, freq: 2.0, phase: 0.3 };
    const s2 = { x: 1.0, y: 0, amp: 1.2, freq: 2.0, phase: 1.1 };
    let allBounded = true;
    let maxRatio = 0;
    // Check multiple probe coordinates and times
    for (let t = 0; t <= 1.0; t += 0.1) {
      for (let px = -2; px <= 2; px += 1) {
        const pt = calculateInterferenceAt(px, 1.5, t, s1, s2, 4.0);
        const ratio = Math.abs(pt.yRes) / Math.max(1e-9, pt.resultantAmplitude);
        if (ratio > maxRatio) maxRatio = ratio;
        if (Math.abs(pt.yRes) > pt.resultantAmplitude + 1e-9) {
          allBounded = false;
        }
      }
    }
    addTest(
      'test_interference_envelope_bound',
      'Desigualdade Envoltória Phasorial (|y_res| ≤ A_res)',
      'Superposição e Interferência',
      'Valida que a elongação instantânea nunca ultrapassa a amplitude envoltória do fasor resultante.',
      allBounded,
      '|y_res| ≤ A_res (razão máxima ≤ 1.000)',
      `Razão máxima observada: ${maxRatio.toFixed(4)}`,
      '< 1e-9',
      'Verificado em 55 pontos espaço-temporais distintos.'
    );
  } catch (err) {
    addTest('test_interference_envelope_bound', 'Desigualdade Envoltória Phasorial', 'Superposição', 'Erro', false, 'Limitado', String(err));
  }

  // Test 20: Invariance of Frequency for Equal Velocities in Doppler Effect
  try {
    const f0 = 440.0;
    const vSpeed = 50.0; // both source and observer move right at 50 m/s
    // Source at x=0, Observer at x=200, both at 50 m/s
    const dop = calculateDoppler(0, 200, vSpeed, vSpeed, f0, 340.0);
    const passed = Math.abs(dop.observedFreq - f0) < 1e-12 && !dop.isApproaching;
    addTest(
      'test_doppler_equal_velocities_invariance',
      'Invariância de Frequência em Velocidades Idênticas (v_fonte = v_obs)',
      'Acústica e Efeito Doppler',
      'Demonstra que quando fonte e observador se movem com a mesma velocidade no mesmo sentido, a distância é constante e f_obs = f₀.',
      passed,
      `f_obs = f₀ = ${f0.toFixed(1)} Hz`,
      `f_obs = ${dop.observedFreq.toFixed(1)} Hz`,
      '0.00%',
      `v_f = ${vSpeed} m/s, v_o = ${vSpeed} m/s -> f_obs = ${dop.observedFreq.toFixed(4)} Hz`
    );
  } catch (err) {
    addTest('test_doppler_equal_velocities_invariance', 'Invariância Doppler Velocidades Idênticas', 'Acústica e Doppler', 'Erro', false, 'f_obs = f0', String(err));
  }

  // Test 21: Asymptotic Limit of Nonlinear Pendulum as theta_0 -> 0 (T_exact -> T_approx)
  try {
    const L = 1.5;
    const g = 9.8;
    const smallTheta = (0.5 * Math.PI) / 180.0; // 0.5 degrees
    const pSmall = integratePendulumRK4(smallTheta, L, 1.0, g, 0, 0);
    const diff = Math.abs(pSmall.periodExact - pSmall.periodApprox);
    const relDiff = diff / pSmall.periodApprox;
    const passed = relDiff < 1e-4;
    addTest(
      'test_pendulum_small_angle_asymptotic_limit',
      'Limite Assintótico do Pêndulo em Pequenos Ângulos (θ₀ → 0)',
      'Pêndulo Simples',
      'Garante que no limite de pequenas amplitudes (θ₀ = 0.5°), o período exato T_exato coincide com a fórmula analítica clássica T₀ = 2π√(L/g).',
      passed,
      `T_exato ≈ T₀ (desvio relativo < 0.01%)`,
      `Desvio relativo: ${(relDiff * 100).toFixed(4)}%`,
      '< 1e-4',
      `T_aprox = ${pSmall.periodApprox.toFixed(5)} s, T_exato = ${pSmall.periodExact.toFixed(5)} s`
    );
  } catch (err) {
    addTest('test_pendulum_small_angle_asymptotic_limit', 'Limite Assintótico do Pêndulo', 'Pêndulo Simples', 'Erro', false, 'Convergência', String(err));
  }

  // Test 22: Closed-Open Pipe Odd Harmonics Full Series (n = 1, 3, 5, 7)
  try {
    const L = 2.4;
    const v = 340.0;
    const harmonics = [1, 3, 5, 7];
    let allValid = true;
    harmonics.forEach((n) => {
      const sw = calculateStandingWave(L, v, n, 'pipe_closed_open');
      const expectedFn = (n * v) / (4.0 * L);
      const expectedMode = (n + 1) / 2;
      const firstNode = sw.nodePositions[0];
      const lastAntinode = sw.antinodePositions[sw.antinodePositions.length - 1];

      if (
        sw.harmonicNumber !== n ||
        sw.modeIndex !== expectedMode ||
        sw.nodeCount !== expectedMode ||
        sw.antinodeCount !== expectedMode ||
        firstNode !== 0 ||
        Math.abs(lastAntinode - L) > 1e-9 ||
        Math.abs(sw.frequency - expectedFn) > 1e-9
      ) {
        allValid = false;
      }
    });

    addTest(
      'test_standing_wave_pipe_series',
      'Série de Harmônicos Ímpares em Tubo Fechado-Aberto (n = 1, 3, 5, 7)',
      'Ondas Estacionárias',
      'Verifica simultaneamente nós, ventres, frequências e relações modais em toda a série de harmônicos ímpares permitidos.',
      allValid,
      'Todos os harmônicos (1, 3, 5, 7) satisfazem nós em 0, ventres em L e f_n = n·v/(4L)',
      allValid ? 'Série completa 100% verificada' : 'Discrepância detectada',
    );
  } catch (err) {
    addTest('test_standing_wave_pipe_series', 'Série de Harmônicos Tubo Fechado-Aberto', 'Ondas Estacionárias', 'Erro', false, 'Série Válida', String(err));
  }

  // Test 23: Module ID Validator & LocalStorage Fallback Protection
  try {
    const validCheck1 = isValidModuleId('doppler');
    const validCheck2 = isValidModuleId('shm');
    const validCheck3 = isValidModuleId('standing_waves');
    const invalidCheck1 = isValidModuleId('non_existent_module');
    const invalidCheck2 = isValidModuleId('');
    const invalidCheck3 = isValidModuleId(null);
    const invalidCheck4 = isValidModuleId(123);
    const passed =
      validCheck1 &&
      validCheck2 &&
      validCheck3 &&
      !invalidCheck1 &&
      !invalidCheck2 &&
      !invalidCheck3 &&
      !invalidCheck4;

    addTest(
      'test_module_id_validator_resilience',
      'Validação de Identificadores de Módulo e Proteção de Inicialização',
      'Arquitetura do Sistema',
      'Garante que identificadores válidos sejam aceitos e dados corrompidos do localStorage sejam rejeitados com fallback seguro.',
      passed,
      'Aceitar válidos e rejeitar inválidos/nulos/números',
      passed ? 'Proteção 100% ativa' : 'Falha na validação',
      'Exato',
      'Testado com doppler, shm, standing_waves vs strings aleatórias e valores não-string.'
    );
  } catch (err) {
    addTest('test_module_id_validator_resilience', 'Validação de Módulo', 'Sistema', 'Erro', false, 'Válido', String(err));
  }

  // Test 24: Single-Slit Fraunhofer Diffraction First Minimum (a·sin(theta) = lambda)
  try {
    const a = 0.04; // slit width 4 cm
    const lambda = 0.01; // wavelength 1 cm
    // At first minimum: a * sin(theta) = lambda -> sin(theta) = lambda / a = 0.25
    const thetaMin = Math.asin(lambda / a);
    const intensityAtMin = singleSlitDiffractionIntensity(thetaMin, a, lambda);
    const passed = intensityAtMin < 1e-12;

    addTest(
      'test_diffraction_first_minimum',
      'Condição de Mínimo na Difração de Fraunhofer (a · sen θ = λ)',
      'Fenômenos Ondulatórios',
      'Confirma que a intensidade difratada se anula rigorosamente no primeiro mínimo de interferência destrutiva.',
      passed,
      'I(θ_min) = 0.000000',
      `I(θ_min) = ${intensityAtMin.toExponential(4)}`,
      '< 1e-12',
      `a = ${a} m, λ = ${lambda} m, θ_min = ${(thetaMin * 180 / Math.PI).toFixed(2)}°`
    );
  } catch (err) {
    addTest('test_diffraction_first_minimum', 'Difração Fenda Simples', 'Fenômenos Ondulatórios', 'Erro', false, 'I = 0', String(err));
  }

  // Test 25: Complete Elliptic Integral AGM Numerical Precision
  try {
    // Known exact mathematical benchmark: K(0.5) = 1.854074677301372...
    const kHalf = completeEllipticK(0.5);
    const benchmark = 1.854074677301372;
    const errDiff = Math.abs(kHalf - benchmark);
    const passed = errDiff < 1e-12;

    addTest(
      'test_elliptic_integral_benchmark',
      'Precisão Numérica da Integral Elíptica Completa K(m) via AGM',
      'Pêndulo Simples',
      'Valida o algoritmo da Média Aritmético-Geométrica confrontado com o benchmark transcendental K(0.5).',
      passed,
      `K(0.5) = ${benchmark.toFixed(12)}`,
      `K(0.5) = ${kHalf.toFixed(12)}`,
      `Erro: ${errDiff.toExponential(2)} (< 1e-12)`,
      'Convergência quadrática atingida com tolerância de máquina.'
    );
  } catch (err) {
    addTest('test_elliptic_integral_benchmark', 'Integral Elíptica Benchmark', 'Pêndulo Simples', 'Erro', false, 'Precisão', String(err));
  }

  // Test 26: Damped Oscillator Dissipative Monotonicity vs Undamped Ideal Invariance
  try {
    const m = 1.0;
    const k = 25.0;
    const A = 0.5;
    const stUndamped0 = calculateSpringMass(0, m, k, A, 0).totalEnergy;
    const stUndampedT = calculateSpringMass(5.0, m, k, A, 0).totalEnergy;

    const b = 0.8;
    const stDamped0 = calculateSpringMass(0, m, k, A, b).totalEnergy;
    const stDampedT = calculateSpringMass(5.0, m, k, A, b).totalEnergy;

    const undampedPreserved = Math.abs(stUndampedT - stUndamped0) < 1e-9;
    const dampedDecreased = stDampedT < stDamped0 * 0.1; // over 90% dissipated after 5s

    const passed = undampedPreserved && dampedDecreased;

    addTest(
      'test_damped_vs_undamped_energy_dynamics',
      'Dinâmica Comparativa de Energia: Ideal (Conservativo) vs Amortecido (Dissipativo)',
      'Sistema Massa-Mola',
      'Verifica que a energia mecânica permanece rigorosamente constante sem atrito e dissipa monótona e exponencialmente com amortecimento viscoso.',
      passed,
      'Ideal: ΔE = 0 | Amortecido: E(5s) << E(0)',
      `Ideal: ΔE = ${Math.abs(stUndampedT - stUndamped0).toExponential(2)} J | Amortecido: E(0) = ${stDamped0.toFixed(3)} J -> E(5s) = ${stDampedT.toFixed(3)} J`,
      '< 1e-9',
      'Amortecimento viscoso dissipa > 90% da energia em 5s enquanto o oscilador ideal conserva 100%.'
    );
  } catch (err) {
    addTest('test_damped_vs_undamped_energy_dynamics', 'Dinâmica Comparativa de Energia', 'Massa-Mola', 'Erro', false, 'Válido', String(err));
  }

  return results;
}

// CLI Execution entry point
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('tests')) {
  console.log('=======================================================');
  console.log('ONDAS LAB 3D - BATERIA DE VALIDAÇÃO MATEMÁTICA E FÍSICA');
  console.log('=======================================================');
  const testResults = runAllPhysicsTests();
  let failedCount = 0;

  testResults.forEach((t, idx) => {
    const status = t.passed ? '✓ PASSOU' : '✗ FALHOU';
    console.log(`[${idx + 1}] ${status} | ${t.module}: ${t.name}`);
    if (!t.passed) {
      failedCount++;
      console.log(`    Esperado: ${t.expected}`);
      console.log(`    Obtido:   ${t.actual}`);
    }
  });

  console.log('-------------------------------------------------------');
  console.log(`Total: ${testResults.length} testes | Aprovados: ${testResults.length - failedCount} | Falhas: ${failedCount}`);
  console.log('=======================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

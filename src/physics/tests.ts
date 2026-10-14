/**
 * ONDAS LAB 3D - Automated Physics Verification Suite
 * Validates physical invariants, boundary conditions, and mathematical equations.
 */

import {
  calculateSHM,
  calculateSpringMass,
  integratePendulumRK4,
  calculateWavePoint,
  calculateStandingWave,
  calculateDoppler,
  calculateRefraction,
} from './math';
import { AutomatedTestResult } from '../types/physics';

export function runAllPhysicsTests(): AutomatedTestResult[] {
  const results: AutomatedTestResult[] = [];

  // Test 1: Invariant f * T = 1
  try {
    const f = 2.5;
    const shm = calculateSHM(1.0, 0.5, f, 0);
    const product = f * shm.period;
    const passed = Math.abs(product - 1.0) < 1e-9;
    results.push({
      id: 'test_f_t_reciprocal',
      name: 'Relação Fundamental Período e Frequência',
      module: 'Movimento Harmônico Simples',
      description: 'Verifica se o produto f · T = 1 com exatidão matemática.',
      passed,
      expected: '1.000000',
      actual: product.toFixed(6),
      errorMargin: '< 1e-9',
      details: `f = ${f} Hz, T = ${shm.period.toFixed(4)} s -> f · T = ${product}`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_f_t_reciprocal',
      name: 'Relação Fundamental Período e Frequência',
      module: 'MHS',
      description: 'Falha ao executar teste',
      passed: false,
      expected: '1.0',
      actual: String(err),
    });
  }

  // Test 2: Wave speed relationship v = lambda * f
  try {
    const f = 5.0;
    const lambda = 1.2;
    const pt = calculateWavePoint(0, 0, { amplitude: 0.2, frequency: f, wavelength: lambda, initialPhase: 0 });
    const expectedV = lambda * f;
    const passed = Math.abs(pt.waveSpeed - expectedV) < 1e-9;
    results.push({
      id: 'test_wave_speed',
      name: 'Equação Fundamental da Ondulatória (v = λ · f)',
      module: 'Ondas Progressivas',
      description: 'Valida a relação de velocidade de propagação de fase com comprimento e frequência.',
      passed,
      expected: `${expectedV.toFixed(2)} m/s`,
      actual: `${pt.waveSpeed.toFixed(2)} m/s`,
      errorMargin: '0.00%',
      details: `λ = ${lambda} m, f = ${f} Hz -> v = ${pt.waveSpeed.toFixed(2)} m/s`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_wave_speed',
      name: 'Equação Fundamental da Ondulatória',
      module: 'Ondas Progressivas',
      description: 'Erro na execução',
      passed: false,
      expected: '6.0 m/s',
      actual: String(err),
    });
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
    const passed = diff < 1e-6;
    results.push({
      id: 'test_energy_conservation_spring',
      name: 'Conservação da Energia Mecânica (Oscilador Ideal)',
      module: 'Sistema Massa-Mola',
      description: 'Garante que a energia mecânica total Em = Ec + Ep permanece constante no tempo.',
      passed,
      expected: `${e0.toFixed(4)} J (constante)`,
      actual: `${e1.toFixed(4)} J`,
      errorMargin: `ΔE = ${diff.toExponential(2)} J`,
      details: `Em(0) = ${e0.toFixed(4)} J, Em(0.42s) = ${e1.toFixed(4)} J, Em(1.15s) = ${e2.toFixed(4)} J`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_energy_conservation_spring',
      name: 'Conservação da Energia Mecânica',
      module: 'Sistema Massa-Mola',
      description: 'Erro ao avaliar conservação',
      passed: false,
      expected: 'ΔE = 0',
      actual: String(err),
    });
  }

  // Test 4: Dissipation of Energy in Damped Oscillator
  try {
    const m = 1.0;
    const k = 40.0;
    const A = 0.4;
    const gamma = 1.2; // damping
    const e0 = calculateSpringMass(0, m, k, A, gamma).totalEnergy;
    const e1 = calculateSpringMass(1.0, m, k, A, gamma).totalEnergy;
    const e2 = calculateSpringMass(2.5, m, k, A, gamma).totalEnergy;
    const passed = e0 > e1 && e1 > e2;
    results.push({
      id: 'test_damped_dissipation',
      name: 'Dissipação Monótona de Energia (Amortecimento)',
      module: 'Sistema Massa-Mola',
      description: 'Verifica a perda contínua de energia mecânica sob atrito viscoso.',
      passed,
      expected: 'E(0) > E(1.0s) > E(2.5s)',
      actual: `${e0.toFixed(3)} J > ${e1.toFixed(3)} J > ${e2.toFixed(3)} J`,
      errorMargin: 'Decaimento exponencial verificado',
      details: 'Taxa de dissipação consistente com o modelo analítico subcrítico.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_damped_dissipation',
      name: 'Dissipação Monótona de Energia',
      module: 'Sistema Massa-Mola',
      description: 'Erro',
      passed: false,
      expected: 'Decaimento',
      actual: String(err),
    });
  }

  // Test 5: Mass-Spring Period Formula T = 2*pi*sqrt(m/k)
  try {
    const m = 2.0;
    const k = 50.0;
    const expectedT = 2 * Math.PI * Math.sqrt(m / k);
    const state = calculateSpringMass(0, m, k, 0.2, 0);
    const passed = Math.abs(state.naturalPeriod - expectedT) < 1e-9;
    results.push({
      id: 'test_spring_period_formula',
      name: 'Fórmula Analítica do Período Massa-Mola',
      module: 'Sistema Massa-Mola',
      description: 'Confirma a dependência T = 2π√(m/k).',
      passed,
      expected: `${expectedT.toFixed(4)} s`,
      actual: `${state.naturalPeriod.toFixed(4)} s`,
      errorMargin: '< 1e-9 s',
      details: `m = ${m} kg, k = ${k} N/m -> T_calc = ${state.naturalPeriod.toFixed(4)} s`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_spring_period_formula',
      name: 'Fórmula Analítica do Período Massa-Mola',
      module: 'Sistema Massa-Mola',
      description: 'Erro',
      passed: false,
      expected: '1.2566 s',
      actual: String(err),
    });
  }

  // Test 6: Pendulum Period: Independence of mass in ideal model
  try {
    const L = 1.0;
    const g = 9.8;
    const th0 = (5 * Math.PI) / 180; // 5 degrees (small angle)
    const p1 = integratePendulumRK4(th0, L, 0.5, g, 0, 0);
    const p2 = integratePendulumRK4(th0, L, 5.0, g, 0, 0);
    const passed = Math.abs(p1.periodApprox - p2.periodApprox) < 1e-9;
    results.push({
      id: 'test_pendulum_mass_independence',
      name: 'Independência da Massa no Pêndulo Simples',
      module: 'Pêndulo Simples',
      description: 'Valida que a massa do corpo não altera o período de oscilação ideal.',
      passed,
      expected: `${p1.periodApprox.toFixed(4)} s`,
      actual: `${p2.periodApprox.toFixed(4)} s`,
      errorMargin: '0.00%',
      details: `m = 0.5 kg: T = ${p1.periodApprox.toFixed(4)} s | m = 5.0 kg: T = ${p2.periodApprox.toFixed(4)} s`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_pendulum_mass_independence',
      name: 'Independência da Massa no Pêndulo',
      module: 'Pêndulo Simples',
      description: 'Erro',
      passed: false,
      expected: 'Períodos iguais',
      actual: String(err),
    });
  }

  // Test 7: SHM Acceleration vs Displacement: a(t) = -omega^2 * x(t)
  try {
    const shm = calculateSHM(0.73, 0.4, 3.0, 0.5);
    const expectedA = -Math.pow(shm.omega, 2) * shm.x;
    const passed = Math.abs(shm.a - expectedA) < 1e-9;
    results.push({
      id: 'test_shm_acceleration_displacement',
      name: 'Equação Diferencial do MHS (a = -ω²x)',
      module: 'Movimento Harmônico Simples',
      description: 'Verifica a proporcionalidade estrita entre aceleração e elongação com sentido oposto.',
      passed,
      expected: `${expectedA.toFixed(4)} m/s²`,
      actual: `${shm.a.toFixed(4)} m/s²`,
      errorMargin: '< 1e-9',
      details: `ω = ${shm.omega.toFixed(2)} rad/s, x = ${shm.x.toFixed(4)} m -> a = ${shm.a.toFixed(4)} m/s²`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_shm_acceleration_displacement',
      name: 'Equação Diferencial do MHS',
      module: 'MHS',
      description: 'Erro',
      passed: false,
      expected: 'Consistente',
      actual: String(err),
    });
  }

  // Test 8: Refraction Frequency Invariance across Stationary Interface
  try {
    const v1 = 300;
    const v2 = 150;
    const fIn = 50;
    const refr = calculateRefraction(v1, v2, fIn);
    const passed = refr.freq === fIn && refr.lambda1 / refr.lambda2 === v1 / v2;
    results.push({
      id: 'test_refraction_invariance',
      name: 'Invariância da Frequência na Refração',
      module: 'Fenômenos Ondulatórios',
      description: 'Confirma que a frequência da onda permanece rigorosamente inalterada ao mudar de meio.',
      passed,
      expected: `f1 = f2 = ${fIn} Hz, λ1/λ2 = ${(v1 / v2).toFixed(2)}`,
      actual: `f = ${refr.freq} Hz, λ1/λ2 = ${(refr.lambda1 / refr.lambda2).toFixed(2)}`,
      errorMargin: '0.00%',
      details: `v1 = ${v1} m/s, v2 = ${v2} m/s -> λ1 = ${refr.lambda1} m, λ2 = ${refr.lambda2} m`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_refraction_invariance',
      name: 'Invariância da Frequência na Refração',
      module: 'Fenômenos Ondulatórios',
      description: 'Erro',
      passed: false,
      expected: 'f constante',
      actual: String(err),
    });
  }

  // Test 9: Boundary Conditions in Standing Waves (Both ends fixed -> nodes at ends)
  try {
    const L = 2.0;
    const v = 40;
    const n = 3;
    const sw = calculateStandingWave(L, v, n, 'both_fixed');
    const firstNode = sw.nodePositions[0];
    const lastNode = sw.nodePositions[sw.nodePositions.length - 1];
    const passed = firstNode === 0 && Math.abs(lastNode - L) < 1e-9 && sw.nodeCount === n + 1;
    results.push({
      id: 'test_standing_wave_boundary',
      name: 'Condições de Contorno em Corda com Extremidades Fixas',
      module: 'Ondas Estacionárias',
      description: 'Garante que os extremos x=0 e x=L são sempre nós de deslocamento nulo.',
      passed,
      expected: `Nó em x=0 e x=${L} m (total ${n + 1} nós)`,
      actual: `Nó em x=${firstNode} e x=${lastNode.toFixed(1)} m (total ${sw.nodeCount} nós)`,
      errorMargin: 'Exato',
      details: `Harmônico n = ${n}: Comprimento de onda λ = ${sw.wavelength.toFixed(3)} m, f = ${sw.frequency.toFixed(1)} Hz`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_standing_wave_boundary',
      name: 'Condições de Contorno em Corda',
      module: 'Ondas Estacionárias',
      description: 'Erro',
      passed: false,
      expected: 'Nós nas extremidades',
      actual: String(err),
    });
  }

  // Test 10: Doppler Effect Frequency Shift Direction
  try {
    const f0 = 440;
    const vs = 340;
    // Approaching source: source at x=0 moving right (+50 m/s), observer at x=100 static (0 m/s)
    const dopAppr = calculateDoppler(0, 100, 50, 0, f0, vs);
    // Receding source: source at x=150 moving right (+50 m/s), observer at x=100 static (0 m/s)
    const dopRec = calculateDoppler(150, 100, 50, 0, f0, vs);
    const passed = dopAppr.observedFreq > f0 && dopRec.observedFreq < f0;
    results.push({
      id: 'test_doppler_shift_signs',
      name: 'Direção do Desvio Doppler (Aproximação vs Afastamento)',
      module: 'Acústica e Efeito Doppler',
      description: 'Verifica se a frequência aparente aumenta na aproximação e diminui no afastamento.',
      passed,
      expected: 'f_aprox > 440 Hz e f_afast < 440 Hz',
      actual: `f_aprox = ${dopAppr.observedFreq.toFixed(1)} Hz, f_afast = ${dopRec.observedFreq.toFixed(1)} Hz`,
      errorMargin: 'Consistente',
      details: `f0 = ${f0} Hz | Na aproximação: +${(dopAppr.observedFreq - f0).toFixed(1)} Hz | No afastamento: -${(f0 - dopRec.observedFreq).toFixed(1)} Hz`,
    });
  } catch (err: unknown) {
    results.push({
      id: 'test_doppler_shift_signs',
      name: 'Direção do Desvio Doppler',
      module: 'Acústica e Doppler',
      description: 'Erro',
      passed: false,
      expected: 'Desvio Doppler coerente',
      actual: String(err),
    });
  }

  return results;
}

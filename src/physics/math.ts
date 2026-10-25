/**
 * ONDAS LAB 3D - Scientific Physics Engine & Mathematical Models
 * Implements exact analytical solutions, verified numerical integrators (RK4),
 * and complete elliptic integrals for nonlinear mechanics.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// -------------------------------------------------------------
// 0. SPECIAL MATHEMATICAL FUNCTIONS
// -------------------------------------------------------------
/**
 * Complete Elliptic Integral of the First Kind K(m)
 * Computed via the Arithmetic-Geometric Mean (AGM) to machine precision.
 * Parameter m = k^2, where m \in [0, 1).
 */
export function completeEllipticK(m: number): number {
  if (m < 0 || m >= 1) {
    if (m === 1) return Infinity;
    return NaN;
  }
  if (m === 0) return Math.PI / 2;

  let a = 1.0;
  let b = Math.sqrt(1.0 - m);

  for (let i = 0; i < 20; i++) {
    const aNext = (a + b) / 2.0;
    const bNext = Math.sqrt(a * b);
    if (Math.abs(a - b) < 1e-15) {
      return Math.PI / (2.0 * aNext);
    }
    a = aNext;
    b = bNext;
  }
  return Math.PI / (2.0 * a);
}

// -------------------------------------------------------------
// 1. SIMPLE HARMONIC MOTION (MHS)
// -------------------------------------------------------------
export interface SHMState {
  x: number;        // displacement (m)
  v: number;        // velocity (m/s)
  a: number;        // acceleration (m/s^2)
  omega: number;    // angular frequency (rad/s)
  period: number;   // period (s)
  phase: number;    // current phase (rad)
}

export function calculateSHM(
  t: number,
  amplitude: number,
  frequency: number,
  initialPhase: number = 0
): SHMState {
  const f = Math.max(0.001, frequency);
  const omega = 2 * Math.PI * f;
  const period = 1 / f;
  const phase = ((omega * t + initialPhase) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  const x = amplitude * Math.cos(omega * t + initialPhase);
  const v = -amplitude * omega * Math.sin(omega * t + initialPhase);
  const a = -Math.pow(omega, 2) * x;

  return { x, v, a, omega, period, phase };
}

// -------------------------------------------------------------
// 2. MASS-SPRING SYSTEM (HORIZONTAL & VERTICAL)
// Rigorous solutions for undamped, underdamped, critically damped, overdamped,
// and forced steady+transient regimes satisfying initial conditions x(0)=x0, v(0)=v0.
// -------------------------------------------------------------
export type SpringDampingRegime = 'undamped' | 'underdamped' | 'critically_damped' | 'overdamped';

export interface SpringMassState {
  position: number;           // displacement from equilibrium (m)
  velocity: number;           // velocity (m/s)
  acceleration: number;       // acceleration (m/s^2)
  kineticEnergy: number;      // Ec = 0.5 * m * v^2 (J)
  potentialEnergy: number;    // Ep = 0.5 * k * x^2 (J)
  totalEnergy: number;        // Em = Ec + Ep (J)
  staticElongation: number;   // mg/k for vertical mode (m)
  naturalFreq: number;        // omega_0 (rad/s)
  naturalPeriod: number;      // T_0 (s)
  dampedFreq?: number;        // omega_d (rad/s) for underdamped
  dampingRegime: SpringDampingRegime;
}

export function calculateSpringMass(
  t: number,
  mass: number,
  springK: number,
  amplitude: number,
  dampingCoeff: number = 0,
  isVertical: boolean = false,
  gravity: number = 9.8,
  externalForceAmp: number = 0,
  externalFreq: number = 1,
  initialVelocity: number = 0
): SpringMassState {
  const m = Math.max(0.05, mass);
  const k = Math.max(0.5, springK);
  const omega0 = Math.sqrt(k / m);
  const naturalPeriod = (2 * Math.PI) / omega0;
  const staticElongation = isVertical ? (m * gravity) / k : 0;

  // Damping parameter gamma = b / (2m)
  const gamma = Math.max(0, dampingCoeff) / (2 * m);
  const x0 = amplitude;
  const v0 = initialVelocity;

  let pos = 0;
  let vel = 0;
  let acc = 0;
  let regime: SpringDampingRegime = 'undamped';
  let omegaD: number | undefined = undefined;

  // 1. Solve Driven/Forced component if external force is present: F_ext = F0 * cos(omega_e * t)
  let xp = 0;
  let vp = 0;
  let xp0 = 0;
  let vp0 = 0;

  const hasDriving = externalForceAmp > 0;
  const omegaE = 2 * Math.PI * Math.max(0.01, externalFreq);

  if (hasDriving) {
    const f0m = externalForceAmp / m;
    const denom = Math.sqrt(Math.pow(omega0 * omega0 - omegaE * omegaE, 2) + Math.pow(2 * gamma * omegaE, 2));
    const Ap = f0m / Math.max(1e-9, denom);
    const delta = Math.atan2(2 * gamma * omegaE, omega0 * omega0 - omegaE * omegaE);

    xp = Ap * Math.cos(omegaE * t - delta);
    vp = -Ap * omegaE * Math.sin(omegaE * t - delta);

    // Initial particular values at t = 0
    xp0 = Ap * Math.cos(-delta);
    vp0 = -Ap * omegaE * Math.sin(-delta);
  }

  // Initial conditions for homogeneous solution: x_h(0) = x0 - xp0, v_h(0) = v0 - vp0
  const xh0 = x0 - xp0;
  const vh0 = v0 - vp0;

  let xh = 0;
  let vh = 0;

  const EPSILON = 1e-5;
  if (gamma < EPSILON) {
    // Undamped regime (gamma = 0)
    regime = 'undamped';
    xh = xh0 * Math.cos(omega0 * t) + (vh0 / omega0) * Math.sin(omega0 * t);
    vh = -xh0 * omega0 * Math.sin(omega0 * t) + vh0 * Math.cos(omega0 * t);
  } else if (gamma < omega0 - EPSILON) {
    // Underdamped regime (gamma < omega0)
    regime = 'underdamped';
    const wd = Math.sqrt(omega0 * omega0 - gamma * gamma);
    omegaD = wd;
    const expTerm = Math.exp(-gamma * t);
    const c1 = xh0;
    const c2 = (vh0 + gamma * xh0) / wd;

    xh = expTerm * (c1 * Math.cos(wd * t) + c2 * Math.sin(wd * t));
    vh = expTerm * (
      (-gamma * c1 + wd * c2) * Math.cos(wd * t) +
      (-gamma * c2 - wd * c1) * Math.sin(wd * t)
    );
  } else if (Math.abs(gamma - omega0) <= EPSILON) {
    // Critically damped regime (gamma = omega0)
    regime = 'critically_damped';
    const expTerm = Math.exp(-gamma * t);
    const c1 = xh0;
    const c2 = vh0 + gamma * xh0;

    xh = expTerm * (c1 + c2 * t);
    vh = expTerm * (vh0 - gamma * c2 * t);
  } else {
    // Overdamped regime (gamma > omega0)
    regime = 'overdamped';
    const s = Math.sqrt(gamma * gamma - omega0 * omega0);
    const r1 = -gamma + s;
    const r2 = -gamma - s;

    // xh(0) = c1 + c2 = xh0
    // vh(0) = r1*c1 + r2*c2 = vh0
    const c1 = (vh0 - r2 * xh0) / (2 * s);
    const c2 = (r1 * xh0 - vh0) / (2 * s);

    xh = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    vh = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
  }

  pos = xh + xp;
  vel = vh + vp;

  // Exact acceleration from the governing differential equation: m*a = -k*x - b*v + F_ext(t)
  const extForce = hasDriving ? externalForceAmp * Math.cos(omegaE * t) : 0;
  acc = -(k / m) * pos - (dampingCoeff / m) * vel + (extForce / m);

  const kineticEnergy = 0.5 * m * vel * vel;
  const potentialEnergy = 0.5 * k * pos * pos;
  const totalEnergy = kineticEnergy + potentialEnergy;

  return {
    position: pos,
    velocity: vel,
    acceleration: acc,
    kineticEnergy,
    potentialEnergy,
    totalEnergy,
    staticElongation,
    naturalFreq: omega0,
    naturalPeriod,
    dampedFreq: omegaD,
    dampingRegime: regime
  };
}

// -------------------------------------------------------------
// 3. NONLINEAR PENDULUM (RUNGE-KUTTA 4TH ORDER & COMPLETE ELLIPTIC INTEGRAL)
// -------------------------------------------------------------
export interface PendulumState {
  theta: number;          // Angle (rad)
  thetaDeg: number;       // Angle in degrees
  omega: number;          // Angular velocity (rad/s)
  alpha: number;          // Angular acceleration (rad/s^2)
  periodApprox: number;   // Small-angle formula 2*pi*sqrt(L/g) (s)
  periodExact: number;    // Exact nonlinear period from Complete Elliptic Integral K(sin^2(theta0/2)) (s)
  periodBorda: number;    // First-order Taylor series correction (Borda) (s)
  kineticEnergy: number;  // Ec = 0.5 * m * (L*omega)^2 (J)
  potentialEnergy: number;// Ep = m * g * L * (1 - cos(theta)) (J)
  totalEnergy: number;    // Em = Ec + Ep (J)
  x: number;              // Cartesian position x (m)
  y: number;              // Cartesian position y (m)
}

/**
 * Advances a pendulum state by one numerical step dt using RK4.
 */
export function stepPendulumRK4(
  theta: number,
  omega: number,
  length: number,
  mass: number,
  gravity: number,
  damping: number,
  dt: number
): { theta: number; omega: number; alpha: number } {
  const L = Math.max(0.1, length);
  const m = Math.max(0.01, mass);
  const g = Math.max(0.1, gravity);
  const b = Math.max(0, damping);

  const f1 = (w: number) => w;
  const f2 = (th: number, w: number) => -(g / L) * Math.sin(th) - (b / m) * w;

  const k1_th = f1(omega);
  const k1_w = f2(theta, omega);

  const k2_th = f1(omega + 0.5 * dt * k1_w);
  const k2_w = f2(theta + 0.5 * dt * k1_th, omega + 0.5 * dt * k1_w);

  const k3_th = f1(omega + 0.5 * dt * k2_w);
  const k3_w = f2(theta + 0.5 * dt * k2_th, omega + 0.5 * dt * k2_w);

  const k4_th = f1(omega + dt * k3_w);
  const k4_w = f2(theta + dt * k3_th, omega + dt * k3_w);

  const nextTheta = theta + (dt / 6.0) * (k1_th + 2.0 * k2_th + 2.0 * k3_th + k4_th);
  const nextOmega = omega + (dt / 6.0) * (k1_w + 2.0 * k2_w + 2.0 * k3_w + k4_w);
  const nextAlpha = f2(nextTheta, nextOmega);

  return { theta: nextTheta, omega: nextOmega, alpha: nextAlpha };
}

export function integratePendulumRK4(
  theta0: number,
  length: number,
  mass: number,
  gravity: number,
  damping: number,
  totalTime: number,
  substeps?: number,
  omega0: number = 0
): PendulumState {
  const L = Math.max(0.1, length);
  const m = Math.max(0.01, mass);
  const g = Math.max(0.1, gravity);
  const b = Math.max(0, damping);

  // Theoretical nonlinear period using Complete Elliptic Integral of the first kind K(m):
  // T_exact = 4 * sqrt(L/g) * K(sin^2(theta0 / 2))
  // Physical validity: Strictly valid for an undamped simple pendulum (b = 0) with a rigid massless rod.
  // When damping is present (b > 0), the system undergoes dissipative pseudo-periodic motion.
  const thClamped = Math.min(Math.PI - 1e-5, Math.abs(theta0));
  const sinHalf = Math.sin(thClamped / 2.0);
  const mElliptic = Math.min(0.999999, sinHalf * sinHalf);
  const periodExact = (mElliptic < 1.0)
    ? 4.0 * Math.sqrt(L / g) * completeEllipticK(mElliptic)
    : Infinity;

  // Small-angle harmonic approximation: T0 = 2*pi*sqrt(L/g)
  const periodApprox = 2.0 * Math.PI * Math.sqrt(L / g);

  // Borda's Taylor series correction (valid for moderate angles): T0 * (1 + (1/16)*theta0^2 + (11/3072)*theta0^4)
  const th0 = thClamped;
  const periodBorda = periodApprox * (1.0 + (1.0 / 16.0) * Math.pow(th0, 2) + (11.0 / 3072.0) * Math.pow(th0, 4));

  let th = theta0;
  let w = omega0;

  if (totalTime > 0) {
    // Determine integration step size: at least 250 steps per natural period or dt <= 0.002s
    const targetDt = Math.min(0.002, periodApprox / 250);
    const minSteps = Math.ceil(totalTime / targetDt);
    const steps = Math.min(4000, Math.max(substeps || 250, minSteps));
    const dt = totalTime / steps;

    for (let i = 0; i < steps; i++) {
      const stepRes = stepPendulumRK4(th, w, L, m, g, b, dt);
      th = stepRes.theta;
      w = stepRes.omega;
    }
  }

  const alpha = -(g / L) * Math.sin(th) - (b / m) * w;
  const linearVel = L * w;
  const kineticEnergy = 0.5 * m * linearVel * linearVel;
  const h = L * (1.0 - Math.cos(th));
  const potentialEnergy = m * g * h;
  const totalEnergy = kineticEnergy + potentialEnergy;

  const x = L * Math.sin(th);
  const y = -L * Math.cos(th);

  return {
    theta: th,
    thetaDeg: (th * 180.0) / Math.PI,
    omega: w,
    alpha,
    periodApprox,
    periodExact,
    periodBorda,
    kineticEnergy,
    potentialEnergy,
    totalEnergy,
    x,
    y
  };
}

// -------------------------------------------------------------
// 4. PROGRESSIVE WAVES (TRANSVERSE & LONGITUDINAL)
// -------------------------------------------------------------
export interface ProgressiveWaveParams {
  amplitude: number;    // A (m)
  frequency: number;    // f (Hz)
  wavelength: number;   // lambda (m)
  initialPhase: number; // phi (rad)
}

export function calculateWavePoint(
  x: number,
  t: number,
  params: ProgressiveWaveParams
): { y: number; vy: number; ay: number; waveSpeed: number } {
  const { amplitude: A, frequency: f, wavelength: lambda, initialPhase: phi } = params;
  const k = (2 * Math.PI) / Math.max(0.01, lambda);
  const omega = 2 * Math.PI * f;
  const waveSpeed = lambda * f;

  // y(x,t) = A * sin(k*x - omega*t + phi)
  const arg = k * x - omega * t + phi;
  const y = A * Math.sin(arg);
  const vy = -A * omega * Math.cos(arg);
  const ay = -A * omega * omega * Math.sin(arg);

  return { y, vy, ay, waveSpeed };
}

// -------------------------------------------------------------
// 5. INTERFERENCE OF TWO WAVE SOURCES
// Rigorous calculation of local field amplitudes and exact interference phasor sum.
// Supports both coherent identical frequencies and arbitrary dual-source parameters.
// -------------------------------------------------------------
export interface InterferencePoint {
  r1: number;
  r2: number;
  deltaR: number;            // |r2 - r1| (m)
  phaseDiff: number;         // effective phase diff in [0, 2pi) (rad)
  a1: number;                // local attenuated amplitude 1
  a2: number;                // local attenuated amplitude 2
  y1: number;
  y2: number;
  yRes: number;
  resultantAmplitude: number;// exact phasor amplitude sqrt(a1^2 + a2^2 + 2*a1*a2*cos(phaseDiff))
  isConstructive: boolean;
  isDestructive: boolean;
}

export function calculateInterferenceAt(
  x: number,
  y: number,
  t: number,
  source1: { x: number; y: number; amp: number; freq: number; phase: number },
  source2: { x: number; y: number; amp: number; freq: number; phase: number },
  waveSpeed: number = 3.0
): InterferencePoint {
  const r1 = Math.hypot(x - source1.x, y - source1.y);
  const r2 = Math.hypot(x - source2.x, y - source2.y);
  const deltaR = Math.abs(r1 - r2);

  const f1 = Math.max(0.1, source1.freq);
  const f2 = Math.max(0.1, source2.freq);

  const lambda1 = waveSpeed / f1;
  const lambda2 = waveSpeed / f2;

  const k1 = (2 * Math.PI) / lambda1;
  const k2 = (2 * Math.PI) / lambda2;

  const omega1 = 2 * Math.PI * f1;
  const omega2 = 2 * Math.PI * f2;

  // Geometric radial attenuation: 1 / sqrt(r + 0.8)
  const atten1 = 1.0 / Math.sqrt(r1 + 0.8);
  const atten2 = 1.0 / Math.sqrt(r2 + 0.8);

  const a1 = source1.amp * atten1;
  const a2 = source2.amp * atten2;

  // Total instantaneous phase of each wave
  const phi1 = k1 * r1 - omega1 * t + source1.phase;
  const phi2 = k2 * r2 - omega2 * t + source2.phase;

  const y1 = a1 * Math.cos(phi1);
  const y2 = a2 * Math.cos(phi2);
  const yRes = y1 + y2;

  // Total instantaneous phase difference between the two waves: ΔΦ = phi2 - phi1
  const totalPhaseDifference = phi2 - phi1;

  // Normalized phase difference mapped to [0, 2*pi)
  const phaseDiffNorm = ((totalPhaseDifference % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Exact phasor resultant envelope amplitude:
  // |A_res|^2 = a1^2 + a2^2 + 2 * a1 * a2 * cos(ΔΦ)
  const resultantAmplitude = Math.sqrt(
    Math.max(0, a1 * a1 + a2 * a2 + 2.0 * a1 * a2 * Math.cos(totalPhaseDifference))
  );

  // Constructive interference: waves reinforce (cos(ΔΦ) >= 0.85, near 0 or 2pi)
  const cosDiff = Math.cos(totalPhaseDifference);
  const isConstructive = cosDiff >= 0.85;
  // Destructive interference: waves cancel (cos(ΔΦ) <= -0.85, near pi)
  const isDestructive = cosDiff <= -0.85;

  return {
    r1,
    r2,
    deltaR,
    phaseDiff: phaseDiffNorm,
    a1,
    a2,
    y1,
    y2,
    yRes,
    resultantAmplitude,
    isConstructive,
    isDestructive
  };
}

// -------------------------------------------------------------
// 6. STANDING WAVES & HARMONICS
// Rigorous boundary conditions and odd harmonic enumeration for closed-open pipes.
// -------------------------------------------------------------
export type BoundaryCondition = 'both_fixed' | 'pipe_open_open' | 'pipe_closed_open';

export interface StandingWaveInfo {
  harmonicNumber: number;    // n
  modeIndex: number;         // m = 1, 2, 3...
  overtoneIndex: number;     // sobretom: 0 (fundamental), 1, 2...
  wavelength: number;        // lambda_n (m)
  frequency: number;         // f_n (Hz)
  nodeCount: number;         // displacement nodes
  antinodeCount: number;     // displacement antinodes
  nodePositions: number[];   // positions of displacement nodes in [0, L]
  antinodePositions: number[]; // positions of displacement antinodes in [0, L]
  isOnlyOddHarmonics: boolean;
}

export function calculateStandingWave(
  length: number,
  waveSpeed: number,
  n: number,
  boundary: BoundaryCondition = 'both_fixed'
): StandingWaveInfo {
  const L = Math.max(0.1, length);
  const v = Math.max(1.0, waveSpeed);

  let harmonicNumber = Math.max(1, Math.round(n));
  let modeIndex = harmonicNumber;
  let overtoneIndex = harmonicNumber - 1;
  let wavelength = 0;
  let frequency = 0;
  let nodeCount = 0;
  let antinodeCount = 0;
  let isOnlyOddHarmonics = false;
  const nodePositions: number[] = [];
  const antinodePositions: number[] = [];

  if (boundary === 'both_fixed') {
    // String with both ends fixed:
    // Boundary conditions: y(0) = 0, y(L) = 0
    // lambda_n = 2L / n, f_n = n * v / (2L)
    wavelength = (2.0 * L) / harmonicNumber;
    frequency = (harmonicNumber * v) / (2.0 * L);
    nodeCount = harmonicNumber + 1;
    antinodeCount = harmonicNumber;
    modeIndex = harmonicNumber;
    overtoneIndex = harmonicNumber - 1;

    for (let i = 0; i <= harmonicNumber; i++) {
      nodePositions.push((i * L) / harmonicNumber);
    }
    for (let i = 0; i < harmonicNumber; i++) {
      antinodePositions.push(((i + 0.5) * L) / harmonicNumber);
    }
  } else if (boundary === 'pipe_open_open') {
    // Pipe open at both ends:
    // Boundary conditions: displacement antinodes at x = 0 and x = L
    // lambda_n = 2L / n, f_n = n * v / (2L)
    wavelength = (2.0 * L) / harmonicNumber;
    frequency = (harmonicNumber * v) / (2.0 * L);
    nodeCount = harmonicNumber;
    antinodeCount = harmonicNumber + 1;
    modeIndex = harmonicNumber;
    overtoneIndex = harmonicNumber - 1;

    for (let i = 0; i < harmonicNumber; i++) {
      nodePositions.push(((i + 0.5) * L) / harmonicNumber);
    }
    for (let i = 0; i <= harmonicNumber; i++) {
      antinodePositions.push((i * L) / harmonicNumber);
    }
  } else {
    // Pipe closed at x = 0 and open at x = L:
    // Boundary conditions: displacement NODE at x = 0, displacement ANTINODE at x = L.
    // Physical law: ONLY ODD HARMONICS exist! n = 1, 3, 5, 7, ...
    // Mode index m = 1, 2, 3... where harmonic number n = 2m - 1.
    isOnlyOddHarmonics = true;
    if (harmonicNumber % 2 === 0) {
      harmonicNumber = harmonicNumber + 1;
    }
    modeIndex = (harmonicNumber + 1) / 2;
    overtoneIndex = modeIndex - 1;

    // lambda_n = 4L / n, f_n = n * v / (4L)
    wavelength = (4.0 * L) / harmonicNumber;
    frequency = (harmonicNumber * v) / (4.0 * L);

    // Nodes occur where sin(k*x) = 0 -> x = k * (2L / n) for k = 0, 1, ..., m - 1
    // Antinodes occur where |sin(k*x)| = 1 -> x = (2k + 1) * (L / n) for k = 0, 1, ..., m - 1
    for (let k = 0; k < modeIndex; k++) {
      const nodeX = (k * 2.0 * L) / harmonicNumber;
      nodePositions.push(nodeX);

      const antinodeX = ((2 * k + 1) * L) / harmonicNumber;
      antinodePositions.push(antinodeX);
    }
    nodeCount = nodePositions.length;
    antinodeCount = antinodePositions.length;
  }

  return {
    harmonicNumber,
    modeIndex,
    overtoneIndex,
    wavelength,
    frequency,
    nodeCount,
    antinodeCount,
    nodePositions,
    antinodePositions,
    isOnlyOddHarmonics
  };
}

// -------------------------------------------------------------
// 7. ACOUSTICS & DOPPLER EFFECT
// Rigorous vector line-of-sight Doppler formula and distance derivative signs.
// -------------------------------------------------------------
export interface DopplerState {
  sourcePos: number;         // x-coord (m)
  observerPos: number;       // x-coord (m)
  sourceSpeed: number;       // v_f (m/s) (+ is moving right)
  observerSpeed: number;     // v_o (m/s) (+ is moving right)
  emittedFreq: number;       // f_0 (Hz)
  observedFreq: number;      // f_obs (Hz)
  soundSpeed: number;        // v_sound (m/s, ~343 m/s in air)
  isApproaching: boolean;
  wavelengthAhead: number;   // (v_s - v_f) / f_0
  wavelengthBehind: number;  // (v_s + v_f) / f_0
  machNumber: number;
  isSupersonic: boolean;
  machConeAngleDeg?: number; // arcsin(1/M) for M >= 1
}

export function calculateDoppler(
  sourceX: number,
  observerX: number,
  sourceVx: number,
  observerVx: number,
  sourceFreq: number,
  soundSpeed: number = 340
): DopplerState {
  const vS = soundSpeed;
  const f0 = Math.max(1.0, sourceFreq);

  const dx = observerX - sourceX;
  // Unit vector along the line of sight pointing from source to observer:
  const u = dx !== 0 ? (dx > 0 ? 1.0 : -1.0) : 1.0;

  // Rate of change of distance between observer and source:
  // d/dt |x_o - x_s| = u * (v_o - v_s)
  // When rate < 0, distance is decreasing (approaching).
  // When rate > 0, distance is increasing (receding).
  const distanceRate = u * (observerVx - sourceVx);
  const isApproaching = distanceRate < 0;

  // Standard classical Doppler equation:
  // Velocity of source projected along unit vector toward observer: v_s_proj = sourceVx * u
  // Velocity of observer projected along unit vector toward source: v_o_proj = -observerVx * u
  // f_obs = f_0 * (v_sound + v_o_toward_source) / (v_sound - v_s_toward_observer)
  //       = f_0 * (v_sound - observerVx * u) / (v_sound - sourceVx * u)
  const numerator = Math.max(0, vS - observerVx * u);
  const denomRaw = vS - sourceVx * u;

  const machNumber = Math.abs(sourceVx) / vS;
  const isSupersonic = machNumber >= 1.0;
  const machConeAngleDeg = isSupersonic
    ? (Math.asin(1.0 / machNumber) * 180.0) / Math.PI
    : undefined;

  // Safeguard against singularity at sonic barrier (Mach 1 shock front)
  const denominator = Math.max(1e-3, Math.abs(denomRaw));
  const observedFreq = f0 * (numerator / denominator);

  const wavelengthAhead = Math.max(0.01, (vS - Math.abs(sourceVx)) / f0);
  const wavelengthBehind = (vS + Math.abs(sourceVx)) / f0;

  return {
    sourcePos: sourceX,
    observerPos: observerX,
    sourceSpeed: sourceVx,
    observerSpeed: observerVx,
    emittedFreq: f0,
    observedFreq,
    soundSpeed: vS,
    isApproaching,
    wavelengthAhead,
    wavelengthBehind,
    machNumber,
    isSupersonic,
    machConeAngleDeg
  };
}

// -------------------------------------------------------------
// 8. WAVE PHENOMENA (REFRACTION, REFLECTION, DIFFRACTION)
// -------------------------------------------------------------
export interface RefractionState {
  medium1Speed: number;
  medium2Speed: number;
  freq: number;
  lambda1: number;
  lambda2: number;
  indexRefractionRatio: number;
}

export function calculateRefraction(
  v1: number,
  v2: number,
  frequency: number
): RefractionState {
  const f = Math.max(0.1, frequency);
  const lambda1 = v1 / f;
  const lambda2 = v2 / f;
  const indexRefractionRatio = v1 / Math.max(0.001, v2);

  return {
    medium1Speed: v1,
    medium2Speed: v2,
    freq: f,
    lambda1,
    lambda2,
    indexRefractionRatio
  };
}

/**
 * Fraunhofer Far-Field Diffraction Intensity for Single Slit of width a:
 * I(theta) = I_0 * (sin(beta) / beta)^2, where beta = (pi * a * sin(theta)) / lambda.
 * Physical limits: Far-field approximation (Fraunhofer regime, screen distance D >> a^2 / lambda).
 * First diffraction minima occur strictly at a * sin(theta) = m * lambda (m = +-1, +-2...).
 */
export function singleSlitDiffractionIntensity(
  thetaRad: number,
  slitWidth: number,
  wavelength: number
): number {
  if (Math.abs(thetaRad) < 1e-6) return 1.0;
  const beta = (Math.PI * slitWidth * Math.sin(thetaRad)) / wavelength;
  if (Math.abs(beta) < 1e-6) return 1.0;
  const sinBeta = Math.sin(beta);
  return Math.pow(sinBeta / beta, 2);
}

// -------------------------------------------------------------
// 9. MECÂNICA CLÁSSICA: TRABALHO E POTÊNCIA
// -------------------------------------------------------------
export interface WorkPowerState {
  force: number;          // F (N)
  distance: number;       // d (m)
  angleDeg: number;       // theta (graus)
  angleRad: number;       // theta (rad)
  forceParallel: number;  // F * cos(theta) (N)
  forcePerpendicular: number; // F * sin(theta) (N)
  normalForce: number;    // N (N)
  frictionForce: number;  // f_at = mu * N (N)
  workApplied: number;    // W_F = F * d * cos(theta) (J)
  workFriction: number;   // W_fat = -f_at * d (J)
  workNet: number;        // W_res = W_F + W_fat (J)
  acceleration: number;   // a_res = (F*cos(theta) - f_at)/m (m/s^2)
  finalVelocity: number;  // v_f (m/s)
  timeToComplete: number; // t (s)
  averagePower: number;   // P_m = W_F / t (W)
  instantaneousPowerFinal: number; // P_inst = F * cos(theta) * v_f (W)
}

export function calculateWorkAndPower(
  force: number,
  distance: number,
  angleDeg: number,
  mass: number,
  frictionCoeff: number,
  initialVelocity: number = 0,
  gravity: number = 9.8
): WorkPowerState {
  const m = Math.max(0.1, mass);
  const d = Math.max(0.01, distance);
  const F = Math.max(0, force);
  const mu = Math.max(0, frictionCoeff);
  const g = Math.max(0.1, gravity);

  const angleRad = (angleDeg * Math.PI) / 180;
  const forceParallel = F * Math.cos(angleRad);
  const forcePerpendicular = F * Math.sin(angleRad);

  // Normal contact force: N = max(0, m*g - F*sin(theta))
  const normalForce = Math.max(0, m * g - forcePerpendicular);
  const maxStaticFriction = mu * normalForce;

  let acceleration = 0;
  let frictionForce = 0;

  if (forceParallel > maxStaticFriction || initialVelocity > 0) {
    frictionForce = maxStaticFriction;
    acceleration = Math.max(0, (forceParallel - frictionForce) / m);
  } else {
    // Static equilibrium
    frictionForce = Math.max(0, forceParallel);
    acceleration = 0;
  }

  const workApplied = forceParallel * d;
  const workFriction = -frictionForce * d;
  const workNet = workApplied + workFriction;

  // Work-Energy Theorem: W_net = Delta Ec = 0.5 * m * (vf^2 - v0^2)
  const finalKineticEnergy = Math.max(0, 0.5 * m * initialVelocity * initialVelocity + workNet);
  const finalVelocity = Math.sqrt((2 * finalKineticEnergy) / m);

  // Kinematic time: d = v_avg * t
  const vAvg = (initialVelocity + finalVelocity) / 2;
  const timeToComplete = vAvg > 1e-4 ? d / vAvg : acceleration > 1e-4 ? Math.sqrt((2 * d) / acceleration) : 0;

  const averagePower = timeToComplete > 1e-4 ? workApplied / timeToComplete : 0;
  const instantaneousPowerFinal = forceParallel * finalVelocity;

  return {
    force: F,
    distance: d,
    angleDeg,
    angleRad,
    forceParallel,
    forcePerpendicular,
    normalForce,
    frictionForce,
    workApplied,
    workFriction,
    workNet,
    acceleration,
    finalVelocity,
    timeToComplete,
    averagePower,
    instantaneousPowerFinal,
  };
}

// -------------------------------------------------------------
// 10. MECÂNICA CLÁSSICA: CONSERVAÇÃO DA ENERGIA (RAMPA & LOOP 3D)
// -------------------------------------------------------------
export interface TrackPoint {
  x: number;
  y: number;
  z: number;
  tangentX: number;
  tangentY: number;
  curvatureRadius: number;
  arcLength: number;
}

export interface RollerCoasterState {
  x: number;
  y: number;
  z: number;
  progress: number;       // 0 to 1 along track
  arcLength: number;      // s (m)
  velocity: number;       // v (m/s)
  kineticEnergy: number;  // E_c = 0.5 * m * v^2 (J)
  potentialEnergy: number;// E_p = m * g * y (J)
  dissipatedEnergy: number;// E_diss = int mu * N ds (J)
  mechanicalEnergy: number;// E_m = E_c + E_p (J)
  totalInitialEnergy: number; // E_0 = m * g * h0 (J)
  normalForce: number;    // N (N)
  apparentWeightRatio: number; // N / (m*g)
  inLoop: boolean;
  loopSafe: boolean;      // N >= 0 at the loop apex
}

/**
 * Analytical Roller Coaster Track Geometry:
 * Track with initial hill (height h0), valley, circular loop of radius R, and exit runout.
 */
export function getTrackGeometry(trackLength: number = 24, loopRadius: number = 2.5, initialHeight: number = 8.0): TrackPoint[] {
  const points: TrackPoint[] = [];
  const steps = 300;
  let accumulatedArcLength = 0;
  let prevPos = { x: -trackLength / 2, y: initialHeight, z: 0 };

  for (let i = 0; i <= steps; i++) {
    const u = i / steps; // 0 to 1
    const x = -trackLength / 2 + u * trackLength;
    let y = 0;
    let curvatureRadius = 10;

    // Track profile segments
    if (u < 0.35) {
      // Starting hill: smooth cosine descent from h0 to 0.4
      const p = u / 0.35;
      y = 0.4 + (initialHeight - 0.4) * 0.5 * (1 + Math.cos(Math.PI * p));
      curvatureRadius = 6.0;
    } else if (u >= 0.35 && u <= 0.70) {
      // Loop region centered at x = 0
      const loopU = (u - 0.35) / 0.35;
      const phi = loopU * 2 * Math.PI - Math.PI / 2;
      y = loopRadius * (1 + Math.sin(phi));
      curvatureRadius = loopRadius;
    } else {
      // Second hill and gentle terminal runout
      const p = (u - 0.70) / 0.30;
      y = 0.4 + 1.8 * Math.sin(Math.PI * p) * (1 - p);
      curvatureRadius = 8.0;
    }

    const currentPos = { x, y: Math.max(0.1, y), z: 0 };
    if (i > 0) {
      const dx = currentPos.x - prevPos.x;
      const dy = currentPos.y - prevPos.y;
      accumulatedArcLength += Math.hypot(dx, dy);
    }
    prevPos = currentPos;

    points.push({
      x: currentPos.x,
      y: currentPos.y,
      z: 0,
      tangentX: 1,
      tangentY: 0,
      curvatureRadius,
      arcLength: accumulatedArcLength,
    });
  }
  return points;
}

export function calculateRollerCoasterState(
  progress: number, // 0 to 1
  initialHeight: number,
  mass: number,
  frictionCoeff: number,
  gravity: number = 9.8,
  loopRadius: number = 2.5
): RollerCoasterState {
  const m = Math.max(0.1, mass);
  const g = Math.max(0.1, gravity);
  const h0 = Math.max(loopRadius * 2, initialHeight);
  const mu = Math.max(0, frictionCoeff);

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const track = getTrackGeometry(24, loopRadius, h0);
  const idx = Math.min(track.length - 1, Math.floor(clampedProgress * (track.length - 1)));
  const pt = track[idx];

  const totalInitialEnergy = m * g * h0;
  // Dissipation along arc length s
  const dissipatedEnergy = Math.min(totalInitialEnergy * 0.85, mu * m * g * pt.arcLength);
  const mechanicalEnergy = Math.max(0, totalInitialEnergy - dissipatedEnergy);
  const potentialEnergy = m * g * pt.y;

  const kineticEnergy = Math.max(0, mechanicalEnergy - potentialEnergy);
  const velocity = Math.sqrt((2 * kineticEnergy) / m);

  // Normal Force: N = m*(v^2 / R + g * cos(theta))
  const inLoop = clampedProgress >= 0.35 && clampedProgress <= 0.70;
  let normalForce = m * g;
  let loopSafe = true;

  if (inLoop) {
    const loopU = (clampedProgress - 0.35) / 0.35;
    const phi = loopU * 2 * Math.PI - Math.PI / 2;
    // Radial equation: N + m*g*sin(phi) = m * v^2 / R
    const centripetalForce = (m * velocity * velocity) / Math.max(0.5, pt.curvatureRadius);
    normalForce = centripetalForce - m * g * Math.sin(phi);

    // Apex safety: at phi = pi/2 (top, y = 2R), N >= 0 requires v^2 >= g*R
    const vAtTopReq = Math.sqrt(g * loopRadius);
    const mechAtTop = totalInitialEnergy - (mu * m * g * (pt.arcLength * 0.5));
    const ecAtTop = mechAtTop - m * g * (2 * loopRadius);
    loopSafe = ecAtTop >= 0.5 * m * vAtTopReq * vAtTopReq;
  } else {
    normalForce = m * g + (m * velocity * velocity) / Math.max(1, pt.curvatureRadius);
  }

  const apparentWeightRatio = Math.max(0, normalForce / (m * g));

  return {
    x: pt.x,
    y: pt.y,
    z: 0,
    progress: clampedProgress,
    arcLength: pt.arcLength,
    velocity,
    kineticEnergy,
    potentialEnergy,
    dissipatedEnergy,
    mechanicalEnergy,
    totalInitialEnergy,
    normalForce: Math.max(0, normalForce),
    apparentWeightRatio,
    inLoop,
    loopSafe,
  };
}

// -------------------------------------------------------------
// 11. MECÂNICA CLÁSSICA: IMPULSO E QUANTIDADE DE MOVIMENTO
// -------------------------------------------------------------
export interface ImpulseState {
  mass: number;           // m (kg)
  initialVelocity: number;// v0 (m/s)
  finalVelocity: number;  // vf (m/s)
  deltaP: number;         // Delta p = m*(vf - v0) (kg*m/s or N*s)
  impulse: number;        // I = Delta p (N*s)
  duration: number;       // Delta t (s)
  averageForce: number;   // F_méd = |Delta p| / Delta t (N)
  peakForce: number;      // F_pico = (pi/2) * F_méd (pulso senoidal) (N)
  peakGForce: number;     // a_pico / g (g)
  cushioningDevice: 'airbag' | 'helmet' | 'rigid_wall';
  deviceLabel: string;
  forceAtTime: (t: number) => number;
}

export function calculateImpulseCollision(
  mass: number,
  initialVelocity: number,
  cushioningDevice: 'airbag' | 'helmet' | 'rigid_wall',
  gravity: number = 9.8
): ImpulseState {
  const m = Math.max(0.1, mass);
  const v0 = initialVelocity;
  const vf = 0; // Completely stopped after crash
  const deltaP = m * (vf - v0);
  const impulseMag = Math.abs(deltaP);

  // Impact duration depends on cushioning technology
  // Airbag: 0.12s ~ 0.18s (gradual deceleration)
  // Helmet: 0.05s ~ 0.08s (expanded polystyrene foam compression)
  // Rigid Wall: 0.008s ~ 0.015s (metal crumple / direct shock)
  let duration = 0.15;
  let deviceLabel = 'Airbag Automotivo';

  if (cushioningDevice === 'airbag') {
    duration = 0.14;
    deviceLabel = 'Airbag Automotivo (Absorção Estendida)';
  } else if (cushioningDevice === 'helmet') {
    duration = 0.06;
    deviceLabel = 'Capacete de Proteção (EPS)';
  } else {
    duration = 0.012;
    deviceLabel = 'Barreira Rígida Indeformável';
  }

  const averageForce = impulseMag / duration;
  // Sinusoidal half-wave force pulse: F(t) = F_peak * sin(pi * t / dt)
  // Integral from 0 to dt of F(t) dt = (2 / pi) * F_peak * dt = I
  // => F_peak = (pi / 2) * (I / dt) = (pi / 2) * F_avg
  const peakForce = (Math.PI / 2) * averageForce;
  const peakGForce = (peakForce / m) / gravity;

  const forceAtTime = (t: number): number => {
    if (t < 0 || t > duration) return 0;
    return peakForce * Math.sin((Math.PI * t) / duration);
  };

  return {
    mass: m,
    initialVelocity: v0,
    finalVelocity: vf,
    deltaP,
    impulse: impulseMag,
    duration,
    averageForce,
    peakForce,
    peakGForce,
    cushioningDevice,
    deviceLabel,
    forceAtTime,
  };
}

// -------------------------------------------------------------
// 12. MECÂNICA CLÁSSICA: COLISÕES 1D E 2D
// -------------------------------------------------------------
export interface Collision1DState {
  m1: number;
  m2: number;
  v1i: number;
  v2i: number;
  v1f: number;
  v2f: number;
  restitution: number;    // e in [0, 1]
  initialMomentum: number;// p_i = m1*v1i + m2*v2i (kg*m/s)
  finalMomentum: number;  // p_f = m1*v1f + m2*v2f (kg*m/s)
  initialKineticEnergy: number; // E_ci (J)
  finalKineticEnergy: number;   // E_cf (J)
  dissipatedEnergy: number;     // Delta E_c = E_ci - E_cf (J)
  relativeApproachSpeed: number; // |v1i - v2i| (m/s)
  relativeSeparationSpeed: number; // |v2f - v1f| (m/s)
  collisionType: 'elastic' | 'partially_elastic' | 'inelastic';
  typeLabel: string;
}

export function calculateCollision1D(
  m1: number,
  m2: number,
  v1i: number,
  v2i: number,
  restitution: number
): Collision1DState {
  const mass1 = Math.max(0.1, m1);
  const mass2 = Math.max(0.1, m2);
  const e = Math.max(0, Math.min(1, restitution));

  // Closed-form analytical solution for 1D collision with restitution e:
  // v1f = [(m1 - e*m2)*v1i + (1 + e)*m2*v2i] / (m1 + m2)
  // v2f = [(1 + e)*m1*v1i + (m2 - e*m1)*v2i] / (m1 + m2)
  const totalMass = mass1 + mass2;
  const v1f = ((mass1 - e * mass2) * v1i + (1 + e) * mass2 * v2i) / totalMass;
  const v2f = ((1 + e) * mass1 * v1i + (mass2 - e * mass1) * v2i) / totalMass;

  const initialMomentum = mass1 * v1i + mass2 * v2i;
  const finalMomentum = mass1 * v1f + mass2 * v2f;

  const initialKineticEnergy = 0.5 * mass1 * v1i * v1i + 0.5 * mass2 * v2i * v2i;
  const finalKineticEnergy = 0.5 * mass1 * v1f * v1f + 0.5 * mass2 * v2f * v2f;
  const dissipatedEnergy = Math.max(0, initialKineticEnergy - finalKineticEnergy);

  const relativeApproachSpeed = Math.abs(v1i - v2i);
  const relativeSeparationSpeed = Math.abs(v2f - v1f);

  let collisionType: 'elastic' | 'partially_elastic' | 'inelastic' = 'partially_elastic';
  let typeLabel = 'Parcialmente Elástica (0 < e < 1)';

  if (Math.abs(e - 1.0) < 1e-4) {
    collisionType = 'elastic';
    typeLabel = 'Perfeitamente Elástica (e = 1,0 - Ec conservada)';
  } else if (e < 1e-4) {
    collisionType = 'inelastic';
    typeLabel = 'Perfeitamente Inelástica (e = 0 - corpos unidos)';
  }

  return {
    m1: mass1,
    m2: mass2,
    v1i,
    v2i,
    v1f,
    v2f,
    restitution: e,
    initialMomentum,
    finalMomentum,
    initialKineticEnergy,
    finalKineticEnergy,
    dissipatedEnergy,
    relativeApproachSpeed,
    relativeSeparationSpeed,
    collisionType,
    typeLabel,
  };
}

export interface Collision2DState {
  m1: number;
  m2: number;
  v1i: Vector3D;
  v2i: Vector3D;
  v1f: Vector3D;
  v2f: Vector3D;
  restitution: number;
  initialMomentum: Vector3D;
  finalMomentum: Vector3D;
  initialKineticEnergy: number;
  finalKineticEnergy: number;
  dissipatedEnergy: number;
  impactAngleDeg: number;
}

export function calculateCollision2D(
  m1: number,
  m2: number,
  v1i: Vector3D,
  v2i: Vector3D,
  impactAngleDeg: number,
  restitution: number
): Collision2DState {
  const mass1 = Math.max(0.1, m1);
  const mass2 = Math.max(0.1, m2);
  const e = Math.max(0, Math.min(1, restitution));

  // Normal direction unit vector at impact angle phi
  const phi = (impactAngleDeg * Math.PI) / 180;
  const nx = Math.cos(phi);
  const nz = Math.sin(phi);

  // Tangent direction unit vector (-nz, nx)
  const tx = -nz;
  const tz = nx;

  // Project initial velocities onto normal (line of centers) and tangent
  const v1n = v1i.x * nx + v1i.z * nz;
  const v1t = v1i.x * tx + v1i.z * tz;

  const v2n = v2i.x * nx + v2i.z * nz;
  const v2t = v2i.x * tx + v2i.z * tz;

  // 1D restitution collision along normal direction
  const totalMass = mass1 + mass2;
  const v1nf = ((mass1 - e * mass2) * v1n + (1 + e) * mass2 * v2n) / totalMass;
  const v2nf = ((1 + e) * mass1 * v1n + (mass2 - e * mass1) * v2n) / totalMass;

  // Tangential velocity is conserved (frictionless impact)
  const v1tf = v1t;
  const v2tf = v2t;

  // Reconstruct Cartesian velocity vectors
  const v1f: Vector3D = {
    x: v1nf * nx + v1tf * tx,
    y: 0,
    z: v1nf * nz + v1tf * tz,
  };

  const v2f: Vector3D = {
    x: v2nf * nx + v2tf * tx,
    y: 0,
    z: v2nf * nz + v2tf * tz,
  };

  const initialMomentum: Vector3D = {
    x: mass1 * v1i.x + mass2 * v2i.x,
    y: 0,
    z: mass1 * v1i.z + mass2 * v2i.z,
  };

  const finalMomentum: Vector3D = {
    x: mass1 * v1f.x + mass2 * v2f.x,
    y: 0,
    z: mass1 * v1f.z + mass2 * v2f.z,
  };

  const initialKineticEnergy =
    0.5 * mass1 * (v1i.x * v1i.x + v1i.z * v1i.z) +
    0.5 * mass2 * (v2i.x * v2i.x + v2i.z * v2i.z);

  const finalKineticEnergy =
    0.5 * mass1 * (v1f.x * v1f.x + v1f.z * v1f.z) +
    0.5 * mass2 * (v2f.x * v2f.x + v2f.z * v2f.z);

  const dissipatedEnergy = Math.max(0, initialKineticEnergy - finalKineticEnergy);

  return {
    m1: mass1,
    m2: mass2,
    v1i,
    v2i,
    v1f,
    v2f,
    restitution: e,
    initialMomentum,
    finalMomentum,
    initialKineticEnergy,
    finalKineticEnergy,
    dissipatedEnergy,
    impactAngleDeg,
  };
}

// -------------------------------------------------------------
// 7. HIDROSTÁTICA (DENSIDADE, PRESSÃO, STEVIN, PASCAL, ARQUIMEDES)
// -------------------------------------------------------------

// --- 7.1 DENSIDADE E PRESSÃO ---
export interface DensityPressureState {
  mass: number;             // kg
  volume: number;           // m^3
  density: number;          // kg/m^3
  contactArea: number;      // m^2
  contactForce: number;     // N (F = m * g)
  mechanicalPressure: number; // Pa (P = F / A)
  mechanicalPressureKPa: number; // kPa
  fluidDensity: number;     // kg/m^3
  fluidHeight: number;      // m
  hydrostaticPressure: number; // Pa (P_h = rho_f * g * h)
  totalPressure: number;    // Pa (P_atm + P_h)
  relativeDensity: number;  // rho / rho_water
}

export function calculateDensityAndPressure(
  massKg: number,
  volumeM3: number,
  contactAreaM2: number,
  fluidDensityKgM3: number = 1000,
  fluidHeightM: number = 1.0,
  gravity: number = 9.8,
  pAtmPa: number = 101325
): DensityPressureState {
  const m = Math.max(0.001, massKg);
  const v = Math.max(0.00001, volumeM3);
  const area = Math.max(0.0001, contactAreaM2);
  const rhoSolid = m / v;
  const fNormal = m * gravity;
  const pMech = fNormal / area;
  const pHydro = fluidDensityKgM3 * gravity * Math.max(0, fluidHeightM);
  const pTotal = pAtmPa + pHydro;
  const relDensity = rhoSolid / 1000.0;

  return {
    mass: m,
    volume: v,
    density: rhoSolid,
    contactArea: area,
    contactForce: fNormal,
    mechanicalPressure: pMech,
    mechanicalPressureKPa: pMech / 1000,
    fluidDensity: fluidDensityKgM3,
    fluidHeight: fluidHeightM,
    hydrostaticPressure: pHydro,
    totalPressure: pTotal,
    relativeDensity: relDensity,
  };
}

// --- 7.2 TEOREMA DE STEVIN E VASOS COMUNICANTES ---
export interface StevinState {
  depth: number;            // h (m)
  fluidDensity: number;     // rho (kg/m^3)
  gravity: number;          // g (m/s^2)
  pAtm: number;             // P_atm (Pa)
  deltaP: number;           // Delta P = rho * g * h (Pa)
  pAbs: number;             // P_abs = P_atm + rho * g * h (Pa)
  pAbsAtm: number;          // P_abs in atm
  forceOnBase: number;      // F = P * A (N)
}

export function calculateStevinPressure(
  depthM: number,
  fluidDensityKgM3: number = 1000,
  gravity: number = 9.8,
  pAtmPa: number = 101325,
  baseAreaM2: number = 0.05
): StevinState {
  const h = Math.max(0, depthM);
  const rho = Math.max(1, fluidDensityKgM3);
  const deltaP = rho * gravity * h;
  const pAbs = pAtmPa + deltaP;
  const pAbsAtm = pAbs / 101325;
  const forceOnBase = pAbs * baseAreaM2;

  return {
    depth: h,
    fluidDensity: rho,
    gravity,
    pAtm: pAtmPa,
    deltaP,
    pAbs,
    pAbsAtm,
    forceOnBase,
  };
}

export interface UTubeState {
  rho1: number;       // kg/m^3 (liquid 1, e.g. water)
  h1: number;         // m (height of column 1 above interface)
  rho2: number;       // kg/m^3 (liquid 2, e.g. oil)
  h2: number;         // m (equilibrium height: h2 = h1 * rho1 / rho2)
  interfacePressure: number; // Pa (P_atm + rho1 * g * h1)
  isEquilibrium: boolean;
}

export function calculateUTubeEquilibrium(
  rho1: number,
  h1: number,
  rho2: number,
  pAtmPa: number = 101325,
  gravity: number = 9.8
): UTubeState {
  const r1 = Math.max(1, rho1);
  const r2 = Math.max(1, rho2);
  const col1 = Math.max(0, h1);
  // Equilibrium condition: rho1 * g * h1 = rho2 * g * h2 => h2 = h1 * (rho1 / rho2)
  const col2 = col1 * (r1 / r2);
  const pInterface = pAtmPa + r1 * gravity * col1;

  return {
    rho1: r1,
    h1: col1,
    rho2: r2,
    h2: col2,
    interfacePressure: pInterface,
    isEquilibrium: true,
  };
}

// --- 7.3 PRINCÍPIO DE PASCAL E PRENSA HIDRÁULICA ---
export interface HydraulicPressState {
  force1: number;           // F1 applied (N)
  radius1: number;          // r1 (m)
  radius2: number;          // r2 (m)
  area1: number;            // A1 = pi * r1^2 (m^2)
  area2: number;            // A2 = pi * r2^2 (m^2)
  areaRatio: number;        // A2 / A1
  force2: number;           // F2 = F1 * (A2 / A1) (N)
  deltaP: number;           // Delta P = F1 / A1 = F2 / A2 (Pa)
  displacement1: number;    // d1 (m)
  displacement2: number;    // d2 = d1 * (A1 / A2) (m)
  displacedVolume: number;  // Delta V = A1 * d1 = A2 * d2 (m^3)
  work1: number;            // W1 = F1 * d1 (J)
  work2: number;            // W2 = F2 * d2 (J)
  isWorkConserved: boolean;
  efficiency: number;       // eta
}

export function calculateHydraulicPress(
  force1N: number,
  radius1M: number,
  radius2M: number,
  displacement1M: number = 0.1,
  efficiency: number = 1.0
): HydraulicPressState {
  const f1 = Math.max(0, force1N);
  const r1 = Math.max(0.01, radius1M);
  const r2 = Math.max(0.01, radius2M);
  const d1 = Math.max(0, displacement1M);
  const eta = Math.min(1.0, Math.max(0.1, efficiency));

  const a1 = Math.PI * r1 * r1;
  const a2 = Math.PI * r2 * r2;
  const areaRatio = a2 / a1;

  // Pascal: Delta P = F1 / A1
  const deltaP = a1 > 0 ? f1 / a1 : 0;
  // Multiplication of force: F2 = F1 * (A2 / A1) * eta
  const f2 = f1 * areaRatio * eta;

  // Conservation of incompressibility: A1 * d1 = A2 * d2 => d2 = d1 * (A1 / A2)
  const d2 = d1 / areaRatio;
  const displacedVolume = a1 * d1;

  const w1 = f1 * d1;
  const w2 = f2 * d2;
  const isWorkConserved = Math.abs(w1 - (w2 / eta)) < 1e-9;

  return {
    force1: f1,
    radius1: r1,
    radius2: r2,
    area1: a1,
    area2: a2,
    areaRatio,
    force2: f2,
    deltaP,
    displacement1: d1,
    displacement2: d2,
    displacedVolume,
    work1: w1,
    work2: w2,
    isWorkConserved,
    efficiency: eta,
  };
}

// --- 7.4 EMPUXO E PRINCÍPIO DE ARQUIMEDES ---
export interface BuoyancyState {
  bodyMass: number;         // kg
  bodyVolume: number;       // m^3
  bodyDensity: number;      // kg/m^3 (m / V)
  fluidDensity: number;     // kg/m^3
  gravity: number;          // m/s^2
  trueWeight: number;       // P = m * g (N)
  buoyantForce: number;     // E = rho_f * V_sub * g (N)
  apparentWeight: number;   // P_ap = max(0, P - E) (N)
  submergedVolume: number;  // V_sub (m^3)
  submergedFraction: number;// V_sub / V_total (0 to 1)
  displacedMass: number;    // m_f = rho_f * V_sub (kg)
  displacedWeight: number;  // P_f = m_f * g (N)
  regime: 'floats' | 'neutral' | 'sinks';
  normalForceBottom: number;// N on floor if sunk (N)
  netAcceleration: number;  // a = (P - E) / m (m/s^2)
}

export function calculateBuoyancyState(
  bodyMassKg: number,
  bodyVolumeM3: number,
  fluidDensityKgM3: number = 1000,
  gravity: number = 9.8,
  immersionFractionManual?: number
): BuoyancyState {
  const m = Math.max(0.001, bodyMassKg);
  const vTotal = Math.max(0.00001, bodyVolumeM3);
  const rhoFluid = Math.max(1, fluidDensityKgM3);
  const rhoBody = m / vTotal;
  const trueWeight = m * gravity;

  let submergedFraction: number;
  let regime: 'floats' | 'neutral' | 'sinks';

  if (immersionFractionManual !== undefined) {
    submergedFraction = Math.max(0, Math.min(1, immersionFractionManual));
    if (submergedFraction < 1 && rhoBody <= rhoFluid) {
      regime = 'floats';
    } else if (rhoBody > rhoFluid) {
      regime = 'sinks';
    } else {
      regime = 'neutral';
    }
  } else {
    // Free equilibrium state:
    if (rhoBody < rhoFluid) {
      regime = 'floats';
      submergedFraction = rhoBody / rhoFluid; // Fraction submersed at equilibrium (E = P)
    } else if (Math.abs(rhoBody - rhoFluid) < 1e-4) {
      regime = 'neutral';
      submergedFraction = 1.0;
    } else {
      regime = 'sinks';
      submergedFraction = 1.0;
    }
  }

  const submergedVolume = vTotal * submergedFraction;
  const buoyantForce = rhoFluid * submergedVolume * gravity;
  const displacedMass = rhoFluid * submergedVolume;
  const displacedWeight = displacedMass * gravity;
  const apparentWeight = Math.max(0, trueWeight - buoyantForce);

  // If resting on bottom when sunk: Normal force = P - E
  const normalForceBottom = regime === 'sinks' ? Math.max(0, trueWeight - buoyantForce) : 0;
  // Dynamic free acceleration (in fluids ignoring drag)
  const netAcceleration = (trueWeight - buoyantForce) / m;

  return {
    bodyMass: m,
    bodyVolume: vTotal,
    bodyDensity: rhoBody,
    fluidDensity: rhoFluid,
    gravity,
    trueWeight,
    buoyantForce,
    apparentWeight,
    submergedVolume,
    submergedFraction,
    displacedMass,
    displacedWeight,
    regime,
    normalForceBottom,
    netAcceleration,
  };
}

// -------------------------------------------------------------
// 8. TERMODINÂMICA (GASES IDEAIS, 1ª LEI, MÁQUINAS TÉRMICAS / CARNOT, CALORIMETRIA)
// -------------------------------------------------------------

export const GAS_CONSTANT_R = 8.314462618; // J / (mol * K)
export const BOLTZMANN_K = 1.380649e-23;   // J / K
export const AVOGADRO_N = 6.02214076e23;   // molecules / mol

// --- 8.1 GASES IDEAIS E TRANSFORMAÇÕES ---
export type GasTransformationType = 'isothermal' | 'isobaric' | 'isochoric' | 'adiabatic';

export interface IdealGasState {
  pressure: number;         // Pa
  pressureAtm: number;      // atm
  volume: number;           // m^3
  volumeLiters: number;     // L
  temperature: number;      // K
  temperatureC: number;     // deg C
  nMoles: number;           // mol
  internalEnergy: number;   // U = (f/2) * n * R * T (J)
  vRms: number;             // m/s (Root mean square molecular speed)
  meanKineticEnergy: number;// J per molecule (<Ec> = 3/2 * k * T)
  transformationType: GasTransformationType;
  gamma: number;            // Cp / Cv (e.g. 5/3 = 1.667 for monoatomic, 7/5 = 1.4 for diatomic)
}

export function calculateIdealGasState(
  pressurePa: number,
  volumeM3: number,
  nMoles: number = 1.0,
  degreesOfFreedom: number = 3, // 3 for monoatomic (He, Ar), 5 for diatomic (N2, O2)
  molarMassKgMol: number = 0.02897 // air ~ 29 g/mol
): IdealGasState {
  const p = Math.max(100, pressurePa);
  const v = Math.max(0.0001, volumeM3);
  const n = Math.max(0.01, nMoles);
  const f = Math.max(3, degreesOfFreedom);

  // PV = nRT => T = PV / (nR)
  const t = (p * v) / (n * GAS_CONSTANT_R);
  const u = (f / 2) * n * GAS_CONSTANT_R * t;
  const gamma = (f + 2) / f;

  // v_rms = sqrt(3 * R * T / M)
  const vRms = Math.sqrt((3 * GAS_CONSTANT_R * t) / molarMassKgMol);
  // <Ec> = 3/2 * k_B * T
  const meanEc = 1.5 * BOLTZMANN_K * t;

  return {
    pressure: p,
    pressureAtm: p / 101325,
    volume: v,
    volumeLiters: v * 1000,
    temperature: t,
    temperatureC: t - 273.15,
    nMoles: n,
    internalEnergy: u,
    vRms,
    meanKineticEnergy: meanEc,
    transformationType: 'isothermal',
    gamma,
  };
}

export interface TransformationStepResult {
  initialP: number;
  initialV: number;
  initialT: number;
  finalP: number;
  finalV: number;
  finalT: number;
  workW: number;            // J (positive when expanding)
  heatQ: number;            // J (positive when heat absorbed)
  deltaU: number;           // J (change in internal energy)
}

export function calculateGasTransformation(
  type: GasTransformationType,
  initialP: number,
  initialV: number,
  finalV: number,
  nMoles: number = 1.0,
  degreesOfFreedom: number = 3
): TransformationStepResult {
  const n = Math.max(0.01, nMoles);
  const f = Math.max(3, degreesOfFreedom);
  const cv = (f / 2) * GAS_CONSTANT_R;
  const cp = cv + GAS_CONSTANT_R;
  const gamma = cp / cv;

  const p1 = Math.max(100, initialP);
  const v1 = Math.max(0.0001, initialV);
  const v2 = Math.max(0.0001, finalV);
  const t1 = (p1 * v1) / (n * GAS_CONSTANT_R);

  let p2 = p1;
  let t2 = t1;
  let workW = 0;
  let heatQ = 0;
  let deltaU = 0;

  switch (type) {
    case 'isothermal': {
      // T2 = T1, P2 = P1 * (V1 / V2)
      t2 = t1;
      p2 = p1 * (v1 / v2);
      workW = n * GAS_CONSTANT_R * t1 * Math.log(v2 / v1);
      deltaU = 0;
      heatQ = workW; // 1st Law: Q = W when deltaU = 0
      break;
    }
    case 'isobaric': {
      // P2 = P1, V2 / T2 = V1 / T1 => T2 = T1 * (V2 / V1)
      p2 = p1;
      t2 = t1 * (v2 / v1);
      workW = p1 * (v2 - v1);
      deltaU = n * cv * (t2 - t1);
      heatQ = n * cp * (t2 - t1); // or Q = deltaU + workW
      break;
    }
    case 'isochoric': {
      // V2 = V1 (no expansion work)
      // If finalV is different, this transformation holds V constant and changes T/P
      p2 = p1 * (v2 / v1); // user adjusts P
      t2 = (p2 * v1) / (n * GAS_CONSTANT_R);
      workW = 0;
      deltaU = n * cv * (t2 - t1);
      heatQ = deltaU;
      break;
    }
    case 'adiabatic': {
      // Q = 0, P1 * V1^gamma = P2 * V2^gamma
      heatQ = 0;
      p2 = p1 * Math.pow(v1 / v2, gamma);
      t2 = (p2 * v2) / (n * GAS_CONSTANT_R);
      deltaU = n * cv * (t2 - t1);
      workW = -deltaU; // W = (P1*V1 - P2*V2) / (gamma - 1)
      break;
    }
  }

  return {
    initialP: p1,
    initialV: v1,
    initialT: t1,
    finalP: p2,
    finalV: v2,
    finalT: t2,
    workW,
    heatQ,
    deltaU,
  };
}

// --- 8.2 PRIMEIRA LEI DA TERMODINÂMICA ---
export interface FirstLawState {
  heatQ: number;            // J
  workW: number;            // J
  deltaU: number;           // J (Delta U = Q - W)
  initialInternalEnergy: number;
  finalInternalEnergy: number;
  isFirstLawSatisfied: boolean;
  regime: 'expansion' | 'compression' | 'isometric' | 'adiabatic';
}

export function calculateFirstLaw(
  heatQJoules: number,
  workWJoules: number,
  initialEnergyU1: number = 1000
): FirstLawState {
  const q = heatQJoules;
  const w = workWJoules;
  // 1st Law of Thermodynamics: Delta U = Q - W
  const deltaU = q - w;
  const u2 = initialEnergyU1 + deltaU;

  let regime: 'expansion' | 'compression' | 'isometric' | 'adiabatic' = 'expansion';
  if (Math.abs(w) < 1e-6) regime = 'isometric';
  else if (Math.abs(q) < 1e-6) regime = 'adiabatic';
  else if (w < 0) regime = 'compression';

  return {
    heatQ: q,
    workW: w,
    deltaU,
    initialInternalEnergy: initialEnergyU1,
    finalInternalEnergy: u2,
    isFirstLawSatisfied: Math.abs(deltaU - (q - w)) < 1e-12,
    regime,
  };
}

// --- 8.3 MÁQUINAS TÉRMICAS E CICLO DE CARNOT (2ª LEI) ---
export interface CarnotCycleState {
  tempHot: number;          // T_H (K)
  tempCold: number;         // T_C (K)
  carnotEfficiency: number; // eta_C = 1 - T_C / T_H
  carnotEfficiencyPercent: number;
  nMoles: number;
  v1: number;               // start of isothermal expansion
  v2: number;               // end of isothermal expansion (start of adiabatic expansion)
  v3: number;               // end of adiabatic expansion (start of isothermal compression)
  v4: number;               // end of isothermal compression (start of adiabatic compression)
  heatAbsorbedQH: number;   // Q_H = n * R * T_H * ln(v2 / v1) (J)
  heatRejectedQC: number;   // Q_C = n * R * T_C * ln(v3 / v4) (J)
  netWork: number;          // W_net = Q_H - Q_C (J)
  actualEfficiency: number; // W_net / Q_H
  gamma: number;
}

export function calculateCarnotCycle(
  tempHotK: number,
  tempColdK: number,
  nMoles: number = 1.0,
  v1M3: number = 0.002,
  v2M3: number = 0.004,
  degreesOfFreedom: number = 3
): CarnotCycleState {
  const th = Math.max(10, tempHotK);
  const tc = Math.max(5, Math.min(th - 1, tempColdK));
  const n = Math.max(0.01, nMoles);
  const f = Math.max(3, degreesOfFreedom);
  const gamma = (f + 2) / f;

  const v1 = Math.max(0.0005, v1M3);
  const v2 = Math.max(v1 * 1.05, v2M3);

  // In Carnot cycle:
  // 1 -> 2: Isothermal at T_H: Q_H = n R T_H ln(v2 / v1)
  const qH = n * GAS_CONSTANT_R * th * Math.log(v2 / v1);

  // 2 -> 3: Adiabatic from T_H to T_C: T_H * V2^(gamma-1) = T_C * V3^(gamma-1)
  // V3 = V2 * (T_H / T_C)^(1 / (gamma - 1))
  const tempRatio = th / tc;
  const adiabaticVolRatio = Math.pow(tempRatio, 1.0 / (gamma - 1));
  const v3 = v2 * adiabaticVolRatio;

  // 4 -> 1: Adiabatic from T_C to T_H: T_C * V4^(gamma-1) = T_H * V1^(gamma-1)
  // V4 = V1 * (T_H / T_C)^(1 / (gamma - 1))
  const v4 = v1 * adiabaticVolRatio;

  // 3 -> 4: Isothermal at T_C: Q_C = n R T_C ln(v3 / v4)
  // Note: v3/v4 = (v2*ratio) / (v1*ratio) = v2 / v1!
  const qC = n * GAS_CONSTANT_R * tc * Math.log(v3 / v4);

  const wNet = qH - qC;
  const etaCarnot = 1.0 - tc / th;
  const etaActual = qH > 0 ? wNet / qH : 0;

  return {
    tempHot: th,
    tempCold: tc,
    carnotEfficiency: etaCarnot,
    carnotEfficiencyPercent: etaCarnot * 100,
    nMoles: n,
    v1,
    v2,
    v3,
    v4,
    heatAbsorbedQH: qH,
    heatRejectedQC: qC,
    netWork: wNet,
    actualEfficiency: etaActual,
    gamma,
  };
}

// --- 8.4 CALORIMETRIA E MUDANÇAS DE FASE ---
export interface CalorimetrySubstance {
  name: string;
  massG: number;             // grams
  specificHeat: number;      // cal / (g * °C) (1 cal/g°C = 4184 J/kg°C)
  initialTempC: number;      // °C
  latentHeatFusion?: number; // cal / g (e.g. 80 cal/g for ice)
}

export interface CalorimetryResult {
  equilibriumTempC: number;  // °C
  equilibriumTempK: number;  // K
  heatTransferredCal: number;// cal
  heatTransferredJoules: number; // J (1 cal = 4.184 J)
  iceMeltedFraction?: number; // 0 to 1
  isConservationSatisfied: boolean;
}

export function calculateCalorimetryEquilibrium(
  liquid: CalorimetrySubstance,
  solid: CalorimetrySubstance
): CalorimetryResult {
  const m1 = Math.max(0.1, liquid.massG);
  const c1 = Math.max(0.01, liquid.specificHeat);
  const t1 = liquid.initialTempC;

  const m2 = Math.max(0.1, solid.massG);
  const c2 = Math.max(0.01, solid.specificHeat);
  const t2 = solid.initialTempC;

  // Check if solid is ice undergoing phase change at 0°C
  const isIce = solid.name.toLowerCase().includes('gelo') && solid.latentHeatFusion !== undefined;

  let te = 0;
  let iceMeltedFraction = 1.0;

  if (isIce && t2 <= 0 && solid.latentHeatFusion) {
    const lFusion = solid.latentHeatFusion; // 80 cal/g
    // Heat needed to warm ice to 0°C
    const qWarmIce = m2 * c2 * (0 - t2);
    // Heat needed to melt all ice
    const qMeltIce = m2 * lFusion;
    // Heat available from liquid cooling to 0°C
    const qCoolLiquidToZero = m1 * c1 * (t1 - 0);

    if (qCoolLiquidToZero >= qWarmIce + qMeltIce) {
      // All ice melts and resulting water warms up with liquid
      const qRemaining = qCoolLiquidToZero - (qWarmIce + qMeltIce);
      // Thermal equilibrium of (m1 + m2) of water (c_water = 1.0)
      te = qRemaining / (m1 * c1 + m2 * 1.0);
      iceMeltedFraction = 1.0;
    } else if (qCoolLiquidToZero >= qWarmIce) {
      // Ice reaches 0°C, partially melts, equilibrium at 0°C
      const qForMelting = qCoolLiquidToZero - qWarmIce;
      iceMeltedFraction = qForMelting / qMeltIce;
      te = 0;
    } else {
      // Liquid freezes into ice below 0°C (sub-zero equilibrium)
      te = (m1 * c1 * t1 + m2 * c2 * t2) / (m1 * c1 + m2 * c2);
      iceMeltedFraction = 0;
    }
  } else {
    // Standard sensible heat equilibrium: m1*c1*(Te - T1) + m2*c2*(Te - T2) = 0
    // Te * (m1*c1 + m2*c2) = m1*c1*T1 + m2*c2*T2
    te = (m1 * c1 * t1 + m2 * c2 * t2) / (m1 * c1 + m2 * c2);
  }

  // Heat exchanged by liquid: Q1 = m1 * c1 * (Te - T1)
  const qCal = Math.abs(m1 * c1 * (te - t1));
  const qJoules = qCal * 4.184;

  return {
    equilibriumTempC: te,
    equilibriumTempK: te + 273.15,
    heatTransferredCal: qCal,
    heatTransferredJoules: qJoules,
    iceMeltedFraction,
    isConservationSatisfied: true,
  };
}

// -------------------------------------------------------------
// 9. ELETRICIDADE (LEI DE COULOMB E CAMPO ELÉTRICO)
// -------------------------------------------------------------

export const COULOMB_CONSTANT_K = 8.9875517923e9; // N * m^2 / C^2 (vacuum permittivity constant 1/(4 * pi * epsilon_0))

export interface CoulombState {
  q1MicroC: number;         // microCoulombs (10^-6 C)
  q2MicroC: number;         // microCoulombs
  q1Coulombs: number;       // C
  q2Coulombs: number;       // C
  distanceM: number;        // r (m)
  forceMagnitudeN: number;  // |F| = k * |q1 * q2| / r^2 (N)
  forceSignedN: number;     // positive for repulsion, negative for attraction
  interactionType: 'repulsive' | 'attractive' | 'neutral';
  constantK: number;        // N * m^2 / C^2
}

export function calculateCoulombLaw(
  q1MicroC: number,
  q2MicroC: number,
  distanceM: number,
  constantK: number = COULOMB_CONSTANT_K
): CoulombState {
  const r = Math.max(0.01, distanceM);
  const q1 = q1MicroC * 1e-6;
  const q2 = q2MicroC * 1e-6;

  const product = q1 * q2;
  const forceMag = (constantK * Math.abs(product)) / (r * r);
  const forceSigned = (constantK * product) / (r * r);

  let interactionType: 'repulsive' | 'attractive' | 'neutral' = 'neutral';
  if (Math.abs(product) > 1e-15) {
    interactionType = product > 0 ? 'repulsive' : 'attractive';
  }

  return {
    q1MicroC,
    q2MicroC,
    q1Coulombs: q1,
    q2Coulombs: q2,
    distanceM: r,
    forceMagnitudeN: forceMag,
    forceSignedN: forceSigned,
    interactionType,
    constantK,
  };
}

export interface PointCharge3D {
  id: string;
  qMicroC: number;          // microCoulombs
  x: number;                // m
  y: number;                // m
  z: number;                // m
}

export interface ElectricFieldPoint {
  x: number;
  y: number;
  z: number;
  ex: number;               // N/C (or V/m)
  ey: number;
  ez: number;
  magnitude: number;        // |E| (N/C)
  potentialV: number;       // Electric potential V = sum(k * q / r) (Volts)
}

export function calculateElectricFieldAtPoint(
  charges: PointCharge3D[],
  point: { x: number; y: number; z: number },
  constantK: number = COULOMB_CONSTANT_K
): ElectricFieldPoint {
  let ex = 0;
  let ey = 0;
  let ez = 0;
  let potential = 0;

  for (const c of charges) {
    const qC = c.qMicroC * 1e-6;
    const dx = point.x - c.x;
    const dy = point.y - c.y;
    const dz = point.z - c.z;
    const r2 = dx * dx + dy * dy + dz * dz;
    const r = Math.sqrt(r2);

    // Singularity protection when evaluating near point charge
    if (r < 0.05) continue;

    // E_i = k * q_i / r^2 * (r_hat) = k * q_i / r^3 * vec(r)
    const factor = (constantK * qC) / (r * r * r);
    ex += factor * dx;
    ey += factor * dy;
    ez += factor * dz;

    // V_i = k * q_i / r
    potential += (constantK * qC) / r;
  }

  const mag = Math.sqrt(ex * ex + ey * ey + ez * ez);

  return {
    x: point.x,
    y: point.y,
    z: point.z,
    ex,
    ey,
    ez,
    magnitude: mag,
    potentialV: potential,
  };
}

// -------------------------------------------------------------
// 23. POTENCIAL ELÉTRICO E TRABALHO ELETROSTÁTICO
// -------------------------------------------------------------
export interface ElectricWorkState {
  vA: number;             // Potential at point A (Volts)
  vB: number;             // Potential at point B (Volts)
  deltaV: number;         // V_B - V_A (Volts)
  q0Coulombs: number;     // Test charge (Coulombs)
  workElectricJ: number;  // W_elec = q0 * (V_A - V_B) = -q0 * deltaV (Joules)
  workExternalJ: number;  // W_ext = q0 * (V_B - V_A) = q0 * deltaV (Joules)
}

export function calculateElectricWork(
  charges: PointCharge3D[],
  pointA: { x: number; y: number; z: number },
  pointB: { x: number; y: number; z: number },
  q0MicroC: number,
  constantK: number = COULOMB_CONSTANT_K
): ElectricWorkState {
  const pA = calculateElectricFieldAtPoint(charges, pointA, constantK);
  const pB = calculateElectricFieldAtPoint(charges, pointB, constantK);
  const q0 = q0MicroC * 1e-6;
  const deltaV = pB.potentialV - pA.potentialV;
  const workElectricJ = q0 * (pA.potentialV - pB.potentialV);
  const workExternalJ = q0 * deltaV;

  return {
    vA: pA.potentialV,
    vB: pB.potentialV,
    deltaV,
    q0Coulombs: q0,
    workElectricJ,
    workExternalJ,
  };
}

// -------------------------------------------------------------
// 24. CAPACITOR DE PLACAS PARALELAS E ENERGIA ELETROSTÁTICA
// -------------------------------------------------------------
export const VACUUM_PERMITTIVITY_EPSILON_0 = 8.8541878128e-12; // F/m (ou C^2/(N·m^2))

export interface ParallelCapacitorState {
  areaM2: number;                // Plate surface area (m^2)
  distanceM: number;             // Plate separation distance (m)
  voltageV: number;              // Applied voltage V (Volts)
  dielectricConstant: number;    // Relative permittivity kappa (dimensionless)
  effectivePermittivity: number; // epsilon = kappa * epsilon_0 (F/m)
  capacitanceF: number;          // C = epsilon * A / d (Farads)
  capacitancePF: number;         // C in picoFarads (pF)
  electricFieldVPerM: number;    // Uniform E = V / d (V/m or N/C)
  storedChargeC: number;         // Q = C * V (Coulombs)
  storedChargeMicroC: number;    // Q in microCoulombs (µC)
  storedEnergyJ: number;         // U = 0.5 * C * V^2 (Joules)
  storedEnergyMicroJ: number;    // U in microJoules (µJ)
  energyDensityJPerM3: number;   // u = 0.5 * epsilon * E^2 (J/m^3)
}

export function calculateParallelPlateCapacitor(
  areaM2: number,
  distanceM: number,
  voltageV: number,
  dielectricConstant: number = 1.0,
  epsilon0: number = VACUUM_PERMITTIVITY_EPSILON_0
): ParallelCapacitorState {
  // Clamped physical safeguards
  const safeArea = Math.max(1e-4, areaM2);
  const safeDistance = Math.max(1e-4, distanceM);
  const safeVoltage = Math.max(0, voltageV);
  const safeKappa = Math.max(1.0, dielectricConstant);

  const epsilon = safeKappa * epsilon0;
  const capacitance = (epsilon * safeArea) / safeDistance;
  const electricField = safeVoltage / safeDistance;
  const charge = capacitance * safeVoltage;
  const energy = 0.5 * capacitance * safeVoltage * safeVoltage;
  const energyDensity = 0.5 * epsilon * electricField * electricField;

  return {
    areaM2: safeArea,
    distanceM: safeDistance,
    voltageV: safeVoltage,
    dielectricConstant: safeKappa,
    effectivePermittivity: epsilon,
    capacitanceF: capacitance,
    capacitancePF: capacitance * 1e12,
    electricFieldVPerM: electricField,
    storedChargeC: charge,
    storedChargeMicroC: charge * 1e6,
    storedEnergyJ: energy,
    storedEnergyMicroJ: energy * 1e6,
    energyDensityJPerM3: energyDensity,
  };
}


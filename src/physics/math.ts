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

  // Exact nonlinear period using Complete Elliptic Integral of the first kind K(m):
  // T_exact = 4 * sqrt(L/g) * K(sin^2(theta0 / 2))
  const sinHalf = Math.sin(Math.abs(theta0) / 2.0);
  const mElliptic = sinHalf * sinHalf;
  const periodExact = (mElliptic < 1.0)
    ? 4.0 * Math.sqrt(L / g) * completeEllipticK(mElliptic)
    : Infinity;

  // Small-angle approximation: T0 = 2*pi*sqrt(L/g)
  const periodApprox = 2.0 * Math.PI * Math.sqrt(L / g);

  // Borda's Taylor series correction: T0 * (1 + (1/16)*theta0^2 + (11/3072)*theta0^4)
  const th0 = Math.abs(theta0);
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

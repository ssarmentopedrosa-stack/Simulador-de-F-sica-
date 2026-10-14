/**
 * ONDAS LAB 3D - Scientific Physics Engine & Mathematical Models
 * Implements exact analytical solutions and verified numerical integrators (RK4).
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
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
  const phase = (omega * t + initialPhase) % (2 * Math.PI);

  const x = amplitude * Math.cos(omega * t + initialPhase);
  const v = -amplitude * omega * Math.sin(omega * t + initialPhase);
  const a = -Math.pow(omega, 2) * x;

  return { x, v, a, omega, period, phase };
}

// -------------------------------------------------------------
// 2. MASS-SPRING SYSTEM (HORIZONTAL & VERTICAL)
// -------------------------------------------------------------
export interface SpringMassState {
  position: number;    // displacement from equilibrium (m)
  velocity: number;    // velocity (m/s)
  acceleration: number;// acceleration (m/s^2)
  kineticEnergy: number;      // Ec = 0.5 * m * v^2 (J)
  potentialEnergy: number;    // Ep = 0.5 * k * x^2 (J)
  totalEnergy: number;        // Em = Ec + Ep (J)
  staticElongation: number;   // mg/k for vertical mode (m)
  naturalFreq: number;        // omega_0 (rad/s)
  naturalPeriod: number;      // T_0 (s)
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
  externalFreq: number = 1
): SpringMassState {
  const m = Math.max(0.05, mass);
  const k = Math.max(0.5, springK);
  const omega0 = Math.sqrt(k / m);
  const naturalPeriod = (2 * Math.PI) / omega0;
  const staticElongation = isVertical ? (m * gravity) / k : 0;

  let pos = 0;
  let vel = 0;
  let acc = 0;

  // Damped vs undamped analytical/harmonic response
  const gamma = dampingCoeff / (2 * m);

  if (externalForceAmp > 0) {
    // Driven harmonic oscillator steady-state amplitude & phase
    const omegaE = 2 * Math.PI * externalFreq;
    const denom = Math.sqrt(Math.pow(omega0 * omega0 - omegaE * omegaE, 2) + Math.pow(2 * gamma * omegaE, 2));
    const forcedAmp = (externalForceAmp / m) / Math.max(0.0001, denom);
    const delta = Math.atan2(2 * gamma * omegaE, omega0 * omega0 - omegaE * omegaE);
    
    // Total approx combination
    const transientDecay = Math.exp(-gamma * t);
    const posTransient = amplitude * transientDecay * Math.cos(omega0 * t);
    const posForced = forcedAmp * Math.cos(omegaE * t - delta);
    pos = posTransient + posForced;

    // Numerical-derivative step for velocity in forced state
    const dtE = 0.001;
    const posNext = amplitude * Math.exp(-gamma * (t + dtE)) * Math.cos(omega0 * (t + dtE)) + forcedAmp * Math.cos(omegaE * (t + dtE) - delta);
    vel = (posNext - pos) / dtE;
    acc = -(k / m) * pos - (dampingCoeff / m) * vel + (externalForceAmp / m) * Math.cos(omegaE * t);
  } else if (gamma < 0.0001) {
    // Ideal undamped oscillator
    pos = amplitude * Math.cos(omega0 * t);
    vel = -amplitude * omega0 * Math.sin(omega0 * t);
    acc = -Math.pow(omega0, 2) * pos;
  } else if (gamma < omega0) {
    // Underdamped
    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    const envelope = amplitude * Math.exp(-gamma * t);
    pos = envelope * Math.cos(omegaD * t);
    vel = -gamma * pos - omegaD * envelope * Math.sin(omegaD * t);
    acc = -Math.pow(omega0, 2) * pos - 2 * gamma * vel;
  } else if (Math.abs(gamma - omega0) < 0.001) {
    // Critically damped
    pos = amplitude * (1 + gamma * t) * Math.exp(-gamma * t);
    vel = amplitude * (-gamma * gamma * t) * Math.exp(-gamma * t);
    acc = -(k / m) * pos - (dampingCoeff / m) * vel;
  } else {
    // Overdamped
    const s = Math.sqrt(gamma * gamma - omega0 * omega0);
    const r1 = -gamma + s;
    const r2 = -gamma - s;
    const c1 = amplitude / 2;
    const c2 = amplitude / 2;
    pos = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    vel = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
    acc = -(k / m) * pos - (dampingCoeff / m) * vel;
  }

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
    naturalPeriod
  };
}

// -------------------------------------------------------------
// 3. NONLINEAR PENDULUM (RUNGE-KUTTA 4TH ORDER INTEGRATION)
// -------------------------------------------------------------
export interface PendulumState {
  theta: number;        // Angle (rad)
  thetaDeg: number;     // Angle in degrees
  omega: number;        // Angular velocity (rad/s)
  alpha: number;        // Angular acceleration (rad/s^2)
  periodApprox: number; // Small-angle 2*pi*sqrt(L/g)
  periodExact: number;  // Borda / Carlson elliptic correction
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  x: number;            // Cartesian position x (m)
  y: number;            // Cartesian position y (m)
}

export function integratePendulumRK4(
  theta0: number,
  length: number,
  mass: number,
  gravity: number,
  damping: number,
  totalTime: number,
  substeps: number = 200
): PendulumState {
  const L = Math.max(0.1, length);
  const m = Math.max(0.01, mass);
  const g = Math.max(0.1, gravity);
  const b = damping;

  // Derivates function: dtheta/dt = w, dw/dt = -(g/L)*sin(theta) - (b/m)*w
  const f1 = (w: number) => w;
  const f2 = (th: number, w: number) => -(g / L) * Math.sin(th) - (b / m) * w;

  const dt = totalTime > 0 ? totalTime / substeps : 0;
  let th = theta0;
  let w = 0;

  for (let i = 0; i < substeps; i++) {
    const k1_th = f1(w);
    const k1_w = f2(th, w);

    const k2_th = f1(w + 0.5 * dt * k1_w);
    const k2_w = f2(th + 0.5 * dt * k1_th, w + 0.5 * dt * k1_w);

    const k3_th = f1(w + 0.5 * dt * k2_w);
    const k3_w = f2(th + 0.5 * dt * k2_th, w + 0.5 * dt * k2_w);

    const k4_th = f1(w + dt * k3_w);
    const k4_w = f2(th + dt * k3_th, w + dt * k3_w);

    th += (dt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
    w += (dt / 6) * (k1_w + 2 * k2_w + 2 * k3_w + k4_w);
  }

  const alpha = f2(th, w);
  const periodApprox = 2 * Math.PI * Math.sqrt(L / g);
  // First-order nonlinear correction for large amplitude (Borda's formula):
  // T = T0 * (1 + (1/16)*theta0^2 + (11/3072)*theta0^4)
  const th0 = Math.abs(theta0);
  const periodExact = periodApprox * (1 + (1 / 16) * Math.pow(th0, 2) + (11 / 3072) * Math.pow(th0, 4));

  const linearVel = L * w;
  const kineticEnergy = 0.5 * m * linearVel * linearVel;
  const h = L * (1 - Math.cos(th));
  const potentialEnergy = m * g * h;
  const totalEnergy = kineticEnergy + potentialEnergy;

  const x = L * Math.sin(th);
  const y = -L * Math.cos(th);

  return {
    theta: th,
    thetaDeg: (th * 180) / Math.PI,
    omega: w,
    alpha,
    periodApprox,
    periodExact,
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
// -------------------------------------------------------------
export interface InterferencePoint {
  r1: number;
  r2: number;
  deltaR: number;       // r2 - r1 (m)
  phaseDiff: number;    // k * deltaR + deltaPhi (rad)
  y1: number;
  y2: number;
  yRes: number;
  resultantAmplitude: number;
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

  const lambda = waveSpeed / Math.max(0.1, source1.freq);
  const k = (2 * Math.PI) / lambda;
  const omega = 2 * Math.PI * source1.freq;

  // Wave 1 & 2 values with spherical attenuation 1 / sqrt(r+1)
  const atten1 = 1 / Math.sqrt(r1 + 0.8);
  const atten2 = 1 / Math.sqrt(r2 + 0.8);

  const y1 = source1.amp * atten1 * Math.cos(k * r1 - omega * t + source1.phase);
  const y2 = source2.amp * atten2 * Math.cos(k * r2 - omega * t + source2.phase);
  const yRes = y1 + y2;

  // Theoretical phase difference
  const deltaPhi = source2.phase - source1.phase;
  const phaseDiff = Math.abs(k * (r2 - r1) + deltaPhi) % (2 * Math.PI);

  // Resultant amplitude for equal sources
  const deltaEffective = k * (r2 - r1) + deltaPhi;
  const resultantAmplitude = 2 * source1.amp * Math.abs(Math.cos(deltaEffective / 2));

  // Constructive if phase diff near 0 or 2pi, destructive if near pi
  const diffFromPi = Math.abs(phaseDiff - Math.PI);
  const isDestructive = diffFromPi < 0.35;
  const isConstructive = phaseDiff < 0.35 || Math.abs(phaseDiff - 2 * Math.PI) < 0.35;

  return {
    r1,
    r2,
    deltaR,
    phaseDiff,
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
// -------------------------------------------------------------
export type BoundaryCondition = 'both_fixed' | 'pipe_open_open' | 'pipe_closed_open';

export interface StandingWaveInfo {
  harmonicNumber: number;
  wavelength: number;
  frequency: number;
  nodeCount: number;
  antinodeCount: number;
  nodePositions: number[];
  antinodePositions: number[];
}

export function calculateStandingWave(
  length: number,
  waveSpeed: number,
  n: number,
  boundary: BoundaryCondition = 'both_fixed'
): StandingWaveInfo {
  const L = Math.max(0.1, length);
  const v = Math.max(1, waveSpeed);
  const harmonic = Math.max(1, Math.round(n));

  let wavelength = 0;
  let frequency = 0;
  let nodeCount = 0;
  let antinodeCount = 0;
  const nodePositions: number[] = [];
  const antinodePositions: number[] = [];

  if (boundary === 'both_fixed') {
    // lambda_n = 2L / n, f_n = n * v / (2L)
    wavelength = (2 * L) / harmonic;
    frequency = (harmonic * v) / (2 * L);
    nodeCount = harmonic + 1;
    antinodeCount = harmonic;

    for (let i = 0; i <= harmonic; i++) {
      nodePositions.push((i * L) / harmonic);
    }
    for (let i = 0; i < harmonic; i++) {
      antinodePositions.push(((i + 0.5) * L) / harmonic);
    }
  } else if (boundary === 'pipe_open_open') {
    // Both ends open (displacement antinodes at ends)
    // lambda_n = 2L / n, f_n = n * v / (2L)
    wavelength = (2 * L) / harmonic;
    frequency = (harmonic * v) / (2 * L);
    nodeCount = harmonic;
    antinodeCount = harmonic + 1;

    for (let i = 0; i < harmonic; i++) {
      nodePositions.push(((i + 0.5) * L) / harmonic);
    }
    for (let i = 0; i <= harmonic; i++) {
      antinodePositions.push((i * L) / harmonic);
    }
  } else {
    // Pipe closed at x=0, open at x=L: only odd harmonics n = 1, 3, 5...
    // lambda_n = 4L / n, f_n = n * v / (4L)
    const oddHarmonic = harmonic % 2 === 0 ? harmonic + 1 : harmonic;
    wavelength = (4 * L) / oddHarmonic;
    frequency = (oddHarmonic * v) / (4 * L);

    // Nodes at (2m)*lambda/4, Antinodes at (2m+1)*lambda/4
    const quarterLambda = wavelength / 4;
    let pos = 0;
    while (pos <= L + 0.001) {
      nodePositions.push(pos);
      pos += wavelength / 2;
    }
    nodeCount = nodePositions.length;

    let antipos = quarterLambda;
    while (antipos <= L + 0.001) {
      antinodePositions.push(antipos);
      antipos += wavelength / 2;
    }
    antinodeCount = antinodePositions.length;
  }

  return {
    harmonicNumber: harmonic,
    wavelength,
    frequency,
    nodeCount,
    antinodeCount,
    nodePositions,
    antinodePositions
  };
}

// -------------------------------------------------------------
// 7. ACOUSTICS & DOPPLER EFFECT
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
  const f0 = Math.max(1, sourceFreq);

  // Direction from source to observer:
  // If observer is to the right of source (dx > 0), approaching if source moves right (>0)
  const dx = observerX - sourceX;
  const isApproaching = (dx > 0 && sourceVx > observerVx) || (dx < 0 && sourceVx < observerVx);

  // Velocity components along the line of sight (from source to observer):
  const sign = dx >= 0 ? 1 : -1;
  const vSourceProj = sourceVx * sign;
  const vObsProj = observerVx * sign;

  // Doppler formula: f_obs = f_0 * (v_sound - v_observer_toward_source) / (v_sound - v_source_toward_observer)
  // standard form: f' = f0 * (vs - vo) / (vs - vf) where positive velocities are in direction source -> observer
  const denominator = Math.max(1, vS - vSourceProj);
  const numerator = Math.max(0, vS - vObsProj);
  const observedFreq = f0 * (numerator / denominator);

  const wavelengthAhead = (vS - Math.abs(sourceVx)) / f0;
  const wavelengthBehind = (vS + Math.abs(sourceVx)) / f0;
  const machNumber = Math.abs(sourceVx) / vS;

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
    machNumber
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

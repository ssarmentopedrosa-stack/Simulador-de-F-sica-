/**
 * ONDAS LAB 3D - Utilitários de Medição Física 3D (Régua e Sonda de Inspeção)
 * Funções puras e exatas para cálculo de distância euclidiana, espaçamento de harmônicos (λ/2)
 * e avaliação pontual de grandezas físicas (potencial, campo e amplitude).
 */

import { BoundaryCondition, calculateStandingWave, COULOMB_CONSTANT_K } from './math';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface DistanceMeasurement {
  distance: number;
  dx: number;
  dy: number;
  dz: number;
  formattedDistance: string;
}

/**
 * Calcula a distância euclidiana tridimensional exata entre dois pontos e suas projeções cartesianas.
 */
export function calculateDistance3D(p1: Point3D, p2: Point3D): DistanceMeasurement {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const dz = Math.abs(p2.z - p1.z);
  const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);

  return {
    distance,
    dx,
    dy,
    dz,
    formattedDistance: `${distance.toFixed(3).replace('.', ',')} m`,
  };
}

export interface StandingWaveMeasurement {
  wavelength: number;
  nodeToNodeDistance: number;       // d = λ / 2
  antinodeToAntinodeDistance: number; // d = λ / 2
  nodeToAntinodeDistance: number;   // d = λ / 4
  nodePositions: number[];
  antinodePositions: number[];
}

/**
 * Calcula a geometria espacial de nós e ventres em ondas estacionárias.
 * Comprova que a distância entre nós consecutivos e entre ventres consecutivos é exatamente λ/2.
 */
export function calculateStandingWaveSpacing(
  length: number,
  waveSpeed: number,
  harmonic: number,
  boundary: BoundaryCondition = 'both_fixed'
): StandingWaveMeasurement {
  const waveInfo = calculateStandingWave(length, waveSpeed, harmonic, boundary);
  const lambda = waveInfo.wavelength;
  const halfLambda = lambda / 2.0;
  const quarterLambda = lambda / 4.0;

  return {
    wavelength: lambda,
    nodeToNodeDistance: halfLambda,
    antinodeToAntinodeDistance: halfLambda,
    nodeToAntinodeDistance: quarterLambda,
    nodePositions: waveInfo.nodePositions,
    antinodePositions: waveInfo.antinodePositions,
  };
}

export interface StandingWaveProbeResult {
  x: number;
  t: number;
  displacement: number;
  envelopeAmplitude: number;
  isNode: boolean;
  isAntinode: boolean;
  distanceToNearestNode: number;
  distanceToNearestAntinode: number;
}

/**
 * Sonda de inspeção pontual para onda estacionária:
 * Avalia o deslocamento instantâneo y(x,t) e a envoltória 2A·sin(kx) na coordenada x.
 */
export function probeStandingWaveAt(
  x: number,
  t: number,
  length: number,
  waveSpeed: number,
  harmonic: number,
  boundary: BoundaryCondition = 'both_fixed',
  amplitude: number = 0.7
): StandingWaveProbeResult {
  const waveInfo = calculateStandingWave(length, waveSpeed, harmonic, boundary);
  const L = Math.max(0.1, length);
  const clampedX = Math.max(0, Math.min(L, x));
  const k = (2 * Math.PI) / waveInfo.wavelength;
  const omega = 2 * Math.PI * waveInfo.frequency;

  let envelope = 0;
  let displacement = 0;

  if (boundary === 'both_fixed') {
    // Nós nas pontas: y(x,t) = 2A * sen(kx) * cos(omega*t)
    envelope = 2 * amplitude * Math.abs(Math.sin(k * clampedX));
    displacement = 2 * amplitude * Math.sin(k * clampedX) * Math.cos(omega * t);
  } else if (boundary === 'pipe_open_open') {
    // Ventres nas pontas: y(x,t) = 2A * cos(kx) * cos(omega*t)
    envelope = 2 * amplitude * Math.abs(Math.cos(k * clampedX));
    displacement = 2 * amplitude * Math.cos(k * clampedX) * Math.cos(omega * t);
  } else {
    // Fechado em x=0 (nó), aberto em x=L (ventre)
    envelope = 2 * amplitude * Math.abs(Math.sin(k * clampedX));
    displacement = 2 * amplitude * Math.sin(k * clampedX) * Math.cos(omega * t);
  }

  // Encontrar nó e ventre mais próximos
  let minNodeDist = Infinity;
  for (const nPos of waveInfo.nodePositions) {
    const dist = Math.abs(clampedX - nPos);
    if (dist < minNodeDist) minNodeDist = dist;
  }

  let minAntinodeDist = Infinity;
  for (const aPos of waveInfo.antinodePositions) {
    const dist = Math.abs(clampedX - aPos);
    if (dist < minAntinodeDist) minAntinodeDist = dist;
  }

  const isNode = minNodeDist < 0.05 * (L / harmonic);
  const isAntinode = minAntinodeDist < 0.05 * (L / harmonic);

  return {
    x: clampedX,
    t,
    displacement,
    envelopeAmplitude: envelope,
    isNode,
    isAntinode,
    distanceToNearestNode: minNodeDist,
    distanceToNearestAntinode: minAntinodeDist,
  };
}

export interface ElectricPointProbeResult {
  potential: number;        // V (Volts)
  fieldMagnitude: number;   // |E| (V/m)
  fieldVector: Point3D;     // (Ex, Ey, Ez)
}

/**
 * Sonda de inspeção de potencial e campo elétrico para distribuição de cargas pontuais.
 */
export function probeElectricFieldAndPotential(
  probePoint: Point3D,
  charges: { q: number; x: number; y: number; z: number }[],
  k_e: number = COULOMB_CONSTANT_K
): ElectricPointProbeResult {
  let totalV = 0;
  let ex = 0;
  let ey = 0;
  let ez = 0;

  for (const c of charges) {
    const rx = probePoint.x - c.x;
    const ry = probePoint.y - c.y;
    const rz = probePoint.z - c.z;
    const r = Math.hypot(rx, ry, rz);
    const rEff = Math.max(0.05, r); // Evita singularidade numérica na origem da carga

    // Potencial V = k * q / r
    totalV += (k_e * c.q) / rEff;

    // Campo E = k * q * r_vec / r^3
    const factor = (k_e * c.q) / (rEff * rEff * rEff);
    ex += factor * rx;
    ey += factor * ry;
    ez += factor * rz;
  }

  const fieldMag = Math.hypot(ex, ey, ez);

  return {
    potential: totalV,
    fieldMagnitude: fieldMag,
    fieldVector: { x: ex, y: ey, z: ez },
  };
}

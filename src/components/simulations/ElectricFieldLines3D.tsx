import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateElectricFieldAtPoint, PointCharge3D, COULOMB_CONSTANT_K, ElectricFieldPoint } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Zap, Compass, ShieldCheck, Target, Crosshair } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface ElectricFieldLines3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

type ConfigurationPreset = 'dipole' | 'repulsion' | 'single_positive' | 'single_negative' | 'asymmetric';

export const ElectricFieldLines3D: React.FC<ElectricFieldLines3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Configuration and Physical Parameters
  const [mode, setMode] = useState<'two_charges' | 'single_charge'>(
    () => (initialParams?.mode as 'two_charges' | 'single_charge') || 'two_charges'
  );
  const [q1MicroC, setQ1MicroC] = useState<number>(
    () => (initialParams?.q1MicroC != null ? Number(initialParams.q1MicroC) : 4.0)
  );
  const [q2MicroC, setQ2MicroC] = useState<number>(
    () => (initialParams?.q2MicroC != null ? Number(initialParams.q2MicroC) : -4.0)
  );
  const [separationM, setSeparationM] = useState<number>(
    () => (initialParams?.separationM != null ? Number(initialParams.separationM) : 0.9)
  );
  const [lineDensity, setLineDensity] = useState<number>(
    () => (initialParams?.lineDensity != null ? Number(initialParams.lineDensity) : 18)
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: string | Record<string, any>) => {
    if (typeof p === 'string') {
      switch (p) {
        case 'dipole':
          setMode('two_charges');
          setQ1MicroC(4.0);
          setQ2MicroC(-4.0);
          setSeparationM(0.9);
          setProbeX(0.0);
          setProbeY(0.4);
          setProbeZ(0.0);
          break;
        case 'repulsion':
          setMode('two_charges');
          setQ1MicroC(4.0);
          setQ2MicroC(4.0);
          setSeparationM(1.0);
          setProbeX(0.0);
          setProbeY(0.2);
          setProbeZ(0.0);
          break;
        case 'single_positive':
          setMode('single_charge');
          setQ1MicroC(5.0);
          setProbeX(0.6);
          setProbeY(0.3);
          setProbeZ(0.0);
          break;
        case 'single_negative':
          setMode('single_charge');
          setQ1MicroC(-5.0);
          setProbeX(0.6);
          setProbeY(0.3);
          setProbeZ(0.0);
          break;
        case 'asymmetric':
          setMode('two_charges');
          setQ1MicroC(6.0);
          setQ2MicroC(-2.0);
          setSeparationM(1.1);
          setProbeX(0.2);
          setProbeY(0.35);
          setProbeZ(0.0);
          break;
      }
      return;
    }
    if (p.mode !== undefined) setMode(p.mode);
    if (p.q1MicroC !== undefined) setQ1MicroC(Number(p.q1MicroC));
    if (p.q2MicroC !== undefined) setQ2MicroC(Number(p.q2MicroC));
    if (p.separationM !== undefined) setSeparationM(Number(p.separationM));
    if (p.lineDensity !== undefined) setLineDensity(Number(p.lineDensity));
  }, []);

  useEffect(() => {
    onParamsChange?.({ mode, q1MicroC, q2MicroC, separationM, lineDensity });
  }, [mode, q1MicroC, q2MicroC, separationM, lineDensity, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.mode !== undefined) setMode(initialParams.mode);
      if (initialParams.q1MicroC !== undefined) setQ1MicroC(Number(initialParams.q1MicroC));
      if (initialParams.q2MicroC !== undefined) setQ2MicroC(Number(initialParams.q2MicroC));
      if (initialParams.separationM !== undefined) setSeparationM(Number(initialParams.separationM));
      if (initialParams.lineDensity !== undefined) setLineDensity(Number(initialParams.lineDensity));
    }
  }, [initialParams]);

  // Probe / Sensor Position
  const [probeX, setProbeX] = useState<number>(0.0);
  const [probeY, setProbeY] = useState<number>(0.35);
  const [probeZ, setProbeZ] = useState<number>(0.0);

  // Simulation Clock
  const [clock, setClock] = useState<SimulationClock>({
    time: 0,
    dt: 0.016,
    speed: 1.0,
    isRunning: true,
    is2DView: false,
    showVectors: true,
    showTrajectories: true,
    showFormulas: true,
    showGraphs: true,
  });

  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);

  // Charges array based on configuration
  const charges: PointCharge3D[] = useMemo(() => {
    if (mode === 'single_charge') {
      return [
        {
          id: 'q1',
          qMicroC: q1MicroC,
          x: 0,
          y: 0,
          z: 0,
        },
      ];
    }
    const halfD = separationM / 2;
    return [
      {
        id: 'q1',
        qMicroC: q1MicroC,
        x: -halfD,
        y: 0,
        z: 0,
      },
      {
        id: 'q2',
        qMicroC: q2MicroC,
        x: halfD,
        y: 0,
        z: 0,
      },
    ];
  }, [mode, q1MicroC, q2MicroC, separationM]);

  // Evaluated Field at Sensor Probe Position
  const probeField: ElectricFieldPoint = useMemo(() => {
    return calculateElectricFieldAtPoint(charges, { x: probeX, y: probeY, z: probeZ }, COULOMB_CONSTANT_K);
  }, [charges, probeX, probeY, probeZ]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 3D Objects
  const linesGroupRef = useRef<THREE.Group | null>(null);
  const chargesGroupRef = useRef<THREE.Group | null>(null);
  const probeGroupRef = useRef<THREE.Group | null>(null);
  const probeArrowRef = useRef<THREE.ArrowHelper | null>(null);

  // Orbit Angles
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.35,
    phi: 0.85,
    radius: 4.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.35, phi: 0.85, radius: 4.5 };
  }, []);

  // Telemetry buffer update
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        fieldMagnitude: Number((probeField.magnitude / 1000).toFixed(2)), // in kN/C
        potentialV: Number(probeField.potentialV.toFixed(1)),
        probeDist: Number(Math.sqrt(probeX * probeX + probeY * probeY + probeZ * probeZ).toFixed(2)),
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, probeField, probeX, probeY, probeZ]);

  // Three.js Mount Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-5, -4, -4);
    scene.add(dirLight2);

    // Coordinate Grid Floor
    const grid = new THREE.GridHelper(5, 20, 0x1e293b, 0x0f172a);
    grid.position.y = -0.7;
    scene.add(grid);

    // Groups
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);
    linesGroupRef.current = linesGroup;

    const chargesGroup = new THREE.Group();
    scene.add(chargesGroup);
    chargesGroupRef.current = chargesGroup;

    const probeGroup = new THREE.Group();
    scene.add(probeGroup);
    probeGroupRef.current = probeGroup;

    // Interactive Probe Mesh (crosshair glowing sphere)
    const probeGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    probeGroup.add(probeMesh);

    // Probe Arrow Helper for local E field vector
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0.4,
      0xfbbf24,
      0.08,
      0.05
    );
    probeGroup.add(arrowHelper);
    probeArrowRef.current = arrowHelper;

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Mouse & Touch Controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.007;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi - dy * 0.007));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(1.8, Math.min(10.0, cameraAngleRef.current.radius + e.deltaY * 0.003));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Touch support
    let touchStartDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - prevMouseRef.current.x;
        const dy = e.touches[0].clientY - prevMouseRef.current.y;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        cameraAngleRef.current.theta -= dx * 0.007;
        cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi - dy * 0.007));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = touchStartDist - dist;
        touchStartDist = dist;
        cameraAngleRef.current.radius = Math.max(1.8, Math.min(10.0, cameraAngleRef.current.radius + delta * 0.01));
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    // Animation Render Loop
    const animate = () => {
      if (cameraRef.current && rendererRef.current && sceneRef.current) {
        const { theta, phi, radius } = cameraAngleRef.current;
        cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
        cameraRef.current.position.y = radius * Math.cos(phi);
        cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
        cameraRef.current.lookAt(0, 0, 0);

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, []);

  // Update Charges 3D Visuals
  useEffect(() => {
    const group = chargesGroupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    charges.forEach((c) => {
      const isPositive = c.qMicroC >= 0;
      const absQ = Math.abs(c.qMicroC);
      const radius = 0.09 + Math.min(0.08, Math.sqrt(absQ) * 0.025);

      const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xef4444 : 0x3b82f6,
        emissive: isPositive ? 0x991b1b : 0x1d4ed8,
        emissiveIntensity: 0.6,
        metalness: 0.2,
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.set(c.x, c.y, c.z);
      group.add(mesh);

      // Glowing equator ring
      const ringGeo = new THREE.TorusGeometry(radius * 1.25, 0.007, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isPositive ? 0xfca5a5 : 0x93c5fd,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(c.x, c.y, c.z);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    });
  }, [charges]);

  // Compute and Render 3D Electric Field Lines
  useEffect(() => {
    const linesGroup = linesGroupRef.current;
    if (!linesGroup) return;

    // Clear previous field lines
    while (linesGroup.children.length > 0) {
      const child = linesGroup.children[0];
      linesGroup.remove(child);
      if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (!clock.showTrajectories) return;

    // Generate seed points
    // For each charge, seed lines evenly on sphere
    const stepSize = 0.028;
    const maxSteps = 75;
    const boundRadius = 2.8;

    // Determine charges to emit from:
    // If positive charges exist, emit outward from positives along +E.
    // If only negative charges exist, emit outward from negatives along -E.
    const hasPositive = charges.some((c) => c.qMicroC > 0);
    const hasNegative = charges.some((c) => c.qMicroC < 0);

    const emitCharges: { charge: PointCharge3D; forwardDirection: number }[] = [];

    charges.forEach((c) => {
      if (Math.abs(c.qMicroC) < 0.1) return;
      if (c.qMicroC > 0) {
        emitCharges.push({ charge: c, forwardDirection: 1 });
      } else if (!hasPositive) {
        // Only negative charges exist: trace inward backwards (direction = -1)
        emitCharges.push({ charge: c, forwardDirection: -1 });
      } else if (!hasNegative) {
        // Only positive exists
      } else {
        // Both positive and negative exist: also emit a few lines backwards from negative for symmetric dipole aesthetics
        emitCharges.push({ charge: c, forwardDirection: -1 });
      }
    });

    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const numSeeds = lineDensity;

    emitCharges.forEach(({ charge, forwardDirection }) => {
      const isPos = charge.qMicroC > 0;
      const seedR = 0.13;

      for (let i = 0; i < numSeeds; i++) {
        // Fibonacci sphere distribution for uniform coverage
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / numSeeds);

        const sx = charge.x + seedR * Math.sin(phi) * Math.cos(theta);
        const sy = charge.y + seedR * Math.sin(phi) * Math.sin(theta);
        const sz = charge.z + seedR * Math.cos(phi);

        const points: THREE.Vector3[] = [new THREE.Vector3(sx, sy, sz)];
        let cx = sx;
        let cy = sy;
        let cz = sz;

        for (let step = 0; step < maxSteps; step++) {
          const field = calculateElectricFieldAtPoint(charges, { x: cx, y: cy, z: cz });
          if (field.magnitude < 1e-4) break;

          // Normalized unit vector
          const ux = (field.ex / field.magnitude) * forwardDirection;
          const uy = (field.ey / field.magnitude) * forwardDirection;
          const uz = (field.ez / field.magnitude) * forwardDirection;

          // Euler / RK step
          const nx = cx + ux * stepSize;
          const ny = cy + uy * stepSize;
          const nz = cz + uz * stepSize;

          // Check distance bounds
          const distFromOrigin = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (distFromOrigin > boundRadius) break;

          // Check collision with opposite charges
          let hitOther = false;
          for (const target of charges) {
            const dx = nx - target.x;
            const dy = ny - target.y;
            const dz = nz - target.z;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d < 0.10) {
              points.push(new THREE.Vector3(target.x, target.y, target.z));
              hitOther = true;
              break;
            }
          }

          points.push(new THREE.Vector3(nx, ny, nz));
          if (hitOther) break;

          cx = nx;
          cy = ny;
          cz = nz;
        }

        if (points.length > 2) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({
            color: isPos ? 0xf59e0b : 0x38bdf8,
            transparent: true,
            opacity: 0.65,
          });
          const line = new THREE.Line(lineGeo, lineMat);
          linesGroup.add(line);
        }
      }
    });
  }, [charges, lineDensity, clock.showTrajectories]);

  // Update Sensor Probe in 3D
  useEffect(() => {
    const probeGroup = probeGroupRef.current;
    const arrow = probeArrowRef.current;
    if (!probeGroup || !arrow) return;

    probeGroup.position.set(probeX, probeY, probeZ);
    probeGroup.visible = clock.showVectors;

    if (probeField.magnitude > 1e-4) {
      const dir = new THREE.Vector3(probeField.ex, probeField.ey, probeField.ez).normalize();
      arrow.setDirection(dir);
      // Scaled length between 0.25 and 0.8
      const len = Math.max(0.2, Math.min(0.85, 0.25 + Math.log10(probeField.magnitude + 1) * 0.08));
      arrow.setLength(len, 0.08, 0.05);
    }
  }, [probeX, probeY, probeZ, probeField, clock.showVectors]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      {
        key: 'fieldMagnitude',
        label: '|E| (kN/C)',
        color: '#f59e0b',
        unit: 'kN/C',
      },
      {
        key: 'potentialV',
        label: 'Potencial V (V)',
        color: '#38bdf8',
        unit: 'V',
      },
    ],
    []
  );

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Simulation Header */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60 uppercase font-bold">
                MÓDULO E2 · ELETRICIDADE
              </span>
              <h1 className="text-sm font-bold text-white tracking-wide">Linhas de Campo Elétrico 3D</h1>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => applyPreset('dipole')}
            className="px-2.5 py-1 text-xs rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Dipolo (+ / -)
          </button>
          <button
            onClick={() => applyPreset('repulsion')}
            className="px-2.5 py-1 text-xs rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Repulsão (+ / +)
          </button>
          <button
            onClick={() => applyPreset('single_positive')}
            className="px-2.5 py-1 text-xs rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Carga Única (+)
          </button>
          <button
            onClick={() => applyPreset('asymmetric')}
            className="px-2.5 py-1 text-xs rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Assimétrica (+6/-2)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-400 hover:bg-amber-900/60 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Roteiro de Campo</span>
            </button>
          )}
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Resetar Câmera 3D"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace (3D Viewport + Side Panel) */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing">
          <div ref={mountRef} className="w-full h-full" />

          {/* HUD Overlay: Sensor Readout */}
          <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-auto max-w-xs flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                <Target className="w-3.5 h-3.5" />
                <span>Sensor de Prova P</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                ({probeX.toFixed(2)}, {probeY.toFixed(2)}, {probeZ.toFixed(2)}) m
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <span className="text-xs text-slate-400">Intensidade |E|:</span>
              <span className="text-base font-mono font-extrabold text-amber-300">
                {(probeField.magnitude / 1000).toFixed(2)}{' '}
                <span className="text-xs font-normal text-amber-400/80">kN/C</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Potencial Elétrico V:</span>
              <span className="font-mono text-sky-400 font-bold">
                {(probeField.potentialV / 1000).toFixed(2)} kV
              </span>
            </div>

            <div className="text-[10px] text-slate-400 font-mono bg-slate-950/70 p-1.5 rounded border border-slate-800/80 flex justify-between">
              <span>Ex: {(probeField.ex / 1000).toFixed(1)}</span>
              <span>Ey: {(probeField.ey / 1000).toFixed(1)}</span>
              <span>Ez: {(probeField.ez / 1000).toFixed(1)} kN/C</span>
            </div>
          </div>

          {/* KaTeX Formula Banner */}
          {clock.showFormulas && (
            <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-3">
              <div className="text-slate-400 text-[11px]">Superposição Vetorial:</div>
              <div className="font-mono text-amber-300">
                <KaTeXMath math={String.raw`\vec{E} = \frac{1}{4\pi\varepsilon_0}\sum \frac{q_i}{r_i^2}\hat{r}_i`} />
              </div>
            </div>
          )}

          {/* Camera hints */}
          <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800 pointer-events-none hidden sm:block">
            Arraste: Girar 3D · Scroll: Zoom
          </div>
        </div>

        {/* Side Panel (Tabs: Controls vs Graphs) */}
        <div className="w-full md:w-84 lg:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col shrink-0">
          {/* Side Tabs Header */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveSideTab('controls')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeSideTab === 'controls'
                  ? 'bg-slate-800/80 text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configuração & Prova</span>
            </button>
            <button
              onClick={() => setActiveSideTab('graphs')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeSideTab === 'graphs'
                  ? 'bg-slate-800/80 text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Gráfico E(t)</span>
            </button>
          </div>

          {/* Side Tabs Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSideTab === 'controls' ? (
              <>
                {/* Classic Didactic Presets Bar */}
                <ClassicPresetsBar
                  moduleId="electric_field_lines"
                  onSelectPreset={applyPreset}
                  currentParams={{ mode, q1MicroC, q2MicroC, separationM, lineDensity }}
                />

                {/* Configuration Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Modo de Cargas</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('two_charges')}
                      className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                        mode === 'two_charges'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Duas Cargas (Dipolo)
                    </button>
                    <button
                      onClick={() => setMode('single_charge')}
                      className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                        mode === 'single_charge'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Carga Única Isolada
                    </button>
                  </div>
                </div>

                {/* Slider: q1 */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Carga q1:</span>
                    <span className={`font-mono font-bold ${q1MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {q1MicroC > 0 ? `+${q1MicroC.toFixed(1)}` : q1MicroC.toFixed(1)} µC
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10.0"
                    max="10.0"
                    step="0.5"
                    value={q1MicroC}
                    onChange={(e) => setQ1MicroC(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Slider: q2 (if two_charges) */}
                {mode === 'two_charges' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Carga q2:</span>
                        <span className={`font-mono font-bold ${q2MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          {q2MicroC > 0 ? `+${q2MicroC.toFixed(1)}` : q2MicroC.toFixed(1)} µC
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-10.0"
                        max="10.0"
                        step="0.5"
                        value={q2MicroC}
                        onChange={(e) => setQ2MicroC(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Slider: Separation distance */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Distância d:</span>
                        <span className="font-mono text-amber-300 font-bold">{separationM.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="2.0"
                        step="0.05"
                        value={separationM}
                        onChange={(e) => setSeparationM(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </>
                )}

                {/* Slider: Line Density */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Densidade de Linhas:</span>
                    <span className="font-mono text-slate-300">{lineDensity} linhas/carga</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="28"
                    step="2"
                    value={lineDensity}
                    onChange={(e) => setLineDensity(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Sensor Probe Position Controls */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Posição do Sensor de Prova P</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Eixo X:</span>
                      <span className="font-mono text-slate-300">{probeX.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-1.5"
                      max="1.5"
                      step="0.05"
                      value={probeX}
                      onChange={(e) => setProbeX(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Eixo Y (Altura):</span>
                      <span className="font-mono text-slate-300">{probeY.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-1.0"
                      max="1.2"
                      step="0.05"
                      value={probeY}
                      onChange={(e) => setProbeY(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Eixo Z (Profundidade):</span>
                      <span className="font-mono text-slate-300">{probeZ.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-1.0"
                      max="1.0"
                      step="0.05"
                      value={probeZ}
                      onChange={(e) => setProbeZ(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Educational Insight Card */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Princípio Físico das Linhas de Força</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>As linhas de campo nascem em cargas positivas e convergem para cargas negativas.</li>
                    <li>O vetor campo elétrico <span className="text-slate-200 font-mono">E</span> é tangente à linha de força em cada ponto.</li>
                    <li>A densidade espacial das linhas é proporcional à intensidade do campo elétrico.</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Intensidade de Campo no Sensor</span>
                  <span className="text-amber-400 font-mono text-[10px]">Tempo Real</span>
                </div>
                <div className="h-64 bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    xLabel="Tempo"
                    xUnit="s"
                    title="Intensidade |E| e Potencial V no Sensor de Prova"
                    height={220}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playback Control Bar */}
      <PlaybackBar
        clock={clock}
        onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
        onReset={() => {
          applyPreset('dipole');
          setDataBuffer([]);
        }}
        onStepForward={() => setClock((p) => ({ ...p, time: p.time + 0.05 }))}
        onChangeSpeed={(s: number) => setClock((p) => ({ ...p, speed: s }))}
        onToggleVectors={() => setClock((p) => ({ ...p, showVectors: !p.showVectors }))}
        onToggleTrajectories={() => setClock((p) => ({ ...p, showTrajectories: !p.showTrajectories }))}
        onToggleFormulas={() => setClock((p) => ({ ...p, showFormulas: !p.showFormulas }))}
        onToggle2DView={() => setClock((p) => ({ ...p, is2DView: !p.is2DView }))}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

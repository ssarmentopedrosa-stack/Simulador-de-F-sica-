import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateElectricFieldAtPoint, calculateElectricWork, PointCharge3D, COULOMB_CONSTANT_K, ElectricWorkState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Zap, Target, Crosshair, ArrowRight, ShieldCheck } from 'lucide-react';

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface ElectricPotential3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

type PotentialPreset = 'single_positive' | 'single_negative' | 'dipole' | 'repulsion' | 'asymmetric';

export const ElectricPotential3D: React.FC<ElectricPotential3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Configuration
  const [mode, setMode] = useState<'single_charge' | 'two_charges'>(
    () => (initialParams?.mode as 'single_charge' | 'two_charges') || 'two_charges'
  );
  const [q1MicroC, setQ1MicroC] = useState<number>(
    () => (initialParams?.q1MicroC != null ? Number(initialParams.q1MicroC) : 3.0)
  );
  const [q2MicroC, setQ2MicroC] = useState<number>(
    () => (initialParams?.q2MicroC != null ? Number(initialParams.q2MicroC) : -3.0)
  );
  const [separationM, setSeparationM] = useState<number>(
    () => (initialParams?.separationM != null ? Number(initialParams.separationM) : 0.8)
  );
  const [q0MicroC, setQ0MicroC] = useState<number>(
    () => (initialParams?.q0MicroC != null ? Number(initialParams.q0MicroC) : 1.0)
  ); // Test charge q0
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  // Probe positions: Point A (Reference / Start) and Point B (Current probe)
  const [posA, setPosA] = useState<{ x: number; y: number; z: number }>({ x: 0.5, y: 0.2, z: 0.0 });
  const [posB, setPosB] = useState<{ x: number; y: number; z: number }>(
    () => (initialParams?.posB != null ? initialParams.posB : { x: 0.0, y: 0.5, z: 0.0 })
  );

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.mode !== undefined) setMode(p.mode);
    if (p.q1MicroC !== undefined) setQ1MicroC(Number(p.q1MicroC));
    if (p.q2MicroC !== undefined) setQ2MicroC(Number(p.q2MicroC));
    if (p.separationM !== undefined) setSeparationM(Number(p.separationM));
    if (p.q0MicroC !== undefined) setQ0MicroC(Number(p.q0MicroC));
    if (p.posB !== undefined) setPosB(p.posB);
  }, []);

  useEffect(() => {
    onParamsChange?.({ mode, q1MicroC, q2MicroC, separationM, q0MicroC, posB });
  }, [mode, q1MicroC, q2MicroC, separationM, q0MicroC, posB, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.mode !== undefined) setMode(initialParams.mode);
      if (initialParams.q1MicroC !== undefined) setQ1MicroC(Number(initialParams.q1MicroC));
      if (initialParams.q2MicroC !== undefined) setQ2MicroC(Number(initialParams.q2MicroC));
      if (initialParams.separationM !== undefined) setSeparationM(Number(initialParams.separationM));
      if (initialParams.q0MicroC !== undefined) setQ0MicroC(Number(initialParams.q0MicroC));
      if (initialParams.posB !== undefined) setPosB(initialParams.posB);
    }
  }, [initialParams]);

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

  // Charges array
  const charges: PointCharge3D[] = useMemo(() => {
    if (mode === 'single_charge') {
      return [{ id: 'q1', qMicroC: q1MicroC, x: 0, y: 0, z: 0 }];
    }
    const halfD = separationM / 2;
    return [
      { id: 'q1', qMicroC: q1MicroC, x: -halfD, y: 0, z: 0 },
      { id: 'q2', qMicroC: q2MicroC, x: halfD, y: 0, z: 0 },
    ];
  }, [mode, q1MicroC, q2MicroC, separationM]);

  // Work and Potential Calculations
  const workState: ElectricWorkState = useMemo(() => {
    return calculateElectricWork(charges, posA, posB, q0MicroC, COULOMB_CONSTANT_K);
  }, [charges, posA, posB, q0MicroC]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 3D Objects
  const chargesGroupRef = useRef<THREE.Group | null>(null);
  const equipotentialsGroupRef = useRef<THREE.Group | null>(null);
  const probeGroupRef = useRef<THREE.Group | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);

  // Camera Orbit
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.4,
    phi: 0.8,
    radius: 4.6,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.4, phi: 0.8, radius: 4.6 };
  }, []);

  // Telemetry buffer update
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        potentialB: Number((workState.vB / 1000).toFixed(2)), // kV
        workElectric: Number((workState.workElectricJ * 1000).toFixed(3)), // mJ
        deltaV: Number((workState.deltaV / 1000).toFixed(2)), // kV
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, workState]);

  // Mount Three.js
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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-5, -3, -4);
    scene.add(dirLight2);

    // Floor Grid
    const grid = new THREE.GridHelper(5, 20, 0x1e293b, 0x0f172a);
    grid.position.y = -0.7;
    scene.add(grid);

    // Groups
    const chargesGroup = new THREE.Group();
    scene.add(chargesGroup);
    chargesGroupRef.current = chargesGroup;

    const equipotentialsGroup = new THREE.Group();
    scene.add(equipotentialsGroup);
    equipotentialsGroupRef.current = equipotentialsGroup;

    const probeGroup = new THREE.Group();
    scene.add(probeGroup);
    probeGroupRef.current = probeGroup;

    // Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Mouse controls
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

    // Touch controls
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

    // Animation loop
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

  // Update Charges 3D
  useEffect(() => {
    const group = chargesGroupRef.current;
    if (!group) return;

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
    });
  }, [charges]);

  // Update 3D Equipotential Surfaces & Rings
  useEffect(() => {
    const group = equipotentialsGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    if (!clock.showTrajectories) return;

    // For single charge: concentric transparent spheres & equatorial circles
    if (mode === 'single_charge') {
      const c = charges[0];
      const isPositive = c.qMicroC >= 0;
      const radii = [0.25, 0.45, 0.7, 1.0, 1.4];

      radii.forEach((r, idx) => {
        // Semi-transparent sphere
        const sphereGeo = new THREE.SphereGeometry(r, 28, 28);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: isPositive ? 0xf59e0b : 0x38bdf8,
          transparent: true,
          opacity: 0.12 - idx * 0.015,
          side: THREE.DoubleSide,
          roughness: 0.8,
          wireframe: false,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(c.x, c.y, c.z);
        group.add(sphere);

        // Highlight ring in horizontal plane
        const ringGeo = new THREE.TorusGeometry(r, 0.005, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: isPositive ? 0xfbbf24 : 0x7dd3fc,
          transparent: true,
          opacity: 0.7 - idx * 0.08,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(c.x, c.y, c.z);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      });
    } else {
      // Two charges: sample 3D potential grid and build equipotential contours
      charges.forEach((c) => {
        const isPositive = c.qMicroC >= 0;
        const radii = [0.2, 0.35, 0.55];

        radii.forEach((r, idx) => {
          const sphereGeo = new THREE.SphereGeometry(r, 20, 20);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: isPositive ? 0xf59e0b : 0x38bdf8,
            transparent: true,
            opacity: 0.14 - idx * 0.02,
            side: THREE.DoubleSide,
            wireframe: false,
          });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.set(c.x, c.y, c.z);
          group.add(sphere);

          const ringGeo = new THREE.TorusGeometry(r, 0.005, 8, 40);
          const ringMat = new THREE.MeshBasicMaterial({
            color: isPositive ? 0xfbbf24 : 0x7dd3fc,
            transparent: true,
            opacity: 0.65 - idx * 0.1,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(c.x, c.y, c.z);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
        });
      });

      // Central zero-potential plane if dipole (+q and -q)
      if (Math.abs(q1MicroC + q2MicroC) < 0.1 && q1MicroC !== 0) {
        const planeGeo = new THREE.PlaneGeometry(2.0, 2.0);
        const planeMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.y = Math.PI / 2;
        group.add(plane);
      }
    }
  }, [charges, mode, q1MicroC, q2MicroC, clock.showTrajectories]);

  // Update Points A, B and connecting trajectory
  useEffect(() => {
    const group = probeGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    if (!clock.showVectors) return;

    // Point A (Reference sphere - Cyan)
    const sphereAGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereAMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
    });
    const meshA = new THREE.Mesh(sphereAGeo, sphereAMat);
    meshA.position.set(posA.x, posA.y, posA.z);
    group.add(meshA);

    // Point B (Current probe sphere - Amber)
    const sphereBGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const sphereBMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
    });
    const meshB = new THREE.Mesh(sphereBGeo, sphereBMat);
    meshB.position.set(posB.x, posB.y, posB.z);
    group.add(meshB);

    // Connecting dashed line A -> B
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(posA.x, posA.y, posA.z),
      new THREE.Vector3(posB.x, posB.y, posB.z),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xe2e8f0,
      dashSize: 0.05,
      gapSize: 0.03,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    group.add(line);
    pathLineRef.current = line;
  }, [posA, posB, clock.showVectors]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      {
        key: 'potentialB',
        label: 'Potencial V_B (kV)',
        color: '#f59e0b',
        unit: 'kV',
      },
      {
        key: 'workElectric',
        label: 'Trabalho W_elec (mJ)',
        color: '#10b981',
        unit: 'mJ',
      },
      {
        key: 'deltaV',
        label: 'ΔV (kV)',
        color: '#38bdf8',
        unit: 'kV',
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
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60 uppercase font-bold">
                MÓDULO E3 · ELETRICIDADE
              </span>
              <h1 className="text-sm font-bold text-white tracking-wide">Potencial Elétrico & Trabalho</h1>
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
            onClick={() => applyPreset('single_negative')}
            className="px-2.5 py-1 text-xs rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Carga Única (-)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-400 hover:bg-amber-900/60 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Roteiro de Potencial</span>
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

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing">
          <div ref={mountRef} className="w-full h-full" />

          {/* Floating Readout HUD */}
          <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-auto max-w-sm flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" /> Balanço de Potencial & Trabalho
              </span>
              <span className="text-[10px] font-mono text-slate-400">q₀ = {q0MicroC.toFixed(1)} µC</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Ponto A (Início)
                </div>
                <div className="text-sm font-mono font-bold text-cyan-300">
                  {(workState.vA / 1000).toFixed(2)} kV
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Ponto B (Atual)
                </div>
                <div className="text-sm font-mono font-bold text-amber-300">
                  {(workState.vB / 1000).toFixed(2)} kV
                </div>
              </div>
            </div>

            <div className="flex items-baseline justify-between text-xs pt-0.5">
              <span className="text-slate-400">Diferença de Potencial ΔV:</span>
              <span className="font-mono text-slate-200 font-bold">
                {(workState.deltaV / 1000).toFixed(2)} kV
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Trabalho da Força Elétrica (W_elec):</span>
              <span className={`font-mono font-extrabold ${workState.workElectricJ >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(workState.workElectricJ * 1000).toFixed(3)} mJ
              </span>
            </div>

            <div className="text-[10px] font-mono text-slate-400 bg-slate-950/70 p-1.5 rounded border border-slate-800 flex justify-between">
              <span>W_ext: {(workState.workExternalJ * 1000).toFixed(3)} mJ</span>
              <span>{Math.abs(workState.deltaV) < 10 ? '✨ Equipotencial (W ≈ 0)' : 'Gradiente Ativo'}</span>
            </div>
          </div>

          {/* Formula Banner */}
          {clock.showFormulas && (
            <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-3">
              <div className="text-slate-400 text-[11px]">Trabalho & Potencial:</div>
              <div className="font-mono text-amber-300 font-bold">
                W_AB = q₀ · (V_A − V_B) = −q₀ · ΔV
              </div>
            </div>
          )}

          <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800 pointer-events-none hidden sm:block">
            Esferas translúcidas = Superfícies Equipotenciais
          </div>
        </div>

        {/* Side Panel */}
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
              <span>Controle & Sonda</span>
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
              <span>Gráficos de Trabalho</span>
            </button>
          </div>

          {/* Side Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSideTab === 'controls' ? (
              <>
                {/* Classic Didactic Presets Bar */}
                <ClassicPresetsBar
                  moduleId="electric_potential"
                  onApplyPreset={applyPreset}
                  currentParams={{ mode, q1MicroC, q2MicroC, separationM, q0MicroC, posB }}
                />

                {/* Configuration Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Modo de Fontes</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('two_charges')}
                      className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                        mode === 'two_charges'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Duas Cargas
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
                    <span className="text-slate-300 font-medium">Carga Fonte q1:</span>
                    <span className={`font-mono font-bold ${q1MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {q1MicroC > 0 ? `+${q1MicroC.toFixed(1)}` : q1MicroC.toFixed(1)} µC
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8.0"
                    max="8.0"
                    step="0.5"
                    value={q1MicroC}
                    onChange={(e) => setQ1MicroC(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Slider: q2 */}
                {mode === 'two_charges' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Carga Fonte q2:</span>
                        <span className={`font-mono font-bold ${q2MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          {q2MicroC > 0 ? `+${q2MicroC.toFixed(1)}` : q2MicroC.toFixed(1)} µC
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-8.0"
                        max="8.0"
                        step="0.5"
                        value={q2MicroC}
                        onChange={(e) => setQ2MicroC(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Separação entre Fontes d:</span>
                        <span className="font-mono text-amber-300 font-bold">{separationM.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="1.6"
                        step="0.05"
                        value={separationM}
                        onChange={(e) => setSeparationM(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </>
                )}

                {/* Slider: Test Charge q0 */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-400 font-semibold">Carga de Prova q₀:</span>
                    <span className="font-mono text-amber-300 font-bold">{q0MicroC.toFixed(1)} µC</span>
                  </div>
                  <input
                    type="range"
                    min="-5.0"
                    max="5.0"
                    step="0.5"
                    value={q0MicroC}
                    onChange={(e) => setQ0MicroC(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="text-[10px] text-slate-400">
                    A carga de prova sofre força do campo e acumula variação de energia potencial ΔEp = -W.
                  </div>
                </div>

                {/* Probe B Position Controls */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Target className="w-3.5 h-3.5" />
                      <span>Posição do Ponto B (Sonda Atual)</span>
                    </div>
                    <button
                      onClick={() => setPosA({ ...posB })}
                      className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                      title="Fixa Ponto A na posição atual de B"
                    >
                      Definir A = B
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Eixo X:</span>
                      <span className="font-mono text-slate-300">{posB.x.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-1.2"
                      max="1.2"
                      step="0.05"
                      value={posB.x}
                      onChange={(e) => setPosB((prev) => ({ ...prev, x: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Eixo Y (Altura):</span>
                      <span className="font-mono text-slate-300">{posB.y.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-0.8"
                      max="1.0"
                      step="0.05"
                      value={posB.y}
                      onChange={(e) => setPosB((prev) => ({ ...prev, y: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Educational Insight */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Princípio da Conservação & Trabalho</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>O campo eletrostático é <strong>conservativo</strong>: o trabalho independe da trajetória e depende apenas dos pontos A e B.</li>
                    <li>Em qualquer trajetória contida em uma mesma <strong>superfície equipotencial</strong> (V_A = V_B), o trabalho realizado é rigorosamente nulo (W = 0).</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Evolução Temporal no Sensor</span>
                  <span className="text-amber-400 font-mono text-[10px]">Tempo Real</span>
                </div>
                <div className="h-64 bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    xLabel="Tempo"
                    xUnit="s"
                    title="Potencial V_B (kV) e Trabalho Elétrico (mJ)"
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

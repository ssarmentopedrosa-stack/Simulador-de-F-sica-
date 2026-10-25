import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateCoulombLaw, CoulombState, COULOMB_CONSTANT_K } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Zap, ArrowRightLeft, ShieldCheck, Ruler } from 'lucide-react';

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface CoulombLaw3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const CoulombLaw3D: React.FC<CoulombLaw3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Physical parameters
  const [q1MicroC, setQ1MicroC] = useState<number>(
    () => (initialParams?.q1MicroC != null ? Number(initialParams.q1MicroC) : 3.0)
  );
  const [q2MicroC, setQ2MicroC] = useState<number>(
    () => (initialParams?.q2MicroC != null ? Number(initialParams.q2MicroC) : -4.0)
  );
  const [distanceM, setDistanceM] = useState<number>(
    () => (initialParams?.distanceM != null ? Number(initialParams.distanceM) : 0.8)
  );
  const [medium, setMedium] = useState<'vacuum' | 'water' | 'oil'>(
    () => (initialParams?.medium as 'vacuum' | 'water' | 'oil') || 'vacuum'
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.q1MicroC !== undefined) setQ1MicroC(Number(p.q1MicroC));
    if (p.q2MicroC !== undefined) setQ2MicroC(Number(p.q2MicroC));
    if (p.distanceM !== undefined) setDistanceM(Number(p.distanceM));
    if (p.medium !== undefined) setMedium(p.medium);
  }, []);

  useEffect(() => {
    onParamsChange?.({ q1MicroC, q2MicroC, distanceM, medium });
  }, [q1MicroC, q2MicroC, distanceM, medium, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.q1MicroC !== undefined) setQ1MicroC(Number(initialParams.q1MicroC));
      if (initialParams.q2MicroC !== undefined) setQ2MicroC(Number(initialParams.q2MicroC));
      if (initialParams.distanceM !== undefined) setDistanceM(Number(initialParams.distanceM));
      if (initialParams.medium !== undefined) setMedium(initialParams.medium);
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

  // Dielectric medium constant k = k_0 / epsilon_r
  const effectiveK = useMemo(() => {
    switch (medium) {
      case 'water':
        return COULOMB_CONSTANT_K / 80.0;
      case 'oil':
        return COULOMB_CONSTANT_K / 2.2;
      case 'vacuum':
      default:
        return COULOMB_CONSTANT_K;
    }
  }, [medium]);

  // Derived Physical State
  const state: CoulombState = useMemo(() => {
    return calculateCoulombLaw(q1MicroC, q2MicroC, distanceM, effectiveK);
  }, [q1MicroC, q2MicroC, distanceM, effectiveK]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 3D Scene Objects
  const charge1GroupRef = useRef<THREE.Group | null>(null);
  const charge2GroupRef = useRef<THREE.Group | null>(null);
  const sphere1MeshRef = useRef<THREE.Mesh | null>(null);
  const sphere2MeshRef = useRef<THREE.Mesh | null>(null);
  const arrowF1Ref = useRef<THREE.ArrowHelper | null>(null);
  const arrowF2Ref = useRef<THREE.ArrowHelper | null>(null);
  const rulerLineRef = useRef<THREE.Line | null>(null);

  // Camera Orbit Angles
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.45,
    phi: 0.72,
    radius: 4.8,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.45, phi: 0.72, radius: 4.8 };
  }, []);

  // Update telemetry for charts
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        forceN: Number(state.forceMagnitudeN.toFixed(4)),
        distanceM: Number(state.distanceM.toFixed(2)),
        q1MicroC: state.q1MicroC,
        q2MicroC: state.q2MicroC,
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, state]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.Fog(0x0a0f1d, 8, 26);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0284c7, 0.9);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // ==========================================
    // CHARGE 1 GROUP (Left, along X)
    // ==========================================
    const c1Group = new THREE.Group();
    c1Group.position.set(-distanceM / 2, 1.2, 0);
    scene.add(c1Group);
    charge1GroupRef.current = c1Group;

    // Pedestal stem & mount
    const stem1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
    );
    stem1.position.y = -0.6;
    c1Group.add(stem1);

    const sphere1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.5,
      })
    );
    sphere1.castShadow = true;
    c1Group.add(sphere1);
    sphere1MeshRef.current = sphere1;

    // ==========================================
    // CHARGE 2 GROUP (Right, along X)
    // ==========================================
    const c2Group = new THREE.Group();
    c2Group.position.set(distanceM / 2, 1.2, 0);
    scene.add(c2Group);
    charge2GroupRef.current = c2Group;

    const stem2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
    );
    stem2.position.y = -0.6;
    c2Group.add(stem2);

    const sphere2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.5,
      })
    );
    sphere2.castShadow = true;
    c2Group.add(sphere2);
    sphere2MeshRef.current = sphere2;

    // ==========================================
    // FORCE VECTOR ARROWS (F21 on q1, F12 on q2)
    // ==========================================
    const arrowF1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.6, 0xef4444, 0.16, 0.1);
    c1Group.add(arrowF1);
    arrowF1Ref.current = arrowF1;

    const arrowF2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 0.6, 0x0284c7, 0.16, 0.1);
    c2Group.add(arrowF2);
    arrowF2Ref.current = arrowF2;

    // Ruler Line between charges on floor
    const rulerGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-distanceM / 2, 0.05, 0),
      new THREE.Vector3(distanceM / 2, 0.05, 0),
    ]);
    const rulerLine = new THREE.Line(
      rulerGeom,
      new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 0.08, gapSize: 0.04 })
    );
    rulerLine.computeLineDistances();
    scene.add(rulerLine);
    rulerLineRef.current = rulerLine;

    // ==========================================
    // ORBIT CAMERA CONTROLS
    // ==========================================
    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(2.2, Math.min(8.0, cameraAngleRef.current.radius + e.deltaY * 0.004));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouseRef.current.x;
      const dy = e.touches[0].clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      cameraAngleRef.current.theta -= dx * 0.01;
      cameraAngleRef.current.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.01));
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 1.2;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 1.2, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, []);

  // Update physical visuals when distance, charges or forces change
  useEffect(() => {
    const halfD = distanceM / 2;

    if (charge1GroupRef.current) {
      charge1GroupRef.current.position.set(-halfD, 1.2, 0);
    }
    if (charge2GroupRef.current) {
      charge2GroupRef.current.position.set(halfD, 1.2, 0);
    }

    // Ruler update
    if (rulerLineRef.current) {
      const positions = rulerLineRef.current.geometry.attributes.position;
      positions.setXYZ(0, -halfD, 0.05, 0);
      positions.setXYZ(1, halfD, 0.05, 0);
      positions.needsUpdate = true;
      rulerLineRef.current.computeLineDistances();
    }

    // Sphere materials and sizes based on charges
    if (sphere1MeshRef.current) {
      const mat = sphere1MeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (q1MicroC > 0) {
          mat.color.setHex(0xef4444);
          mat.emissive.setHex(0x991b1b);
        } else if (q1MicroC < 0) {
          mat.color.setHex(0x0284c7);
          mat.emissive.setHex(0x0369a1);
        } else {
          mat.color.setHex(0x64748b);
          mat.emissive.setHex(0x1e293b);
        }
      }
      const s1 = 0.8 + (Math.abs(q1MicroC) / 10.0) * 0.4;
      sphere1MeshRef.current.scale.set(s1, s1, s1);
    }

    if (sphere2MeshRef.current) {
      const mat = sphere2MeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (q2MicroC > 0) {
          mat.color.setHex(0xef4444);
          mat.emissive.setHex(0x991b1b);
        } else if (q2MicroC < 0) {
          mat.color.setHex(0x0284c7);
          mat.emissive.setHex(0x0369a1);
        } else {
          mat.color.setHex(0x64748b);
          mat.emissive.setHex(0x1e293b);
        }
      }
      const s2 = 0.8 + (Math.abs(q2MicroC) / 10.0) * 0.4;
      sphere2MeshRef.current.scale.set(s2, s2, s2);
    }

    // Force vector arrows update
    if (arrowF1Ref.current && arrowF2Ref.current) {
      const isVisible = clock.showVectors && state.forceMagnitudeN > 1e-6;
      arrowF1Ref.current.visible = isVisible;
      arrowF2Ref.current.visible = isVisible;

      // Scaling: length maps reasonably between 0.3m and 1.2m
      const len = Math.max(0.25, Math.min(1.2, 0.25 + Math.log10(1 + state.forceMagnitudeN) * 0.5));

      if (state.interactionType === 'attractive') {
        // Attract: arrow on q1 points right (+x), arrow on q2 points left (-x)
        arrowF1Ref.current.setDirection(new THREE.Vector3(1, 0, 0));
        arrowF2Ref.current.setDirection(new THREE.Vector3(-1, 0, 0));
        arrowF1Ref.current.setColor(0x10b981); // Emerald for attraction
        arrowF2Ref.current.setColor(0x10b981);
      } else {
        // Repel: arrow on q1 points left (-x), arrow on q2 points right (+x)
        arrowF1Ref.current.setDirection(new THREE.Vector3(-1, 0, 0));
        arrowF2Ref.current.setDirection(new THREE.Vector3(1, 0, 0));
        arrowF1Ref.current.setColor(0xf59e0b); // Amber for repulsion
        arrowF2Ref.current.setColor(0xf59e0b);
      }

      arrowF1Ref.current.setLength(len, len * 0.25, len * 0.15);
      arrowF2Ref.current.setLength(len, len * 0.25, len * 0.15);
    }
  }, [distanceM, q1MicroC, q2MicroC, state, clock.showVectors]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      { key: 'forceN', label: 'Força F (N)', color: '#38bdf8', unit: 'N' },
      { key: 'distanceM', label: 'Distância r (m)', color: '#f59e0b', unit: 'm' },
    ],
    []
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 3D Scene Viewport */}
      <div className="relative flex-1 h-[50vh] lg:h-full overflow-hidden bg-slate-950">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Physical Overlay Card */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-sm pointer-events-none">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Lei de Coulomb em 3D
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                state.interactionType === 'attractive'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : state.interactionType === 'repulsive'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {state.interactionType === 'attractive' ? 'Atração Mútua' : state.interactionType === 'repulsive' ? 'Repulsão Mútua' : 'Nula'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Intensidade da Força (|F|)</div>
                <div className="text-base font-black font-mono text-cyan-300">
                  {state.forceMagnitudeN >= 1000
                    ? `${(state.forceMagnitudeN / 1000).toFixed(2)} kN`
                    : state.forceMagnitudeN >= 1
                    ? `${state.forceMagnitudeN.toFixed(3)} N`
                    : `${(state.forceMagnitudeN * 1000).toFixed(1)} mN`}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">F₁₂ = -F₂₁ (3ª Lei)</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Distância (r)</div>
                <div className="text-base font-black font-mono text-amber-300">
                  {distanceM.toFixed(2)} <span className="text-xs text-slate-400 font-normal">m</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">r² = {(distanceM * distanceM).toFixed(4)} m²</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Carga q₁
                </div>
                <div className={`text-sm font-black font-mono ${q1MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {q1MicroC > 0 ? `+${q1MicroC.toFixed(1)}` : q1MicroC.toFixed(1)} <span className="text-xs text-slate-400 font-normal">µC</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Carga q₂
                </div>
                <div className={`text-sm font-black font-mono ${q2MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {q2MicroC > 0 ? `+${q2MicroC.toFixed(1)}` : q2MicroC.toFixed(1)} <span className="text-xs text-slate-400 font-normal">µC</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Playback & Camera Controls */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <PlaybackBar
            clock={clock}
            onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
            onReset={() => {
              setQ1MicroC(3.0);
              setQ2MicroC(-4.0);
              setDistanceM(0.8);
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
      </div>

      {/* Side Panel (Parameters & Real-time Graphs Tabs) */}
      <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col h-auto lg:h-full z-20">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveSideTab('controls')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSideTab === 'controls'
                ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Parâmetros & Cargas
          </button>
          <button
            onClick={() => setActiveSideTab('graphs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSideTab === 'graphs'
                ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Curva F × r & Telemetria
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {activeSideTab === 'controls' ? (
            <>
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="coulomb_law"
                onApplyPreset={applyPreset}
                currentParams={{ q1MicroC, q2MicroC, distanceM, medium }}
              />

              {/* Charge 1 Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Carga Elétrica q₁
                  </span>
                  <span className={`font-mono text-xs font-bold ${q1MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {q1MicroC > 0 ? `+${q1MicroC.toFixed(1)}` : q1MicroC.toFixed(1)} µC
                  </span>
                </div>
                <input
                  type="range"
                  min={-10.0}
                  max={10.0}
                  step={0.5}
                  value={q1MicroC}
                  onChange={(e) => setQ1MicroC(parseFloat(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-10 µC (Negativa)</span>
                  <span>0 µC (Neutra)</span>
                  <span>+10 µC (Positiva)</span>
                </div>
              </div>

              {/* Charge 2 Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Carga Elétrica q₂
                  </span>
                  <span className={`font-mono text-xs font-bold ${q2MicroC >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {q2MicroC > 0 ? `+${q2MicroC.toFixed(1)}` : q2MicroC.toFixed(1)} µC
                  </span>
                </div>
                <input
                  type="range"
                  min={-10.0}
                  max={10.0}
                  step={0.5}
                  value={q2MicroC}
                  onChange={(e) => setQ2MicroC(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-10 µC (Negativa)</span>
                  <span>0 µC (Neutra)</span>
                  <span>+10 µC (Positiva)</span>
                </div>
              </div>

              {/* Distance Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-amber-400" /> Distância de Separação (r)
                  </span>
                  <span className="font-mono text-amber-400 text-xs font-bold">
                    {distanceM.toFixed(2)} m ({(distanceM * 100).toFixed(0)} cm)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.05}
                  value={distanceM}
                  onChange={(e) => setDistanceM(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.2 m (Próximo)</span>
                  <span>1.0 m</span>
                  <span>2.5 m (Distante)</span>
                </div>
              </div>

              {/* Dielectric Medium Selection */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Meio Dielétrico
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'vacuum', label: 'Vácuo (k₀)' },
                    { id: 'oil', label: 'Óleo (ε_r = 2.2)' },
                    { id: 'water', label: 'Água (ε_r = 80)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMedium(m.id as any)}
                      className={`p-2 rounded-lg font-medium border text-center transition-all ${
                        medium === m.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mathematical Equation Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Formulação Fundamental</span>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex justify-center text-sm font-mono font-bold text-amber-300">
                  F = k · |q₁ · q₂| / r² &nbsp;&nbsp;⇔&nbsp;&nbsp; F⃗₁₂ = −F⃗₂₁
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Telemetry Chart */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Telemetria de Força Eletrostática
                </span>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="Força Eletrostática F (N) e Distância r (m)"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>
              </div>

              {/* Physical interpretation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <span className="font-mono uppercase font-bold text-amber-400">Análise Eletrostática</span>
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    • <strong>Regime:</strong> {state.interactionType === 'attractive' ? 'Cargas com sinais contrários sofrem atração mútua.' : state.interactionType === 'repulsive' ? 'Cargas com o mesmo sinal sofrem repulsão mútua.' : 'Força nula (ao menos uma carga neutra).'}
                  </p>
                  <p>
                    • <strong>Lei do Inverso do Quadrado:</strong> Se a distância duplicar (2r), a força eletrostática decai para 1/4 (25%) do valor original.
                  </p>
                  <p>
                    • <strong>3ª Lei de Newton:</strong> Ambas as cargas sofrem forças rigorosamente iguais em módulo e opostas em sentido, independentemente de seus valores individuais.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

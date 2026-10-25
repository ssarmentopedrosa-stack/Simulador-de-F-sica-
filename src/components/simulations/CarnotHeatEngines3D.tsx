import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateCarnotCycle, CarnotCycleState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, RotateCw, Flame, Snowflake, Cpu, Zap, ArrowRight, Gauge } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface CarnotHeatEngines3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const CarnotHeatEngines3D: React.FC<CarnotHeatEngines3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Engine parameters
  const [tHot, setTHot] = useState<number>(() =>
    initialParams?.tHot != null ? Number(initialParams.tHot) : 600
  );
  const [tCold, setTCold] = useState<number>(() =>
    initialParams?.tCold != null ? Number(initialParams.tCold) : 300
  );
  const [moles, setMoles] = useState<number>(() =>
    initialParams?.moles != null ? Number(initialParams.moles) : 1.0
  );
  const [v1, setV1] = useState<number>(() =>
    initialParams?.v1 != null ? Number(initialParams.v1) : 0.012
  );
  const [v2, setV2] = useState<number>(() =>
    initialParams?.v2 != null ? Number(initialParams.v2) : 0.024
  );
  const [engineIrreversibility, setEngineIrreversibility] = useState<number>(() =>
    initialParams?.engineIrreversibility != null ? Number(initialParams.engineIrreversibility) : 0.75
  );

  const applyPreset = useCallback((params: Record<string, any>) => {
    if (params.tHot != null) setTHot(Number(params.tHot));
    if (params.tCold != null) setTCold(Number(params.tCold));
    if (params.moles != null) setMoles(Number(params.moles));
    if (params.v1 != null) setV1(Number(params.v1));
    if (params.v2 != null) setV2(Number(params.v2));
    if (params.engineIrreversibility != null) setEngineIrreversibility(Number(params.engineIrreversibility));
  }, []);

  useEffect(() => {
    onParamsChange?.({ tHot, tCold, moles, v1, v2, engineIrreversibility });
  }, [tHot, tCold, moles, v1, v2, engineIrreversibility, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      applyPreset(initialParams);
    }
  }, [initialParams, applyPreset]);

  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

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

  // Calculate Carnot Cycle state
  const state: CarnotCycleState = useMemo(() => {
    return calculateCarnotCycle(tHot, tCold, moles, v1, v2, 3);
  }, [tHot, tCold, moles, v1, v2]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mechanical Parts Refs
  const flywheelGroupRef = useRef<THREE.Group | null>(null);
  const pistonGroupRef = useRef<THREE.Group | null>(null);
  const conRodRef = useRef<THREE.Mesh | null>(null);
  const crankPinGroupRef = useRef<THREE.Group | null>(null);
  const hotSourceMeshRef = useRef<THREE.Mesh | null>(null);
  const coldSourceMeshRef = useRef<THREE.Mesh | null>(null);
  const gasChamberMeshRef = useRef<THREE.Mesh | null>(null);

  // Current cycle angle theta (0 to 2*PI)
  const crankAngleRef = useRef<number>(0);

  // Camera Orbit
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.55,
    phi: 0.70,
    radius: 5.2,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.55, phi: 0.70, radius: 5.2 };
  }, []);

  // Update telemetry for charts
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const realEta = state.carnotEfficiency * engineIrreversibility;
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        carnotEfficiencyPct: Number((state.carnotEfficiency * 100).toFixed(1)),
        realEfficiencyPct: Number((realEta * 100).toFixed(1)),
        qHotJ: Number(state.heatAbsorbedQH.toFixed(0)),
        qColdJ: Number(state.heatRejectedQC.toFixed(0)),
        workNetJ: Number(state.netWork.toFixed(0)),
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, state, engineIrreversibility]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090e1a);
    scene.fog = new THREE.Fog(0x090e1a, 8, 26);

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
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0284c7, 0.9);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Heavy Industrial Engine Bedplate
    const bedplate = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.2, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    bedplate.position.set(0, 0.1, 0);
    bedplate.receiveShadow = true;
    scene.add(bedplate);

    // ==========================================
    // HOT RESERVOIR (LEFT, x = -1.1)
    // ==========================================
    const hotGroup = new THREE.Group();
    hotGroup.position.set(-1.1, 0.2, -0.4);
    const hotBoiler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.7, 24),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    hotBoiler.position.y = 0.35;
    hotGroup.add(hotBoiler);
    scene.add(hotGroup);
    hotSourceMeshRef.current = hotBoiler;

    // ==========================================
    // COLD RESERVOIR (LEFT-FRONT, x = -1.1, z = 0.4)
    // ==========================================
    const coldGroup = new THREE.Group();
    coldGroup.position.set(-1.1, 0.2, 0.4);
    const coldCondenser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.7, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    coldCondenser.position.y = 0.35;
    coldGroup.add(coldCondenser);
    scene.add(coldGroup);
    coldSourceMeshRef.current = coldCondenser;

    // ==========================================
    // CENTRAL WORKING CYLINDER (x = -0.3)
    // ==========================================
    const cylGroup = new THREE.Group();
    cylGroup.position.set(-0.3, 0.2, 0);
    scene.add(cylGroup);

    // Glass cylinder sleeve
    const cylGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 1.3, 32, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
        depthWrite: false,
      })
    );
    cylGlass.position.y = 0.65;
    cylGroup.add(cylGlass);

    // Gas inside cylinder
    const gasChamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.6, 28),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5 })
    );
    gasChamber.position.y = 0.3;
    cylGroup.add(gasChamber);
    gasChamberMeshRef.current = gasChamber;

    // Movable Piston
    const pGroup = new THREE.Group();
    pGroup.position.y = 0.6;
    const pHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 })
    );
    pGroup.add(pHead);

    const pPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    pPin.rotation.x = Math.PI / 2;
    pGroup.add(pPin);

    cylGroup.add(pGroup);
    pistonGroupRef.current = pGroup;

    // ==========================================
    // CRANKSHAFT & FLYWHEEL (RIGHT, x = 1.0)
    // ==========================================
    const crankCenter = new THREE.Vector3(1.0, 1.1, 0);

    // Bearing Pillar Stand
    const pillar1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.0, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
    );
    pillar1.position.set(1.0, 0.6, -0.4);
    scene.add(pillar1);

    const pillar2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.0, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
    );
    pillar2.position.set(1.0, 0.6, 0.4);
    scene.add(pillar2);

    // Rotating Flywheel & Crank Group
    const flywheelGroup = new THREE.Group();
    flywheelGroup.position.copy(crankCenter);
    scene.add(flywheelGroup);
    flywheelGroupRef.current = flywheelGroup;

    // Flywheel Rim (heavy brass/cast iron rim)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.09, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 })
    );
    flywheelGroup.add(rim);

    // Spokes (6 cross bars)
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.45, 16),
        new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.8 })
      );
      sp.rotation.z = (i * Math.PI) / 6;
      flywheelGroup.add(sp);
    }

    // Crankshaft Arm & Pin
    const crankArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.35, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
    );
    crankArm.position.y = 0.175;
    flywheelGroup.add(crankArm);

    // Connecting Rod (biela) between piston and crank pin
    const conRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.35, 16),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.15 })
    );
    scene.add(conRod);
    conRodRef.current = conRod;

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
      cameraAngleRef.current.radius = Math.max(2.6, Math.min(8.5, cameraAngleRef.current.radius + e.deltaY * 0.004));
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

    // ==========================================
    // ANIMATION LOOP (Flywheel rotation + Kinematics)
    // ==========================================
    const crankRadius = 0.32;
    const rodLength = 1.35;
    const cylX = -0.3;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (clock.isRunning) {
        // Rotate flywheel by angular velocity
        crankAngleRef.current += 0.04 * clock.speed;
        if (crankAngleRef.current > Math.PI * 2) {
          crankAngleRef.current -= Math.PI * 2;
        }
      }

      const angle = crankAngleRef.current;

      // Crank pin world position
      const pinX = 1.0 + Math.sin(angle) * crankRadius;
      const pinY = 1.1 + Math.cos(angle) * crankRadius;
      const pinZ = 0;

      // Piston height derived from crank slider kinematics
      // rodLength^2 = (pinX - cylX)^2 + (pinY - pistonY)^2
      const dx = pinX - cylX;
      const dy = Math.sqrt(Math.max(0.01, rodLength * rodLength - dx * dx));
      const pistonWorldY = pinY - dy;

      if (flywheelGroupRef.current) {
        flywheelGroupRef.current.rotation.z = -angle;
      }

      if (pistonGroupRef.current) {
        pistonGroupRef.current.position.y = Math.max(0.25, Math.min(1.2, pistonWorldY - 0.2));
      }

      // Gas chamber height inside cylinder
      if (gasChamberMeshRef.current && pistonGroupRef.current) {
        const gh = Math.max(0.1, pistonGroupRef.current.position.y);
        gasChamberMeshRef.current.scale.set(1, gh / 0.6, 1);
        gasChamberMeshRef.current.position.y = gh / 2;

        // Dynamic color tint based on cycle phase (hot red during expansion, cool blue during compression)
        const isHotPhase = angle >= 0 && angle < Math.PI;
        const mat = gasChamberMeshRef.current.material as THREE.MeshStandardMaterial;
        if (mat) {
          if (isHotPhase) {
            mat.color.setHex(0xf97316);
          } else {
            mat.color.setHex(0x38bdf8);
          }
        }
      }

      // Connecting rod position & orientation
      if (conRodRef.current && pistonGroupRef.current) {
        const pWorldPos = new THREE.Vector3(cylX, pistonGroupRef.current.position.y + 0.2, 0);
        const pinWorldPos = new THREE.Vector3(pinX, pinY, pinZ);

        const mid = new THREE.Vector3().addVectors(pWorldPos, pinWorldPos).multiplyScalar(0.5);
        conRodRef.current.position.copy(mid);

        // Orient rod along vector
        const dir = new THREE.Vector3().subVectors(pinWorldPos, pWorldPos);
        conRodRef.current.scale.set(1, dir.length() / rodLength, 1);
        conRodRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      }

      // Camera position
      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 1.1;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0.9, 0);

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
  }, [clock.speed, clock.isRunning]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      { key: 'carnotEfficiencyPct', label: 'Rendimento de Carnot η_C (%)', color: '#10b981', unit: '%' },
      { key: 'realEfficiencyPct', label: 'Rendimento Real η_real (%)', color: '#38bdf8', unit: '%' },
      { key: 'workNetJ', label: 'Trabalho Útil W_net (J)', color: '#f59e0b', unit: 'J' },
    ],
    []
  );

  const realEfficiency = state.carnotEfficiency * engineIrreversibility;
  const currentPhaseIndex = Math.floor((crankAngleRef.current / (Math.PI * 2)) * 4) % 4;

  const phaseNames = [
    { title: '1. Expansão Isotérmica (T_H)', desc: 'Absorve Q_H da caldeira mantendo temperatura alta.' },
    { title: '2. Expansão Adiabática', desc: 'Isolado termicamente (Q = 0); expande e resfria de T_H para T_C.' },
    { title: '3. Compressão Isotérmica (T_C)', desc: 'Rejeita calor Q_C para a fonte fria à temperatura mínima.' },
    { title: '4. Compressão Adiabática', desc: 'Isolado termicamente (Q = 0); comprimido até reaquecer a T_H.' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 3D Scene Container */}
      <div className="relative flex-1 h-[50vh] lg:h-full overflow-hidden bg-slate-950">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Physical Overlay Card */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-sm pointer-events-none">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" /> Máquina Térmica & 2ª Lei
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                η = 1 - T_C / T_H
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Rendimento de Carnot (η_C)</div>
                <div className="text-base font-black font-mono text-emerald-400">
                  {(state.carnotEfficiency * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Limite teórico absoluto</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Rendimento Real (η_real)</div>
                <div className="text-base font-black font-mono text-cyan-300">
                  {(realEfficiency * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{(engineIrreversibility * 100).toFixed(0)}% de Carnot</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Calor Absorvido (Q_H)</div>
                <div className="text-sm font-black font-mono text-orange-400">
                  {state.heatAbsorbedQH.toFixed(0)} <span className="text-xs text-slate-400 font-normal">J</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Fonte Quente ({tHot} K)</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Trabalho Líquido (W_net)</div>
                <div className="text-sm font-black font-mono text-amber-300">
                  {state.netWork.toFixed(0)} <span className="text-xs text-slate-400 font-normal">J</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Rejeitado Q_C: {state.heatRejectedQC.toFixed(0)} J</div>
              </div>
            </div>

            {/* Current Stage Indicator */}
            <div className="mt-2 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Fase Atual do Ciclo:</div>
              <div className="font-bold text-cyan-300 mt-0.5">{phaseNames[currentPhaseIndex].title}</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{phaseNames[currentPhaseIndex].desc}</div>
            </div>
          </div>
        </div>

        {/* Bottom Playback & Camera Controls */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <PlaybackBar
            clock={clock}
            onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
            onReset={() => {
              setTHot(600);
              setTCold(300);
              setEngineIrreversibility(0.75);
              crankAngleRef.current = 0;
              setDataBuffer([]);
            }}
            onStepForward={() => {
              crankAngleRef.current += 0.2;
              setClock((p) => ({ ...p, time: p.time + 0.05 }));
            }}
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
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Fontes Térmicas & Motor
          </button>
          <button
            onClick={() => setActiveSideTab('graphs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSideTab === 'graphs'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Eficiência & Rendimento
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {activeSideTab === 'controls' ? (
            <>
              {/* Exemplos Clássicos Presets Bar */}
              <ClassicPresetsBar
                moduleId="carnot_heat_engines"
                currentParams={{ tHot, tCold, moles, v1, v2, engineIrreversibility }}
                onSelectPreset={applyPreset}
              />

              {/* Hot Reservoir THot */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500" /> Fonte Quente (T_H)
                  </span>
                  <span className="font-mono text-red-400 text-xs font-bold">
                    {tHot} K ({(tHot - 273.15).toFixed(0)} °C)
                  </span>
                </div>
                <input
                  type="range"
                  min={350}
                  max={1000}
                  step={10}
                  value={tHot}
                  onChange={(e) => setTHot(Math.max(tCold + 20, parseFloat(e.target.value)))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>350 K (Morno)</span>
                  <span>1000 K (Fornalha industrial)</span>
                </div>
              </div>

              {/* Cold Reservoir TCold */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-400" /> Fonte Fria (T_C)
                  </span>
                  <span className="font-mono text-cyan-400 text-xs font-bold">
                    {tCold} K ({(tCold - 273.15).toFixed(0)} °C)
                  </span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={450}
                  step={10}
                  value={tCold}
                  onChange={(e) => setTCold(Math.min(tHot - 20, parseFloat(e.target.value)))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>150 K (Criogênico)</span>
                  <span>300 K (Ambiente)</span>
                  <span>450 K</span>
                </div>
              </div>

              {/* Real Engine Irreversibility Factor */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Fator de Reversibilidade da Máquina
                  </span>
                  <span className="font-mono text-indigo-300 text-xs font-bold">
                    {(engineIrreversibility * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1.0}
                  step={0.05}
                  value={engineIrreversibility}
                  onChange={(e) => setEngineIrreversibility(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>30% (Motor a vapor real)</span>
                  <span>75% (Turbina moderna)</span>
                  <span>100% (Carnot Ideal)</span>
                </div>
              </div>

              {/* Mathematical Equation Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Limite de Carnot</span>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex justify-center text-sm">
                  <KaTeXMath math="\eta_C = 1 - \frac{T_C}{T_H} = \frac{W_{\text{net}}}{Q_H} \quad (\text{com } T \text{ em Kelvin})" block />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Telemetry Chart */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Comparação de Rendimento & Potência do Ciclo
                </span>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="Rendimento de Carnot vs Real (%) e Trabalho Útil (J)"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>
              </div>

              {/* Thermodynamic 2nd Law analysis */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <span className="font-mono uppercase font-bold text-cyan-400">Postulados da 2ª Lei</span>
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    • <strong>Enunciado de Kelvin-Planck:</strong> É impossível construir um dispositivo que opere em ciclo termodinâmico e produza apenas trabalho trocando calor com um único reservatório térmico.
                  </p>
                  <p>
                    • Por essa razão física, dos <strong className="text-orange-400">{state.heatAbsorbedQH.toFixed(0)} J</strong> fornecidos pela fonte quente, obrigatoriamente <strong className="text-cyan-400">{state.heatRejectedQC.toFixed(0)} J</strong> são descartados na fonte fria.
                  </p>
                  <p>
                    • O trabalho máximo realizável no eixo é de <strong className="text-emerald-400">{state.netWork.toFixed(0)} J</strong> por ciclo.
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

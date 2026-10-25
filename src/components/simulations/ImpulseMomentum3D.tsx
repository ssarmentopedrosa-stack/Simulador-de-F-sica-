import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateImpulseCollision, ImpulseState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Shield, ShieldAlert, ShieldCheck, AlertOctagon, Activity } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface ImpulseMomentum3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const ImpulseMomentum3D: React.FC<ImpulseMomentum3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [speedKmH, setSpeedKmH] = useState<number>(
    () => (initialParams?.speedKmH != null ? Number(initialParams.speedKmH) : 60.0)
  );
  const [mass, setMass] = useState<number>(
    () => (initialParams?.mass != null ? Number(initialParams.mass) : 75.0)
  );
  const [device, setDevice] = useState<'airbag' | 'helmet' | 'rigid_wall'>(
    () => (initialParams?.device as 'airbag' | 'helmet' | 'rigid_wall') || 'airbag'
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.speedKmH !== undefined) setSpeedKmH(Number(p.speedKmH));
    if (p.mass !== undefined) setMass(Number(p.mass));
    if (p.device !== undefined) setDevice(p.device);
  }, []);

  useEffect(() => {
    onParamsChange?.({ speedKmH, mass, device });
  }, [speedKmH, mass, device, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.speedKmH !== undefined) setSpeedKmH(Number(initialParams.speedKmH));
      if (initialParams.mass !== undefined) setMass(Number(initialParams.mass));
      if (initialParams.device !== undefined) setDevice(initialParams.device);
    }
  }, [initialParams]);

  const speedMs = useMemo(() => speedKmH / 3.6, [speedKmH]);

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

  const timeRef = useRef<number>(clock.time);
  timeRef.current = clock.time;

  // Derived Physical State
  const impulseState: ImpulseState = useMemo(() => {
    return calculateImpulseCollision(mass, speedMs, device);
  }, [mass, speedMs, device]);

  // Motion cycle parameters: sled approaches from x = -8 to x = 0 (barrier at 0)
  const approachDistance = 7.0; // meters in 3D
  const approachTime = useMemo(() => {
    return Math.max(0.6, approachDistance / Math.max(1, speedMs * 0.5));
  }, [speedMs]);

  const cycleDuration = useMemo(() => {
    return approachTime + impulseState.duration + 1.2;
  }, [approachTime, impulseState.duration]);

  // Current kinematic position and force at instant t
  const currentDynamics = useMemo(() => {
    const cycleTime = clock.time % cycleDuration;
    const impactStartTime = approachTime;
    const impactEndTime = approachTime + impulseState.duration;

    let posX = -approachDistance;
    let currentV = speedMs;
    let currentForce = 0;
    let isImpacting = false;
    let airbagExpansion = 0;

    if (cycleTime < impactStartTime) {
      // Free approach
      const fraction = cycleTime / impactStartTime;
      posX = -approachDistance + fraction * approachDistance;
      currentV = speedMs;
      currentForce = 0;
      isImpacting = false;
      airbagExpansion = 0;
    } else if (cycleTime >= impactStartTime && cycleTime <= impactEndTime) {
      // In collision contact
      isImpacting = true;
      const tInImpact = cycleTime - impactStartTime;
      currentForce = impulseState.forceAtTime(tInImpact);

      // Deceleration curve from speedMs to 0
      const progressInImpact = tInImpact / impulseState.duration;
      currentV = Math.max(0, speedMs * (1 - Math.sin((Math.PI * progressInImpact) / 2)));
      // Cart compresses into cushion by up to 0.4m
      const maxCrumple = device === 'airbag' ? 0.45 : device === 'helmet' ? 0.2 : 0.03;
      posX = -maxCrumple * Math.sin(Math.PI * progressInImpact);
      airbagExpansion = Math.sin((Math.PI * progressInImpact) / 2);
    } else {
      // Post-crash stopped
      posX = 0;
      currentV = 0;
      currentForce = 0;
      isImpacting = false;
      airbagExpansion = 0.8;
    }

    return {
      cycleTime,
      posX,
      currentV,
      currentForce,
      isImpacting,
      airbagExpansion,
    };
  }, [clock.time, cycleDuration, approachTime, impulseState, speedMs, device]);

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sledGroupRef = useRef<THREE.Group | null>(null);
  const airbagMeshRef = useRef<THREE.Mesh | null>(null);
  const forceArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const velArrowRef = useRef<THREE.ArrowHelper | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.35,
    phi: 0.65,
    radius: 13.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update telemetry data for F(t) chart
  useEffect(() => {
    const pts: DataPoint[] = [];
    const totalSteps = 80;
    const dt = impulseState.duration;

    for (let i = 0; i <= totalSteps; i++) {
      const tMs = (i / totalSteps) * (dt * 1000);
      const tSec = tMs / 1000;
      const f = impulseState.forceAtTime(tSec);
      pts.push({
        t: Number(tMs.toFixed(1)),
        force: Number((f / 1000).toFixed(2)), // in kN
        avgForce: Number((impulseState.averageForce / 1000).toFixed(2)),
      });
    }
    setDataBuffer(pts);
  }, [impulseState]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(8, 14, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const redFlash = new THREE.PointLight(0xf43f5e, 1.0, 15);
    redFlash.position.set(0, 1.5, 0);
    scene.add(redFlash);

    // Ground Track
    const groundGeo = new THREE.PlaneGeometry(24, 8);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(24, 24, 0x0284c7, 0x1e293b);
    grid.position.y = 0.005;
    scene.add(grid);

    // Concrete Crash Barrier Wall (at x = 0.5)
    const wallGeo = new THREE.BoxGeometry(0.8, 2.5, 3.2);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0.4, 1.25, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    // Hazard Stripes on barrier face
    const stripeGeo = new THREE.PlaneGeometry(0.02, 2.4);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.y = -Math.PI / 2;
    stripe.position.set(-0.01, 1.25, 0);
    scene.add(stripe);

    // Inflatable Airbag Cushion / Helmet Cushion mesh
    const airbagGeo = new THREE.SphereGeometry(0.6, 24, 16);
    const airbagMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const airbag = new THREE.Mesh(airbagGeo, airbagMat);
    airbag.scale.set(0.1, 0.9, 0.9);
    airbag.position.set(-0.1, 1.0, 0);
    airbagMeshRef.current = airbag;
    scene.add(airbag);

    // Test Sled / Vehicle with Dummy
    const sledGroup = new THREE.Group();
    sledGroupRef.current = sledGroup;

    // Sled chassis
    const chassisGeo = new THREE.BoxGeometry(2.0, 0.6, 1.3);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.4 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.4;
    chassis.castShadow = true;
    sledGroup.add(chassis);

    // Dummy Head & Torso
    const torsoGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.55, 12);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(-0.2, 0.95, 0);
    sledGroup.add(torso);

    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(-0.2, 1.38, 0);
    sledGroup.add(head);

    // Helmet mesh (if helmet active)
    const helmetGeo = new THREE.SphereGeometry(0.21, 16, 16);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.8 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(-0.2, 1.4, 0);
    sledGroup.add(helmet);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    [[-0.6, 0.18, 0.65], [0.6, 0.18, 0.65], [-0.6, 0.18, -0.65], [0.6, 0.18, -0.65]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, wy, wz);
      sledGroup.add(w);
    });

    scene.add(sledGroup);

    // Vector Arrows
    // Velocity vector (Cyan)
    const arrVel = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.0, 0x38bdf8, 0.35, 0.16);
    velArrowRef.current = arrVel;
    scene.add(arrVel);

    // Collision Force vector (Rose, pointing backward)
    const arrForce = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 2.0, 0xf43f5e, 0.35, 0.16);
    forceArrowRef.current = arrForce;
    scene.add(arrForce);

    // Mouse Interaction
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(6, Math.min(26, cameraAngleRef.current.radius + e.deltaY * 0.02));
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Main Render Loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const deltaSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (clock.isRunning) {
        timeRef.current += Math.min(deltaSec, 0.1) * clock.speed;
        setClock((prev) => ({
          ...prev,
          time: timeRef.current,
        }));
      }

      // Camera
      const cam = cameraRef.current;
      if (cam) {
        if (clock.is2DView) {
          cam.position.set(-2, 14, 0.01);
          cam.lookAt(-2, 1.0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta) - 2.0;
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(-1.5, 1.0, 0);
        }
      }

      // Sled Position
      const { posX, currentV, currentForce, isImpacting, airbagExpansion } = currentDynamics;
      if (sledGroupRef.current) {
        sledGroupRef.current.position.set(posX - 1.0, 0, 0);
      }

      // Airbag Cushion Animation
      if (airbagMeshRef.current) {
        if (device === 'airbag') {
          airbagMeshRef.current.visible = true;
          const scaleX = 0.1 + airbagExpansion * 0.7;
          const scaleYZ = 0.3 + airbagExpansion * 0.8;
          airbagMeshRef.current.scale.set(scaleX, scaleYZ, scaleYZ);
        } else if (device === 'helmet') {
          airbagMeshRef.current.visible = false;
        } else {
          airbagMeshRef.current.visible = false;
        }
      }

      // Vector Arrows
      if (clock.showVectors) {
        if (velArrowRef.current) {
          velArrowRef.current.visible = currentV > 0.1;
          velArrowRef.current.position.set(posX, 1.0, 0.7);
          velArrowRef.current.setDirection(new THREE.Vector3(1, 0, 0));
          velArrowRef.current.setLength(Math.max(0.3, currentV * 0.12), 0.3, 0.12);
        }

        if (forceArrowRef.current) {
          forceArrowRef.current.visible = isImpacting && currentForce > 10;
          forceArrowRef.current.position.set(posX, 1.0, 0);
          forceArrowRef.current.setDirection(new THREE.Vector3(-1, 0, 0));
          const fScale = 0.00004; // scale kN to 3D units
          forceArrowRef.current.setLength(Math.max(0.3, currentForce * fScale), 0.35, 0.14);
        }
      } else {
        if (velArrowRef.current) velArrowRef.current.visible = false;
        if (forceArrowRef.current) forceArrowRef.current.visible = false;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [clock.isRunning, clock.speed, clock.is2DView, clock.showVectors, currentDynamics, device]);

  const chartSeries: ChartSeries[] = [
    { key: 'force', label: 'Força de Impacto Instantânea F(t)', color: '#f43f5e', unit: 'kN' },
    { key: 'avgForce', label: 'Força Média F_méd', color: '#f59e0b', unit: 'kN' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Impulso Total', symbol: 'I', value: impulseState.impulse, unit: 'N·s', precision: 0, highlight: true },
    { label: 'Força de Pico', symbol: 'F_pico', value: impulseState.peakForce / 1000, unit: 'kN', precision: 1, highlight: true },
    { label: 'Força Média', symbol: 'F_méd', value: impulseState.averageForce / 1000, unit: 'kN', precision: 1 },
    { label: 'Desaceleração', symbol: 'a_pico', value: impulseState.peakGForce, unit: 'g', precision: 1 },
    { label: 'Duração', symbol: 'Δt', value: impulseState.duration * 1000, unit: 'ms', precision: 0 },
    { label: 'Velocidade Inicial', symbol: 'v₀', value: speedMs, unit: 'm/s', precision: 1 },
    { label: 'Momento Linear', symbol: 'p₀', value: mass * speedMs, unit: 'kg·m/s', precision: 0 },
  ];

  // Biomechanical safety assessment
  const gForce = impulseState.peakGForce;
  const riskStatus =
    gForce < 25
      ? { label: 'Sobrevivência Alta (Baixo Risco)', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800' }
      : gForce < 60
      ? { label: 'Risco Moderado (Lesões Tratáveis)', color: 'text-amber-400 bg-amber-950/80 border-amber-800' }
      : { label: 'Risco Crítico / Letal (> 60g)', color: 'text-rose-400 bg-rose-950/80 border-rose-800' };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Header Tag */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">MECÂNICA CLÁSSICA · IMPULSO E COLISÕES</span>
              <span className="text-xs text-slate-300">Teorema do Impulso, Gráficos F × t e Segurança com Airbag / Capacete</span>
            </div>
          </div>

          {/* Guided Experiment Button */}
          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-lg transition-colors border border-blue-400/40 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Experimento Guiado</span>
            </button>
          )}

          {/* Biomechanical Risk Badge */}
          <div className="absolute top-16 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium backdrop-blur-md flex items-center gap-2 shadow-lg ${riskStatus.color}`}>
              {gForce < 25 ? <ShieldCheck className="w-4 h-4" /> : gForce < 60 ? <Shield className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
              <span>{riskStatus.label}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 backdrop-blur-sm">
              <span>{impulseState.deviceLabel}</span>
            </div>
          </div>

          {/* Quantities Overlay Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 overflow-x-auto z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-950/85 border border-slate-800/90 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md">
              {quantities.map((q, idx) => (
                <div key={idx} className="flex items-baseline gap-1 text-xs whitespace-nowrap px-1.5 border-r border-slate-800 last:border-none">
                  <span className="text-slate-400 font-medium">{q.symbol}:</span>
                  <span className={`font-mono font-semibold ${q.highlight ? 'text-cyan-400' : 'text-slate-200'}`}>
                    {q.value.toFixed(q.precision ?? 2)}
                  </span>
                  <span className="text-[10px] text-slate-500">{q.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side Panel: Tabs for Controls and Graphs */}
        <div className="w-full md:w-96 lg:w-[420px] bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-full overflow-hidden shrink-0">
          <div className="flex items-center p-2.5 border-b border-slate-800 bg-slate-950/60 gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSideTab('controls')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'controls'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parâmetros</span>
            </button>
            <button
              onClick={() => setActiveSideTab('graphs')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'graphs'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Gráficos em Tempo Real</span>
            </button>
          </div>

          {/* Tab 1: Parameters */}
          {activeSideTab === 'controls' && (
            <div className="p-3.5 flex flex-col gap-3.5 overflow-y-auto flex-1">
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="impulse_momentum"
                onApplyPreset={applyPreset}
                currentParams={{ speedKmH, mass, device }}
              />

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros de Impacto</span>
                <span className="text-[10px] text-cyan-400 font-mono">Crash Test 3D</span>
              </div>

              {/* Cushioning Device Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Dispositivo de Atenuação:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'airbag', label: 'Airbag Automotivo (140 ms)', desc: 'Expansão pirotécnica, desaceleração suave' },
                    { id: 'helmet', label: 'Capacete de Proteção (60 ms)', desc: 'Compressão do poliestireno (EPS)' },
                    { id: 'rigid_wall', label: 'Barreira Rígida (12 ms)', desc: 'Impacto direto sem deformação programada' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDevice(d.id as any)}
                      className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                        device === d.id
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-medium'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold">{d.label}</div>
                      <div className="text-[10px] text-slate-500">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed (km/h) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Velocidade de Impacto:</span>
                  <span className="font-mono text-cyan-400 font-medium">
                    {speedKmH.toFixed(0)} km/h ({speedMs.toFixed(1)} m/s)
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={speedKmH}
                  onChange={(e) => setSpeedKmH(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Mass (kg) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Massa do Corpo / Dummy:</span>
                  <span className="font-mono text-slate-200 font-medium">{mass.toFixed(0)} kg</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="110"
                  step="5"
                  value={mass}
                  onChange={(e) => setMass(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Formulas Card */}
              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Teorema do Impulso</span>
                  <KaTeXMath math="\vec{I} = \int_{0}^{\Delta t} \vec{F}\,dt = \Delta \vec{p} = m\vec{v}_f - m\vec{v}_0" block />
                  <KaTeXMath math="F_{\text{méd}} = \frac{|\Delta p|}{\Delta t}, \quad F_{\text{pico}} = \frac{\pi}{2} F_{\text{méd}}" block />
                  <KaTeXMath math="\Delta t \uparrow \implies F_{\text{pico}} \downarrow \quad (\text{Princípio do Airbag})" block />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Graphs */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Curva de Força de Impacto</span>
                <span className="text-[10px] font-mono text-cyan-400">Área = Impulso</span>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={0}
                height={260}
                title={`Perfil de Força de Impacto F(t) vs Tempo (Área Sombreada = Impulso I = ${impulseState.impulse.toFixed(0)} N·s)`}
                xLabel="Tempo de Contato t"
                xUnit="ms"
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Princípio Biomecânico:</span>
                <span>• O Impulso total I = Δp depende exclusivamente de m e v₀.</span>
                <span>• Ao aumentar o tempo de frenagem Δt com o airbag, a Força Máxima de impacto é drasticamente reduzida, salvando vidas humanas.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80">
        <PlaybackBar
          clock={clock}
          onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
          onReset={handleReset}
          onStepForward={() => {
            timeRef.current += 0.05;
            setClock((p) => ({ ...p, time: timeRef.current }));
          }}
          onChangeSpeed={(s) => setClock((p) => ({ ...p, speed: s }))}
          onToggleVectors={() => setClock((p) => ({ ...p, showVectors: !p.showVectors }))}
          onToggleTrajectories={() => setClock((p) => ({ ...p, showTrajectories: !p.showTrajectories }))}
          onToggleFormulas={() => setClock((p) => ({ ...p, showFormulas: !p.showFormulas }))}
          onToggle2DView={() => setClock((p) => ({ ...p, is2DView: !p.is2DView }))}
          onResetCamera={() => {
            cameraAngleRef.current = { theta: 0.35, phi: 0.65, radius: 13.0 };
          }}
        />
      </div>
    </div>
  );
};

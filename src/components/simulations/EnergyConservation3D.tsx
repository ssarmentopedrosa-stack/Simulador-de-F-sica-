import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateRollerCoasterState, getTrackGeometry, RollerCoasterState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, AlertTriangle, CheckCircle, ShieldCheck, Activity } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface EnergyConservation3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const EnergyConservation3D: React.FC<EnergyConservation3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [initialHeight, setInitialHeight] = useState<number>(
    () => (initialParams?.initialHeight != null ? Number(initialParams.initialHeight) : 8.5)
  );
  const [loopRadius, setLoopRadius] = useState<number>(
    () => (initialParams?.loopRadius != null ? Number(initialParams.loopRadius) : 2.5)
  );
  const [mass, setMass] = useState<number>(
    () => (initialParams?.mass != null ? Number(initialParams.mass) : 2.0)
  );
  const [frictionCoeff, setFrictionCoeff] = useState<number>(
    () => (initialParams?.frictionCoeff != null ? Number(initialParams.frictionCoeff) : 0.0)
  );
  const [gravity, setGravity] = useState<number>(9.8);
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.initialHeight !== undefined) setInitialHeight(Number(p.initialHeight));
    if (p.loopRadius !== undefined) setLoopRadius(Number(p.loopRadius));
    if (p.mass !== undefined) setMass(Number(p.mass));
    if (p.frictionCoeff !== undefined) setFrictionCoeff(Number(p.frictionCoeff));
  }, []);

  useEffect(() => {
    onParamsChange?.({ initialHeight, loopRadius, mass, frictionCoeff });
  }, [initialHeight, loopRadius, mass, frictionCoeff, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.initialHeight !== undefined) setInitialHeight(Number(initialParams.initialHeight));
      if (initialParams.loopRadius !== undefined) setLoopRadius(Number(initialParams.loopRadius));
      if (initialParams.mass !== undefined) setMass(Number(initialParams.mass));
      if (initialParams.frictionCoeff !== undefined) setFrictionCoeff(Number(initialParams.frictionCoeff));
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

  const timeRef = useRef<number>(clock.time);
  timeRef.current = clock.time;

  // Track geometry points
  const trackPoints = useMemo(() => {
    return getTrackGeometry(24, loopRadius, initialHeight);
  }, [loopRadius, initialHeight]);

  // Track total length
  const totalTrackLength = useMemo(() => {
    return trackPoints.length > 0 ? trackPoints[trackPoints.length - 1].arcLength : 25;
  }, [trackPoints]);

  // Normalized progress cycle (0 to 1)
  const currentProgress = useMemo(() => {
    // Average speed ~ sqrt(2 * g * h0 * 0.5)
    const vApprox = Math.max(2, Math.sqrt(gravity * initialHeight * 0.8));
    const cyclePeriod = Math.max(1.5, totalTrackLength / vApprox);
    const modTime = clock.time % (cyclePeriod + 1.0);
    return Math.min(1.0, modTime / cyclePeriod);
  }, [clock.time, gravity, initialHeight, totalTrackLength]);

  // Derived Physical State
  const currentState: RollerCoasterState = useMemo(() => {
    return calculateRollerCoasterState(currentProgress, initialHeight, mass, frictionCoeff, gravity, loopRadius);
  }, [currentProgress, initialHeight, mass, frictionCoeff, gravity, loopRadius]);

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cartMeshRef = useRef<THREE.Group | null>(null);
  const trackTubeMeshRef = useRef<THREE.Mesh | null>(null);
  const trackRailsRef = useRef<THREE.LineSegments | null>(null);
  const normalArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const weightArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const velArrowRef = useRef<THREE.ArrowHelper | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.45,
    phi: 0.6,
    radius: 18.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update telemetry data for chart
  useEffect(() => {
    setDataBuffer((prev) => {
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].t - clock.time) < 0.0001) {
        return prev;
      }
      const newPt: DataPoint = {
        t: Number(clock.time.toFixed(2)),
        ec: currentState.kineticEnergy,
        ep: currentState.potentialEnergy,
        em: currentState.mechanicalEnergy,
        ediss: currentState.dissipatedEnergy,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, currentState]);

  // Build Three.js 3D Track Curve & Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.02);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    mainLight.position.set(12, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0x10b981, 1.2, 40);
    fillLight.position.set(-10, 8, -6);
    scene.add(fillLight);

    // Ground Plane with Grid
    const groundGeo = new THREE.PlaneGeometry(36, 18);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.85,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(36, 36, 0x0284c7, 0x1e293b);
    grid.position.y = 0.005;
    scene.add(grid);

    // Cart 3D Mesh
    const cartGroup = new THREE.Group();
    cartMeshRef.current = cartGroup;

    // Cart Body
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.45, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.6,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.25;
    body.castShadow = true;
    cartGroup.add(body);

    // Cockpit windscreen
    const screenGeo = new THREE.ConeGeometry(0.2, 0.35, 4);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.rotation.z = -Math.PI / 2;
    screen.position.set(0.25, 0.45, 0);
    cartGroup.add(screen);

    // Cart Wheels
    const wGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const wOffsets = [
      [-0.3, 0.1, 0.35],
      [0.3, 0.1, 0.35],
      [-0.3, 0.1, -0.35],
      [0.3, 0.1, -0.35],
    ];
    wOffsets.forEach(([ox, oy, oz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(ox, oy, oz);
      cartGroup.add(w);
    });

    scene.add(cartGroup);

    // Vector Arrows
    const arrNormal = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x10b981, 0.3, 0.14);
    normalArrowRef.current = arrNormal;
    scene.add(arrNormal);

    const arrWeight = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 1.5, 0xf59e0b, 0.3, 0.14);
    weightArrowRef.current = arrWeight;
    scene.add(arrWeight);

    const arrVel = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x38bdf8, 0.3, 0.14);
    velArrowRef.current = arrVel;
    scene.add(arrVel);

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
      cameraAngleRef.current.radius = Math.max(8, Math.min(32, cameraAngleRef.current.radius + e.deltaY * 0.02));
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

  // Update Dynamic Track Tube Mesh when initialHeight or loopRadius changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (trackTubeMeshRef.current) {
      scene.remove(trackTubeMeshRef.current);
      trackTubeMeshRef.current.geometry.dispose();
    }
    if (trackRailsRef.current) {
      scene.remove(trackRailsRef.current);
      trackRailsRef.current.geometry.dispose();
    }

    // Convert track points to 3D curve
    const curvePoints = trackPoints.map((pt) => new THREE.Vector3(pt.x, pt.y, pt.z));
    const catmull = new THREE.CatmullRomCurve3(curvePoints);

    // Main central rail
    const tubeGeo = new THREE.TubeGeometry(catmull, 200, 0.08, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.15,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    trackTubeMeshRef.current = tubeMesh;
    scene.add(tubeMesh);

    // Secondary parallel support rails & cross ties
    const railLinePoints: THREE.Vector3[] = [];
    trackPoints.forEach((pt, idx) => {
      if (idx % 4 === 0) {
        // Cross ties
        railLinePoints.push(new THREE.Vector3(pt.x, pt.y, -0.35));
        railLinePoints.push(new THREE.Vector3(pt.x, pt.y, 0.35));

        // Vertical support pillars to the ground
        if (pt.y > 0.4 && idx % 16 === 0) {
          railLinePoints.push(new THREE.Vector3(pt.x, pt.y, 0));
          railLinePoints.push(new THREE.Vector3(pt.x, 0, 0));
        }
      }
    });

    const railsGeo = new THREE.BufferGeometry().setFromPoints(railLinePoints);
    const railsMat = new THREE.LineBasicMaterial({ color: 0x475569, opacity: 0.8, transparent: true });
    const railsMesh = new THREE.LineSegments(railsGeo, railsMat);
    trackRailsRef.current = railsMesh;
    scene.add(railsMesh);
  }, [trackPoints]);

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
          cam.position.set(0, 18, 0.01);
          cam.lookAt(0, 4.0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 3.5, 0);
        }
      }

      // Position and Orient Cart along Track
      if (cartMeshRef.current && trackPoints.length > 0) {
        const u = currentProgress;
        const totalIdx = trackPoints.length - 1;
        const exactIdx = u * totalIdx;
        const idxA = Math.floor(exactIdx);
        const idxB = Math.min(totalIdx, idxA + 1);
        const frac = exactIdx - idxA;

        const pA = trackPoints[idxA];
        const pB = trackPoints[idxB];

        const posX = pA.x + frac * (pB.x - pA.x);
        const posY = pA.y + frac * (pB.y - pA.y);
        const posZ = pA.z + frac * (pB.z - pA.z);

        cartMeshRef.current.position.set(posX, posY, posZ);

        // Compute tangent direction for orientation
        const tx = pB.x - pA.x;
        const ty = pB.y - pA.y;
        const tz = pB.z - pA.z;
        const tangent = new THREE.Vector3(tx, ty, tz).normalize();

        const rollAngle = Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
        cartMeshRef.current.rotation.z = rollAngle;

        // Normal Vector
        const normalVec = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();

        // Update Vector Arrows
        if (clock.showVectors) {
          const vecScale = 0.02;

          // Normal Force (Emerald)
          if (normalArrowRef.current) {
            normalArrowRef.current.visible = true;
            normalArrowRef.current.position.set(posX, posY + 0.25, posZ);
            normalArrowRef.current.setDirection(normalVec);
            normalArrowRef.current.setLength(Math.max(0.3, currentState.normalForce * vecScale), 0.3, 0.12);
          }

          // Weight Force (Amber)
          if (weightArrowRef.current) {
            weightArrowRef.current.visible = true;
            weightArrowRef.current.position.set(posX, posY, posZ);
            weightArrowRef.current.setDirection(new THREE.Vector3(0, -1, 0));
            weightArrowRef.current.setLength(Math.max(0.3, mass * gravity * vecScale), 0.3, 0.12);
          }

          // Velocity Vector (Cyan)
          if (velArrowRef.current) {
            velArrowRef.current.visible = true;
            velArrowRef.current.position.set(posX, posY + 0.25, posZ);
            velArrowRef.current.setDirection(tangent);
            velArrowRef.current.setLength(Math.max(0.3, currentState.velocity * 0.2), 0.3, 0.12);
          }
        } else {
          if (normalArrowRef.current) normalArrowRef.current.visible = false;
          if (weightArrowRef.current) weightArrowRef.current.visible = false;
          if (velArrowRef.current) velArrowRef.current.visible = false;
        }
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
  }, [clock.isRunning, clock.speed, clock.is2DView, clock.showVectors, currentProgress, currentState, gravity, mass, trackPoints]);

  const chartSeries: ChartSeries[] = [
    { key: 'ec', label: 'Energia Cinética Ec', color: '#38bdf8', unit: 'J' },
    { key: 'ep', label: 'Energia Potencial Gravitacional Ep', color: '#10b981', unit: 'J' },
    { key: 'em', label: 'Energia Mecânica Total Em', color: '#f59e0b', unit: 'J' },
    { key: 'ediss', label: 'Energia Dissipada por Atrito Ediss', color: '#f43f5e', unit: 'J' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Energia Mecânica', symbol: 'E_m', value: currentState.mechanicalEnergy, unit: 'J', precision: 1, highlight: true },
    { label: 'Energia Cinética', symbol: 'E_c', value: currentState.kineticEnergy, unit: 'J', precision: 1 },
    { label: 'Energia Potencial', symbol: 'E_p', value: currentState.potentialEnergy, unit: 'J', precision: 1 },
    { label: 'Energia Dissipada', symbol: 'E_diss', value: currentState.dissipatedEnergy, unit: 'J', precision: 1 },
    { label: 'Velocidade', symbol: 'v', value: currentState.velocity, unit: 'm/s', precision: 2, highlight: true },
    { label: 'Altura', symbol: 'h', value: currentState.y, unit: 'm', precision: 2 },
    { label: 'Força Normal', symbol: 'N', value: currentState.normalForce, unit: 'N', precision: 1 },
    { label: 'Peso Aparente', symbol: 'N/mg', value: currentState.apparentWeightRatio, unit: 'g', precision: 2 },
  ];

  // Fraction percentages for energy bar
  const totalE0 = Math.max(1, currentState.totalInitialEnergy);
  const pctEc = Math.min(100, Math.max(0, (currentState.kineticEnergy / totalE0) * 100));
  const pctEp = Math.min(100, Math.max(0, (currentState.potentialEnergy / totalE0) * 100));
  const pctEdiss = Math.min(100, Math.max(0, (currentState.dissipatedEnergy / totalE0) * 100));

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Header Tag */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">CONSERVAÇÃO DA ENERGIA MECÂNICA</span>
              <span className="text-xs text-slate-300">Montanha-Russa 3D, Looping Circular e Dissipação por Atrito</span>
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

          {/* Real-time Dynamic Energy Balance Bar Overlay */}
          <div className="absolute top-16 left-3 z-10 flex flex-col gap-1.5 pointer-events-none max-w-xs w-64">
            <div className="bg-slate-950/85 border border-slate-800 p-2.5 rounded-lg shadow-xl backdrop-blur-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 font-semibold">Balanço de Energia:</span>
                <span className="text-amber-400 font-bold">{currentState.totalInitialEnergy.toFixed(0)} J</span>
              </div>

              {/* Stacked Energy Bar */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                <div style={{ width: `${pctEc}%` }} className="bg-cyan-400 h-full transition-all duration-75" title="Energia Cinética" />
                <div style={{ width: `${pctEp}%` }} className="bg-emerald-500 h-full transition-all duration-75" title="Energia Potencial" />
                <div style={{ width: `${pctEdiss}%` }} className="bg-rose-500 h-full transition-all duration-75" title="Energia Dissipada" />
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono pt-1">
                <div className="text-cyan-400 flex flex-col">
                  <span className="text-slate-500 text-[9px]">Ec</span>
                  <span>{currentState.kineticEnergy.toFixed(0)} J</span>
                </div>
                <div className="text-emerald-400 flex flex-col">
                  <span className="text-slate-500 text-[9px]">Ep</span>
                  <span>{currentState.potentialEnergy.toFixed(0)} J</span>
                </div>
                <div className="text-rose-400 flex flex-col">
                  <span className="text-slate-500 text-[9px]">Ediss</span>
                  <span>{currentState.dissipatedEnergy.toFixed(0)} J</span>
                </div>
              </div>
            </div>

            {/* Loop Safety Badge */}
            <div className={`px-2.5 py-1.5 rounded-md border text-xs font-mono flex items-center gap-1.5 backdrop-blur-md shadow-md ${
              currentState.loopSafe
                ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300'
                : 'bg-amber-950/80 border-amber-800/80 text-amber-300'
            }`}>
              {currentState.loopSafe ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span>{currentState.loopSafe ? 'Loop Seguro (N ≥ 0 no topo)' : 'Alerta: Risco de Queda no Ápice!'}</span>
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
                moduleId="energy_conservation"
                onApplyPreset={applyPreset}
                currentParams={{ initialHeight, loopRadius, mass, frictionCoeff }}
              />

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros da Pista</span>
                <span className="text-[10px] text-cyan-400 font-mono">3D Gravitacional</span>
              </div>

              {/* Initial Height (h0) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Altura de Partida (h₀):</span>
                  <span className="font-mono text-cyan-400 font-medium">{initialHeight.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="16.0"
                  step="0.5"
                  value={initialHeight}
                  onChange={(e) => setInitialHeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Loop Radius (R) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Raio do Looping (R):</span>
                  <span className="font-mono text-emerald-400 font-medium">{loopRadius.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.25"
                  value={loopRadius}
                  onChange={(e) => setLoopRadius(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>h_mín teórica (2,5 R):</span>
                  <span className="font-mono text-amber-400">{(2.5 * loopRadius).toFixed(2)} m</span>
                </div>
              </div>

              {/* Cart Mass (m) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Massa do Carrinho (m):</span>
                  <span className="font-mono text-slate-200 font-medium">{mass.toFixed(1)} kg</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={mass}
                  onChange={(e) => setMass(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Friction Coefficient (mu) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Coeficiente de Atrito (μ):</span>
                  <span className="font-mono text-rose-400 font-medium">{frictionCoeff.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.06"
                  step="0.005"
                  value={frictionCoeff}
                  onChange={(e) => setFrictionCoeff(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => setFrictionCoeff(0.0)}
                    className={`flex-1 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                      frictionCoeff === 0.0 ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Sem Atrito (Conservativo)
                  </button>
                  <button
                    onClick={() => setFrictionCoeff(0.03)}
                    className={`flex-1 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                      frictionCoeff > 0 ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Com Atrito (μ = 0,03)
                  </button>
                </div>
              </div>

              {/* Gravity Preset */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Campo Gravitacional (g):</span>
                  <span className="font-mono text-cyan-400 font-medium">{gravity.toFixed(1)} m/s²</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {[
                    { label: 'Terra', val: 9.8 },
                    { label: 'Lua', val: 1.62 },
                    { label: 'Marte', val: 3.7 },
                  ].map((gPreset) => (
                    <button
                      key={gPreset.label}
                      onClick={() => setGravity(gPreset.val)}
                      className={`py-1 rounded cursor-pointer font-mono ${
                        Math.abs(gravity - gPreset.val) < 0.1
                          ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {gPreset.label} ({gPreset.val})
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulas Card */}
              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Princípios de Conservação</span>
                  <KaTeXMath math="E_m = E_c + E_p = \frac{1}{2}mv^2 + mgh = \text{cte}" block />
                  <KaTeXMath math="\Delta E_m = W_{\text{fat}} = -\int f_{\text{at}}\,ds" block />
                  <KaTeXMath math="N_{\text{topo}} = m\frac{v^2}{R} - mg \ge 0 \implies h_{\text{mín}} = 2{,}5 R" block />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Graphs */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Balanço de Energias</span>
                <span className="text-[10px] font-mono text-cyan-400">Tempo Real</span>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={clock.time}
                height={260}
                title="Evolução Temporal do Balanço de Energias: Ec(t), Ep(t), Em(t) e Ediss(t)"
                xLabel="Tempo t"
                xUnit="s"
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Conservação e Dissipação:</span>
                <span>• Quando μ = 0: a energia mecânica Em(t) permanece perfeitamente constante (linha amarela horizontal).</span>
                <span>• Quando μ &gt; 0: o trabalho do atrito converte energia mecânica em energia térmica dissipada Ediss(t).</span>
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
            cameraAngleRef.current = { theta: 0.45, phi: 0.6, radius: 18.0 };
          }}
        />
      </div>
    </div>
  );
};

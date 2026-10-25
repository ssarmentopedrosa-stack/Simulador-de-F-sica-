import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateWorkAndPower, WorkPowerState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, ArrowRight, Gauge, Activity } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface WorkPower3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const WorkPower3D: React.FC<WorkPower3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [force, setForce] = useState<number>(
    () => (initialParams?.force != null ? Number(initialParams.force) : 60.0)
  );
  const [distance, setDistance] = useState<number>(
    () => (initialParams?.distance != null ? Number(initialParams.distance) : 15.0)
  );
  const [angleDeg, setAngleDeg] = useState<number>(
    () => (initialParams?.angleDeg != null ? Number(initialParams.angleDeg) : 30.0)
  );
  const [mass, setMass] = useState<number>(
    () => (initialParams?.mass != null ? Number(initialParams.mass) : 5.0)
  );
  const [frictionCoeff, setFrictionCoeff] = useState<number>(
    () => (initialParams?.frictionCoeff != null ? Number(initialParams.frictionCoeff) : 0.15)
  );
  const [initialSpeed, setInitialSpeed] = useState<number>(
    () => (initialParams?.initialSpeed != null ? Number(initialParams.initialSpeed) : 0.0)
  );
  const [chartMode, setChartMode] = useState<'force_dist' | 'power_time'>('force_dist');
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.force !== undefined) setForce(Number(p.force));
    if (p.distance !== undefined) setDistance(Number(p.distance));
    if (p.angleDeg !== undefined) setAngleDeg(Number(p.angleDeg));
    if (p.mass !== undefined) setMass(Number(p.mass));
    if (p.frictionCoeff !== undefined) setFrictionCoeff(Number(p.frictionCoeff));
    if (p.initialSpeed !== undefined) setInitialSpeed(Number(p.initialSpeed));
  }, []);

  useEffect(() => {
    onParamsChange?.({ force, distance, angleDeg, mass, frictionCoeff, initialSpeed });
  }, [force, distance, angleDeg, mass, frictionCoeff, initialSpeed, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.force !== undefined) setForce(Number(initialParams.force));
      if (initialParams.distance !== undefined) setDistance(Number(initialParams.distance));
      if (initialParams.angleDeg !== undefined) setAngleDeg(Number(initialParams.angleDeg));
      if (initialParams.mass !== undefined) setMass(Number(initialParams.mass));
      if (initialParams.frictionCoeff !== undefined) setFrictionCoeff(Number(initialParams.frictionCoeff));
      if (initialParams.initialSpeed !== undefined) setInitialSpeed(Number(initialParams.initialSpeed));
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

  // Derived Physical State
  const state: WorkPowerState = useMemo(() => {
    return calculateWorkAndPower(force, distance, angleDeg, mass, frictionCoeff, initialSpeed);
  }, [force, distance, angleDeg, mass, frictionCoeff, initialSpeed]);

  // Current simulation dynamics along trajectory
  const currentKinematics = useMemo(() => {
    const t = clock.time;
    const a = state.acceleration;
    const v0 = initialSpeed;
    const dTarget = distance;

    // Time to reach target distance d
    const totalTime = state.timeToComplete;
    const effectiveTime = totalTime > 0 ? (t % (totalTime + 1.2)) : 0;
    const isWaitingReset = effectiveTime >= totalTime && totalTime > 0;

    let x = 0;
    let v = 0;
    if (!isWaitingReset && a >= 0) {
      x = Math.min(dTarget, v0 * effectiveTime + 0.5 * a * effectiveTime * effectiveTime);
      v = Math.min(state.finalVelocity, v0 + a * effectiveTime);
    } else {
      x = dTarget;
      v = state.finalVelocity;
    }

    const currentPower = state.forceParallel * v;
    const currentWork = state.forceParallel * x;
    const currentFrictionWork = -state.frictionForce * x;
    const currentKineticEnergy = 0.5 * mass * v * v;

    return {
      t: effectiveTime,
      x,
      v,
      currentPower,
      currentWork,
      currentFrictionWork,
      currentKineticEnergy,
      isFinished: isWaitingReset,
    };
  }, [clock.time, state, initialSpeed, distance, mass]);

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cartGroupRef = useRef<THREE.Group | null>(null);
  const ropeMeshRef = useRef<THREE.Line | null>(null);
  const targetFlagRef = useRef<THREE.Group | null>(null);

  // Vector arrows
  const arrowAppliedRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowParallelRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowNormalRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowWeightRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowFrictionRef = useRef<THREE.ArrowHelper | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.35,
    phi: 0.65,
    radius: 12.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update telemetry data for charts
  useEffect(() => {
    if (chartMode === 'force_dist') {
      // Force vs Distance curve (0 to target distance)
      const pts: DataPoint[] = [];
      const numPoints = 60;
      for (let i = 0; i <= numPoints; i++) {
        const dCurrent = (i / numPoints) * distance;
        pts.push({
          t: dCurrent,
          fParallel: state.forceParallel,
          fApplied: force,
          fFriction: state.frictionForce,
          workDone: state.forceParallel * dCurrent,
        });
      }
      setDataBuffer(pts);
    } else {
      // Power & Kinetic Energy vs Time
      setDataBuffer((prev) => {
        if (prev.length > 0 && Math.abs(prev[prev.length - 1].t - currentKinematics.t) < 0.0001) {
          return prev;
        }
        const newPt: DataPoint = {
          t: Number(currentKinematics.t.toFixed(2)),
          power: currentKinematics.currentPower,
          kineticEnergy: currentKinematics.currentKineticEnergy,
          workNet: currentKinematics.currentWork + currentKinematics.currentFrictionWork,
        };
        const updated = [...prev, newPt];
        return updated.length > 250 ? updated.slice(-250) : updated;
      });
    }
  }, [chartMode, distance, force, state.forceParallel, state.frictionForce, currentKinematics]);

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
    dirLight.position.set(10, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x06b6d4, 1.2, 30);
    fillLight.position.set(-8, 6, -4);
    scene.add(fillLight);

    // Floor Runway & Coordinate Grid
    const runwayWidth = 36;
    const runwayGeo = new THREE.PlaneGeometry(runwayWidth, 6);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const runwayMesh = new THREE.Mesh(runwayGeo, runwayMat);
    runwayMesh.rotation.x = -Math.PI / 2;
    runwayMesh.receiveShadow = true;
    scene.add(runwayMesh);

    const grid = new THREE.GridHelper(runwayWidth, 36, 0x0284c7, 0x1e293b);
    grid.position.y = 0.005;
    scene.add(grid);

    // Ruler Tick Marks along X
    for (let x = -15; x <= 15; x += 3) {
      const markerGeo = new THREE.BoxGeometry(0.08, 0.02, 1.5);
      const markerMat = new THREE.MeshBasicMaterial({ color: x === 0 ? 0x38bdf8 : 0x475569 });
      const m = new THREE.Mesh(markerGeo, markerMat);
      m.position.set(x, 0.01, 0);
      scene.add(m);
    }

    // Dynamic Cart / Block Group
    const cartGroup = new THREE.Group();
    cartGroupRef.current = cartGroup;

    // Block Body
    const blockGeo = new THREE.BoxGeometry(1.6, 0.9, 1.1);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.3,
      roughness: 0.4,
    });
    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    blockMesh.position.y = 0.55;
    blockMesh.castShadow = true;
    cartGroup.add(blockMesh);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
    const wheelPositions = [
      [-0.55, 0.2, 0.55],
      [0.55, 0.2, 0.55],
      [-0.55, 0.2, -0.55],
      [0.55, 0.2, -0.55],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, wy, wz);
      cartGroup.add(w);
    });

    // Tow hook & cable attachment
    const hookGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const hookMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const hook = new THREE.Mesh(hookGeo, hookMat);
    hook.position.set(0.8, 0.55, 0);
    cartGroup.add(hook);

    scene.add(cartGroup);

    // Target Finish Marker (distance d)
    const targetGroup = new THREE.Group();
    targetFlagRef.current = targetGroup;

    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 12);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 1.25;
    targetGroup.add(post);

    const bannerGeo = new THREE.PlaneGeometry(0.9, 0.5);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0.45, 2.1, 0);
    targetGroup.add(banner);

    scene.add(targetGroup);

    // Traction Cable Line
    const ropeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const ropeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 1, 0),
    ]);
    const ropeLine = new THREE.Line(ropeGeo, ropeMat);
    ropeMeshRef.current = ropeLine;
    scene.add(ropeLine);

    // Vector Visualizer Arrows
    // 1. Applied Force (Cyan)
    const arrApplied = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.0, 0x38bdf8, 0.35, 0.18);
    arrowAppliedRef.current = arrApplied;
    scene.add(arrApplied);

    // 2. Parallel Component (Sky Blue)
    const arrPar = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x06b6d4, 0.25, 0.12);
    arrowParallelRef.current = arrPar;
    scene.add(arrPar);

    // 3. Normal Force (Emerald)
    const arrNorm = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.8, 0x10b981, 0.25, 0.12);
    arrowNormalRef.current = arrNorm;
    scene.add(arrNorm);

    // 4. Weight Force (Amber)
    const arrWeight = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 2.0, 0xf59e0b, 0.25, 0.12);
    arrowWeightRef.current = arrWeight;
    scene.add(arrWeight);

    // 5. Friction Force (Rose)
    const arrFriction = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1.2, 0xf43f5e, 0.25, 0.12);
    arrowFrictionRef.current = arrFriction;
    scene.add(arrFriction);

    // Mouse Dragging Orbit
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
      cameraAngleRef.current.radius = Math.max(5, Math.min(25, cameraAngleRef.current.radius + e.deltaY * 0.02));
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Window Resize Observer
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

      // Camera Position
      const cam = cameraRef.current;
      if (cam) {
        if (clock.is2DView) {
          cam.position.set(0, 14, 0.01);
          cam.lookAt(0, 0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 1.0, 0);
        }
      }

      // Position cart in 3D world: scaled so 0 to distance maps from -8 to +8 in scene
      const sceneStartX = -7.0;
      const sceneEndX = 7.0;
      const fraction = Math.min(1.0, currentKinematics.x / Math.max(0.1, distance));
      const cartWorldX = sceneStartX + fraction * (sceneEndX - sceneStartX);

      if (cartGroupRef.current) {
        cartGroupRef.current.position.set(cartWorldX, 0, 0);
      }

      // Target Finish Flag position
      if (targetFlagRef.current) {
        targetFlagRef.current.position.set(sceneEndX, 0, 0);
      }

      // Force Vector & Traction Cable
      const rad = (angleDeg * Math.PI) / 180;
      const cableLen = 2.4;
      const cableEndX = cartWorldX + 0.8 + cableLen * Math.cos(rad);
      const cableEndY = 0.55 + cableLen * Math.sin(rad);

      if (ropeMeshRef.current) {
        const positions = ropeMeshRef.current.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, cartWorldX + 0.8, 0.55, 0);
        positions.setXYZ(1, cableEndX, cableEndY, 0);
        positions.needsUpdate = true;
      }

      // Update Vector Arrows
      if (clock.showVectors) {
        const forceScale = 0.035;

        // Applied Force F
        if (arrowAppliedRef.current) {
          arrowAppliedRef.current.visible = true;
          arrowAppliedRef.current.position.set(cartWorldX + 0.8, 0.55, 0);
          arrowAppliedRef.current.setDirection(new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0).normalize());
          arrowAppliedRef.current.setLength(Math.max(0.2, force * forceScale), 0.35, 0.16);
        }

        // Parallel Force F_paralela
        if (arrowParallelRef.current) {
          arrowParallelRef.current.visible = true;
          arrowParallelRef.current.position.set(cartWorldX + 0.8, 0.25, 0.6);
          arrowParallelRef.current.setDirection(new THREE.Vector3(1, 0, 0));
          arrowParallelRef.current.setLength(Math.max(0.2, state.forceParallel * forceScale), 0.25, 0.12);
        }

        // Normal Force N
        if (arrowNormalRef.current) {
          arrowNormalRef.current.visible = true;
          arrowNormalRef.current.position.set(cartWorldX, 1.0, 0);
          arrowNormalRef.current.setDirection(new THREE.Vector3(0, 1, 0));
          arrowNormalRef.current.setLength(Math.max(0.2, state.normalForce * forceScale * 0.7), 0.25, 0.12);
        }

        // Weight Force P
        if (arrowWeightRef.current) {
          arrowWeightRef.current.visible = true;
          arrowWeightRef.current.position.set(cartWorldX, 0.55, 0);
          arrowWeightRef.current.setDirection(new THREE.Vector3(0, -1, 0));
          arrowWeightRef.current.setLength(Math.max(0.2, mass * 9.8 * forceScale * 0.7), 0.25, 0.12);
        }

        // Friction Force f_at
        if (arrowFrictionRef.current) {
          arrowFrictionRef.current.visible = state.frictionForce > 0.05;
          arrowFrictionRef.current.position.set(cartWorldX - 0.8, 0.15, 0);
          arrowFrictionRef.current.setDirection(new THREE.Vector3(-1, 0, 0));
          arrowFrictionRef.current.setLength(Math.max(0.2, state.frictionForce * forceScale), 0.25, 0.12);
        }
      } else {
        if (arrowAppliedRef.current) arrowAppliedRef.current.visible = false;
        if (arrowParallelRef.current) arrowParallelRef.current.visible = false;
        if (arrowNormalRef.current) arrowNormalRef.current.visible = false;
        if (arrowWeightRef.current) arrowWeightRef.current.visible = false;
        if (arrowFrictionRef.current) arrowFrictionRef.current.visible = false;
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
  }, [clock.isRunning, clock.speed, clock.is2DView, clock.showVectors, angleDeg, currentKinematics, distance, force, mass, state]);

  // Series definition for ScientificChart
  const chartSeries: ChartSeries[] =
    chartMode === 'force_dist'
      ? [
          { key: 'fParallel', label: 'Força Paralela F · cos(θ)', color: '#38bdf8', unit: 'N' },
          { key: 'fFriction', label: 'Força de Atrito f_at', color: '#f43f5e', unit: 'N' },
          { key: 'workDone', label: 'Trabalho Acumulado W(d)', color: '#10b981', unit: 'J' },
        ]
      : [
          { key: 'power', label: 'Potência Instantânea P(t)', color: '#38bdf8', unit: 'W' },
          { key: 'kineticEnergy', label: 'Energia Cinética Ec(t)', color: '#10b981', unit: 'J' },
          { key: 'workNet', label: 'Trabalho Resultante W_res(t)', color: '#f59e0b', unit: 'J' },
        ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Trabalho da Força', symbol: 'W_F', value: state.workApplied, unit: 'J', precision: 1, highlight: true },
    { label: 'Trabalho do Atrito', symbol: 'W_fat', value: state.workFriction, unit: 'J', precision: 1 },
    { label: 'Trabalho Resultante', symbol: 'W_res', value: state.workNet, unit: 'J', precision: 1, highlight: true },
    { label: 'Velocidade Final', symbol: 'v_f', value: state.finalVelocity, unit: 'm/s', precision: 2 },
    { label: 'Potência Média', symbol: 'P_m', value: state.averagePower, unit: 'W', precision: 1 },
    { label: 'Potência Final', symbol: 'P_inst', value: state.instantaneousPowerFinal, unit: 'W', precision: 1 },
    { label: 'Aceleração', symbol: 'a', value: state.acceleration, unit: 'm/s²', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Module Title */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">MECÂNICA CLÁSSICA · DINÂMICA</span>
              <span className="text-xs text-slate-300">Trabalho Mecânico, Potência e Teorema da Energia Cinética</span>
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

          {/* Instantaneous Vector Legend Overlay */}
          <div className="absolute top-16 left-3 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="bg-slate-950/80 border border-slate-800/80 px-2.5 py-1.5 rounded text-[10px] backdrop-blur-sm flex flex-col gap-1 font-mono">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>
                <span>F Aplicada ({force.toFixed(0)} N a {angleDeg.toFixed(0)}°)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span>
                <span>F_paralela = {state.forceParallel.toFixed(1)} N</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
                <span>Normal N = {state.normalForce.toFixed(1)} N</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-0.5 bg-rose-400 inline-block"></span>
                <span>Atrito f_at = {state.frictionForce.toFixed(1)} N</span>
              </div>
            </div>
          </div>

          {/* Quantities Bar */}
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
                moduleId="work_power"
                onApplyPreset={applyPreset}
                currentParams={{ force, distance, angleDeg, mass, frictionCoeff, initialSpeed }}
              />

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros de Tração</span>
                <span className="text-[10px] text-cyan-400 font-mono">3D Dinâmico</span>
              </div>

              {/* Force Magnitude (F) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Força Aplicada (F):</span>
                  <span className="font-mono text-cyan-400 font-medium">{force.toFixed(1)} N</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="2"
                  value={force}
                  onChange={(e) => setForce(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Angle (theta) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ângulo de Tração (θ):</span>
                  <span className="font-mono text-sky-400 font-medium">{angleDeg.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="85"
                  step="5"
                  value={angleDeg}
                  onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Target Distance (d) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Deslocamento (d):</span>
                  <span className="font-mono text-emerald-400 font-medium">{distance.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={distance}
                  onChange={(e) => setDistance(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Mass (m) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Massa do Corpo (m):</span>
                  <span className="font-mono text-slate-200 font-medium">{mass.toFixed(1)} kg</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={mass}
                  onChange={(e) => setMass(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Friction Coefficient (mu) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Coef. de Atrito (μ):</span>
                  <span className="font-mono text-rose-400 font-medium">{frictionCoeff.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.60"
                  step="0.05"
                  value={frictionCoeff}
                  onChange={(e) => setFrictionCoeff(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Initial Speed (v0) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Velocidade Inicial (v₀):</span>
                  <span className="font-mono text-slate-300 font-medium">{initialSpeed.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={initialSpeed}
                  onChange={(e) => setInitialSpeed(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Formulas Card */}
              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações de Trabalho e Potência</span>
                  <KaTeXMath math="\tau = F \cdot d \cdot \cos\theta" block />
                  <KaTeXMath math="\tau_{\text{res}} = \Delta E_c = \frac{1}{2}m v_f^2 - \frac{1}{2}m v_0^2" block />
                  <KaTeXMath math="P_m = \frac{\tau}{\Delta t}, \quad P_{\text{inst}} = \vec{F} \cdot \vec{v}" block />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Graphs */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Curvas de Trabalho & Potência</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setChartMode('force_dist')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      chartMode === 'force_dist' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/60' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    F × d
                  </button>
                  <button
                    onClick={() => setChartMode('power_time')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      chartMode === 'power_time' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/60' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    P(t) e Ec
                  </button>
                </div>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={chartMode === 'force_dist' ? currentKinematics.x : currentKinematics.t}
                height={260}
                title={
                  chartMode === 'force_dist'
                    ? 'Gráfico de Força vs Deslocamento (Área Sombreada = Trabalho Realizado)'
                    : 'Evolução Temporal da Potência Instantânea P(t) e Energia Cinética Ec(t)'
                }
                xLabel={chartMode === 'force_dist' ? 'Deslocamento x' : 'Tempo t'}
                xUnit={chartMode === 'force_dist' ? 'm' : 's'}
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Significado Físico:</span>
                <span>• A área sob a curva F(d) × d representa o Trabalho realizado (τ = ∫ F dx).</span>
                <span>• No modo P(t), a integral de P(t) dt fornece a variação da Energia Cinética Ec(t).</span>
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
            cameraAngleRef.current = { theta: 0.35, phi: 0.65, radius: 12.0 };
          }}
        />
      </div>
    </div>
  );
};

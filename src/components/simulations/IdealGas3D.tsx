import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateIdealGasState, calculateGasTransformation, IdealGasState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Gauge, Flame, Wind, Thermometer, Box } from 'lucide-react';

interface IdealGas3DProps {
  onOpenExperiment?: () => void;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface IdealGas3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const IdealGas3D: React.FC<IdealGas3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Thermodynamic parameters
  const [pressure, setPressure] = useState<number>(
    () => (initialParams?.pressure != null ? Number(initialParams.pressure) : 101325)
  );
  const [volume, setVolume] = useState<number>(
    () => (initialParams?.volume != null ? Number(initialParams.volume) : 0.024)
  );
  const [moles, setMoles] = useState<number>(
    () => (initialParams?.moles != null ? Number(initialParams.moles) : 1.0)
  );
  const [degreesOfFreedom, setDegreesOfFreedom] = useState<number>(3);
  const [molarMass, setMolarMass] = useState<number>(0.004);
  const [transformType, setTransformType] = useState<'free' | 'isothermal' | 'isobaric' | 'isochoric' | 'adiabatic'>(
    () => (initialParams?.transformType as any) || 'free'
  );

  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.transformType !== undefined) setTransformType(p.transformType);
    if (p.pressure !== undefined) setPressure(Number(p.pressure));
    if (p.volume !== undefined) setVolume(Number(p.volume));
    if (p.moles !== undefined) setMoles(Number(p.moles));
  }, []);

  useEffect(() => {
    onParamsChange?.({ transformType, pressure, volume, moles });
  }, [transformType, pressure, volume, moles, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.transformType !== undefined) setTransformType(initialParams.transformType);
      if (initialParams.pressure !== undefined) setPressure(Number(initialParams.pressure));
      if (initialParams.volume !== undefined) setVolume(Number(initialParams.volume));
      if (initialParams.moles !== undefined) setMoles(Number(initialParams.moles));
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

  // Calculate thermodynamic state
  const gasState: IdealGasState = useMemo(() => {
    return calculateIdealGasState(pressure, volume, moles, degreesOfFreedom, molarMass);
  }, [pressure, volume, moles, degreesOfFreedom, molarMass]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mechanical components refs
  const pistonGroupRef = useRef<THREE.Group | null>(null);
  const gaugeNeedleRef = useRef<THREE.Mesh | null>(null);
  const particlesMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const tempGaugeMeshRef = useRef<THREE.Mesh | null>(null);

  // Particles simulation state
  const NUM_PARTICLES = 90;
  const particlesRef = useRef<Particle[]>([]);

  // Camera Orbit Angles
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.5,
    phi: 0.75,
    radius: 4.6,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.5, phi: 0.75, radius: 4.6 };
  }, []);

  // Transformation Handler
  const handleVolumeChange = (newVol: number) => {
    if (transformType === 'free') {
      setVolume(newVol);
    } else if (transformType === 'isothermal') {
      // P1 * V1 = P2 * V2 -> P2 = P1 * V1 / V2
      const res = calculateGasTransformation('isothermal', pressure, volume, newVol, moles, degreesOfFreedom);
      setVolume(newVol);
      setPressure(res.finalP);
    } else if (transformType === 'isobaric') {
      // P constant, T changes
      setVolume(newVol);
    } else if (transformType === 'isochoric') {
      // Volume locked
      return;
    } else if (transformType === 'adiabatic') {
      const res = calculateGasTransformation('adiabatic', pressure, volume, newVol, moles, degreesOfFreedom);
      setVolume(newVol);
      setPressure(res.finalP);
    }
  };

  const handlePressureChange = (newP: number) => {
    if (transformType === 'free') {
      setPressure(newP);
    } else if (transformType === 'isobaric') {
      return;
    } else if (transformType === 'isothermal') {
      // P1 * V1 = P2 * V2 -> V2 = P1 * V1 / P2
      const newV = Math.max(0.005, Math.min(0.05, (pressure * volume) / newP));
      setPressure(newP);
      setVolume(newV);
    } else {
      setPressure(newP);
    }
  };

  const handleTemperatureChange = (newT: number) => {
    // T = P * V / (n * R)
    const R = 8.31446;
    if (transformType === 'isochoric') {
      // V is constant -> P = nRT / V
      const newP = (moles * R * newT) / volume;
      setPressure(newP);
    } else if (transformType === 'isobaric') {
      // P is constant -> V = nRT / P
      const newV = Math.max(0.005, Math.min(0.05, (moles * R * newT) / pressure));
      setVolume(newV);
    } else if (transformType === 'free') {
      // Adjust pressure keeping volume
      const newP = (moles * R * newT) / volume;
      setPressure(newP);
    }
  };

  // Initialize particles
  useEffect(() => {
    const list: Particle[] = [];
    const cylRadius = 0.72;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const r = Math.sqrt(Math.random()) * (cylRadius - 0.08);
      const th = Math.random() * Math.PI * 2;
      list.push({
        x: r * Math.cos(th),
        y: 0.15 + Math.random() * 0.8,
        z: r * Math.sin(th),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
      });
    }
    particlesRef.current = list;
  }, []);

  // Update telemetry for charts
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        pressureKPa: Number((gasState.pressure / 1000).toFixed(1)),
        volumeL: Number((gasState.volume * 1000).toFixed(1)),
        temperatureK: Number(gasState.temperature.toFixed(1)),
        vRmsMPerS: Number(gasState.vRms.toFixed(0)),
        internalEnergyKJ: Number((gasState.internalEnergy / 1000).toFixed(2)),
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, gasState]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.Fog(0x0a0f1d, 8, 25);

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

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0284c7, 0.9);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // ==========================================
    // CYLINDER ASSEMBLY (CHAMBER)
    // ==========================================
    const chamberGroup = new THREE.Group();
    chamberGroup.position.set(0, 0, 0);
    scene.add(chamberGroup);

    // Base pedestal
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.15, 0.12, 36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
    );
    basePlate.position.y = 0.06;
    basePlate.receiveShadow = true;
    chamberGroup.add(basePlate);

    // Transparent Glass Cylinder Wall
    const glassCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 2.2, 36, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.85,
        depthWrite: false,
      })
    );
    glassCyl.position.y = 1.22;
    chamberGroup.add(glassCyl);

    // Metal Rings / Flanges on Cylinder
    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.04, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 2.32;
    chamberGroup.add(topRing);

    // Graduation lines along cylinder height
    for (let h = 0.4; h <= 2.1; h += 0.3) {
      const mark = new THREE.Mesh(
        new THREE.RingGeometry(0.752, 0.756, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      mark.rotation.x = Math.PI / 2;
      mark.position.y = h;
      chamberGroup.add(mark);
    }

    // ==========================================
    // MOVABLE PISTON GROUP
    // ==========================================
    const pGroup = new THREE.Group();
    pGroup.position.y = 1.2; // default piston height

    // Piston Head
    const pHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.74, 0.12, 36),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
    );
    pHead.position.y = 0;
    pHead.castShadow = true;
    pGroup.add(pHead);

    // Seal Ring
    const seal = new THREE.Mesh(
      new THREE.TorusGeometry(0.742, 0.02, 16, 36),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 })
    );
    seal.rotation.x = Math.PI / 2;
    seal.position.y = -0.01;
    pGroup.add(seal);

    // Piston Rod
    const pRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 })
    );
    pRod.position.y = 0.76;
    pRod.castShadow = true;
    pGroup.add(pRod);

    // Handle Top
    const pHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 })
    );
    pHandle.position.y = 1.48;
    pGroup.add(pHandle);

    chamberGroup.add(pGroup);
    pistonGroupRef.current = pGroup;

    // ==========================================
    // MANOMETER GAUGE ON CYLINDER
    // ==========================================
    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(0.85, 0.8, 0.3);
    gaugeGroup.rotation.y = 0.4;

    const gBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.06, 28),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 })
    );
    gBody.rotation.x = Math.PI / 2;
    gaugeGroup.add(gBody);

    const gDial = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 28),
      new THREE.MeshBasicMaterial({ color: 0x1e293b })
    );
    gDial.position.z = 0.032;
    gaugeGroup.add(gDial);

    const needleGeom = new THREE.ConeGeometry(0.012, 0.13, 12);
    needleGeom.translate(0, 0.065, 0);
    const needle = new THREE.Mesh(
      needleGeom,
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    needle.position.z = 0.035;
    gaugeGroup.add(needle);
    gaugeNeedleRef.current = needle;

    chamberGroup.add(gaugeGroup);

    // ==========================================
    // PARTICLES (INSTANCED MESH)
    // ==========================================
    const sphereGeom = new THREE.SphereGeometry(0.032, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
    });
    const instMesh = new THREE.InstancedMesh(sphereGeom, sphereMat, NUM_PARTICLES);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chamberGroup.add(instMesh);
    particlesMeshRef.current = instMesh;

    // ==========================================
    // INTERACTION (ORBIT CAMERA)
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
      cameraAngleRef.current.radius = Math.max(2.4, Math.min(8.0, cameraAngleRef.current.radius + e.deltaY * 0.004));
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
    // ANIMATION LOOP
    // ==========================================
    const dummy = new THREE.Object3D();
    const particleColor = new THREE.Color();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Camera position
      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 1.1;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 1.1, 0);

      // Particles physics update
      if (particlesMeshRef.current && particlesRef.current.length > 0) {
        const pList = particlesRef.current;
        const currentPistonY = pistonGroupRef.current ? pistonGroupRef.current.position.y - 0.06 : 1.2;
        const maxR = 0.70;

        // Speed scalar relative to vRms (baseline 500 m/s ~ speed factor 0.018)
        const vFactor = Math.max(0.008, Math.min(0.035, (gasState.vRms / 600) * 0.018)) * clock.speed;

        // Color based on temperature: 200K (cyan) -> 300K (green/yellow) -> 600K (orange/red)
        const tNorm = Math.max(0, Math.min(1, (gasState.temperature - 200) / 450));
        particleColor.setHSL(0.58 - tNorm * 0.55, 0.9, 0.55);

        for (let i = 0; i < pList.length; i++) {
          const p = pList[i];
          if (clock.isRunning) {
            p.x += p.vx * vFactor;
            p.y += p.vy * vFactor;
            p.z += p.vz * vFactor;

            // Bounce off cylindrical wall
            const r2 = p.x * p.x + p.z * p.z;
            if (r2 > maxR * maxR) {
              const r = Math.sqrt(r2);
              const nx = p.x / r;
              const nz = p.z / r;
              const dot = p.vx * nx + p.vz * nz;
              p.vx = p.vx - 2 * dot * nx;
              p.vz = p.vz - 2 * dot * nz;
              p.x = nx * (maxR - 0.01);
              p.z = nz * (maxR - 0.01);
            }

            // Bounce off bottom floor
            if (p.y < 0.15) {
              p.y = 0.15;
              p.vy = Math.abs(p.vy);
            }

            // Bounce off piston bottom face
            if (p.y > currentPistonY) {
              p.y = currentPistonY;
              p.vy = -Math.abs(p.vy);
            }
          }

          dummy.position.set(p.x, p.y, p.z);
          dummy.updateMatrix();
          particlesMeshRef.current.setMatrixAt(i, dummy.matrix);
          particlesMeshRef.current.setColorAt(i, particleColor);
        }
        particlesMeshRef.current.instanceMatrix.needsUpdate = true;
        if (particlesMeshRef.current.instanceColor) {
          particlesMeshRef.current.instanceColor.needsUpdate = true;
        }
      }

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
  }, [clock.speed, clock.isRunning, gasState.vRms, gasState.temperature]);

  // Update animated mechanical positions (Piston height & Needle angle)
  useEffect(() => {
    // Volume range: 0.005 m³ (5 L) to 0.045 m³ (45 L) -> maps to height 0.35 to 2.1
    const pY = 0.35 + ((gasState.volume - 0.005) / 0.040) * 1.75;
    if (pistonGroupRef.current) {
      pistonGroupRef.current.position.y = THREE.MathUtils.clamp(pY, 0.4, 2.15);
    }

    // Needle rotation (0 to 300 kPa -> angle -2.2 rad to +2.2 rad)
    if (gaugeNeedleRef.current) {
      const pRatio = Math.min(1.0, gasState.pressure / 300000);
      const angle = -2.1 + pRatio * 4.2;
      gaugeNeedleRef.current.rotation.z = -angle;
    }
  }, [gasState.volume, gasState.pressure]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      { key: 'pressureKPa', label: 'Pressão P (kPa)', color: '#38bdf8', unit: 'kPa' },
      { key: 'volumeL', label: 'Volume V (L)', color: '#f59e0b', unit: 'L' },
      { key: 'temperatureK', label: 'Temperatura T (K)', color: '#ef4444', unit: 'K' },
    ],
    []
  );

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
                <Gauge className="w-3.5 h-3.5" /> Estado Termodinâmico Atual
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                PV = nRT
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Pressão (P)</div>
                <div className="text-sm font-black font-mono text-cyan-300">
                  {(gasState.pressure / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">kPa</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{(gasState.pressure / 101325).toFixed(2)} atm</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Volume (V)</div>
                <div className="text-sm font-black font-mono text-amber-300">
                  {(gasState.volume * 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">L</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{(gasState.volume).toFixed(4)} m³</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Temperatura (T)</div>
                <div className="text-sm font-black font-mono text-red-400">
                  {gasState.temperature.toFixed(1)} <span className="text-xs text-slate-400 font-normal">K</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{(gasState.temperature - 273.15).toFixed(1)} °C</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Velocidade Térmica (v_rms)</div>
                <div className="text-sm font-black font-mono text-emerald-400">
                  {gasState.vRms.toFixed(0)} <span className="text-xs text-slate-400 font-normal">m/s</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Energia U: {(gasState.internalEnergy / 1000).toFixed(2)} kJ</div>
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
              setPressure(101325);
              setVolume(0.024);
              setMoles(1.0);
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
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Parâmetros & Transformação
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
            Diagrama P × V & Dados
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {activeSideTab === 'controls' ? (
            <>
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="ideal_gas"
                onApplyPreset={applyPreset}
                currentParams={{ transformType, pressure, volume, moles }}
              />

              {/* Transformation Mode Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" /> Modo de Transformação
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'free', label: 'Livre (Manual)' },
                    { id: 'isothermal', label: 'Isotérmica (T = cte)' },
                    { id: 'isobaric', label: 'Isobárica (P = cte)' },
                    { id: 'isochoric', label: 'Isocórica (V = cte)' },
                    { id: 'adiabatic', label: 'Adiabática (Q = 0)' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTransformType(mode.id as any)}
                      className={`p-2 rounded-lg font-medium text-left transition-all border ${
                        transformType === mode.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Slider (Piston displacement) */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Volume do Cilindro (V)</span>
                  <span className="font-mono text-amber-300 text-xs font-bold">
                    {(volume * 1000).toFixed(1)} L ({(volume).toFixed(3)} m³)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.005}
                  max={0.045}
                  step={0.001}
                  disabled={transformType === 'isochoric'}
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 L (Comprimido)</span>
                  <span>45 L (Expandido)</span>
                </div>
              </div>

              {/* Pressure Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Pressão Interna (P)</span>
                  <span className="font-mono text-cyan-300 text-xs font-bold">
                    {(pressure / 1000).toFixed(1)} kPa ({(pressure / 101325).toFixed(2)} atm)
                  </span>
                </div>
                <input
                  type="range"
                  min={30000}
                  max={300000}
                  step={2000}
                  disabled={transformType === 'isobaric'}
                  value={pressure}
                  onChange={(e) => handlePressureChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer disabled:opacity-40"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>30 kPa (Vácuo parcial)</span>
                  <span>300 kPa (~3 atm)</span>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-red-400" /> Temperatura Absoluta (T)
                  </span>
                  <span className="font-mono text-red-400 text-xs font-bold">
                    {gasState.temperature.toFixed(1)} K ({(gasState.temperature - 273.15).toFixed(1)} °C)
                  </span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={750}
                  step={5}
                  disabled={transformType === 'isothermal' || transformType === 'adiabatic'}
                  value={gasState.temperature}
                  onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer disabled:opacity-40"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>150 K (-123 °C)</span>
                  <span>750 K (+477 °C)</span>
                </div>
              </div>

              {/* Gas Properties (Moles & Degrees of freedom) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-indigo-400" /> Propriedades Moleculares do Gás
                </span>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Quantidade de Matéria (n):</span>
                  <span className="font-mono text-indigo-300 font-bold">{moles.toFixed(2)} mol</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.1}
                  value={moles}
                  onChange={(e) => setMoles(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      setDegreesOfFreedom(3);
                      setMolarMass(0.004); // He
                    }}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      degreesOfFreedom === 3
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Monoatômico (f=3, He)
                  </button>
                  <button
                    onClick={() => {
                      setDegreesOfFreedom(5);
                      setMolarMass(0.028); // N2
                    }}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      degreesOfFreedom === 5
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Diatômico (f=5, N₂)
                  </button>
                </div>
              </div>

              {/* Equation card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Fórmula Indicadora</span>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex justify-center text-sm">
                  <KaTeXMath math="P \cdot V = n \cdot R \cdot T \quad \iff \quad v_{\text{rms}} = \sqrt{\frac{3RT}{M}}" block />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Telemetry Chart */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Evolução Temporal das Variáveis de Estado
                </span>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="Pressão (kPa), Volume (L) e Temperatura (K)"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>
              </div>

              {/* Microscopic kinetic summary */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <span className="font-mono uppercase font-bold text-cyan-400">Teoria Cinética Molecular</span>
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    • A pressão macroscópica de <strong className="text-cyan-300">{(gasState.pressure / 1000).toFixed(1)} kPa</strong> resulta da taxa de colisão de <strong>{NUM_PARTICLES}</strong> partículas virtuais colidindo contra o êmbolo.
                  </p>
                  <p>
                    • Velocidade quadrática média: <strong className="text-emerald-300">{gasState.vRms.toFixed(0)} m/s</strong>.
                  </p>
                  <p>
                    • Energia interna molecular (U = (f/2) · n · R · T): <strong className="text-amber-300">{(gasState.internalEnergy / 1000).toFixed(2)} kJ</strong>.
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

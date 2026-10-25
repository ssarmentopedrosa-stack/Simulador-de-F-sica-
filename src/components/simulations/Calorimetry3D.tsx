import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateCalorimetryEquilibrium, CalorimetryResult } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Thermometer, Droplet, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface Calorimetry3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const Calorimetry3D: React.FC<Calorimetry3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Calorimetry parameters
  const [liquidType, setLiquidType] = useState<'water' | 'ethanol' | 'oil'>(() =>
    initialParams?.liquidType || 'water'
  );
  const [liquidMass, setLiquidMass] = useState<number>(() =>
    initialParams?.liquidMass != null ? Number(initialParams.liquidMass) : 0.25
  );
  const [liquidTemp, setLiquidTemp] = useState<number>(() =>
    initialParams?.liquidTemp != null ? Number(initialParams.liquidTemp) : 55
  );

  const [solidType, setSolidType] = useState<'ice' | 'copper' | 'iron' | 'aluminum'>(() =>
    initialParams?.solidType || 'ice'
  );
  const [solidMass, setSolidMass] = useState<number>(() =>
    initialParams?.solidMass != null ? Number(initialParams.solidMass) : 0.05
  );
  const [solidTemp, setSolidTemp] = useState<number>(() =>
    initialParams?.solidTemp != null ? Number(initialParams.solidTemp) : 0
  );

  const applyPreset = useCallback((params: Record<string, any>) => {
    if (params.liquidType) setLiquidType(params.liquidType);
    if (params.liquidMass != null) setLiquidMass(Number(params.liquidMass));
    if (params.liquidTemp != null) setLiquidTemp(Number(params.liquidTemp));
    if (params.solidType) setSolidType(params.solidType);
    if (params.solidMass != null) setSolidMass(Number(params.solidMass));
    if (params.solidTemp != null) setSolidTemp(Number(params.solidTemp));
  }, []);

  useEffect(() => {
    onParamsChange?.({ liquidType, liquidMass, liquidTemp, solidType, solidMass, solidTemp });
  }, [liquidType, liquidMass, liquidTemp, solidType, solidMass, solidTemp, onParamsChange]);

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

  // Substance constants (cal / g * °C and cal / g)
  const liquidSpecs = useMemo(() => {
    switch (liquidType) {
      case 'ethanol':
        return { name: 'Etanol', specificHeat: 0.58, latentFusion: 25.8, color: 0x93c5fd };
      case 'oil':
        return { name: 'Óleo Mineral', specificHeat: 0.48, latentFusion: 0, color: 0xfacc15 };
      case 'water':
      default:
        return { name: 'Água Líquida', specificHeat: 1.0, latentFusion: 80, color: 0x38bdf8 };
    }
  }, [liquidType]);

  const solidSpecs = useMemo(() => {
    switch (solidType) {
      case 'copper':
        return { name: 'Cobre', specificHeat: 0.092, isIce: false, color: 0xb45309 };
      case 'iron':
        return { name: 'Ferro', specificHeat: 0.11, isIce: false, color: 0x475569 };
      case 'aluminum':
        return { name: 'Alumínio', specificHeat: 0.215, isIce: false, color: 0xcbd5e1 };
      case 'ice':
      default:
        return { name: 'Gelo (H₂O)', specificHeat: 0.50, isIce: true, color: 0xe0f2fe };
    }
  }, [solidType]);

  // Derived Equilibrium Physical State
  const eqState: CalorimetryResult = useMemo(() => {
    return calculateCalorimetryEquilibrium(
      {
        name: liquidSpecs.name,
        massG: liquidMass * 1000,
        initialTempC: liquidTemp,
        specificHeat: liquidSpecs.specificHeat,
        latentHeatFusion: liquidSpecs.latentFusion,
      },
      {
        name: solidSpecs.name,
        massG: solidMass * 1000,
        initialTempC: solidTemp,
        specificHeat: solidSpecs.specificHeat,
        latentHeatFusion: solidSpecs.isIce ? 80 : undefined,
      }
    );
  }, [liquidMass, liquidTemp, liquidSpecs, solidMass, solidTemp, solidSpecs]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 3D Objects
  const stirrerPropRef = useRef<THREE.Mesh | null>(null);
  const solidMeshRef = useRef<THREE.Mesh | null>(null);
  const liquidMeshRef = useRef<THREE.Mesh | null>(null);

  // Transient simulation state (relaxation time)
  const transientTimeRef = useRef<number>(0);

  // Camera Orbit
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.45,
    phi: 0.75,
    radius: 4.4,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.45, phi: 0.75, radius: 4.4 };
  }, []);

  // Update telemetry for charts
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      // Exponential convergence towards equilibrium Te
      const k = 0.08 * clock.speed;
      const tProgress = 1 - Math.exp(-k * (transientTimeRef.current));
      const currentLiquidT = liquidTemp + (eqState.equilibriumTempC - liquidTemp) * tProgress;
      const currentSolidT = solidTemp + (eqState.equilibriumTempC - solidTemp) * tProgress;

      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        liquidTempC: Number(currentLiquidT.toFixed(1)),
        solidTempC: Number(currentSolidT.toFixed(1)),
        equilibriumTempC: Number(eqState.equilibriumTempC.toFixed(1)),
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, clock.speed, liquidTemp, solidTemp, eqState]);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.8);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(5, 8, 5);
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
    // DEWAR CALORIMETER (PRECISION THERMOS FLASK)
    // ==========================================
    const calGroup = new THREE.Group();
    calGroup.position.set(0, 0, 0);
    scene.add(calGroup);

    // Heavy Insulated Base
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.1, 0.14, 36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
    );
    basePlate.position.y = 0.07;
    calGroup.add(basePlate);

    // Outer Vacuum Metal Casing (Cutaway view style)
    const outerCasing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 1.8, 36, 1, false, 0, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide,
      })
    );
    outerCasing.position.y = 1.04;
    calGroup.add(outerCasing);

    // Inner Glass Dewar Flask (Mirrored vacuum chamber)
    const dewarGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 1.6, 36, 1, false, 0, Math.PI * 1.5),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.4,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    dewarGlass.position.y = 0.98;
    calGroup.add(dewarGlass);

    // Liquid Fluid Bath
    const liquidGeom = new THREE.CylinderGeometry(0.7, 0.7, 1.0, 32);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      roughness: 0.15,
      metalness: 0.1,
    });
    const liquidMesh = new THREE.Mesh(liquidGeom, liquidMat);
    liquidMesh.position.y = 0.68;
    calGroup.add(liquidMesh);
    liquidMeshRef.current = liquidMesh;

    // Top Insulated Stopper / Lid
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.74, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 })
    );
    lid.position.y = 1.86;
    calGroup.add(lid);

    // ==========================================
    // MECHANICAL STIRRER (ROTATING SHAFT & BLADES)
    // ==========================================
    const stirrerGroup = new THREE.Group();
    stirrerGroup.position.set(-0.25, 0, 0);

    const stirrerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 })
    );
    stirrerShaft.position.y = 1.1;
    stirrerGroup.add(stirrerShaft);

    // Propeller Blades at the bottom
    const blade1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 })
    );
    blade1.position.y = 0.35;
    stirrerGroup.add(blade1);
    stirrerPropRef.current = blade1;

    // Motor head on top of lid
    const motorHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.22, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    motorHead.position.y = 2.05;
    stirrerGroup.add(motorHead);

    calGroup.add(stirrerGroup);

    // ==========================================
    // IMMERSION THERMOMETER PROBE
    // ==========================================
    const probeGroup = new THREE.Group();
    probeGroup.position.set(0.3, 0, 0);

    const probeRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.7, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6 })
    );
    probeRod.position.y = 1.15;
    probeGroup.add(probeRod);

    // Digital LED display on top
    const digitalBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.8 })
    );
    digitalBox.position.y = 2.08;
    probeGroup.add(digitalBox);

    calGroup.add(probeGroup);

    // ==========================================
    // IMMERSED TEST BODY (SOLID / ICE CUBE)
    // ==========================================
    const solidGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const solidMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const solidMesh = new THREE.Mesh(solidGeom, solidMat);
    solidMesh.position.set(0, 0.45, 0);
    calGroup.add(solidMesh);
    solidMeshRef.current = solidMesh;

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
      cameraAngleRef.current.radius = Math.max(2.4, Math.min(7.5, cameraAngleRef.current.radius + e.deltaY * 0.004));
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
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (clock.isRunning) {
        transientTimeRef.current += 0.02 * clock.speed;

        // Rotate stirrer propeller
        if (stirrerPropRef.current) {
          stirrerPropRef.current.rotation.y += 0.15 * clock.speed;
        }
      }

      // Camera position
      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 1.1;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 1.0, 0);

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

  // Update physical visuals (Liquid color/height, Solid appearance)
  useEffect(() => {
    // Liquid mesh color & height (scaled with mass)
    if (liquidMeshRef.current) {
      const mat = liquidMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.setHex(liquidSpecs.color);
      }
      const lH = 0.5 + (liquidMass / 0.5) * 0.7;
      liquidMeshRef.current.scale.set(1, lH, 1);
      liquidMeshRef.current.position.y = 0.15 + lH / 2;
    }

    // Solid mesh appearance & melting
    if (solidMeshRef.current) {
      const mat = solidMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.setHex(solidSpecs.color);
        if (solidSpecs.isIce) {
          mat.roughness = 0.1;
          mat.opacity = 0.75;
          mat.transparent = true;
        } else {
          mat.roughness = 0.3;
          mat.opacity = 1.0;
          mat.transparent = false;
        }
      }

      // Scale solid volume based on mass and melting
      const massScale = Math.max(0.6, Math.min(1.4, (solidMass / 0.05) * 1.0));
      let meltFactor = 1.0;
      const meltFrac = eqState.iceMeltedFraction ?? 1.0;
      if (solidSpecs.isIce && meltFrac > 0) {
        meltFactor = Math.max(0.1, 1 - meltFrac * 0.85);
      }
      solidMeshRef.current.scale.set(massScale * meltFactor, massScale * meltFactor, massScale * meltFactor);
    }
  }, [liquidSpecs, liquidMass, solidSpecs, solidMass, eqState.iceMeltedFraction]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      { key: 'liquidTempC', label: 'Líquido T_liq (°C)', color: '#38bdf8', unit: '°C' },
      { key: 'solidTempC', label: 'Corpo T_sólido (°C)', color: '#f59e0b', unit: '°C' },
      { key: 'equilibriumTempC', label: 'Equilíbrio T_e (°C)', color: '#10b981', unit: '°C' },
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
                <Thermometer className="w-3.5 h-3.5" /> Equilíbrio Térmico Adiabático
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Σ Q = 0
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Temp. de Equilíbrio (T_e)</div>
                <div className="text-base font-black font-mono text-emerald-400">
                  {eqState.equilibriumTempC.toFixed(1)} <span className="text-xs text-slate-400 font-normal">°C</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{(eqState.equilibriumTempC + 273.15).toFixed(1)} K</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Calor Trocado (Q)</div>
                <div className="text-sm font-black font-mono text-cyan-300">
                  {(eqState.heatTransferredJoules / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">kJ</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{eqState.heatTransferredCal.toFixed(0)} cal</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Estado da Amostra</div>
                <div className="text-sm font-black font-mono text-amber-300">
                  {solidSpecs.isIce
                    ? (eqState.iceMeltedFraction ?? 1) >= 1.0
                      ? 'Fusão 100% Completa'
                      : `${(((eqState.iceMeltedFraction ?? 0)) * 100).toFixed(0)}% Fundido`
                    : 'Fase Sólida'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{solidSpecs.name}</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Calorímetro (Dewar)</div>
                <div className="text-sm font-black font-mono text-indigo-300">Adiabático</div>
                <div className="text-[10px] text-slate-500 font-mono">Q_externo = 0</div>
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
              setLiquidMass(0.25);
              setLiquidTemp(55);
              setSolidMass(0.05);
              setSolidTemp(0);
              transientTimeRef.current = 0;
              setDataBuffer([]);
            }}
            onStepForward={() => {
              transientTimeRef.current += 0.5;
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
            Líquido & Amostra Sólida
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
            Curva Térmica T(t)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {activeSideTab === 'controls' ? (
            <>
              {/* Exemplos Clássicos Presets Bar */}
              <ClassicPresetsBar
                moduleId="calorimetry"
                currentParams={{ liquidType, liquidMass, liquidTemp, solidType, solidMass, solidTemp }}
                onSelectPreset={applyPreset}
              />

              {/* Liquid Bath Controls */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-mono uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5" /> 1. Banho Líquido no Calorímetro
                </span>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'water', label: 'Água' },
                    { id: 'ethanol', label: 'Etanol' },
                    { id: 'oil', label: 'Óleo' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setLiquidType(item.id as any)}
                      className={`p-2 rounded-lg font-medium border text-center transition-all ${
                        liquidType === item.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Massa do Líquido (m₁):</span>
                  <span className="font-mono text-cyan-300 font-bold">{(liquidMass * 1000).toFixed(0)} g</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.02}
                  value={liquidMass}
                  onChange={(e) => setLiquidMass(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Temperatura Inicial (T₁):</span>
                  <span className="font-mono text-red-400 font-bold">{liquidTemp.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={1}
                  value={liquidTemp}
                  onChange={(e) => setLiquidTemp(parseFloat(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              {/* Solid Sample Controls */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> 2. Amostra Submersa / Gelo
                </span>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'ice', label: 'Gelo Fundente (0 °C)' },
                    { id: 'copper', label: 'Cobre (c = 385)' },
                    { id: 'iron', label: 'Ferro (c = 450)' },
                    { id: 'aluminum', label: 'Alumínio (c = 900)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSolidType(s.id as any);
                        if (s.id === 'ice') setSolidTemp(0);
                      }}
                      className={`p-2 rounded-lg font-medium border text-center transition-all ${
                        solidType === s.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Massa da Amostra (m₂):</span>
                  <span className="font-mono text-amber-300 font-bold">{(solidMass * 1000).toFixed(0)} g</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  value={solidMass}
                  onChange={(e) => setSolidMass(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Temperatura da Amostra (T₂):</span>
                  <span className="font-mono text-blue-400 font-bold">{solidTemp.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={100}
                  step={1}
                  disabled={solidType === 'ice'}
                  value={solidTemp}
                  onChange={(e) => setSolidTemp(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer disabled:opacity-40"
                />
              </div>

              {/* Mathematical Equation Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Equilíbrio em Vaso Adiabático</span>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex justify-center text-sm">
                  <KaTeXMath math="\sum Q = 0 \iff m_1 c_1 (T_e - T_1) + m_2 c_2 (T_e - T_2) + m_{\text{fusão}} L_f = 0" block />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Telemetry Chart */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Convergência Assintótica ao Equilíbrio Térmico
                </span>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="Temperatura do Líquido e da Amostra até T_e"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>
              </div>

              {/* Physical interpretation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <span className="font-mono uppercase font-bold text-cyan-400">Análise de Balanço Térmico</span>
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    • Calor transferido entre as substâncias: <strong className="text-cyan-300">{(eqState.heatTransferredJoules / 1000).toFixed(1)} kJ</strong> ({eqState.heatTransferredCal.toFixed(0)} cal).
                  </p>
                  <p>
                    • Temperatura final homogênea no calorímetro: <strong className="text-emerald-400">{eqState.equilibriumTempC.toFixed(1)} °C</strong>.
                  </p>
                  {solidSpecs.isIce && (
                    <p>
                      • Fusão do gelo (Lf = 80 cal/g ≈ 334 kJ/kg): <strong className="text-amber-300">{(((eqState.iceMeltedFraction ?? 0)) * 100).toFixed(1)}%</strong> da massa de gelo derreteu para formar água líquida a {eqState.equilibriumTempC.toFixed(1)} °C.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

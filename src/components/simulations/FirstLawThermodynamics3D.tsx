import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateFirstLaw, FirstLawState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Flame, Snowflake, ArrowUp, ArrowDown, Shield, Gauge, Zap } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface FirstLawThermodynamics3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const FirstLawThermodynamics3D: React.FC<FirstLawThermodynamics3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Thermodynamic parameters
  const [heatQ, setHeatQ] = useState<number>(() =>
    initialParams?.heatQ != null ? Number(initialParams.heatQ) : 300
  );
  const [workW, setWorkW] = useState<number>(() =>
    initialParams?.workW != null ? Number(initialParams.workW) : 180
  );
  const [initialU, setInitialU] = useState<number>(() =>
    initialParams?.initialU != null ? Number(initialParams.initialU) : 1500
  );
  const [modePreset, setModePreset] = useState<'custom' | 'isobaric' | 'isochoric' | 'isothermal' | 'adiabatic'>('custom');

  const applyPreset = useCallback((params: Record<string, any>) => {
    if (params.heatQ != null) setHeatQ(Number(params.heatQ));
    if (params.workW != null) setWorkW(Number(params.workW));
    if (params.initialU != null) setInitialU(Number(params.initialU));
  }, []);

  useEffect(() => {
    onParamsChange?.({ heatQ, workW, initialU });
  }, [heatQ, workW, initialU, onParamsChange]);

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

  // Calculate 1st Law physical state
  const state: FirstLawState = useMemo(() => {
    return calculateFirstLaw(heatQ, workW, initialU);
  }, [heatQ, workW, initialU]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 3D Meshes
  const pistonGroupRef = useRef<THREE.Group | null>(null);
  const flameMeshRef = useRef<THREE.Mesh | null>(null);
  const iceMeshRef = useRef<THREE.Mesh | null>(null);
  const flameLightRef = useRef<THREE.PointLight | null>(null);
  const qArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const wArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const chamberGasMeshRef = useRef<THREE.Mesh | null>(null);

  // Camera Orbit
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

  // Presets handler
  const handleApplyPreset = (preset: 'isobaric' | 'isochoric' | 'isothermal' | 'adiabatic') => {
    setModePreset(preset);
    if (preset === 'isobaric') {
      // Q = ΔU + W (both positive during expansion)
      setHeatQ(400);
      setWorkW(160);
    } else if (preset === 'isochoric') {
      // W = 0 => ΔU = Q
      setHeatQ(300);
      setWorkW(0);
    } else if (preset === 'isothermal') {
      // ΔU = 0 => Q = W
      setHeatQ(250);
      setWorkW(250);
    } else if (preset === 'adiabatic') {
      // Q = 0 => ΔU = -W
      setHeatQ(0);
      setWorkW(220); // expansion lowers U
    }
  };

  // Update telemetry for charts
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        heatQJ: state.heatQ,
        workWJ: state.workW,
        deltaUJ: state.deltaU,
        internalEnergyJ: state.finalInternalEnergy,
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
    scene.background = new THREE.Color(0x0a0e1c);
    scene.fog = new THREE.Fog(0x0a0e1c, 8, 25);

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

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.8);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0284c7, 0.9);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    // Dynamic flame point light
    const fLight = new THREE.PointLight(0xf97316, 2.5, 4);
    fLight.position.set(0, 0.25, 0);
    scene.add(fLight);
    flameLightRef.current = fLight;

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // ==========================================
    // CYLINDER & BURNER APPARATUS
    // ==========================================
    const rigGroup = new THREE.Group();
    scene.add(rigGroup);

    // Tripod Stand & Metal Base
    const tripodRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.05, 16, 36),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
    );
    tripodRing.rotation.x = Math.PI / 2;
    tripodRing.position.y = 0.5;
    rigGroup.add(tripodRing);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.55, 16),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
      );
      leg.position.set(Math.cos(angle) * 0.85, 0.27, Math.sin(angle) * 0.85);
      leg.rotation.z = Math.cos(angle) * 0.15;
      leg.rotation.x = -Math.sin(angle) * 0.15;
      rigGroup.add(leg);
    }

    // Burner Nozzle below tripod
    const burner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    burner.position.y = 0.13;
    rigGroup.add(burner);

    // Flame mesh (Cone with pulsing glowing material)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
    });
    const flameGeom = new THREE.ConeGeometry(0.24, 0.45, 16);
    flameGeom.translate(0, 0.22, 0);
    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.y = 0.25;
    rigGroup.add(flame);
    flameMeshRef.current = flame;

    // Ice bath ring / frost coils (active when Q < 0)
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    const iceRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 16, 32), iceMat);
    iceRing.rotation.x = Math.PI / 2;
    iceRing.position.y = 0.45;
    rigGroup.add(iceRing);
    iceMeshRef.current = iceRing;

    // Chamber Base Plate
    const chamberBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.08, 36),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 })
    );
    chamberBase.position.y = 0.54;
    rigGroup.add(chamberBase);

    // Chamber Wall (Semi-transparent Glass with thermal glow)
    const chamberGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 1.8, 36, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
        transmission: 0.85,
        depthWrite: false,
      })
    );
    chamberGlass.position.y = 1.48;
    rigGroup.add(chamberGlass);

    // Gas volume mesh (tints from blue to deep orange based on internal energy)
    const gasVolumeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      roughness: 0.5,
    });
    const gasVolume = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.0, 32), gasVolumeMat);
    gasVolume.position.y = 1.08;
    rigGroup.add(gasVolume);
    chamberGasMeshRef.current = gasVolume;

    // ==========================================
    // MOVABLE PISTON WITH MECHANICAL WEIGHTS
    // ==========================================
    const pGroup = new THREE.Group();
    pGroup.position.y = 1.35;

    // Piston Head
    const pHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.71, 0.71, 0.12, 36),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 })
    );
    pHead.castShadow = true;
    pGroup.add(pHead);

    // Rod
    const pRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 })
    );
    pRod.position.y = 0.66;
    pRod.castShadow = true;
    pGroup.add(pRod);

    // Top Platform with Weights
    const pPlat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 })
    );
    pPlat.position.y = 1.28;
    pGroup.add(pPlat);

    // Heavy Weights stack
    const weightBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.16, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 })
    );
    weightBlock.position.y = 1.38;
    pGroup.add(weightBlock);

    rigGroup.add(pGroup);
    pistonGroupRef.current = pGroup;

    // ==========================================
    // HEAT & WORK FORCE VECTORS (ARROWS)
    // ==========================================
    // Heat Arrow Q (at the base)
    const qArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0.1, 0.9),
      0.65,
      0xf97316,
      0.16,
      0.1
    );
    scene.add(qArrow);
    qArrowRef.current = qArrow;

    // Work Arrow W (at the piston rod top)
    const wArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 2.6, 0),
      0.7,
      0x0284c7,
      0.16,
      0.1
    );
    scene.add(wArrow);
    wArrowRef.current = wArrow;

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
    let localTime = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      localTime += 0.03 * clock.speed;

      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 1.2;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 1.2, 0);

      // Flame flicker animation
      if (flameMeshRef.current && flameLightRef.current) {
        if (heatQ > 0) {
          const s = 0.9 + Math.sin(localTime * 12) * 0.15 + Math.cos(localTime * 18) * 0.08;
          flameMeshRef.current.scale.set(s, s * 1.1, s);
          flameLightRef.current.intensity = (heatQ / 400) * (2.2 + Math.sin(localTime * 10) * 0.4);
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
  }, [clock.speed, heatQ]);

  // Update physical visuals (Piston height, Flame visibility, Vectors)
  useEffect(() => {
    // Work W expands (W > 0 raises piston) or compresses (W < 0 lowers piston)
    // Base height = 1.35; scale stroke by W
    const stroke = (workW / 400) * 0.65;
    const targetPistonY = Math.max(0.75, Math.min(2.1, 1.35 + stroke));

    if (pistonGroupRef.current) {
      pistonGroupRef.current.position.y = targetPistonY;
    }

    // Gas volume mesh height and position
    if (chamberGasMeshRef.current) {
      const gasHeight = Math.max(0.15, targetPistonY - 0.58);
      chamberGasMeshRef.current.scale.set(1, gasHeight, 1);
      chamberGasMeshRef.current.position.y = 0.58 + gasHeight / 2;

      // Color gas based on ΔU: negative (cold blue) to zero (cyan) to positive (fiery amber/orange)
      const uNorm = Math.max(-1, Math.min(1, state.deltaU / 400));
      const mat = chamberGasMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (uNorm >= 0) {
          mat.color.setHSL(0.55 - uNorm * 0.45, 0.9, 0.5);
        } else {
          mat.color.setHSL(0.55 + Math.abs(uNorm) * 0.08, 0.8, 0.6);
        }
      }
    }

    // Flame & Cooling Coils visibility
    if (flameMeshRef.current && flameLightRef.current && iceMeshRef.current) {
      flameMeshRef.current.visible = heatQ > 0;
      flameLightRef.current.visible = heatQ > 0;
      iceMeshRef.current.visible = heatQ < 0;
    }

    // Vectors (Heat Arrow Q and Work Arrow W)
    if (qArrowRef.current) {
      qArrowRef.current.visible = clock.showVectors && heatQ !== 0;
      if (heatQ > 0) {
        qArrowRef.current.setDirection(new THREE.Vector3(0, 1, 0));
        qArrowRef.current.setColor(0xf97316);
      } else {
        qArrowRef.current.setDirection(new THREE.Vector3(0, -1, 0));
        qArrowRef.current.setColor(0x38bdf8);
      }
      const qLen = Math.max(0.3, Math.min(0.9, (Math.abs(heatQ) / 400) * 0.8));
      qArrowRef.current.setLength(qLen, qLen * 0.25, qLen * 0.15);
    }

    if (wArrowRef.current) {
      wArrowRef.current.visible = clock.showVectors && workW !== 0;
      if (workW > 0) {
        wArrowRef.current.setDirection(new THREE.Vector3(0, 1, 0));
        wArrowRef.current.position.set(0, targetPistonY + 1.45, 0);
      } else {
        wArrowRef.current.setDirection(new THREE.Vector3(0, -1, 0));
        wArrowRef.current.position.set(0, targetPistonY + 1.8, 0);
      }
      const wLen = Math.max(0.3, Math.min(0.9, (Math.abs(workW) / 400) * 0.8));
      wArrowRef.current.setLength(wLen, wLen * 0.25, wLen * 0.15);
    }
  }, [workW, heatQ, state.deltaU, clock.showVectors]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      { key: 'heatQJ', label: 'Calor Q (J)', color: '#f97316', unit: 'J' },
      { key: 'workWJ', label: 'Trabalho W (J)', color: '#0284c7', unit: 'J' },
      { key: 'deltaUJ', label: 'ΔU = Q - W (J)', color: '#10b981', unit: 'J' },
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
                <Zap className="w-3.5 h-3.5" /> Balanço Energético da 1ª Lei
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                ΔU = Q - W
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400">Calor (Q)</span>
                <span className={`text-sm font-black font-mono ${state.heatQ >= 0 ? 'text-orange-400' : 'text-cyan-400'}`}>
                  {state.heatQ > 0 ? `+${state.heatQ.toFixed(0)}` : state.heatQ.toFixed(0)} J
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {state.heatQ > 0 ? 'Recebe calor' : state.heatQ === 0 ? 'Adiabático' : 'Cede calor'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400">Trabalho (W)</span>
                <span className={`text-sm font-black font-mono ${state.workW >= 0 ? 'text-blue-400' : 'text-purple-400'}`}>
                  {state.workW > 0 ? `+${state.workW.toFixed(0)}` : state.workW.toFixed(0)} J
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {state.regime === 'expansion' ? 'Expansão' : state.regime === 'isometric' ? 'Isocórico' : state.regime === 'adiabatic' ? 'Adiabático' : 'Compressão'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400">Var. Energia (ΔU)</span>
                <span className={`text-sm font-black font-mono ${state.deltaU >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {state.deltaU > 0 ? `+${state.deltaU.toFixed(0)}` : state.deltaU.toFixed(0)} J
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {state.deltaU > 0 ? 'Aquece' : state.deltaU === 0 ? 'T = cte' : 'Esfria'}
                </span>
              </div>
            </div>

            {/* Energy Partition Progress Bar */}
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Partição: Q ({state.heatQ} J)</span>
                <span>W: {state.workW} J | ΔU: {state.deltaU} J</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (Math.abs(state.workW) / (Math.abs(state.workW) + Math.abs(state.deltaU) + 0.01)) * 100))}%` }}
                  title="Parcela convertida em Trabalho W"
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (Math.abs(state.deltaU) / (Math.abs(state.workW) + Math.abs(state.deltaU) + 0.01)) * 100))}%` }}
                  title="Parcela convertida em Energia Interna ΔU"
                />
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
              setHeatQ(300);
              setWorkW(180);
              setInitialU(1500);
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
            Calor & Trabalho (1ª Lei)
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
            Telemetria & Gráficos
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {activeSideTab === 'controls' ? (
            <>
              {/* Exemplos Clássicos Presets Bar */}
              <ClassicPresetsBar
                moduleId="first_law_thermodynamics"
                currentParams={{ heatQ, workW, initialU }}
                onSelectPreset={applyPreset}
              />

              {/* Presets Grid */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Cenários Clássicos da 1ª Lei
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'isobaric', label: 'Expansão Isobárica (Q = ΔU + W)' },
                    { id: 'isochoric', label: 'Aquecimento Isocórico (W = 0)' },
                    { id: 'isothermal', label: 'Expansão Isotérmica (ΔU = 0)' },
                    { id: 'adiabatic', label: 'Compressão Adiabática (Q = 0)' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleApplyPreset(p.id as any)}
                      className={`p-2 rounded-lg text-left font-medium border transition-all ${
                        modePreset === p.id
                          ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heat Q Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" /> Calor Trocado (Q)
                  </span>
                  <span className="font-mono text-orange-400 text-xs font-bold">
                    {heatQ > 0 ? `+${heatQ}` : heatQ} J
                  </span>
                </div>
                <input
                  type="range"
                  min={-400}
                  max={600}
                  step={20}
                  value={heatQ}
                  onChange={(e) => {
                    setModePreset('custom');
                    setHeatQ(parseFloat(e.target.value));
                  }}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-400 J (Resfriamento)</span>
                  <span>0 J (Adiabático)</span>
                  <span>+600 J (Chama)</span>
                </div>
              </div>

              {/* Work W Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> Trabalho Mecânico (W)
                  </span>
                  <span className="font-mono text-blue-400 text-xs font-bold">
                    {workW > 0 ? `+${workW}` : workW} J
                  </span>
                </div>
                <input
                  type="range"
                  min={-400}
                  max={600}
                  step={20}
                  value={workW}
                  onChange={(e) => {
                    setModePreset('custom');
                    setWorkW(parseFloat(e.target.value));
                  }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-400 J (Comprimido)</span>
                  <span>0 J (Travado)</span>
                  <span>+600 J (Expansão)</span>
                </div>
              </div>

              {/* Initial Internal Energy U1 */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Energia Interna Inicial (U₁)</span>
                  <span className="font-mono text-emerald-400 text-xs font-bold">{initialU} J</span>
                </div>
                <input
                  type="range"
                  min={800}
                  max={3000}
                  step={100}
                  value={initialU}
                  onChange={(e) => setInitialU(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>800 J (Frio)</span>
                  <span>U₂ = {state.finalInternalEnergy} J (Final)</span>
                  <span>3000 J (Superaquecido)</span>
                </div>
              </div>

              {/* Mathematical Equation Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Princípio da Conservação</span>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex justify-center text-sm">
                  <KaTeXMath math="\Delta U = Q - W \quad \iff \quad U_2 = U_1 + (Q - W)" block />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Telemetry Chart */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Histórico das Grandezas Energéticas
                </span>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="Calor Q, Trabalho W e Variação ΔU"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>
              </div>

              {/* Physical interpretation notes */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <span className="font-mono uppercase font-bold text-cyan-400">Interpretação Termodinâmica</span>
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    • <strong>Q = {state.heatQ} J:</strong> {state.heatQ > 0 ? 'Calor fornecido ao fluido pela chama inferior.' : state.heatQ < 0 ? 'Calor extraído pelo resfriador.' : 'Sistema perfeitamente isolado termicamente.'}
                  </p>
                  <p>
                    • <strong>W = {state.workW} J:</strong> {state.workW > 0 ? 'O gás realizou trabalho sobre o êmbolo e levantou as massas.' : state.workW < 0 ? 'Trabalho externo realizado sobre o gás comprimindo o êmbolo.' : 'Volume constante, êmbolo travado.'}
                  </p>
                  <p>
                    • <strong>ΔU = {state.deltaU} J:</strong> A energia interna das moléculas variou de {initialU} J para <strong>{state.finalInternalEnergy} J</strong>.
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

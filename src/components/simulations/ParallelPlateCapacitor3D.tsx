import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateParallelPlateCapacitor, ParallelCapacitorState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Layers, BatteryCharging, ShieldCheck, Gauge, Zap } from 'lucide-react';

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface ParallelPlateCapacitor3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

type DielectricType = 'vacuum' | 'paper' | 'glass' | 'ceramic';

const formatScientific = (val: number): string => {
  if (val === 0 || !Number.isFinite(val)) return '0,00 × 10⁰';
  const exponent = Math.floor(Math.log10(Math.abs(val)));
  const mantissa = val / Math.pow(10, exponent);
  const superscriptMap: Record<string, string> = {
    '-': '⁻',
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  };
  const expUnicode = String(exponent)
    .split('')
    .map((char) => superscriptMap[char] || char)
    .join('');
  return `${mantissa.toFixed(2).replace('.', ',')} × 10${expUnicode}`;
};

export const ParallelPlateCapacitor3D: React.FC<ParallelPlateCapacitor3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Physical Parameters
  const [areaM2, setAreaM2] = useState<number>(
    () => (initialParams?.areaM2 != null ? Number(initialParams.areaM2) : 0.04)
  );
  const [distanceMm, setDistanceMm] = useState<number>(
    () => (initialParams?.distanceMm != null ? Number(initialParams.distanceMm) : 12.0)
  );
  const [voltageV, setVoltageV] = useState<number>(
    () => (initialParams?.voltageV != null ? Number(initialParams.voltageV) : 20.0)
  );
  const [dielectric, setDielectric] = useState<DielectricType>(
    () => (initialParams?.dielectric as DielectricType) || 'vacuum'
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.areaM2 !== undefined) setAreaM2(Number(p.areaM2));
    if (p.distanceMm !== undefined) setDistanceMm(Number(p.distanceMm));
    if (p.voltageV !== undefined) setVoltageV(Number(p.voltageV));
    if (p.dielectric !== undefined) setDielectric(p.dielectric as DielectricType);
  }, []);

  useEffect(() => {
    onParamsChange?.({ areaM2, distanceMm, voltageV, dielectric });
  }, [areaM2, distanceMm, voltageV, dielectric, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.areaM2 !== undefined) setAreaM2(Number(initialParams.areaM2));
      if (initialParams.distanceMm !== undefined) setDistanceMm(Number(initialParams.distanceMm));
      if (initialParams.voltageV !== undefined) setVoltageV(Number(initialParams.voltageV));
      if (initialParams.dielectric !== undefined) setDielectric(initialParams.dielectric as DielectricType);
    }
  }, [initialParams]);

  // Dielectric constant mapping
  const kappa = useMemo(() => {
    switch (dielectric) {
      case 'paper': return 2.5;
      case 'glass': return 5.0;
      case 'ceramic': return 10.0;
      case 'vacuum':
      default: return 1.0;
    }
  }, [dielectric]);

  const distanceM = distanceMm / 1000.0;

  // Derived Physical State
  const state: ParallelCapacitorState = useMemo(() => {
    return calculateParallelPlateCapacitor(areaM2, distanceM, voltageV, kappa);
  }, [areaM2, distanceM, voltageV, kappa]);

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

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 3D Objects
  const topPlateRef = useRef<THREE.Mesh | null>(null);
  const bottomPlateRef = useRef<THREE.Mesh | null>(null);
  const dielectricMeshRef = useRef<THREE.Mesh | null>(null);
  const fieldArrowsGroupRef = useRef<THREE.Group | null>(null);

  // Camera Orbit
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.6,
    phi: 0.9,
    radius: 3.8,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.6, phi: 0.9, radius: 3.8 };
  }, []);

  // Telemetry buffer update
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number(((now % 100000) / 1000).toFixed(2)),
        capacitancePF: Number(state.capacitancePF.toFixed(2)),
        electricField: Number((state.electricFieldVPerM / 1000).toFixed(2)), // kV/m
        storedEnergyNJ: Number((state.storedEnergyJ * 1e9).toFixed(3)), // nJ
        chargePC: Number((state.storedChargeC * 1e12).toFixed(2)), // pC
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, state]);

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
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 7, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-5, -3, -4);
    scene.add(dirLight2);

    // Coordinate Grid Floor
    const grid = new THREE.GridHelper(4, 16, 0x1e293b, 0x0f172a);
    grid.position.y = -0.9;
    scene.add(grid);

    // Groups
    const fieldArrowsGroup = new THREE.Group();
    scene.add(fieldArrowsGroup);
    fieldArrowsGroupRef.current = fieldArrowsGroup;

    // Top Plate (+ Q)
    const topPlateGeo = new THREE.BoxGeometry(1, 0.04, 1);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
    });
    const topPlate = new THREE.Mesh(topPlateGeo, topPlateMat);
    scene.add(topPlate);
    topPlateRef.current = topPlate;

    // Bottom Plate (- Q)
    const bottomPlateGeo = new THREE.BoxGeometry(1, 0.04, 1);
    const bottomPlateMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.35,
    });
    const bottomPlate = new THREE.Mesh(bottomPlateGeo, bottomPlateMat);
    scene.add(bottomPlate);
    bottomPlateRef.current = bottomPlate;

    // Dielectric Slab
    const dielectricGeo = new THREE.BoxGeometry(0.98, 0.2, 0.98);
    const dielectricMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
    });
    const dielectricMesh = new THREE.Mesh(dielectricGeo, dielectricMat);
    scene.add(dielectricMesh);
    dielectricMeshRef.current = dielectricMesh;

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
      cameraAngleRef.current.radius = Math.max(1.8, Math.min(8.0, cameraAngleRef.current.radius + e.deltaY * 0.003));
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
        cameraAngleRef.current.radius = Math.max(1.8, Math.min(8.0, cameraAngleRef.current.radius + delta * 0.01));
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    // Animation Loop
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

  // Update Geometry & Plates Positioning
  useEffect(() => {
    const topPlate = topPlateRef.current;
    const bottomPlate = bottomPlateRef.current;
    const dielectricMesh = dielectricMeshRef.current;
    const fieldArrowsGroup = fieldArrowsGroupRef.current;

    if (!topPlate || !bottomPlate || !dielectricMesh || !fieldArrowsGroup) return;

    // Visual plate side length L = sqrt(A) * visualScale
    const visualSide = Math.max(0.6, Math.min(1.8, Math.sqrt(areaM2) * 5.5));
    // Visual separation scaled
    const visualDistance = Math.max(0.2, Math.min(1.2, distanceM * 25.0));

    // Update plate scales
    topPlate.scale.set(visualSide, 1, visualSide);
    bottomPlate.scale.set(visualSide, 1, visualSide);

    topPlate.position.set(0, visualDistance / 2, 0);
    bottomPlate.position.set(0, -visualDistance / 2, 0);

    // Dielectric slab
    if (dielectric === 'vacuum') {
      dielectricMesh.visible = false;
    } else {
      dielectricMesh.visible = true;
      dielectricMesh.scale.set(visualSide * 0.98, visualDistance * 0.96 / 0.2, visualSide * 0.98);
      dielectricMesh.position.set(0, 0, 0);

      // Material color according to dielectric
      const mat = dielectricMesh.material as THREE.MeshStandardMaterial;
      if (dielectric === 'paper') {
        mat.color.setHex(0xd97706);
        mat.opacity = 0.45;
      } else if (dielectric === 'glass') {
        mat.color.setHex(0x38bdf8);
        mat.opacity = 0.35;
      } else if (dielectric === 'ceramic') {
        mat.color.setHex(0xa855f7);
        mat.opacity = 0.55;
      }
    }

    // Uniform Field Vectors (pointing downwards from + top to - bottom)
    while (fieldArrowsGroup.children.length > 0) {
      const obj = fieldArrowsGroup.children[0];
      fieldArrowsGroup.remove(obj);
      if (obj instanceof THREE.ArrowHelper) obj.dispose();
    }

    if (clock.showVectors && visualDistance > 0.15) {
      const dir = new THREE.Vector3(0, -1, 0);
      const rows = 3;
      const cols = 3;
      const span = visualSide * 0.65;
      const halfSpan = span / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = -halfSpan + (span / (cols - 1 || 1)) * c;
          const z = -halfSpan + (span / (rows - 1 || 1)) * r;
          const startOrigin = new THREE.Vector3(x, (visualDistance / 2) - 0.03, z);
          const arrowLen = Math.max(0.12, visualDistance - 0.06);

          const arrow = new THREE.ArrowHelper(
            dir,
            startOrigin,
            arrowLen,
            0xfbbf24,
            Math.min(0.08, arrowLen * 0.35),
            Math.min(0.05, arrowLen * 0.25)
          );
          fieldArrowsGroup.add(arrow);
        }
      }
    }
  }, [areaM2, distanceM, dielectric, clock.showVectors]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(
    () => [
      {
        key: 'capacitancePF',
        label: 'Capacitância C (pF)',
        color: '#f59e0b',
        unit: 'pF',
      },
      {
        key: 'electricField',
        label: 'Campo E (kV/m)',
        color: '#38bdf8',
        unit: 'kV/m',
      },
      {
        key: 'storedEnergyNJ',
        label: 'Energia U (nJ)',
        color: '#10b981',
        unit: 'nJ',
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
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60 uppercase font-bold">
                MÓDULO E4 · ELETRICIDADE
              </span>
              <h1 className="text-sm font-bold text-white tracking-wide">Capacitor de Placas Paralelas</h1>
            </div>
          </div>
        </div>

        {/* Quick Voltage Presets */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => setVoltageV(5.0)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              voltageV === 5.0 ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            5V
          </button>
          <button
            onClick={() => setVoltageV(12.0)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              voltageV === 12.0 ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            12V
          </button>
          <button
            onClick={() => setVoltageV(24.0)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              voltageV === 24.0 ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            24V
          </button>
          <button
            onClick={() => setVoltageV(50.0)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              voltageV === 50.0 ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            50V
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-400 hover:bg-amber-900/60 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Roteiro do Capacitor</span>
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

          {/* Floating Physical HUD */}
          <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-auto max-w-sm flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5" /> Estado do Capacitor
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                κ = {kappa.toFixed(1)} ({dielectric.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Capacitância (C)</div>
                <div className="text-base font-mono font-extrabold text-amber-300">
                  {state.capacitancePF.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-amber-400/80">pF</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Campo Uniforme (E)</div>
                <div className="text-base font-mono font-extrabold text-sky-400">
                  {(state.electricFieldVPerM / 1000).toFixed(2)}{' '}
                  <span className="text-xs font-normal text-sky-400/80">kV/m</span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline justify-between text-xs pt-0.5">
              <span className="text-slate-400">Carga Acumulada Q:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {(state.storedChargeC * 1e9).toFixed(3)} nC
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Energia Eletrostática U:</span>
              <span className="font-mono text-cyan-300 font-bold">
                {(state.storedEnergyJ * 1e9).toFixed(3)} nJ
              </span>
            </div>

            <div className="text-[10px] font-mono text-slate-400 bg-slate-950/70 p-1.5 rounded border border-slate-800 flex justify-between">
              <span>Densidade u: {formatScientific(state.energyDensityJPerM3)} J/m³</span>
              <span>V = {voltageV.toFixed(1)} V</span>
            </div>
          </div>

          {/* Equations Banner */}
          {clock.showFormulas && (
            <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-3">
              <div className="text-slate-400 text-[11px]">Equações Fundamentais:</div>
              <div className="font-mono text-cyan-300 font-bold flex items-center gap-3">
                <span>C = ε · A / d = κ · ε₀ · A / d</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-300">U = ½ · C · V²</span>
              </div>
            </div>
          )}

          <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800 pointer-events-none hidden sm:block">
            Vermelho: Placa (+) · Azul: Placa (-)
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
              <span>Dimensões & Dielétrico</span>
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
              <span>Gráficos C, E e U</span>
            </button>
          </div>

          {/* Side Tabs Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSideTab === 'controls' ? (
              <>
                {/* Classic Didactic Presets Bar */}
                <ClassicPresetsBar
                  moduleId="parallel_plate_capacitor"
                  onApplyPreset={applyPreset}
                  currentParams={{ areaM2, distanceMm, voltageV, dielectric }}
                />

                {/* Dielectric Material Selector */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-300">Material Dielétrico (κ)</span>
                    <span className="font-mono text-amber-400 font-bold">κ = {kappa.toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'vacuum', label: 'VÁCUO', sub: 'κ = 1,0' },
                      { id: 'paper', label: 'PAPEL', sub: 'κ = 2,5' },
                      { id: 'glass', label: 'VIDRO', sub: 'κ = 5,0' },
                      { id: 'ceramic', label: 'CERÂMICA', sub: 'κ = 10,0' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDielectric(d.id as DielectricType)}
                        className={`p-2 rounded-lg font-medium border text-left transition-colors cursor-pointer ${
                          dielectric === d.id
                            ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-bold text-xs">{d.label}</div>
                        <div className="text-[10px] text-slate-400">{d.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider: Area A */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Área das Placas (A):</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {(areaM2 * 1e4).toFixed(0)} cm² ({areaM2.toFixed(3)} m²)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.12"
                    step="0.005"
                    value={areaM2}
                    onChange={(e) => setAreaM2(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>100 cm²</span>
                    <span>L = {(Math.sqrt(areaM2) * 100).toFixed(1)} cm</span>
                    <span>1200 cm²</span>
                  </div>
                </div>

                {/* Slider: Separation Distance d */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Distância entre Placas (d):</span>
                    <span className="font-mono text-amber-300 font-bold">{distanceMm.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="35.0"
                    step="0.5"
                    value={distanceMm}
                    onChange={(e) => setDistanceMm(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>4 mm (Alta capacitância)</span>
                    <span>35 mm</span>
                  </div>
                </div>

                {/* Slider: Applied Voltage V */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Tensão da Fonte (V):</span>
                    <span className="font-mono text-cyan-300 font-bold">{voltageV.toFixed(1)} V</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="60.0"
                    step="1.0"
                    value={voltageV}
                    onChange={(e) => setVoltageV(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 V</span>
                    <span>60 V</span>
                  </div>
                </div>

                {/* Educational Insight Card */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Conceitos Eletrostáticos Chave</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Ao <strong>reduzir a distância d</strong> pela metade, a capacitância <strong>duplica</strong> (C ∝ 1/d).</li>
                    <li>Ao inserir um <strong>dielétrico (κ)</strong>, as moléculas se polarizam, atenuando o campo interno e permitindo armazenar mais carga para a mesma tensão.</li>
                    <li>A energia potencial é puramente eletrostática e fica armazenada no próprio campo elétrico (u = ½ · ε · E²).</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Capacitância & Energia no Tempo</span>
                  <span className="text-amber-400 font-mono text-[10px]">Tempo Real</span>
                </div>
                <div className="h-64 bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    xLabel="Tempo"
                    xUnit="s"
                    title="Capacitância (pF), Campo (kV/m) e Energia (nJ)"
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
          setAreaM2(0.04);
          setDistanceMm(12.0);
          setVoltageV(20.0);
          setDielectric('vacuum');
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

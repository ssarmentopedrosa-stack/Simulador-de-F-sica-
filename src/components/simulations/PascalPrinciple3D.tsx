import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateHydraulicPress, HydraulicPressState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, ArrowDown, ArrowUp, Gauge, ShieldCheck } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface PascalPrinciple3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const PascalPrinciple3D: React.FC<PascalPrinciple3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [force1, setForce1] = useState<number>(
    () => (initialParams?.force1 != null ? Number(initialParams.force1) : 120)
  );
  const [radius1, setRadius1] = useState<number>(
    () => (initialParams?.radius1 != null ? Number(initialParams.radius1) : 0.05)
  );
  const [radius2, setRadius2] = useState<number>(
    () => (initialParams?.radius2 != null ? Number(initialParams.radius2) : 0.25)
  );
  const [displacement1, setDisplacement1] = useState<number>(
    () => (initialParams?.displacement1 != null ? Number(initialParams.displacement1) : 0.25)
  );
  const [efficiency, setEfficiency] = useState<number>(
    () => (initialParams?.efficiency != null ? Number(initialParams.efficiency) : 1.0)
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.force1 !== undefined) setForce1(Number(p.force1));
    if (p.radius1 !== undefined) setRadius1(Number(p.radius1));
    if (p.radius2 !== undefined) setRadius2(Number(p.radius2));
    if (p.displacement1 !== undefined) setDisplacement1(Number(p.displacement1));
    if (p.efficiency !== undefined) setEfficiency(Number(p.efficiency));
  }, []);

  useEffect(() => {
    onParamsChange?.({ force1, radius1, radius2, displacement1, efficiency });
  }, [force1, radius1, radius2, displacement1, efficiency, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.force1 !== undefined) setForce1(Number(initialParams.force1));
      if (initialParams.radius1 !== undefined) setRadius1(Number(initialParams.radius1));
      if (initialParams.radius2 !== undefined) setRadius2(Number(initialParams.radius2));
      if (initialParams.displacement1 !== undefined) setDisplacement1(Number(initialParams.displacement1));
      if (initialParams.efficiency !== undefined) setEfficiency(Number(initialParams.efficiency));
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

  // Derived Physical State
  const state: HydraulicPressState = useMemo(() => {
    return calculateHydraulicPress(force1, radius1, radius2, displacement1, efficiency);
  }, [force1, radius1, radius2, displacement1, efficiency]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Piston group refs
  const piston1GroupRef = useRef<THREE.Group | null>(null);
  const piston2GroupRef = useRef<THREE.Group | null>(null);
  const cylinder1MeshRef = useRef<THREE.Mesh | null>(null);
  const cylinder2MeshRef = useRef<THREE.Mesh | null>(null);
  const fluid1MeshRef = useRef<THREE.Mesh | null>(null);
  const fluid2MeshRef = useRef<THREE.Mesh | null>(null);
  const arrowF1Ref = useRef<THREE.ArrowHelper | null>(null);
  const arrowF2Ref = useRef<THREE.ArrowHelper | null>(null);

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
        t: Number((now % 100000 / 1000).toFixed(2)),
        force1N: state.force1,
        force2N: state.force2,
        work1J: state.work1,
        work2J: state.work2,
        pressureKPa: state.deltaP / 1000,
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
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.Fog(0x090d16, 10, 28);

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
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Hydraulic Machine Base Frame
    const baseGeo = new THREE.BoxGeometry(3.6, 0.12, 1.4);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
    const machineBase = new THREE.Mesh(baseGeo, baseMat);
    machineBase.position.y = 0.06;
    machineBase.receiveShadow = true;
    scene.add(machineBase);

    // Interconnecting High-Pressure Hydraulic Pipe (Horizontal along base)
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 24);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475467, metalness: 0.8, roughness: 0.3 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0.1, 0.18, 0);
    scene.add(pipe);

    // ==========================================
    // CYLINDER 1 (INPUT / OPERADOR, x = -1.0)
    // ==========================================
    const cyl1Group = new THREE.Group();
    cyl1Group.position.set(-1.0, 0.12, 0);
    scene.add(cyl1Group);

    // Outer Chamber (Transparent Glass / Steel Frame)
    const cyl1Mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 1.6, 32, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.2,
        transmission: 0.8,
        depthWrite: false,
      })
    );
    cyl1Mesh.position.y = 0.8;
    cyl1Group.add(cyl1Mesh);
    cylinder1MeshRef.current = cyl1Mesh;

    // Fluid inside Cylinder 1 (Red/Hydraulic Oil)
    const f1Mat = new THREE.MeshStandardMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 });
    const fluid1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 1, 32), f1Mat);
    fluid1Mesh.position.y = 0.5;
    cyl1Group.add(fluid1Mesh);
    fluid1MeshRef.current = fluid1Mesh;

    // Movable Piston 1
    const p1Group = new THREE.Group();
    const p1Head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.195, 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
    );
    const p1Rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 })
    );
    p1Rod.position.y = 0.7;
    const p1Plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 })
    );
    p1Plate.position.y = 1.4;
    p1Group.add(p1Head);
    p1Group.add(p1Rod);
    p1Group.add(p1Plate);
    cyl1Group.add(p1Group);
    piston1GroupRef.current = p1Group;

    // Arrow F1 (Downward on Piston 1)
    const arrowF1 = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1.0, 2.2, 0), 0.6, 0xf59e0b, 0.12, 0.08);
    scene.add(arrowF1);
    arrowF1Ref.current = arrowF1;

    // Manometer 1 on Cylinder 1
    const gauge1Group = new THREE.Group();
    gauge1Group.position.set(-1.0, 1.4, 0.3);
    const g1Back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.3 })
    );
    g1Back.rotation.x = Math.PI / 2;
    gauge1Group.add(g1Back);
    scene.add(gauge1Group);

    // ==========================================
    // CYLINDER 2 (OUTPUT / ELEVADOR, x = 0.8)
    // ==========================================
    const cyl2Group = new THREE.Group();
    cyl2Group.position.set(0.8, 0.12, 0);
    scene.add(cyl2Group);

    // Outer Chamber 2
    const cyl2Mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 1.6, 32, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.2,
        transmission: 0.8,
        depthWrite: false,
      })
    );
    cyl2Mesh.position.y = 0.8;
    cyl2Group.add(cyl2Mesh);
    cylinder2MeshRef.current = cyl2Mesh;

    // Fluid inside Cylinder 2
    const fluid2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1, 32), f1Mat);
    fluid2Mesh.position.y = 0.5;
    cyl2Group.add(fluid2Mesh);
    fluid2MeshRef.current = fluid2Mesh;

    // Movable Piston 2 (Heavy Platform carrying payload)
    const p2Group = new THREE.Group();
    const p2Head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.585, 0.585, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
    );
    const p2Rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 })
    );
    p2Rod.position.y = 0.6;
    const p2Platform = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 })
    );
    p2Platform.position.y = 1.24;

    // Vehicle / Load on platform
    const loadMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.5 })
    );
    loadMesh.position.y = 1.48;

    p2Group.add(p2Head);
    p2Group.add(p2Rod);
    p2Group.add(p2Platform);
    p2Group.add(loadMesh);
    cyl2Group.add(p2Group);
    piston2GroupRef.current = p2Group;

    // Arrow F2 (Upward on Piston 2)
    const arrowF2 = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.8, 0.1, 0), 1.0, 0x10b981, 0.15, 0.1);
    scene.add(arrowF2);
    arrowF2Ref.current = arrowF2;

    // Manometer 2 on Cylinder 2
    const gauge2Group = new THREE.Group();
    gauge2Group.position.set(0.8, 1.4, 0.7);
    const g2Back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.3 })
    );
    g2Back.rotation.x = Math.PI / 2;
    gauge2Group.add(g2Back);
    scene.add(gauge2Group);

    // Orbit Camera Controls
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
      cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(2.5, Math.min(9.0, cameraAngleRef.current.radius + e.deltaY * 0.003));
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

      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
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

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 0.9;
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
  }, []);

  // Update animated positions of pistons and fluid columns based on stroke displacement
  useEffect(() => {
    if (!piston1GroupRef.current || !piston2GroupRef.current) return;

    // Visual scale factor
    const stroke1 = state.displacement1; // m
    const stroke2 = state.displacement2; // m

    // Rest position: piston 1 at y = 0.9, piston 2 at y = 0.4
    const p1Y = Math.max(0.2, 0.9 - stroke1 * 1.5);
    const p2Y = Math.min(1.4, 0.4 + stroke2 * 1.5);

    piston1GroupRef.current.position.y = p1Y;
    piston2GroupRef.current.position.y = p2Y;

    // Fluid heights in cylinders
    if (fluid1MeshRef.current) {
      fluid1MeshRef.current.scale.set(1, Math.max(0.05, p1Y), 1);
      fluid1MeshRef.current.position.y = p1Y / 2;
    }
    if (fluid2MeshRef.current) {
      fluid2MeshRef.current.scale.set(1, Math.max(0.05, p2Y), 1);
      fluid2MeshRef.current.position.y = p2Y / 2;
    }

    // Dynamic force arrows
    if (arrowF1Ref.current && arrowF2Ref.current) {
      const lenF1 = Math.max(0.3, Math.min(0.8, (state.force1 / 300) * 0.7));
      arrowF1Ref.current.position.set(-1.0, p1Y + 1.5 + lenF1, 0);
      arrowF1Ref.current.setLength(lenF1, lenF1 * 0.25, lenF1 * 0.15);
      arrowF1Ref.current.visible = clock.showVectors;

      const lenF2 = Math.max(0.4, Math.min(1.2, (state.force2 / 5000) * 1.0));
      arrowF2Ref.current.position.set(0.8, p2Y + 0.1, 0);
      arrowF2Ref.current.setLength(lenF2, lenF2 * 0.25, lenF2 * 0.15);
      arrowF2Ref.current.visible = clock.showVectors;
    }
  }, [state, clock.showVectors]);

  // Chart Series
  const chartSeries: ChartSeries[] = useMemo(() => [
    { key: 'force1N', label: 'Força de Entrada F₁ (N)', color: '#f59e0b', unit: 'N' },
    { key: 'force2N', label: 'Força de Saída F₂ (N)', color: '#10b981', unit: 'N' },
  ], []);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
      {/* 3D Viewport */}
      <div className="flex-1 relative flex flex-col min-h-[360px] md:min-h-0">
        <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing outline-none" />

        {/* Floating Top Badge with Camera Reset */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Prensa Hidráulica & Princípio de Pascal
            </span>
          </div>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Redefinir Câmera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live HUD Cards over 3D Scene */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-[260px]">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-sm">
            <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold mb-1">Multiplicação de Força</div>
            <div className="text-xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
              {state.areaRatio.toFixed(1)}x
              <span className="text-xs font-normal text-slate-400">({state.force2.toFixed(1)} N)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Força Aplicada F₁:</span>
              <span className="font-mono text-amber-400">{state.force1.toFixed(1)} N</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Pressão no Fluido:</span>
              <span className="font-mono text-cyan-300">{(state.deltaP / 1000).toFixed(1)} kPa</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Trabalho W₁ = W₂:</span>
              <span className="font-mono text-white">{state.work1.toFixed(1)} J</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Deslocamento d₂:</span>
              <span className="font-mono text-emerald-400">{(state.displacement2 * 100).toFixed(2)} cm</span>
            </div>
          </div>
        </div>

        {/* Playback Control Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80">
          <PlaybackBar
            clock={clock}
            onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
            onReset={() => setDataBuffer([])}
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


      {/* Side Panel Tabs */}
      <div className="w-full md:w-96 lg:w-[420px] bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 z-20">
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveSideTab('controls')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'controls' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parâmetros</span>
          </button>
          <button
            onClick={() => setActiveSideTab('graphs')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'graphs' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Gráficos em Tempo Real</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs">
          {activeSideTab === 'controls' ? (
            <>
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="pascal_principle"
                onApplyPreset={applyPreset}
                currentParams={{ force1, radius1, radius2, displacement1, efficiency }}
              />

              {/* Force 1 Control */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Força de Entrada Aplicada (F₁):</span>
                  <span className="font-mono text-amber-400 font-bold">{force1.toFixed(0)} N</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={force1}
                  onChange={(e) => setForce1(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>10 N</span>
                  <span>500 N</span>
                </div>
              </div>

              {/* Radii Controls */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-400">Raio do Pistão 1 (r₁):</span>
                    <span className="font-mono text-cyan-400 font-bold">{(radius1 * 100).toFixed(1)} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.10"
                    step="0.01"
                    value={radius1}
                    onChange={(e) => setRadius1(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-400">Raio do Pistão 2 (r₂):</span>
                    <span className="font-mono text-emerald-400 font-bold">{(radius2 * 100).toFixed(1)} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0.12"
                    max="0.40"
                    step="0.01"
                    value={radius2}
                    onChange={(e) => setRadius2(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Vantagem Mecânica (A₂ / A₁):</span>
                  <span className="font-mono text-emerald-400 font-bold">{state.areaRatio.toFixed(2)}x</span>
                </div>
              </div>

              {/* Stroke Displacement 1 */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Curso do Pistão 1 (d₁):</span>
                  <span className="font-mono text-cyan-400 font-bold">{(displacement1 * 100).toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.01"
                  value={displacement1}
                  onChange={(e) => setDisplacement1(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Elevação da Carga (d₂):</span>
                  <span className="font-mono text-emerald-400 font-bold">{(state.displacement2 * 100).toFixed(2)} cm</span>
                </div>
              </div>

              {/* Conservation of Work Verification Card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Conservação Rigorosa de Trabalho</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Trabalho Entrada W₁</div>
                    <div className="font-mono text-amber-400 font-bold">{state.work1.toFixed(2)} J</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Trabalho Saída W₂</div>
                    <div className="font-mono text-emerald-400 font-bold">{state.work2.toFixed(2)} J</div>
                  </div>
                </div>
              </div>

              {/* Mathematical Equations */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Princípio de Pascal</span>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <KaTeXMath math="\Delta P = \frac{F_1}{A_1} = \frac{F_2}{A_2}" />
                  <KaTeXMath math="F_2 = F_1 \left(\frac{r_2}{r_1}\right)^2" />
                  <KaTeXMath math="W_1 = F_1 d_1 = F_2 d_2 = W_2" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Charts */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Força de Entrada vs Força Multiplicada
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{dataBuffer.length} amostras</span>
                </div>

                <div className="h-64 w-full bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="F₂ = F₁ · (A₂ / A₁)"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-2">
                  <span className="font-bold text-slate-200">Vantagem Mecânica sem Violação da Energia:</span>
                  <p>
                    A força é amplificada em <strong className="text-emerald-400">{state.areaRatio.toFixed(1)} vezes</strong>,
                    permitindo erguer <strong className="text-white">{(state.force2 / 9.8).toFixed(1)} kg</strong> com apenas{' '}
                    <strong className="text-amber-400">{state.force1.toFixed(0)} N</strong> aplicados. Em contrapartida,
                    o deslocamento do êmbolo de saída é dividido exatamente pelo mesmo fator, conservando o trabalho mecânico{' '}
                    <KaTeXMath math="W_1 = W_2" />.
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

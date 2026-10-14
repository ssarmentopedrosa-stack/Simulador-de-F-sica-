import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { calculateSHM, SHMState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Layers } from 'lucide-react';

interface SHM3DProps {
  onOpenExperiment?: () => void;
}

export const SHM3D: React.FC<SHM3DProps> = ({ onOpenExperiment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Physical Parameters
  const [amplitude, setAmplitude] = useState<number>(1.2);
  const [frequency, setFrequency] = useState<number>(0.8);
  const [initialPhaseDeg, setInitialPhaseDeg] = useState<number>(0);
  const [compareSecond, setCompareSecond] = useState<boolean>(false);
  const [phaseDiffDeg, setPhaseDiffDeg] = useState<number>(90);
  const [showPhasor, setShowPhasor] = useState<boolean>(true);

  // Simulation Clock state
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

  // Telemetry buffer for charts
  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);
  const [currentState, setCurrentState] = useState<SHMState>(() => calculateSHM(0, 1.2, 0.8, 0));

  // Mutable refs for Three.js render loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blockMeshRef = useRef<THREE.Group | null>(null);
  const block2MeshRef = useRef<THREE.Group | null>(null);
  const phasorArmRef = useRef<THREE.Group | null>(null);
  const velArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const accArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const posArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.3,
    phi: 0.4,
    radius: 7.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset simulation
  const handleReset = useCallback(() => {
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update physical calculations
  useEffect(() => {
    const phiRad = (initialPhaseDeg * Math.PI) / 180;
    const st = calculateSHM(clock.time, amplitude, frequency, phiRad);
    setCurrentState(st);

    // Append to chart buffer
    setDataBuffer((prev) => {
      const phi2Rad = ((initialPhaseDeg + phaseDiffDeg) * Math.PI) / 180;
      const st2 = calculateSHM(clock.time, amplitude, frequency, phi2Rad);
      const newPt: DataPoint = {
        t: clock.time,
        x: st.x,
        v: st.v,
        a: st.a,
        x2: st2.x,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, amplitude, frequency, initialPhaseDeg, phaseDiffDeg]);

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.04);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    // Laboratory Floor Grid
    const grid = new THREE.GridHelper(14, 28, 0x0284c7, 0x1e293b);
    grid.position.y = -1.0;
    scene.add(grid);

    // Metallic Linear Track Bed
    const trackGroup = new THREE.Group();
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Base slab
    const baseGeo = new THREE.BoxGeometry(6.4, 0.2, 0.8);
    const baseMesh = new THREE.Mesh(baseGeo, trackMat);
    baseMesh.position.y = -0.9;
    baseMesh.receiveShadow = true;
    trackGroup.add(baseMesh);

    // Twin cylindrical chrome guide rails
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 6.4, 32);
    railGeo.rotateZ(Math.PI / 2);
    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(0, -0.75, 0.22);
    rail1.castShadow = true;
    const rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(0, -0.75, -0.22);
    rail2.castShadow = true;
    trackGroup.add(rail1, rail2);

    // Center equilibrium marker (x = 0)
    const eqLineGeo = new THREE.BoxGeometry(0.04, 0.4, 0.9);
    const eqLineMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.5 });
    const eqMarker = new THREE.Mesh(eqLineGeo, eqLineMat);
    eqMarker.position.set(0, -0.75, 0);
    trackGroup.add(eqMarker);

    scene.add(trackGroup);

    // Primary Oscillating Slider (Composite 4-part procedural assembly)
    const blockGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.2,
    });
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.6);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    blockGroup.add(bodyMesh);

    // Brass linear bushings
    const bushingMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.3 });
    const bGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.72, 16);
    bGeo.rotateZ(Math.PI / 2);
    const b1 = new THREE.Mesh(bGeo, bushingMat);
    b1.position.set(0, -0.1, 0.22);
    const b2 = new THREE.Mesh(bGeo, bushingMat);
    b2.position.set(0, -0.1, -0.22);
    blockGroup.add(b1, b2);

    // Glowing core index
    const coreGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 0.15;
    blockGroup.add(coreMesh);

    blockGroup.position.set(0, -0.65, 0);
    scene.add(blockGroup);
    blockMeshRef.current = blockGroup;

    // Second Oscillator (Comparison)
    const block2Group = new THREE.Group();
    const body2Mat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.7, roughness: 0.2 });
    const b2Mesh = new THREE.Mesh(bodyGeo, body2Mat);
    b2Mesh.castShadow = true;
    block2Group.add(b2Mesh);
    block2Group.position.set(0, -0.65, -0.9);
    block2Group.visible = false;
    scene.add(block2Group);
    block2MeshRef.current = block2Group;

    // Phasor MCU Reference Circle & Arm
    const phasorGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(1.18, 1.22, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 1.2, 0);
    phasorGroup.add(ringMesh);

    // Rotating pointer arm
    const armGroup = new THREE.Group();
    armGroup.position.set(0, 1.2, 0);
    const armGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 16);
    armGeo.translate(0, 0.6, 0);
    armGeo.rotateZ(-Math.PI / 2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armGroup.add(armMesh);

    // Projection dashed drop line
    const dropLineMat = new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 0.1, gapSize: 0.06 });
    const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -1.85, 0),
    ]);
    const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
    dropLine.computeLineDistances();
    armGroup.add(dropLine);

    phasorGroup.add(armGroup);
    scene.add(phasorGroup);
    phasorArmRef.current = armGroup;

    // Vector Visualizers
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x10b981, 0.2, 0.12);
    const accArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0xef4444, 0.2, 0.12);
    const posArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -0.65, 0), 1, 0x3b82f6, 0.15, 0.1);

    scene.add(velArrow);
    scene.add(accArrow);
    scene.add(posArrow);
    velArrowRef.current = velArrow;
    accArrowRef.current = accArrow;
    posArrowRef.current = posArrow;

    // Mouse drag orbit controls
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
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.1, cameraAngleRef.current.phi + dy * 0.008));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      cameraAngleRef.current.radius = Math.max(3.5, Math.min(14, cameraAngleRef.current.radius + e.deltaY * 0.006));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: true });

    // Window resize handler
    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Main Render & Simulation Loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const deltaSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (clock.isRunning) {
        setClock((prev) => ({
          ...prev,
          time: prev.time + Math.min(deltaSec, 0.1) * prev.speed,
        }));
      }

      // Update Camera coordinates
      const cam = cameraRef.current;
      if (cam) {
        if (clock.is2DView) {
          cam.position.set(0, 0, 8);
          cam.lookAt(0, 0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, -0.2, 0);
        }
      }

      // Update 3D block positions
      const phiRad = (initialPhaseDeg * Math.PI) / 180;
      const st = calculateSHM(clock.time, amplitude, frequency, phiRad);

      if (blockMeshRef.current) {
        blockMeshRef.current.position.x = st.x;
      }

      if (block2MeshRef.current) {
        block2MeshRef.current.visible = compareSecond;
        if (compareSecond) {
          const phi2Rad = ((initialPhaseDeg + phaseDiffDeg) * Math.PI) / 180;
          const st2 = calculateSHM(clock.time, amplitude, frequency, phi2Rad);
          block2MeshRef.current.position.x = st2.x;
        }
      }

      // Update Phasor rotation
      if (phasorArmRef.current) {
        phasorArmRef.current.visible = showPhasor;
        phasorArmRef.current.rotation.y = -(st.omega * clock.time + phiRad);
      }

      // Update Vectors
      if (clock.showVectors && velArrowRef.current && accArrowRef.current && posArrowRef.current) {
        velArrowRef.current.visible = true;
        accArrowRef.current.visible = true;
        posArrowRef.current.visible = true;

        // Position arrow
        posArrowRef.current.position.set(0, -0.25, 0.4);
        posArrowRef.current.setDirection(new THREE.Vector3(st.x >= 0 ? 1 : -1, 0, 0));
        posArrowRef.current.setLength(Math.max(0.01, Math.abs(st.x)), 0.15, 0.08);

        // Velocity vector (green)
        const vDir = st.v >= 0 ? 1 : -1;
        velArrowRef.current.position.set(st.x, -0.1, 0);
        velArrowRef.current.setDirection(new THREE.Vector3(vDir, 0, 0));
        velArrowRef.current.setLength(Math.max(0.01, Math.abs(st.v) * 0.45), 0.2, 0.1);

        // Acceleration vector (red)
        const aDir = st.a >= 0 ? 1 : -1;
        accArrowRef.current.position.set(st.x, 0.25, 0);
        accArrowRef.current.setDirection(new THREE.Vector3(aDir, 0, 0));
        accArrowRef.current.setLength(Math.max(0.01, Math.abs(st.a) * 0.25), 0.2, 0.1);
      } else if (velArrowRef.current && accArrowRef.current && posArrowRef.current) {
        velArrowRef.current.visible = false;
        accArrowRef.current.visible = false;
        posArrowRef.current.visible = false;
      }

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [clock.isRunning, clock.speed, clock.time, clock.is2DView, clock.showVectors, amplitude, frequency, initialPhaseDeg, compareSecond, phaseDiffDeg, showPhasor]);

  // Chart series configuration
  const chartSeries: ChartSeries[] = [
    { key: 'x', label: 'Posição x(t)', color: '#38bdf8', unit: 'm' },
    { key: 'v', label: 'Velocidade v(t)', color: '#10b981', unit: 'm/s' },
    { key: 'a', label: 'Aceleração a(t)', color: '#f43f5e', unit: 'm/s²' },
  ];

  if (compareSecond) {
    chartSeries.push({ key: 'x2', label: 'Oscilador 2 x₂(t)', color: '#c084fc', unit: 'm' });
  }

  // Telemetry indicators
  const quantities: PhysicalQuantity[] = [
    { label: 'Posição', symbol: 'x', value: currentState.x, unit: 'm', precision: 3, highlight: true },
    { label: 'Velocidade', symbol: 'v', value: currentState.v, unit: 'm/s', precision: 3 },
    { label: 'Aceleração', symbol: 'a', value: currentState.a, unit: 'm/s²', precision: 3 },
    { label: 'Frequência', symbol: 'f', value: frequency, unit: 'Hz', precision: 2 },
    { label: 'Período', symbol: 'T', value: currentState.period, unit: 's', precision: 2 },
    { label: 'Freq. Angular', symbol: 'ω', value: currentState.omega, unit: 'rad/s', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Simulation Stage + Side Control Drawer */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* Central 3D Canvas Stage */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Overlay Spec HUD badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">MHS TRIDIMENSIONAL</span>
              <span className="text-xs text-slate-300">Oscilador Harmônico & Projeção do MCU</span>
            </div>

            {/* Quick Physics Insight */}
            <div className="hidden sm:block bg-slate-900/75 border border-slate-800/80 px-2.5 py-1 rounded text-[11px] text-slate-400 max-w-xs">
              {Math.abs(currentState.x) < 0.15 ? (
                <span className="text-emerald-400 font-medium">Equilíbrio (x ≈ 0): Velocidade Máxima | Aceleração Nula</span>
              ) : Math.abs(currentState.x) > amplitude * 0.9 ? (
                <span className="text-rose-400 font-medium">Extremidade (|x| ≈ A): Velocidade Nula | Aceleração Máxima</span>
              ) : (
                <span>Energia cinética e potencial permutando-se continuamente</span>
              )}
            </div>
          </div>

          {/* Quick guided experiment button */}
          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-lg transition-colors border border-blue-400/40"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Roteiro de Investigação</span>
            </button>
          )}

          {/* Telemetry instant metrics bar (Bottom overlay of canvas) */}
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

        {/* Right Parameters Deck */}
        <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-3.5 flex flex-col gap-3.5 overflow-y-auto max-h-[360px] md:max-h-none shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros do Oscilador</span>
            </div>
          </div>

          {/* Amplitude Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Amplitude (A):</span>
              <span className="font-mono text-cyan-400 font-medium">{amplitude.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.05"
              value={amplitude}
              onChange={(e) => setAmplitude(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Frequency Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Frequência (f):</span>
              <span className="font-mono text-cyan-400 font-medium">{frequency.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.5"
              step="0.05"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Initial Phase Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Fase Inicial (ϕ₀):</span>
              <span className="font-mono text-cyan-400 font-medium">{initialPhaseDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={initialPhaseDeg}
              onChange={(e) => setInitialPhaseDeg(parseInt(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Phasor Projection Toggle */}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-300">Mostrar Disco Fasor (MCU):</span>
            <input
              type="checkbox"
              checked={showPhasor}
              onChange={(e) => setShowPhasor(e.target.checked)}
              className="rounded accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Compare Two Oscillators */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Comparar 2º Oscilador:
              </span>
              <input
                type="checkbox"
                checked={compareSecond}
                onChange={(e) => setCompareSecond(e.target.checked)}
                className="rounded accent-purple-500 cursor-pointer"
              />
            </div>

            {compareSecond && (
              <div className="flex flex-col gap-1 bg-purple-950/20 p-2 rounded border border-purple-900/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Diferença de Fase (Δϕ):</span>
                  <span className="font-mono text-purple-400 font-medium">{phaseDiffDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={phaseDiffDeg}
                  onChange={(e) => setPhaseDiffDeg(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Mathematical Equations Card */}
          {clock.showFormulas && (
            <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações Governantes</span>
              <KaTeXMath math="x(t) = A\cos(\omega t + \phi_0)" block />
              <KaTeXMath math="v(t) = -A\omega\sin(\omega t + \phi_0)" block />
              <KaTeXMath math="a(t) = -\omega^2 x(t)" block />
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Scientific Chart */}
      {clock.showGraphs && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <ScientificChart
            data={dataBuffer}
            series={chartSeries}
            currentTime={clock.time}
            height={140}
            title="Cinemática do Movimento Harmônico Simples"
          />
        </div>
      )}

      {/* Universal Playback Controls */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80">
        <PlaybackBar
          clock={clock}
          onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
          onReset={handleReset}
          onStepForward={() => setClock((p) => ({ ...p, time: p.time + 0.05 }))}
          onChangeSpeed={(s) => setClock((p) => ({ ...p, speed: s }))}
          onToggleVectors={() => setClock((p) => ({ ...p, showVectors: !p.showVectors }))}
          onToggleTrajectories={() => setClock((p) => ({ ...p, showTrajectories: !p.showTrajectories }))}
          onToggleFormulas={() => setClock((p) => ({ ...p, showFormulas: !p.showFormulas }))}
          onToggle2DView={() => setClock((p) => ({ ...p, is2DView: !p.is2DView }))}
          onResetCamera={() => {
            cameraAngleRef.current = { theta: 0.3, phi: 0.4, radius: 7.5 };
          }}
        />
      </div>
    </div>
  );
};

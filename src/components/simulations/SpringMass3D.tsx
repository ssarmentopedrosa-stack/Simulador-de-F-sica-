import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { calculateSpringMass, SpringMassState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Activity } from 'lucide-react';

interface SpringMass3DProps {
  onOpenExperiment?: () => void;
}

export const SpringMass3D: React.FC<SpringMass3DProps> = ({ onOpenExperiment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Physical Parameters
  const [mass, setMass] = useState<number>(1.5);
  const [springK, setSpringK] = useState<number>(45.0);
  const [amplitude, setAmplitude] = useState<number>(1.2);
  const [dampingCoeff, setDampingCoeff] = useState<number>(0.0);
  const [isVertical, setIsVertical] = useState<boolean>(false);
  const [gravity, setGravity] = useState<number>(9.8);
  const [externalForceAmp, setExternalForceAmp] = useState<number>(0);
  const [externalFreq, setExternalFreq] = useState<number>(0.8);

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

  // Chart data buffer & current physical state
  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);
  const [currentState, setCurrentState] = useState<SpringMassState>(() =>
    calculateSpringMass(0, 1.5, 45, 1.2, 0, false, 9.8)
  );

  // Three.js mutable scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blockGroupRef = useRef<THREE.Group | null>(null);
  const springMeshRef = useRef<THREE.Line | null>(null);
  const springGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const forceArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const velArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.5,
    phi: 0.5,
    radius: 8.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update physical model & telemetry
  useEffect(() => {
    const st = calculateSpringMass(
      clock.time,
      mass,
      springK,
      amplitude,
      dampingCoeff,
      isVertical,
      gravity,
      externalForceAmp,
      externalFreq
    );
    setCurrentState(st);

    setDataBuffer((prev) => {
      const newPt: DataPoint = {
        t: clock.time,
        pos: st.position,
        Ec: st.kineticEnergy,
        Ep: st.potentialEnergy,
        Em: st.totalEnergy,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, mass, springK, amplitude, dampingCoeff, isVertical, gravity, externalForceAmp, externalFreq]);

  // Helper to build procedural helical spring points
  const generateSpringPoints = useCallback(
    (startX: number, endX: number, coils: number = 16, radius: number = 0.22, pointsPerCoil: number = 24) => {
      const points: THREE.Vector3[] = [];
      const totalPoints = coils * pointsPerCoil;
      const length = endX - startX;

      // Straight entry anchor
      points.push(new THREE.Vector3(startX, 0, 0));
      points.push(new THREE.Vector3(startX + length * 0.05, 0, 0));

      const activeStart = startX + length * 0.05;
      const activeLength = length * 0.9;

      for (let i = 0; i <= totalPoints; i++) {
        const u = i / totalPoints;
        const angle = u * coils * Math.PI * 2;
        const x = activeStart + u * activeLength;
        const y = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, z));
      }

      // Straight exit anchor
      points.push(new THREE.Vector3(endX - length * 0.05, 0, 0));
      points.push(new THREE.Vector3(endX, 0, 0));

      return points;
    },
    []
  );

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.035);
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

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(6, 10, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    // Floor Grid
    const grid = new THREE.GridHelper(16, 32, 0x0284c7, 0x1e293b);
    grid.position.y = -1.5;
    scene.add(grid);

    // Metallic Rig Support (Mounting Wall & Rod)
    const rigGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });

    // Vertical Support Post / Wall
    const postGeo = new THREE.BoxGeometry(0.4, 3.2, 1.4);
    const postMesh = new THREE.Mesh(postGeo, metalMat);
    postMesh.position.set(-3.6, 0.1, 0);
    postMesh.castShadow = true;
    rigGroup.add(postMesh);

    // Equilibrium indicator bar
    const eqMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const eqGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.5, 8);
    eqGeo.rotateZ(Math.PI / 2);
    const eqLine = new THREE.Mesh(eqGeo, eqMat);
    eqLine.position.set(0, -1.2, 0);
    rigGroup.add(eqLine);

    scene.add(rigGroup);

    // Procedural Helical Spring Line
    const initialPoints = generateSpringPoints(-3.4, 0);
    const springGeo = new THREE.BufferGeometry().setFromPoints(initialPoints);
    springGeometryRef.current = springGeo;
    const springMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const springLine = new THREE.Line(springGeo, springMat);
    scene.add(springLine);
    springMeshRef.current = springLine;

    // Mass Block Assembly (Composite procedural object)
    const blockGroup = new THREE.Group();
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    });
    const blockGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    blockMesh.castShadow = true;
    blockGroup.add(blockMesh);

    // Metallic attachment bracket
    const hookGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16);
    hookGeo.rotateZ(Math.PI / 2);
    const hookMesh = new THREE.Mesh(hookGeo, metalMat);
    hookMesh.position.x = -0.45;
    blockGroup.add(hookMesh);

    // Mass inscription label badge
    const badgeGeo = new THREE.BoxGeometry(0.5, 0.25, 0.86);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    blockGroup.add(badgeMesh);

    scene.add(blockGroup);
    blockGroupRef.current = blockGroup;

    // Vectors
    const forceArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0xef4444, 0.2, 0.12);
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x10b981, 0.2, 0.12);
    scene.add(forceArrow);
    scene.add(velArrow);
    forceArrowRef.current = forceArrow;
    velArrowRef.current = velArrow;

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
      cameraAngleRef.current.radius = Math.max(4.0, Math.min(16, cameraAngleRef.current.radius + e.deltaY * 0.006));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: true });

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
  }, [generateSpringPoints]);

  // Main Render Loop
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

      // Camera Orbit
      const cam = cameraRef.current;
      if (cam) {
        if (clock.is2DView) {
          cam.position.set(0, 0, 9);
          cam.lookAt(0, 0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 0, 0);
        }
      }

      // Compute position
      const st = calculateSpringMass(
        clock.time,
        mass,
        springK,
        amplitude,
        dampingCoeff,
        isVertical,
        gravity,
        externalForceAmp,
        externalFreq
      );

      const displacementX = st.position;
      const blockX = displacementX;

      // Update Mass Block
      if (blockGroupRef.current) {
        if (isVertical) {
          // Vertical orientation
          blockGroupRef.current.position.set(0, -st.position - st.staticElongation, 0);
        } else {
          blockGroupRef.current.position.set(blockX, 0, 0);
        }
      }

      // Update Procedural Spring Deformation
      if (springGeometryRef.current) {
        const wallX = -3.4;
        const currentPoints = generateSpringPoints(wallX, blockX - 0.42);
        springGeometryRef.current.setFromPoints(currentPoints);
        springGeometryRef.current.computeVertexNormals();
      }

      // Update Force & Velocity Vectors
      if (clock.showVectors && forceArrowRef.current && velArrowRef.current) {
        forceArrowRef.current.visible = true;
        velArrowRef.current.visible = true;

        // Restoring force Fel = -k * x
        const fel = -springK * st.position;
        const fDir = fel >= 0 ? 1 : -1;
        forceArrowRef.current.position.set(blockX, 0.6, 0);
        forceArrowRef.current.setDirection(new THREE.Vector3(fDir, 0, 0));
        forceArrowRef.current.setLength(Math.max(0.01, Math.min(2.5, Math.abs(fel) * 0.04)), 0.2, 0.1);

        // Velocity vector
        const vDir = st.velocity >= 0 ? 1 : -1;
        velArrowRef.current.position.set(blockX, -0.6, 0);
        velArrowRef.current.setDirection(new THREE.Vector3(vDir, 0, 0));
        velArrowRef.current.setLength(Math.max(0.01, Math.min(2.5, Math.abs(st.velocity) * 0.3)), 0.2, 0.1);
      } else if (forceArrowRef.current && velArrowRef.current) {
        forceArrowRef.current.visible = false;
        velArrowRef.current.visible = false;
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
  }, [clock.isRunning, clock.speed, clock.time, clock.is2DView, clock.showVectors, mass, springK, amplitude, dampingCoeff, isVertical, gravity, externalForceAmp, externalFreq, generateSpringPoints]);

  const chartSeries: ChartSeries[] = [
    { key: 'pos', label: 'Elongação x(t)', color: '#38bdf8', unit: 'm' },
    { key: 'Ec', label: 'Energia Cinética Ec', color: '#10b981', unit: 'J' },
    { key: 'Ep', label: 'Energia Potencial Ep', color: '#f59e0b', unit: 'J' },
    { key: 'Em', label: 'Energia Mecânica Total Em', color: '#a855f7', unit: 'J' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Elongação', symbol: 'x', value: currentState.position, unit: 'm', precision: 3, highlight: true },
    { label: 'Velocidade', symbol: 'v', value: currentState.velocity, unit: 'm/s', precision: 3 },
    { label: 'Energia Cinética', symbol: 'Ec', value: currentState.kineticEnergy, unit: 'J', precision: 3 },
    { label: 'Energia Potencial', symbol: 'Ep', value: currentState.potentialEnergy, unit: 'J', precision: 3 },
    { label: 'Energia Total', symbol: 'Em', value: currentState.totalEnergy, unit: 'J', precision: 3 },
    { label: 'Período Próprio', symbol: 'T₀', value: currentState.naturalPeriod, unit: 's', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Scene Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Specification Header Badge */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">SISTEMA MASSA-MOLA 3D</span>
              <span className="text-xs text-slate-300">
                {dampingCoeff > 0 ? 'Oscilador Amortecido' : 'Oscilador Harmônico Ideal'} | {isVertical ? 'Vertical' : 'Horizontal'}
              </span>
            </div>
            {dampingCoeff > 0 && (
              <div className="bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded text-[11px] text-amber-300">
                Dissipação viscosa ativa: Em(t) decresce exponencialmente
              </div>
            )}
          </div>

          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-lg transition-colors border border-blue-400/40"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Experimento Guiado</span>
            </button>
          )}

          {/* Instantaneous Values Strip */}
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

        {/* Control Parameters Deck */}
        <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-3.5 flex flex-col gap-3.5 overflow-y-auto max-h-[360px] md:max-h-none shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros Mecânicos</span>
            </div>
          </div>

          {/* Mass Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Massa (m):</span>
              <span className="font-mono text-cyan-400 font-medium">{mass.toFixed(2)} kg</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5.0"
              step="0.1"
              value={mass}
              onChange={(e) => setMass(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Spring Constant k */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Constante da Mola (k):</span>
              <span className="font-mono text-cyan-400 font-medium">{springK.toFixed(1)} N/m</span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="2"
              value={springK}
              onChange={(e) => setSpringK(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Initial Amplitude */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Elongação Inicial (A):</span>
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

          {/* Damping Coefficient */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Amortecimento Viscoso (b):</span>
              <span className="font-mono text-amber-400 font-medium">{dampingCoeff.toFixed(2)} N·s/m</span>
            </div>
            <input
              type="range"
              min="0"
              max="3.0"
              step="0.05"
              value={dampingCoeff}
              onChange={(e) => setDampingCoeff(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* External Periodic Force (Resonance Demonstration) */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-300 font-medium flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                Força Forçada (Ressonância):
              </span>
              <input
                type="checkbox"
                checked={externalForceAmp > 0}
                onChange={(e) => setExternalForceAmp(e.target.checked ? 10 : 0)}
                className="rounded accent-rose-500 cursor-pointer"
              />
            </div>

            {externalForceAmp > 0 && (
              <div className="flex flex-col gap-2 bg-rose-950/20 p-2 rounded border border-rose-900/40">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Freq. Externa:</span>
                    <span className="font-mono text-rose-400">{externalFreq.toFixed(2)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={externalFreq}
                    onChange={(e) => setExternalFreq(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
                <div className="text-[10px] text-slate-400">
                  Ressonância em f_ext ≈ {(currentState.naturalFreq / (2 * Math.PI)).toFixed(2)} Hz
                </div>
              </div>
            )}
          </div>

          {/* Formulas */}
          {clock.showFormulas && (
            <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações Governantes</span>
              <KaTeXMath math="F_{\text{el}} = -kx" block />
              <KaTeXMath math="T_0 = 2\pi\sqrt{\frac{m}{k}}" block />
              <KaTeXMath math="E_m = \frac{1}{2}mv^2 + \frac{1}{2}kx^2" block />
            </div>
          )}
        </div>
      </div>

      {/* Scientific Chart */}
      {clock.showGraphs && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <ScientificChart
            data={dataBuffer}
            series={chartSeries}
            currentTime={clock.time}
            height={140}
            title="Evolução Temporal e Conservação da Energia Mecânica"
          />
        </div>
      )}

      {/* Transport Bar */}
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
            cameraAngleRef.current = { theta: 0.5, phi: 0.5, radius: 8.5 };
          }}
        />
      </div>
    </div>
  );
};

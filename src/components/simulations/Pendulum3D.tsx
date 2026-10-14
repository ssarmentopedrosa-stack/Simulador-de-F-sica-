import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { integratePendulumRK4, PendulumState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity, GravityPreset } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Globe2 } from 'lucide-react';

interface Pendulum3DProps {
  onOpenExperiment?: () => void;
}

const GRAVITY_PRESETS: GravityPreset[] = [
  { name: 'Terra', g: 9.8, description: '1.0g (9.80 m/s²)' },
  { name: 'Lua', g: 1.62, description: '0.165g (1.62 m/s²)' },
  { name: 'Marte', g: 3.71, description: '0.379g (3.71 m/s²)' },
  { name: 'Júpiter', g: 24.79, description: '2.53g (24.79 m/s²)' },
];

export const Pendulum3D: React.FC<Pendulum3DProps> = ({ onOpenExperiment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [length, setLength] = useState<number>(2.0);
  const [mass, setMass] = useState<number>(1.0);
  const [theta0Deg, setTheta0Deg] = useState<number>(30);
  const [gravity, setGravity] = useState<number>(9.8);
  const [damping, setDamping] = useState<number>(0.0);

  // Clock
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
  const [currentState, setCurrentState] = useState<PendulumState>(() =>
    integratePendulumRK4((30 * Math.PI) / 180, 2.0, 1.0, 9.8, 0, 0)
  );

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rodGroupRef = useRef<THREE.Group | null>(null);
  const bobMeshRef = useRef<THREE.Mesh | null>(null);
  const rodMeshRef = useRef<THREE.Mesh | null>(null);
  const tensionArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const weightArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const velArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.4,
    phi: 0.5,
    radius: 9.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update physical integration
  useEffect(() => {
    const theta0Rad = (theta0Deg * Math.PI) / 180;
    const st = integratePendulumRK4(theta0Rad, length, mass, gravity, damping, clock.time, 250);
    setCurrentState(st);

    setDataBuffer((prev) => {
      const newPt: DataPoint = {
        t: clock.time,
        thetaDeg: st.thetaDeg,
        omega: st.omega,
        Ec: st.kineticEnergy,
        Ep: st.potentialEnergy,
        Em: st.totalEnergy,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, length, mass, theta0Deg, gravity, damping]);

  // Setup Three.js scene
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
    dirLight.position.set(6, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    // Floor Grid
    const grid = new THREE.GridHelper(16, 32, 0x0284c7, 0x1e293b);
    grid.position.y = -3.2;
    scene.add(grid);

    // Pivot Stand Assembly
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.25 });

    // Top Crossbar
    const crossbarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 24);
    crossbarGeo.rotateZ(Math.PI / 2);
    const crossbar = new THREE.Mesh(crossbarGeo, standMat);
    crossbar.position.set(0, 1.8, 0);
    crossbar.castShadow = true;
    scene.add(crossbar);

    // Central bearing
    const bearingGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24);
    bearingGeo.rotateX(Math.PI / 2);
    const bearing = new THREE.Mesh(bearingGeo, brassMat);
    bearing.position.set(0, 1.8, 0);
    scene.add(bearing);

    // Angular Protractor Scale Arc
    const arcRadius = 1.6;
    const arcGeo = new THREE.RingGeometry(arcRadius - 0.02, arcRadius + 0.02, 64, 1, -Math.PI / 2 - 1.2, 2.4);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.position.set(0, 1.8, -0.05);
    scene.add(arcMesh);

    // Pendulum Rotating Arm Group (pivot at (0, 1.8, 0))
    const rodGroup = new THREE.Group();
    rodGroup.position.set(0, 1.8, 0);

    // Thin steel cable/rod
    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 16);
    rodGeo.translate(0, -0.5, 0);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
    const rodMesh = new THREE.Mesh(rodGeo, rodMat);
    rodMesh.castShadow = true;
    rodGroup.add(rodMesh);
    rodMeshRef.current = rodMesh;

    // Heavy spherical mass bob
    const bobGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const bobMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.85,
      roughness: 0.2,
    });
    const bobMesh = new THREE.Mesh(bobGeo, bobMat);
    bobMesh.castShadow = true;
    rodGroup.add(bobMesh);
    bobMeshRef.current = bobMesh;

    scene.add(rodGroup);
    rodGroupRef.current = rodGroup;

    // Trajectory arc visualizer
    const trajectoryMat = new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 0.1, gapSize: 0.05 });
    const trajPoints: THREE.Vector3[] = [];
    const maxTheta = (45 * Math.PI) / 180;
    for (let a = -maxTheta; a <= maxTheta; a += 0.05) {
      trajPoints.push(new THREE.Vector3(2.0 * Math.sin(a), 1.8 - 2.0 * Math.cos(a), 0));
    }
    const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPoints);
    const trajLine = new THREE.Line(trajGeo, trajectoryMat);
    trajLine.computeLineDistances();
    scene.add(trajLine);

    // Physical Vectors
    const tensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0x38bdf8, 0.2, 0.1);
    const weightArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 1, 0xf59e0b, 0.2, 0.1);
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x10b981, 0.2, 0.1);

    scene.add(tensionArrow);
    scene.add(weightArrow);
    scene.add(velArrow);
    tensionArrowRef.current = tensionArrow;
    weightArrowRef.current = weightArrow;
    velArrowRef.current = velArrow;

    // Mouse drag
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
      cameraAngleRef.current.radius = Math.max(4.0, Math.min(18, cameraAngleRef.current.radius + e.deltaY * 0.006));
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
  }, []);

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

      // Camera coordinates
      const cam = cameraRef.current;
      if (cam) {
        if (clock.is2DView) {
          cam.position.set(0, 0.5, 9);
          cam.lookAt(0, 0.5, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 0.3, 0);
        }
      }

      // Physics integration for current frame
      const theta0Rad = (theta0Deg * Math.PI) / 180;
      const st = integratePendulumRK4(theta0Rad, length, mass, gravity, damping, clock.time, 250);

      // Rotate pendulum arm around pivot (0, 1.8, 0)
      if (rodGroupRef.current) {
        rodGroupRef.current.rotation.z = -st.theta;
      }

      // Adjust rod scale and bob position to current length
      if (rodMeshRef.current && bobMeshRef.current) {
        rodMeshRef.current.scale.set(1, length, 1);
        bobMeshRef.current.position.y = -length;
        // Bob scale proportional to cube root of mass
        const scaleBob = Math.pow(mass, 1 / 3) * 0.9;
        bobMeshRef.current.scale.set(scaleBob, scaleBob, scaleBob);
      }

      // Vector arrows at bob position (world coordinates)
      const pivotY = 1.8;
      const bobWorldX = length * Math.sin(st.theta);
      const bobWorldY = pivotY - length * Math.cos(st.theta);

      if (clock.showVectors && tensionArrowRef.current && weightArrowRef.current && velArrowRef.current) {
        tensionArrowRef.current.visible = true;
        weightArrowRef.current.visible = true;
        velArrowRef.current.visible = true;

        // Weight P = m * g (downwards)
        weightArrowRef.current.position.set(bobWorldX, bobWorldY, 0);
        weightArrowRef.current.setDirection(new THREE.Vector3(0, -1, 0));
        weightArrowRef.current.setLength(Math.max(0.01, Math.min(2.0, (mass * gravity) * 0.1)), 0.2, 0.1);

        // Tension T = m*g*cos(theta) + m*v^2/L (along the string toward pivot)
        const toPivot = new THREE.Vector3(-bobWorldX, pivotY - bobWorldY, 0).normalize();
        const linVel = length * st.omega;
        const tensionMag = mass * gravity * Math.cos(st.theta) + (mass * linVel * linVel) / length;
        tensionArrowRef.current.position.set(bobWorldX, bobWorldY, 0);
        tensionArrowRef.current.setDirection(toPivot);
        tensionArrowRef.current.setLength(Math.max(0.01, Math.min(2.5, tensionMag * 0.1)), 0.2, 0.1);

        // Velocity vector (tangential to circular path)
        const tanDir = new THREE.Vector3(Math.cos(st.theta), Math.sin(st.theta), 0).multiplyScalar(st.omega >= 0 ? 1 : -1);
        velArrowRef.current.position.set(bobWorldX, bobWorldY, 0);
        velArrowRef.current.setDirection(tanDir);
        velArrowRef.current.setLength(Math.max(0.01, Math.min(2.0, Math.abs(linVel) * 0.4)), 0.2, 0.1);
      } else if (tensionArrowRef.current && weightArrowRef.current && velArrowRef.current) {
        tensionArrowRef.current.visible = false;
        weightArrowRef.current.visible = false;
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
  }, [clock.isRunning, clock.speed, clock.time, clock.is2DView, clock.showVectors, length, mass, theta0Deg, gravity, damping]);

  const chartSeries: ChartSeries[] = [
    { key: 'thetaDeg', label: 'Ângulo θ(t)', color: '#38bdf8', unit: '°' },
    { key: 'omega', label: 'Velocidade Angular ω', color: '#10b981', unit: 'rad/s' },
    { key: 'Ec', label: 'Energia Cinética Ec', color: '#f59e0b', unit: 'J' },
    { key: 'Ep', label: 'Energia Potencial Ep', color: '#ec4899', unit: 'J' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Ângulo', symbol: 'θ', value: currentState.thetaDeg, unit: '°', precision: 2, highlight: true },
    { label: 'Vel. Angular', symbol: 'ω', value: currentState.omega, unit: 'rad/s', precision: 2 },
    { label: 'Período Exato (RK4)', symbol: 'T_exato', value: currentState.periodExact, unit: 's', precision: 3 },
    { label: 'Período Aprox (Peq. Ângulos)', symbol: 'T_aprox', value: currentState.periodApprox, unit: 's', precision: 3 },
    { label: 'Energia Mecânica', symbol: 'Em', value: currentState.totalEnergy, unit: 'J', precision: 3 },
  ];

  const periodDiscrepancy = ((currentState.periodExact - currentState.periodApprox) / currentState.periodApprox) * 100;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">PÊNDULO SIMPLES 3D</span>
              <span className="text-xs text-slate-300">Integração Não-Linear Exata (Runge-Kutta 4ª Ordem)</span>
            </div>

            {theta0Deg > 20 && (
              <div className="bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded text-[11px] text-amber-300 max-w-sm">
                Desvio não-linear: T_exato é {periodDiscrepancy.toFixed(1)}% maior que a aproximação de pequenos ângulos.
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

        {/* Parameters Panel */}
        <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-3.5 flex flex-col gap-3.5 overflow-y-auto max-h-[360px] md:max-h-none shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros do Pêndulo</span>
            </div>
          </div>

          {/* Length Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Comprimento do Fio (L):</span>
              <span className="font-mono text-cyan-400 font-medium">{length.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Mass Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Massa do Corpo (m):</span>
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
            <span className="text-[10px] text-slate-500">Nota: no modelo ideal, m não afeta o período T.</span>
          </div>

          {/* Initial Angle Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Ângulo Inicial (θ₀):</span>
              <span className="font-mono text-cyan-400 font-medium">{theta0Deg}°</span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="1"
              value={theta0Deg}
              onChange={(e) => setTheta0Deg(parseInt(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Planetary Gravity Presets */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                Campo Gravitacional (g):
              </span>
              <span className="font-mono text-cyan-400">{gravity.toFixed(2)} m/s²</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {GRAVITY_PRESETS.map((gp) => (
                <button
                  key={gp.name}
                  onClick={() => setGravity(gp.g)}
                  className={`px-2 py-1.5 rounded text-xs transition-colors border text-left ${
                    Math.abs(gravity - gp.g) < 0.05
                      ? 'bg-cyan-950/70 border-cyan-500/70 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold">{gp.name}</div>
                  <div className="text-[10px] text-slate-500">{gp.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Damping */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Amortecimento do Ar:</span>
              <span className="font-mono text-amber-400">{damping.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.02"
              value={damping}
              onChange={(e) => setDamping(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {clock.showFormulas && (
            <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações Governantes</span>
              <KaTeXMath math="\ddot{\theta} + \frac{g}{L}\sin\theta = 0" block />
              <KaTeXMath math="T_{\text{aprox}} = 2\pi\sqrt{\frac{L}{g}}" block />
              <KaTeXMath math="E_p = mgL(1 - \cos\theta)" block />
            </div>
          )}
        </div>
      </div>

      {clock.showGraphs && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <ScientificChart
            data={dataBuffer}
            series={chartSeries}
            currentTime={clock.time}
            height={140}
            title="Evolução Angular e Energias do Pêndulo Simples"
          />
        </div>
      )}

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
            cameraAngleRef.current = { theta: 0.4, phi: 0.5, radius: 9.0 };
          }}
        />
      </div>
    </div>
  );
};

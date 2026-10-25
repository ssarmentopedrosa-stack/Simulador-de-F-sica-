import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { calculateWavePoint } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Layers, Ruler } from 'lucide-react';

interface WaveProgressive3DProps {
  onOpenExperiment?: () => void;
}

type WaveMode = 'transverse' | 'longitudinal' | 'surface3d';

export const WaveProgressive3D: React.FC<WaveProgressive3DProps> = ({ onOpenExperiment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Physical Parameters
  const [waveMode, setWaveMode] = useState<WaveMode>('transverse');
  const [amplitude, setAmplitude] = useState<number>(0.8);
  const [frequency, setFrequency] = useState<number>(1.2);
  const [wavelength, setWavelength] = useState<number>(2.4);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [trackedPointX, setTrackedPointX] = useState<number>(2.0);

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

  const timeRef = useRef<number>(0);
  timeRef.current = clock.time;

  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ropeMeshRef = useRef<THREE.Mesh | null>(null);
  const ropeCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const particlesGroupRef = useRef<THREE.Group | null>(null);
  const surfaceMeshRef = useRef<THREE.Mesh | null>(null);
  const surfaceGeoRef = useRef<THREE.PlaneGeometry | null>(null);
  const trackedPointSphereRef = useRef<THREE.Mesh | null>(null);
  const crestValesGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.4,
    phi: 0.6,
    radius: 9.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const waveSpeed = wavelength * frequency;
  const kWave = (2 * Math.PI) / wavelength;
  const omegaWave = 2 * Math.PI * frequency;

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update telemetry
  useEffect(() => {
    setDataBuffer((prev) => {
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].t - clock.time) < 0.0001) {
        return prev;
      }
      const pt = calculateWavePoint(trackedPointX, clock.time, {
        amplitude,
        frequency,
        wavelength,
        initialPhase: 0,
      });
      const newPt: DataPoint = {
        t: clock.time,
        yPoint: pt.y,
        vyPoint: pt.vy,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, trackedPointX, amplitude, frequency, wavelength]);

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.03);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Lights
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 10, 6);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    // Floor Grid
    const grid = new THREE.GridHelper(16, 32, 0x0284c7, 0x1e293b);
    grid.position.y = -2.0;
    scene.add(grid);

    // 1. Transverse Rope (Dynamic Buffer Line with 90 segments)
    const numPoints = 90;
    const ropePositions = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      const x = -4.5 + (i / (numPoints - 1)) * 9.0;
      ropePositions[i * 3] = x;
      ropePositions[i * 3 + 1] = 0;
      ropePositions[i * 3 + 2] = 0;
    }
    const ropeGeo = new THREE.BufferGeometry();
    ropeGeo.setAttribute('position', new THREE.BufferAttribute(ropePositions, 3));
    const ropeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 4 });
    const ropeLine = new THREE.Line(ropeGeo, ropeMat);
    scene.add(ropeLine);
    ropeMeshRef.current = ropeLine as unknown as THREE.Mesh;

    // Tracked point on rope (Glowing sphere marker)
    const trackedSphereGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const trackedSphereMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
    });
    const trackedSphere = new THREE.Mesh(trackedSphereGeo, trackedSphereMat);
    scene.add(trackedSphere);
    trackedPointSphereRef.current = trackedSphere;

    // 2. Longitudinal Wave Particles (Spring coils / air molecules)
    const particlesGroup = new THREE.Group();
    const particleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 16);
    particleGeo.rotateX(Math.PI / 2);
    const particleMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.7, roughness: 0.3 });

    for (let i = 0; i < 40; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      pMesh.position.set(-4.5 + i * 0.23, 0, 0);
      particlesGroup.add(pMesh);
    }
    particlesGroup.visible = false;
    scene.add(particlesGroup);
    particlesGroupRef.current = particlesGroup;

    // 3. 3D Surface Ripple Tank Mesh
    const surfaceGeo = new THREE.PlaneGeometry(8, 6, 70, 50);
    surfaceGeo.rotateX(-Math.PI / 2);
    surfaceGeoRef.current = surfaceGeo;
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      metalness: 0.3,
      roughness: 0.1,
      wireframe: false,
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.position.y = -0.5;
    surfaceMesh.receiveShadow = true;
    surfaceMesh.visible = false;
    scene.add(surfaceMesh);
    surfaceMeshRef.current = surfaceMesh;

    // Crests & Troughs Markers Group
    const crestValesGroup = new THREE.Group();
    scene.add(crestValesGroup);
    crestValesGroupRef.current = crestValesGroup;

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
          cam.position.set(0, 0, 10);
          cam.lookAt(0, 0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 0, 0);
        }
      }

      const t = timeRef.current;

      // 1. Transverse Mode Animation (in-place buffer update, 0 memory churn)
      if (ropeMeshRef.current && waveMode === 'transverse' && ropeMeshRef.current.geometry) {
        ropeMeshRef.current.visible = true;
        if (particlesGroupRef.current) particlesGroupRef.current.visible = false;
        if (surfaceMeshRef.current) surfaceMeshRef.current.visible = false;

        const posAttr = ropeMeshRef.current.geometry.attributes.position;
        const count = posAttr.count;
        for (let i = 0; i < count; i++) {
          const x = -4.5 + (i / (count - 1)) * 9.0;
          const y = amplitude * Math.sin(kWave * (x + 4.5) - omegaWave * t);
          posAttr.setXYZ(i, x, y, 0);
        }
        posAttr.needsUpdate = true;

        // Update tracked point
        if (trackedPointSphereRef.current) {
          trackedPointSphereRef.current.visible = true;
          const yP = amplitude * Math.sin(kWave * (trackedPointX + 4.5) - omegaWave * t);
          trackedPointSphereRef.current.position.set(trackedPointX, yP, 0);
        }
      }

      // 2. Longitudinal Mode Animation
      if (particlesGroupRef.current && waveMode === 'longitudinal') {
        if (ropeMeshRef.current) ropeMeshRef.current.visible = false;
        particlesGroupRef.current.visible = true;
        if (surfaceMeshRef.current) surfaceMeshRef.current.visible = false;
        if (trackedPointSphereRef.current) trackedPointSphereRef.current.visible = false;

        particlesGroupRef.current.children.forEach((child, idx) => {
          const x0 = -4.5 + idx * 0.23;
          const u = amplitude * 0.3 * Math.sin(kWave * (x0 + 4.5) - omegaWave * t);
          child.position.x = x0 + u;
        });
      }

      // 3. Surface 3D Wave Ripple Tank
      if (surfaceMeshRef.current && surfaceGeoRef.current && waveMode === 'surface3d') {
        if (ropeMeshRef.current) ropeMeshRef.current.visible = false;
        if (particlesGroupRef.current) particlesGroupRef.current.visible = false;
        surfaceMeshRef.current.visible = true;
        if (trackedPointSphereRef.current) trackedPointSphereRef.current.visible = false;

        const posAttr = surfaceGeoRef.current.attributes.position;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          const px = posAttr.getX(i);
          const pz = posAttr.getZ(i);
          const r = Math.sqrt(px * px + pz * pz);
          // Circular wave decaying with distance
          const y = (amplitude * 0.7 * Math.cos(kWave * r - omegaWave * t)) / Math.sqrt(r + 1);
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
        surfaceGeoRef.current.computeVertexNormals();
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
  }, [clock.isRunning, clock.speed, clock.is2DView, waveMode, amplitude, kWave, omegaWave, trackedPointX]);

  const chartSeries: ChartSeries[] = [
    { key: 'yPoint', label: 'Elongação do Ponto P y(t)', color: '#38bdf8', unit: 'm' },
    { key: 'vyPoint', label: 'Velocidade Transversal vy(t)', color: '#10b981', unit: 'm/s' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Velocidade da Onda', symbol: 'v', value: waveSpeed, unit: 'm/s', precision: 2, highlight: true },
    { label: 'Comprimento de Onda', symbol: 'λ', value: wavelength, unit: 'm', precision: 2 },
    { label: 'Frequência', symbol: 'f', value: frequency, unit: 'Hz', precision: 2 },
    { label: 'Período', symbol: 'T', value: 1 / frequency, unit: 's', precision: 2 },
    { label: 'Número de Onda', symbol: 'k', value: kWave, unit: 'rad/m', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">ONDAS PROGRESSIVAS 3D</span>
              <span className="text-xs text-slate-300">
                {waveMode === 'transverse'
                  ? 'Onda Transversal em Corda (v = λ · f)'
                  : waveMode === 'longitudinal'
                  ? 'Onda Longitudinal (Compressões & Rarefações)'
                  : 'Onda em Superfície 3D (Tanque de Ondas)'}
              </span>
            </div>

            {/* Wavelength measurement banner */}
            {showRuler && (
              <div className="bg-slate-900/85 border border-cyan-800/70 px-3 py-1.5 rounded-md text-xs font-mono text-cyan-300 flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span>λ medido = {wavelength.toFixed(2)} m</span>
                <span className="text-slate-500">|</span>
                <span>v = {waveSpeed.toFixed(2)} m/s</span>
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

          {/* Instantaneous Values */}
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

        {/* Control Panel */}
        <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-3.5 flex flex-col gap-3.5 overflow-y-auto max-h-[360px] md:max-h-none shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Tipo & Parâmetros de Onda</span>
            </div>
          </div>

          {/* Wave Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => setWaveMode('transverse')}
              className={`py-1.5 rounded font-medium transition-colors ${
                waveMode === 'transverse' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Transversal
            </button>
            <button
              onClick={() => setWaveMode('longitudinal')}
              className={`py-1.5 rounded font-medium transition-colors ${
                waveMode === 'longitudinal' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Longitudinal
            </button>
            <button
              onClick={() => setWaveMode('surface3d')}
              className={`py-1.5 rounded font-medium transition-colors ${
                waveMode === 'surface3d' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Superfície
            </button>
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
              max="1.5"
              step="0.05"
              value={amplitude}
              onChange={(e) => setAmplitude(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Frequency Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Frequência da Fonte (f):</span>
              <span className="font-mono text-cyan-400 font-medium">{frequency.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Wavelength Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Comprimento de Onda (λ):</span>
              <span className="font-mono text-cyan-400 font-medium">{wavelength.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="4.0"
              step="0.1"
              value={wavelength}
              onChange={(e) => setWavelength(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Point Inspector X */}
          {waveMode === 'transverse' && (
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Inspecionar Ponto P (x):
                </span>
                <span className="font-mono text-amber-400">{trackedPointX.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="-4.0"
                max="4.0"
                step="0.2"
                value={trackedPointX}
                onChange={(e) => setTrackedPointX(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Observe o gráfico abaixo: o ponto executa MHS puramente vertical!
              </span>
            </div>
          )}

          {clock.showFormulas && (
            <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações de Onda</span>
              <KaTeXMath math="y(x,t) = A\sin(kx - \omega t)" block />
              <KaTeXMath math="v = \lambda \cdot f" block />
              <KaTeXMath math="k = \frac{2\pi}{\lambda}, \quad \omega = 2\pi f" block />
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
            title="Oscilação Harmônica Temporal do Ponto P Inspecionado y(t)"
          />
        </div>
      )}

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
            cameraAngleRef.current = { theta: 0.4, phi: 0.6, radius: 9.5 };
          }}
        />
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateInterferenceAt } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Radio, Crosshair } from 'lucide-react';

interface Interference3DProps {
  onOpenExperiment?: () => void;
}

export const Interference3D: React.FC<Interference3DProps> = ({ onOpenExperiment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Source Parameters
  const [sourceDistance, setSourceDistance] = useState<number>(3.0);
  const [frequency, setFrequency] = useState<number>(1.2);
  const [amplitude, setAmplitude] = useState<number>(0.6);
  const [phaseDiffDeg, setPhaseDiffDeg] = useState<number>(0);
  const [probePos, setProbePos] = useState<{ x: number; y: number }>({ x: 1.5, y: 2.0 });

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

  const waveSpeed = 3.0; // m/s
  const lambda = waveSpeed / frequency;

  // Pure synchronous derived probe result
  const probeResult = useMemo(() => {
    const s1 = { x: -sourceDistance / 2, y: 0, amp: amplitude, freq: frequency, phase: 0 };
    const s2 = {
      x: sourceDistance / 2,
      y: 0,
      amp: amplitude,
      freq: frequency,
      phase: (phaseDiffDeg * Math.PI) / 180,
    };
    return calculateInterferenceAt(probePos.x, probePos.y, clock.time, s1, s2, waveSpeed);
  }, [probePos.x, probePos.y, clock.time, sourceDistance, amplitude, frequency, phaseDiffDeg]);

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const waterGeoRef = useRef<THREE.PlaneGeometry | null>(null);
  const source1SphereRef = useRef<THREE.Mesh | null>(null);
  const source2SphereRef = useRef<THREE.Mesh | null>(null);
  const probeMarkerRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.2,
    phi: 0.55,
    radius: 11.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
      const newPt: DataPoint = {
        t: clock.time,
        y1: probeResult.y1,
        y2: probeResult.y2,
        yRes: probeResult.yRes,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, probeResult]);

  // Setup Three.js scene
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(6, 12, 6);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-6, 3, -6);
    scene.add(rimLight);

    // Dynamic 3D Water Surface Mesh
    const planeGeo = new THREE.PlaneGeometry(10, 8, 80, 64);
    planeGeo.rotateX(-Math.PI / 2);
    waterGeoRef.current = planeGeo;
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.4,
      roughness: 0.1,
      wireframe: false,
    });
    const waterMesh = new THREE.Mesh(planeGeo, planeMat);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Sources Visual Dippers
    const sourceGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const sourceMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });

    const s1Mesh = new THREE.Mesh(sourceGeo, sourceMat);
    const s2Mesh = new THREE.Mesh(sourceGeo, sourceMat);
    scene.add(s1Mesh);
    scene.add(s2Mesh);
    source1SphereRef.current = s1Mesh;
    source2SphereRef.current = s2Mesh;

    // Probe Marker (Target pin & drop line)
    const probeGroup = new THREE.Group();
    const pinGeo = new THREE.ConeGeometry(0.12, 0.4, 16);
    pinGeo.rotateX(Math.PI);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.y = 0.5;
    probeGroup.add(pin);

    scene.add(probeGroup);
    probeMarkerRef.current = probeGroup;

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
      cameraAngleRef.current.radius = Math.max(5.0, Math.min(22, cameraAngleRef.current.radius + e.deltaY * 0.006));
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
          cam.position.set(0, 11, 0.01);
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
      const s1X = -sourceDistance / 2;
      const s2X = sourceDistance / 2;
      const s1Phase = 0;
      const s2Phase = (phaseDiffDeg * Math.PI) / 180;
      const k = (2 * Math.PI) / lambda;
      const omega = 2 * Math.PI * frequency;

      // Update Sources in 3D
      if (source1SphereRef.current && source2SphereRef.current) {
        source1SphereRef.current.position.set(s1X, amplitude * Math.sin(-omega * t), 0);
        source2SphereRef.current.position.set(s2X, amplitude * Math.sin(-omega * t + s2Phase), 0);
      }

      // Update Probe Marker
      if (probeMarkerRef.current) {
        probeMarkerRef.current.position.set(probePos.x, 0, probePos.y);
      }

      // Update Water Mesh Vertices for Superposition
      if (waterGeoRef.current) {
        const posAttr = waterGeoRef.current.attributes.position;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          const px = posAttr.getX(i);
          const pz = posAttr.getZ(i);

          const r1 = Math.hypot(px - s1X, pz);
          const r2 = Math.hypot(px - s2X, pz);

          const atten1 = 1 / Math.sqrt(r1 + 0.8);
          const atten2 = 1 / Math.sqrt(r2 + 0.8);

          const y1 = amplitude * atten1 * Math.cos(k * r1 - omega * t + s1Phase);
          const y2 = amplitude * atten2 * Math.cos(k * r2 - omega * t + s2Phase);
          const yRes = y1 + y2;

          posAttr.setY(i, yRes * 0.8);
        }
        posAttr.needsUpdate = true;
        waterGeoRef.current.computeVertexNormals();
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
  }, [clock.isRunning, clock.speed, clock.is2DView, sourceDistance, amplitude, frequency, phaseDiffDeg, lambda, probePos.x, probePos.y]);

  const chartSeries: ChartSeries[] = [
    { key: 'y1', label: 'Onda Fonte 1 (y₁)', color: '#38bdf8', unit: 'm' },
    { key: 'y2', label: 'Onda Fonte 2 (y₂)', color: '#c084fc', unit: 'm' },
    { key: 'yRes', label: 'Onda Resultante (y₁ + y₂)', color: '#10b981', unit: 'm' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Diferença de Caminho', symbol: 'Δr', value: probeResult.deltaR, unit: 'm', precision: 2, highlight: true },
    { label: 'Diferença em λ', symbol: 'Δr/λ', value: probeResult.deltaR / lambda, unit: 'λ', precision: 2 },
    { label: 'Amplitude Resultante', symbol: 'A_res', value: probeResult.resultantAmplitude, unit: 'm', precision: 2 },
    { label: 'Comprimento de Onda', symbol: 'λ', value: lambda, unit: 'm', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Scene Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">SUPERPOSIÇÃO & INTERFERÊNCIA 3D</span>
              <span className="text-xs text-slate-300">Duas Fontes Pontuais Coerentes em Superfície de Água</span>
            </div>

            {/* Interference status badge at probe */}
            <div
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 backdrop-blur-md ${
                probeResult.isConstructive
                  ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
                  : probeResult.isDestructive
                  ? 'bg-rose-950/80 border-rose-500/70 text-rose-300'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>
                {probeResult.isConstructive
                  ? 'Interferência Construtiva (Reforço Máximo)'
                  : probeResult.isDestructive
                  ? 'Interferência Destrutiva (Nó de Cancelamento)'
                  : 'Interferência Intermediária'}
              </span>
            </div>
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

        {/* Controls Deck */}
        <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-3.5 flex flex-col gap-3.5 overflow-y-auto max-h-[360px] md:max-h-none shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros das Fontes</span>
            </div>
          </div>

          {/* Source Distance (d) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Distância Entre Fontes (d):</span>
              <span className="font-mono text-cyan-400 font-medium">{sourceDistance.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.2"
              value={sourceDistance}
              onChange={(e) => setSourceDistance(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Frequência (f):</span>
              <span className="font-mono text-cyan-400 font-medium">{frequency.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Phase Difference */}
          <div className="flex flex-col gap-1">
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

          {/* Probe Position X & Y */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              Posição do Sensor de Medição:
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Coord. X:</span>
                <span className="font-mono text-amber-300">{probePos.x.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="-4.0"
                max="4.0"
                step="0.2"
                value={probePos.x}
                onChange={(e) => setProbePos((p) => ({ ...p, x: parseFloat(e.target.value) }))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Coord. Y:</span>
                <span className="font-mono text-amber-300">{probePos.y.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="-3.5"
                max="3.5"
                step="0.2"
                value={probePos.y}
                onChange={(e) => setProbePos((p) => ({ ...p, y: parseFloat(e.target.value) }))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {clock.showFormulas && (
            <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Critérios de Interferência</span>
              <KaTeXMath math="y_{\text{res}} = y_1 + y_2" block />
              <KaTeXMath math="\Delta r = n\lambda \implies \text{Construtiva}" block />
              <KaTeXMath math="\Delta r = \left(n + \frac{1}{2}\right)\lambda \implies \text{Destrutiva}" block />
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
            title="Superposição das Duas Ondas no Ponto do Sensor y₁(t) + y₂(t)"
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
            cameraAngleRef.current = { theta: 0.2, phi: 0.55, radius: 11.5 };
          }}
        />
      </div>
    </div>
  );
};

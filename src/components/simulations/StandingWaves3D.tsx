import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { calculateStandingWave, BoundaryCondition, StandingWaveInfo } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Layers } from 'lucide-react';

interface StandingWaves3DProps {
  onOpenExperiment?: () => void;
}

export const StandingWaves3D: React.FC<StandingWaves3DProps> = ({ onOpenExperiment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [boundary, setBoundary] = useState<BoundaryCondition>('both_fixed');
  const [harmonic, setHarmonic] = useState<number>(3);
  const [length, setLength] = useState<number>(3.0);
  const [waveSpeed, setWaveSpeed] = useState<number>(60.0);
  const [amplitude, setAmplitude] = useState<number>(0.7);

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
  const [waveInfo, setWaveInfo] = useState<StandingWaveInfo>(() =>
    calculateStandingWave(3.0, 60.0, 3, 'both_fixed')
  );

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const stringMeshRef = useRef<THREE.Mesh | null>(null);
  const envelopeLinePosRef = useRef<THREE.Line | null>(null);
  const envelopeLineNegRef = useRef<THREE.Line | null>(null);
  const nodesMarkersGroupRef = useRef<THREE.Group | null>(null);
  const pipeAcousticGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.35,
    phi: 0.55,
    radius: 9.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update standing wave model
  useEffect(() => {
    const info = calculateStandingWave(length, waveSpeed, harmonic, boundary);
    setWaveInfo(info);

    // Midpoint observation
    const midX = length / 2;
    const k = (2 * Math.PI) / info.wavelength;
    const omega = 2 * Math.PI * info.frequency;
    const yMid = 2 * amplitude * Math.sin(k * midX) * Math.cos(omega * clock.time);

    setDataBuffer((prev) => {
      const newPt: DataPoint = {
        t: clock.time,
        yMid,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [length, waveSpeed, harmonic, boundary, clock.time, amplitude]);

  // Setup Three.js Scene
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(6, 10, 6);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    // Floor Grid
    const grid = new THREE.GridHelper(16, 32, 0x0284c7, 0x1e293b);
    grid.position.y = -1.8;
    scene.add(grid);

    // Fixed End Clamp Supports
    const clampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const c1Geo = new THREE.BoxGeometry(0.3, 1.8, 0.8);
    const clamp1 = new THREE.Mesh(c1Geo, clampMat);
    clamp1.position.set(-2.0, -0.2, 0);
    const clamp2 = new THREE.Mesh(c1Geo, clampMat);
    clamp2.position.set(2.0, -0.2, 0);
    scene.add(clamp1, clamp2);

    // Vibrating String Dynamic Line
    const steps = 80;
    const strPositions = new Float32Array((steps + 1) * 3);
    for (let i = 0; i <= steps; i++) {
      const x = -2.0 + (i / steps) * 4.0;
      strPositions[i * 3] = x;
      strPositions[i * 3 + 1] = 0;
      strPositions[i * 3 + 2] = 0;
    }
    const strGeo = new THREE.BufferGeometry();
    strGeo.setAttribute('position', new THREE.BufferAttribute(strPositions, 3));
    const strMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 4 });
    const stringLine = new THREE.Line(strGeo, strMat);
    scene.add(stringLine);
    stringMeshRef.current = stringLine as unknown as THREE.Mesh;

    // Envelopes of Vibration (Upper and Lower limit curves)
    const envMat = new THREE.LineDashedMaterial({ color: 0x0284c7, dashSize: 0.1, gapSize: 0.05 });
    const envGeoPos = new THREE.BufferGeometry();
    envGeoPos.setAttribute('position', new THREE.BufferAttribute(new Float32Array(strPositions), 3));
    const envGeoNeg = new THREE.BufferGeometry();
    envGeoNeg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(strPositions), 3));
    const envLinePos = new THREE.Line(envGeoPos, envMat);
    const envLineNeg = new THREE.Line(envGeoNeg, envMat);
    envLinePos.computeLineDistances();
    envLineNeg.computeLineDistances();
    scene.add(envLinePos, envLineNeg);
    envelopeLinePosRef.current = envLinePos;
    envelopeLineNegRef.current = envLineNeg;

    // Nodes & Antinodes Markers Group
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);
    nodesMarkersGroupRef.current = nodesGroup;

    // Pipe Acoustic Column (Semi-transparent cylinder for tube modes)
    const pipeGroup = new THREE.Group();
    const pipeCylGeo = new THREE.CylinderGeometry(0.45, 0.45, 4.0, 32, 1, true);
    pipeCylGeo.rotateZ(Math.PI / 2);
    const pipeCylMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transmission: 0.85,
      opacity: 0.4,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
    });
    const pipeCyl = new THREE.Mesh(pipeCylGeo, pipeCylMat);
    pipeGroup.add(pipeCyl);
    pipeGroup.visible = false;
    scene.add(pipeGroup);
    pipeAcousticGroupRef.current = pipeGroup;

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

      // Camera
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

      const t = clock.time;
      const info = calculateStandingWave(length, waveSpeed, harmonic, boundary);
      const k = (2 * Math.PI) / info.wavelength;
      const omega = 2 * Math.PI * info.frequency;
      const halfL = length / 2;

      // Update String Mesh Vibration In-Place (0 memory allocations)
      if (stringMeshRef.current && stringMeshRef.current.geometry) {
        const posAttr = stringMeshRef.current.geometry.attributes.position;
        const steps = 80;
        const envPosPoints: THREE.Vector3[] = [];
        const envNegPoints: THREE.Vector3[] = [];

        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const xPhys = frac * length;
          const xWorld = -halfL + frac * length;

          let ySpatial = 0;
          if (boundary === 'both_fixed') {
            ySpatial = Math.sin(k * xPhys);
          } else if (boundary === 'pipe_open_open') {
            ySpatial = Math.cos(k * xPhys);
          } else {
            ySpatial = Math.sin(k * xPhys);
          }

          const yInstant = 2 * amplitude * ySpatial * Math.cos(omega * t);
          posAttr.setXYZ(i, xWorld, yInstant, 0);
          envPosPoints.push(new THREE.Vector3(xWorld, 2 * amplitude * Math.abs(ySpatial), 0));
          envNegPoints.push(new THREE.Vector3(xWorld, -2 * amplitude * Math.abs(ySpatial), 0));
        }
        posAttr.needsUpdate = true;

        // Update Envelope Lines
        if (envelopeLinePosRef.current && envelopeLineNegRef.current) {
          envelopeLinePosRef.current.geometry.setFromPoints(envPosPoints);
          envelopeLineNegRef.current.geometry.setFromPoints(envNegPoints);
        }
      }

      // Update Acoustic Tube visibility
      if (pipeAcousticGroupRef.current) {
        pipeAcousticGroupRef.current.visible = boundary !== 'both_fixed';
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
  }, [clock.isRunning, clock.speed, clock.time, clock.is2DView, length, waveSpeed, harmonic, boundary, amplitude]);

  const chartSeries: ChartSeries[] = [
    { key: 'yMid', label: 'Deslocamento no Ponto Médio y(L/2, t)', color: '#38bdf8', unit: 'm' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Harmônico Ativo', symbol: 'n', value: waveInfo.harmonicNumber, unit: 'º', precision: 0, highlight: true },
    { label: 'Frequência de Ressonância', symbol: 'f_n', value: waveInfo.frequency, unit: 'Hz', precision: 2 },
    { label: 'Comprimento de Onda', symbol: 'λ_n', value: waveInfo.wavelength, unit: 'm', precision: 3 },
    { label: 'Número de Nós', symbol: 'Nós', value: waveInfo.nodeCount, unit: 'pts', precision: 0 },
    { label: 'Número de Ventres', symbol: 'Ventres', value: waveInfo.antinodeCount, unit: 'pts', precision: 0 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">ONDAS ESTACIONÁRIAS & HARMÔNICOS</span>
              <span className="text-xs text-slate-300">
                {boundary === 'both_fixed'
                  ? 'Corda Fixa nas Duas Extremidades (λ = 2L/n)'
                  : boundary === 'pipe_open_open'
                  ? 'Tubo Sonoro Aberto-Aberto (Ventres nas Extremidades)'
                  : 'Tubo Sonoro Fechado-Aberto (Harmônicos Ímpares)'}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded text-xs text-slate-400 flex items-center gap-2">
              <span className="text-cyan-400 font-mono font-medium">{waveInfo.harmonicNumber}º Harmônico</span>
              <span>·</span>
              <span className="text-slate-300 font-mono">{waveInfo.nodeCount} Nós</span>
              <span>·</span>
              <span className="text-slate-300 font-mono">{waveInfo.antinodeCount} Ventres</span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Condições de Contorno & Harmônico</span>
            </div>
          </div>

          {/* Boundary Condition Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">Condição do Meio:</span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setBoundary('both_fixed')}
                className={`px-2.5 py-1.5 rounded text-xs text-left transition-colors border ${
                  boundary === 'both_fixed'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Corda com 2 Extremidades Fixas
              </button>
              <button
                onClick={() => setBoundary('pipe_open_open')}
                className={`px-2.5 py-1.5 rounded text-xs text-left transition-colors border ${
                  boundary === 'pipe_open_open'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tubo Sonoro Aberto-Aberto
              </button>
              <button
                onClick={() => setBoundary('pipe_closed_open')}
                className={`px-2.5 py-1.5 rounded text-xs text-left transition-colors border ${
                  boundary === 'pipe_closed_open'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tubo Fechado em uma Ponta
              </button>
            </div>
          </div>

          {/* Harmonic Number (n) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Harmônico Ativo:</span>
              <span className="font-mono text-cyan-400 font-medium">
                {waveInfo.harmonicNumber}º Harmônico {boundary === 'pipe_closed_open' ? `(Modo m = ${waveInfo.modeIndex})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {(boundary === 'pipe_closed_open' ? [1, 3, 5, 7, 9, 11] : [1, 2, 3, 4, 5, 6]).map((nVal) => (
                <button
                  key={nVal}
                  onClick={() => setHarmonic(nVal)}
                  className={`flex-1 py-1 rounded text-xs font-mono font-semibold transition-colors border ${
                    waveInfo.harmonicNumber === nVal
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {nVal}
                </button>
              ))}
            </div>
            {boundary === 'pipe_closed_open' && (
              <span className="text-[10px] text-amber-400/90 mt-0.5">
                Em tubos com uma extremidade fechada, só existem harmônicos ímpares (n = 1, 3, 5, 7, 9, 11).
              </span>
            )}
          </div>

          {/* Length (L) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Comprimento Útil (L):</span>
              <span className="font-mono text-cyan-400 font-medium">{length.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.2"
              value={length}
              onChange={(e) => setLength(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Wave Speed (v) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Velocidade da Onda (v):</span>
              <span className="font-mono text-cyan-400 font-medium">{waveSpeed.toFixed(0)} m/s</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={waveSpeed}
              onChange={(e) => setWaveSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {clock.showFormulas && (
            <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Ressonância & Modos</span>
              <KaTeXMath math="\lambda_n = \frac{2L}{n} \quad (\text{corda / aberto})" block />
              <KaTeXMath math="f_n = n \frac{v}{2L}" block />
              <KaTeXMath math="\lambda_n = \frac{4L}{n} \quad (n \text{ ímpar em tubo fechado})" block />
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
            title="Evolução Temporal do Ponto Médio da Onda Estacionária"
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
            cameraAngleRef.current = { theta: 0.35, phi: 0.55, radius: 9.0 };
          }}
        />
      </div>
    </div>
  );
};

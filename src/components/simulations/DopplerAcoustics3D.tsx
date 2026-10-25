import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateDoppler, DopplerState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { labAudio } from '../common/AudioController';
import { Sliders, HelpCircle, Volume2, VolumeX, Radio, Activity } from 'lucide-react';

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface DopplerAcoustics3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

interface WavefrontRing {
  center: THREE.Vector3;
  birthTime: number;
}

export const DopplerAcoustics3D: React.FC<DopplerAcoustics3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Doppler & Acoustics Parameters
  const [sourceSpeed, setSourceSpeed] = useState<number>(
    () => (initialParams?.sourceSpeed != null ? Number(initialParams.sourceSpeed) : 35.0)
  );
  const [observerSpeed, setObserverSpeed] = useState<number>(
    () => (initialParams?.observerSpeed != null ? Number(initialParams.observerSpeed) : 0.0)
  );
  const [sourceFreq, setSourceFreq] = useState<number>(
    () => (initialParams?.sourceFreq != null ? Number(initialParams.sourceFreq) : 440.0)
  );
  const [soundSpeed] = useState<number>(340.0); // m/s in air
  const [isBeatsMode, setIsBeatsMode] = useState<boolean>(
    () => (initialParams?.isBeatsMode != null ? Boolean(initialParams.isBeatsMode) : false)
  );
  const [beatsFreq2, setBeatsFreq2] = useState<number>(
    () => (initialParams?.beatsFreq2 != null ? Number(initialParams.beatsFreq2) : 444.0)
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.sourceSpeed !== undefined) setSourceSpeed(Number(p.sourceSpeed));
    if (p.observerSpeed !== undefined) setObserverSpeed(Number(p.observerSpeed));
    if (p.sourceFreq !== undefined) setSourceFreq(Number(p.sourceFreq));
    if (p.isBeatsMode !== undefined) setIsBeatsMode(Boolean(p.isBeatsMode));
    if (p.beatsFreq2 !== undefined) setBeatsFreq2(Number(p.beatsFreq2));
  }, []);

  useEffect(() => {
    onParamsChange?.({ sourceSpeed, observerSpeed, sourceFreq, isBeatsMode, beatsFreq2 });
  }, [sourceSpeed, observerSpeed, sourceFreq, isBeatsMode, beatsFreq2, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.sourceSpeed !== undefined) setSourceSpeed(Number(initialParams.sourceSpeed));
      if (initialParams.observerSpeed !== undefined) setObserverSpeed(Number(initialParams.observerSpeed));
      if (initialParams.sourceFreq !== undefined) setSourceFreq(Number(initialParams.sourceFreq));
      if (initialParams.isBeatsMode !== undefined) setIsBeatsMode(Boolean(initialParams.isBeatsMode));
      if (initialParams.beatsFreq2 !== undefined) setBeatsFreq2(Number(initialParams.beatsFreq2));
    }
  }, [initialParams]);

  // Audio state
  const [audioActive, setAudioActive] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.2);

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

  const timeRef = useRef<number>(clock.time);
  timeRef.current = clock.time;

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sourceVehicleRef = useRef<THREE.Group | null>(null);
  const observerMeshRef = useRef<THREE.Group | null>(null);
  const wavefrontsGroupRef = useRef<THREE.Group | null>(null);
  const ringsDataRef = useRef<WavefrontRing[]>([]);
  const ringPoolRef = useRef<THREE.Mesh[]>([]);
  const srcArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const obsArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.25,
    phi: 0.55,
    radius: 14.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    lastEmitTimeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
    ringsDataRef.current = [];
    if (ringPoolRef.current) {
      ringPoolRef.current.forEach((m) => {
        m.visible = false;
      });
    }
  }, []);

  // Derived Doppler physical calculations
  const currentState = useMemo(() => {
    const travelSpan = 160;
    const cycleTime = travelSpan / Math.max(1, Math.abs(sourceSpeed));
    const modTime = clock.time % cycleTime;
    const srcX = -80 + modTime * sourceSpeed;
    // Observer position responds to observer speed
    const obsX = 20 + (observerSpeed !== 0 ? (((clock.time * observerSpeed) % 80 + 80) % 80 - 40) : 0);
    return calculateDoppler(srcX, obsX, sourceSpeed, observerSpeed, sourceFreq, soundSpeed);
  }, [clock.time, sourceSpeed, observerSpeed, sourceFreq, soundSpeed]);

  // Update audio synthesis when pitch changes
  useEffect(() => {
    if (!audioActive) {
      labAudio.stop();
      return;
    }
    labAudio.setEnabled(true);
    labAudio.setVolume(volume);

    if (isBeatsMode) {
      labAudio.playBeats(sourceFreq, beatsFreq2);
    } else {
      labAudio.playTone(currentState.observedFreq);
    }

    return () => {
      labAudio.stop();
    };
  }, [audioActive, volume, isBeatsMode, sourceFreq, beatsFreq2, currentState.observedFreq]);

  // Update data buffer
  useEffect(() => {
    setDataBuffer((prev) => {
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].t - clock.time) < 0.0001) {
        return prev;
      }
      const newPt: DataPoint = {
        t: clock.time,
        fObs: currentState.observedFreq,
        fSource: sourceFreq,
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, currentState.observedFreq, sourceFreq]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.02);
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

    // Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(6, 12, 6);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    // Highway Road & Ground Grid
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const roadGeo = new THREE.BoxGeometry(30, 0.1, 4);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, -0.05, 0);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    const grid = new THREE.GridHelper(30, 30, 0x0284c7, 0x1e293b);
    grid.position.y = -0.06;
    scene.add(grid);

    // Moving Acoustic Source (Composite Siren Vehicle Assembly)
    const vehicleGroup = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), carMat);
    carBody.position.y = 0.35;
    carBody.castShadow = true;
    vehicleGroup.add(carBody);

    // Cabin
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.8), cabinMat);
    cabin.position.set(-0.1, 0.65, 0);
    vehicleGroup.add(cabin);

    // Flashing Siren Beacon
    const sirenMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
    const siren = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16), sirenMat);
    siren.position.set(-0.1, 0.9, 0);
    vehicleGroup.add(siren);

    scene.add(vehicleGroup);
    sourceVehicleRef.current = vehicleGroup;

    // Static Observer Figure (Pedestrian at roadside)
    const observerGroup = new THREE.Group();
    const obsMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });
    const obsBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 16), obsMat);
    obsBody.position.y = 0.45;
    const obsHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), obsMat);
    obsHead.position.y = 1.05;
    observerGroup.add(obsBody, obsHead);
    observerGroup.position.set(20 * 0.1, 0, 1.8);
    scene.add(observerGroup);
    observerMeshRef.current = observerGroup;

    // Expanding Wavefront Rings Group (Pre-allocated pool to prevent GPU memory churn)
    const wavefrontsGroup = new THREE.Group();
    const unitRingGeo = new THREE.RingGeometry(0.96, 1.04, 48);
    unitRingGeo.rotateX(Math.PI / 2);
    const ringMeshPool: THREE.Mesh[] = [];

    for (let k = 0; k < 32; k++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(unitRingGeo, ringMat);
      ringMesh.visible = false;
      wavefrontsGroup.add(ringMesh);
      ringMeshPool.push(ringMesh);
    }

    scene.add(wavefrontsGroup);
    wavefrontsGroupRef.current = wavefrontsGroup;
    ringPoolRef.current = ringMeshPool;

    // Velocity Vector Helpers
    const srcArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.8, 0), 1, 0x38bdf8, 0.3, 0.15);
    const obsArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.8, 0), 1, 0x10b981, 0.3, 0.15);
    scene.add(srcArrow);
    scene.add(obsArrow);
    srcArrowRef.current = srcArrow;
    obsArrowRef.current = obsArrow;

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
      cameraAngleRef.current.radius = Math.max(6.0, Math.min(30, cameraAngleRef.current.radius + e.deltaY * 0.006));
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
      unitRingGeo.dispose();
      ringMeshPool.forEach((m) => {
        (m.material as THREE.Material).dispose();
      });
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
          cam.position.set(0, 16, 0.01);
          cam.lookAt(0, 0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 0.5, 0);
        }
      }

      const t = timeRef.current;

      // Scaled world positions (1 unit in 3D = 10 meters)
      const scalePos = 0.15;
      const travelSpan = 160;
      const cycleTime = travelSpan / Math.max(1, Math.abs(sourceSpeed));
      const modTime = t % cycleTime;
      const srcWorldX = (-80 + modTime * sourceSpeed) * scalePos;
      const obsWorldX = (20 + (observerSpeed !== 0 ? (((t * observerSpeed) % 80 + 80) % 80 - 40) : 0)) * scalePos;

      if (sourceVehicleRef.current) {
        sourceVehicleRef.current.position.x = srcWorldX;
      }
      if (observerMeshRef.current) {
        observerMeshRef.current.position.x = obsWorldX;
      }

      // Vector visualizers
      if (clock.showVectors && srcArrowRef.current && obsArrowRef.current) {
        const srcMag = Math.abs(sourceSpeed);
        if (srcMag > 0.5) {
          srcArrowRef.current.visible = true;
          srcArrowRef.current.position.set(srcWorldX, 0.9, 0);
          srcArrowRef.current.setDirection(new THREE.Vector3(sourceSpeed >= 0 ? 1 : -1, 0, 0));
          srcArrowRef.current.setLength(Math.max(0.1, Math.min(2.5, srcMag * 0.03)), 0.25, 0.12);
        } else {
          srcArrowRef.current.visible = false;
        }

        const obsMag = Math.abs(observerSpeed);
        if (obsMag > 0.5) {
          obsArrowRef.current.visible = true;
          obsArrowRef.current.position.set(obsWorldX, 1.3, 1.8);
          obsArrowRef.current.setDirection(new THREE.Vector3(observerSpeed >= 0 ? 1 : -1, 0, 0));
          obsArrowRef.current.setLength(Math.max(0.1, Math.min(2.5, obsMag * 0.03)), 0.25, 0.12);
        } else {
          obsArrowRef.current.visible = false;
        }
      } else if (srcArrowRef.current && obsArrowRef.current) {
        srcArrowRef.current.visible = false;
        obsArrowRef.current.visible = false;
      }

      // Emit new wavefront ring every ~0.25s
      if (t - lastEmitTimeRef.current >= 0.25) {
        lastEmitTimeRef.current = t;
        ringsDataRef.current.push({
          center: new THREE.Vector3(srcWorldX, 0.35, 0),
          birthTime: t,
        });

        if (ringsDataRef.current.length > 30) {
          ringsDataRef.current.shift();
        }
      }

      // Update wavefront rings from pre-allocated pool (0 GPU leaks)
      const pool = ringPoolRef.current;
      if (pool) {
        const vSoundScaled = soundSpeed * scalePos;
        pool.forEach((mesh, idx) => {
          if (idx < ringsDataRef.current.length) {
            const ring = ringsDataRef.current[idx];
            const age = t - ring.birthTime;
            if (age > 0) {
              const currentRadius = age * vSoundScaled * 0.45;
              mesh.position.set(ring.center.x, 0.02, ring.center.z);
              mesh.scale.set(currentRadius, 1, currentRadius);
              const mat = mesh.material as THREE.MeshBasicMaterial;
              mat.opacity = Math.max(0.05, 1.0 - age / 3.0);
              mesh.visible = true;
            } else {
              mesh.visible = false;
            }
          } else {
            mesh.visible = false;
          }
        });
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
  }, [clock.isRunning, clock.speed, clock.is2DView, clock.showVectors, sourceSpeed, observerSpeed, soundSpeed]);

  const chartSeries: ChartSeries[] = [
    { key: 'fObs', label: 'Frequência Percebida f_obs', color: '#38bdf8', unit: 'Hz' },
    { key: 'fSource', label: 'Frequência Emitida f₀', color: '#94a3b8', unit: 'Hz' },
  ];

  const quantities: PhysicalQuantity[] = [
    { label: 'Freq. Percebida', symbol: 'f_obs', value: currentState.observedFreq, unit: 'Hz', precision: 1, highlight: true },
    { label: 'Freq. Emitida', symbol: 'f₀', value: currentState.emittedFreq, unit: 'Hz', precision: 1 },
    { label: 'Velocidade da Fonte', symbol: 'v_fonte', value: sourceSpeed, unit: 'm/s', precision: 1 },
    { label: 'Número de Mach', symbol: 'M', value: currentState.machNumber, unit: '', precision: 2 },
    { label: 'λ Frontal', symbol: 'λ_frente', value: currentState.wavelengthAhead, unit: 'm', precision: 2 },
    { label: 'λ Traseiro', symbol: 'λ_trás', value: currentState.wavelengthBehind, unit: 'm', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">ACÚSTICA & EFEITO DOPPLER</span>
              <span className="text-xs text-slate-300">Compressão de Frentes de Onda e Desvio de Frequência</span>
            </div>

            <div
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 backdrop-blur-md ${
                currentState.isApproaching
                  ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/70 text-rose-300'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>
                {currentState.isApproaching
                  ? `Aproximação: Som mais agudo (+${(currentState.observedFreq - sourceFreq).toFixed(1)} Hz)`
                  : `Afastamento: Som mais grave (-${(sourceFreq - currentState.observedFreq).toFixed(1)} Hz)`}
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

        {/* Side Panel: Tabs for Controls and Graphs */}
        <div className="w-full md:w-96 lg:w-[420px] bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-full overflow-hidden shrink-0">
          <div className="flex items-center p-2.5 border-b border-slate-800 bg-slate-950/60 gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSideTab('controls')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'controls'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parâmetros</span>
            </button>
            <button
              onClick={() => setActiveSideTab('graphs')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'graphs'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Gráficos em Tempo Real</span>
            </button>
          </div>

          {/* Tab 1: Parameters */}
          {activeSideTab === 'controls' && (
            <div className="p-3.5 flex flex-col gap-3.5 overflow-y-auto flex-1">
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="doppler"
                onApplyPreset={applyPreset}
                currentParams={{ sourceSpeed, observerSpeed, sourceFreq, isBeatsMode, beatsFreq2 }}
              />

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros Acústicos</span>
                <span className="text-[10px] text-cyan-400 font-mono">3D Doppler</span>
              </div>

              {/* Audio Synthesis Consent & Controls */}
              <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    {audioActive ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    Síntese de Áudio Web:
                  </span>
                  <button
                    onClick={() => setAudioActive(!audioActive)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors border cursor-pointer ${
                      audioActive
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {audioActive ? 'Desativar Som' : 'Ativar Áudio'}
                  </button>
                </div>

                {audioActive && (
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Volume do Laboratório:</span>
                      <span className="font-mono text-cyan-400">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Source Velocity (v_f) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Velocidade da Fonte (vf):</span>
                  <span className="font-mono text-cyan-400 font-medium">
                    {sourceSpeed.toFixed(0)} m/s ({(sourceSpeed * 3.6).toFixed(0)} km/h)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={sourceSpeed}
                  onChange={(e) => setSourceSpeed(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Observer Velocity (v_o) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Velocidade do Observador (vo):</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {observerSpeed >= 0 ? `+${observerSpeed.toFixed(0)}` : observerSpeed.toFixed(0)} m/s ({(observerSpeed * 3.6).toFixed(0)} km/h)
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="5"
                  value={observerSpeed}
                  onChange={(e) => setObserverSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-60 m/s (esq)</span>
                  <span>0 (repouso)</span>
                  <span>+60 m/s (dir)</span>
                </div>
              </div>

              {/* Emitted Frequency (f_0) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Frequência Emitida (f₀):</span>
                  <span className="font-mono text-cyan-400 font-medium">{sourceFreq.toFixed(0)} Hz</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="20"
                  value={sourceFreq}
                  onChange={(e) => setSourceFreq(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Beats Mode Toggle */}
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300 font-medium flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    Fenômeno de Batimentos:
                  </span>
                  <input
                    type="checkbox"
                    checked={isBeatsMode}
                    onChange={(e) => setIsBeatsMode(e.target.checked)}
                    className="rounded accent-purple-500 cursor-pointer"
                  />
                </div>

                {isBeatsMode && (
                  <div className="flex flex-col gap-2 bg-purple-950/20 p-2 rounded border border-purple-900/40">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Freq. 2 (f₂):</span>
                        <span className="font-mono text-purple-400">{beatsFreq2.toFixed(1)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="430"
                        max="450"
                        step="0.5"
                        value={beatsFreq2}
                        onChange={(e) => setBeatsFreq2(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] font-mono text-purple-300">
                      Frequência de Batimento: f_bat = |f₁ - f₂| = {Math.abs(sourceFreq - beatsFreq2).toFixed(1)} Hz
                    </div>
                  </div>
                )}
              </div>

              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equação do Efeito Doppler</span>
                  <KaTeXMath
                    math="f_{\text{obs}} = f_0 \left(\frac{v_{\text{som}} \pm v_{\text{obs}}}{v_{\text{som}} \mp v_{\text{fonte}}}\right)"
                    block
                  />
                  <KaTeXMath math="\lambda_{\text{frente}} = \frac{v_{\text{som}} - v_f}{f_0}" block />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Graphs */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Frequência Percebida f_obs(t)</span>
                <span className="text-[10px] font-mono text-cyan-400">Tempo Real</span>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={clock.time}
                height={260}
                title="Desvio de Frequência Percebida f_obs(t) vs Frequência Emitida f₀"
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Comportamento Acústico:</span>
                <span>• Na aproximação da fonte, as frentes de onda se comprimem e o som percebido é mais agudo (f_obs &gt; f₀).</span>
                <span>• No afastamento, o comprimento de onda aparente se dilata e o som fica mais grave (f_obs &lt; f₀).</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
            cameraAngleRef.current = { theta: 0.25, phi: 0.55, radius: 14.0 };
          }}
        />
      </div>
    </div>
  );
};

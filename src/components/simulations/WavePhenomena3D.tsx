import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { calculateRefraction, singleSlitDiffractionIntensity } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Layers, Activity } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface WavePhenomena3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

type PhenomenonMode = 'reflection' | 'refraction' | 'diffraction';

export const WavePhenomena3D: React.FC<WavePhenomena3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Phenomenon selection
  const [phenomenon, setPhenomenon] = useState<PhenomenonMode>(
    () => (initialParams?.phenomenon as PhenomenonMode) || 'reflection'
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  // Reflection parameters
  const [isFixedEnd, setIsFixedEnd] = useState<boolean>(
    () => (initialParams?.isFixedEnd != null ? Boolean(initialParams.isFixedEnd) : true)
  );

  // Refraction parameters
  const [v1, setV1] = useState<number>(
    () => (initialParams?.v1 != null ? Number(initialParams.v1) : 4.0)
  );
  const [v2, setV2] = useState<number>(
    () => (initialParams?.v2 != null ? Number(initialParams.v2) : 2.0)
  );
  const [refractFreq, setRefractFreq] = useState<number>(
    () => (initialParams?.refractFreq != null ? Number(initialParams.refractFreq) : 1.0)
  );

  // Diffraction parameters
  const [slitWidth, setSlitWidth] = useState<number>(
    () => (initialParams?.slitWidth != null ? Number(initialParams.slitWidth) : 1.2)
  );
  const [diffractWavelength, setDiffractWavelength] = useState<number>(
    () => (initialParams?.diffractWavelength != null ? Number(initialParams.diffractWavelength) : 1.0)
  );

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.phenomenon !== undefined) setPhenomenon(p.phenomenon);
    if (p.isFixedEnd !== undefined) setIsFixedEnd(Boolean(p.isFixedEnd));
    if (p.v1 !== undefined) setV1(Number(p.v1));
    if (p.v2 !== undefined) setV2(Number(p.v2));
    if (p.refractFreq !== undefined) setRefractFreq(Number(p.refractFreq));
    if (p.slitWidth !== undefined) setSlitWidth(Number(p.slitWidth));
    if (p.diffractWavelength !== undefined) setDiffractWavelength(Number(p.diffractWavelength));
  }, []);

  useEffect(() => {
    onParamsChange?.({
      phenomenon,
      isFixedEnd,
      v1,
      v2,
      refractFreq,
      slitWidth,
      diffractWavelength,
    });
  }, [phenomenon, isFixedEnd, v1, v2, refractFreq, slitWidth, diffractWavelength, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.phenomenon !== undefined) setPhenomenon(initialParams.phenomenon);
      if (initialParams.isFixedEnd !== undefined) setIsFixedEnd(Boolean(initialParams.isFixedEnd));
      if (initialParams.v1 !== undefined) setV1(Number(initialParams.v1));
      if (initialParams.v2 !== undefined) setV2(Number(initialParams.v2));
      if (initialParams.refractFreq !== undefined) setRefractFreq(Number(initialParams.refractFreq));
      if (initialParams.slitWidth !== undefined) setSlitWidth(Number(initialParams.slitWidth));
      if (initialParams.diffractWavelength !== undefined) setDiffractWavelength(Number(initialParams.diffractWavelength));
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

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mainMeshRef = useRef<THREE.Mesh | null>(null);
  const slitObstacleGroupRef = useRef<THREE.Group | null>(null);
  const boundaryPlaneRef = useRef<THREE.Mesh | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.3,
    phi: 0.55,
    radius: 10.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const timeRef = useRef<number>(clock.time);
  timeRef.current = clock.time;

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update telemetry for static diffraction chart
  useEffect(() => {
    if (phenomenon === 'diffraction') {
      const pts: DataPoint[] = [];
      for (let angleDeg = -60; angleDeg <= 60; angleDeg += 2) {
        const thetaRad = (angleDeg * Math.PI) / 180;
        const intensity = singleSlitDiffractionIntensity(thetaRad, slitWidth, diffractWavelength);
        pts.push({
          t: angleDeg,
          intensity,
        });
      }
      setDataBuffer(pts);
    }
  }, [phenomenon, slitWidth, diffractWavelength]);

  // Update telemetry for time-dependent refraction & reflection charts
  useEffect(() => {
    if (phenomenon === 'refraction') {
      const lambda1 = v1 / refractFreq;
      const lambda2 = v2 / refractFreq;
      const pts: DataPoint[] = [];
      for (let x = -4; x <= 4; x += 0.1) {
        let y = 0;
        if (x < 0) {
          y = Math.sin((2 * Math.PI / lambda1) * x - 2 * Math.PI * refractFreq * clock.time);
        } else {
          y = 0.8 * Math.sin((2 * Math.PI / lambda2) * x - 2 * Math.PI * refractFreq * clock.time);
        }
        pts.push({ t: x, profile: y });
      }
      setDataBuffer(pts);
    } else if (phenomenon === 'reflection') {
      const pts: DataPoint[] = [];
      const pulseWidth = 0.8;
      const v = 3.0;
      const L = 4.0;
      for (let x = 0; x <= L; x += 0.08) {
        const distInc = x - (clock.time * v) % (2 * L);
        const yInc = Math.exp(-Math.pow(distInc / pulseWidth, 2));

        const distRef = (2 * L - x) - (clock.time * v) % (2 * L);
        const sign = isFixedEnd ? -1 : 1;
        const yRef = sign * Math.exp(-Math.pow(distRef / pulseWidth, 2));

        pts.push({ t: x, pulse: yInc + yRef });
      }
      setDataBuffer(pts);
    }
  }, [phenomenon, clock.time, v1, v2, refractFreq, isFixedEnd]);

  // Setup Three.js Scene
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

    // Dynamic 3D Wave Surface / Cord Mesh
    const planeGeo = new THREE.PlaneGeometry(8, 6, 70, 50);
    planeGeo.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.4,
      roughness: 0.15,
      wireframe: false,
    });
    const mainMesh = new THREE.Mesh(planeGeo, planeMat);
    scene.add(mainMesh);
    mainMeshRef.current = mainMesh;

    // Slit Obstacle Walls (for diffraction)
    const obstacleGroup = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 2.4), wallMat);
    wallLeft.position.set(0, 0, -1.8);
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 2.4), wallMat);
    wallRight.position.set(0, 0, 1.8);
    obstacleGroup.add(wallLeft, wallRight);
    obstacleGroup.visible = false;
    scene.add(obstacleGroup);
    slitObstacleGroupRef.current = obstacleGroup;

    // Interface boundary dividing line (for refraction)
    const bndMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const bndGeo = new THREE.CylinderGeometry(0.02, 0.02, 6, 8);
    bndGeo.rotateX(Math.PI / 2);
    const bndMesh = new THREE.Mesh(bndGeo, bndMat);
    bndMesh.visible = false;
    scene.add(bndMesh);
    boundaryPlaneRef.current = bndMesh;

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
      cameraAngleRef.current.radius = Math.max(4.0, Math.min(20, cameraAngleRef.current.radius + e.deltaY * 0.006));
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

      // Update visibility of scenario props
      if (slitObstacleGroupRef.current) {
        slitObstacleGroupRef.current.visible = phenomenon === 'diffraction';
        // Adjust slit gap
        if (phenomenon === 'diffraction') {
          const halfGap = slitWidth / 2;
          const leftW = slitObstacleGroupRef.current.children[0] as THREE.Mesh;
          const rightW = slitObstacleGroupRef.current.children[1] as THREE.Mesh;
          leftW.position.z = -(halfGap + 1.2);
          rightW.position.z = +(halfGap + 1.2);
        }
      }

      if (boundaryPlaneRef.current) {
        boundaryPlaneRef.current.visible = phenomenon === 'refraction';
      }

      // Mesh deformation according to active phenomenon
      if (mainMeshRef.current) {
        const geo = mainMeshRef.current.geometry as THREE.PlaneGeometry;
        const posAttr = geo.attributes.position;
        const count = posAttr.count;

        if (phenomenon === 'diffraction') {
          const k = (2 * Math.PI) / diffractWavelength;
          const omega = 2 * Math.PI * 1.2;

          for (let i = 0; i < count; i++) {
            const px = posAttr.getX(i);
            const pz = posAttr.getZ(i);

            let y = 0;
            if (px < 0) {
              // Plane waves approaching slit from left
              y = 0.5 * Math.cos(k * px - omega * t);
            } else {
              // Bending waves emerging through slit
              const r = Math.hypot(px, pz);
              const theta = Math.atan2(pz, Math.max(0.01, px));
              const intensity = singleSlitDiffractionIntensity(theta, slitWidth, diffractWavelength);
              const atten = 1 / Math.sqrt(r + 0.5);
              y = 0.7 * Math.sqrt(intensity) * atten * Math.cos(k * r - omega * t);
            }
            posAttr.setY(i, y);
          }
        } else if (phenomenon === 'refraction') {
          const lambda1 = v1 / refractFreq;
          const lambda2 = v2 / refractFreq;
          const k1 = (2 * Math.PI) / lambda1;
          const k2 = (2 * Math.PI) / lambda2;
          const omega = 2 * Math.PI * refractFreq;

          for (let i = 0; i < count; i++) {
            const px = posAttr.getX(i);
            let y = 0;
            if (px < 0) {
              y = 0.6 * Math.sin(k1 * px - omega * t);
            } else {
              // Higher or lower spatial frequency in medium 2
              y = 0.5 * Math.sin(k2 * px - omega * t);
            }
            posAttr.setY(i, y);
          }
        } else {
          // Reflection pulse along X
          const pulseWidth = 0.8;
          const v = 3.0;
          const L = 4.0;
          for (let i = 0; i < count; i++) {
            const px = posAttr.getX(i);
            const pz = posAttr.getZ(i);
            const xShift = px + 4.0; // from 0 to 8

            const distInc = xShift - (t * v) % (2 * L);
            const yInc = Math.exp(-Math.pow(distInc / pulseWidth, 2));

            const distRef = (2 * L - xShift) - (t * v) % (2 * L);
            const sign = isFixedEnd ? -1 : 1;
            const yRef = sign * Math.exp(-Math.pow(distRef / pulseWidth, 2));

            const yTotal = yInc + yRef;
            // Cross-sectional attenuation away from center Z
            const zAtten = Math.exp(-Math.pow(pz / 1.5, 2));
            posAttr.setY(i, yTotal * zAtten * 0.8);
          }
        }

        posAttr.needsUpdate = true;
        geo.computeVertexNormals();
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
  }, [clock.isRunning, clock.speed, clock.is2DView, phenomenon, slitWidth, diffractWavelength, v1, v2, refractFreq, isFixedEnd]);

  // Chart configuration based on phenomenon
  const chartSeries: ChartSeries[] =
    phenomenon === 'diffraction'
      ? [{ key: 'intensity', label: 'Intensidade Relativa I(θ) / I₀', color: '#06b6d4', unit: '' }]
      : phenomenon === 'refraction'
      ? [{ key: 'profile', label: 'Forma da Onda y(x)', color: '#38bdf8', unit: 'm' }]
      : [{ key: 'pulse', label: 'Deslocamento da Corda y(x)', color: '#10b981', unit: 'm' }];

  const refractionState = calculateRefraction(v1, v2, refractFreq);

  const quantities: PhysicalQuantity[] =
    phenomenon === 'refraction'
      ? [
          { label: 'Frequência (Invariante)', symbol: 'f', value: refractFreq, unit: 'Hz', precision: 2, highlight: true },
          { label: 'Velocidade Meio 1', symbol: 'v₁', value: v1, unit: 'm/s', precision: 1 },
          { label: 'Velocidade Meio 2', symbol: 'v₂', value: v2, unit: 'm/s', precision: 1 },
          { label: 'Comprimento Meio 1', symbol: 'λ₁', value: refractionState.lambda1, unit: 'm', precision: 2 },
          { label: 'Comprimento Meio 2', symbol: 'λ₂', value: refractionState.lambda2, unit: 'm', precision: 2 },
        ]
      : phenomenon === 'diffraction'
      ? [
          { label: 'Razão Difração', symbol: 'λ/a', value: diffractWavelength / slitWidth, unit: '', precision: 2, highlight: true },
          { label: 'Largura da Fenda', symbol: 'a', value: slitWidth, unit: 'm', precision: 2 },
          { label: 'Comprimento de Onda', symbol: 'λ', value: diffractWavelength, unit: 'm', precision: 2 },
        ]
      : [
          { label: 'Extremidade', symbol: 'Fim', value: isFixedEnd ? -180 : 0, unit: '° (fase)', precision: 0, highlight: true },
        ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">FENÔMENOS ONDULATÓRIOS</span>
              <span className="text-xs text-slate-300">
                {phenomenon === 'reflection'
                  ? `Reflexão em Extremidade ${isFixedEnd ? 'Fixa (Inversão 180°)' : 'Livre (Sem Inversão)'}`
                  : phenomenon === 'refraction'
                  ? 'Refração com Frequência Rigorosamente Constante'
                  : 'Difração em Fenda Simples (Dispersão Angular)'}
              </span>
            </div>

            {phenomenon === 'diffraction' && (
              <div className="bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded text-xs text-slate-400">
                {diffractWavelength / slitWidth >= 0.8 ? (
                  <span className="text-emerald-400 font-medium">Difração acentuada (a ≈ λ): onda se espalha angularmente</span>
                ) : (
                  <span className="text-amber-400 font-medium">Difração discreta (a &gt;&gt; λ): comportamento retilíneo (raio)</span>
                )}
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
                    {typeof q.value === 'number' ? q.value.toFixed(q.precision ?? 2) : q.value}
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
                moduleId="phenomena"
                onApplyPreset={applyPreset}
                currentParams={{
                  phenomenon,
                  isFixedEnd,
                  v1,
                  v2,
                  refractFreq,
                  slitWidth,
                  diffractWavelength,
                }}
              />

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Fenômeno em Estudo</span>
                <span className="text-[10px] text-cyan-400 font-mono">3D Óptica & Ondas</span>
              </div>

              {/* Phenomenon Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
                <button
                  onClick={() => setPhenomenon('reflection')}
                  className={`py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    phenomenon === 'reflection' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reflexão
                </button>
                <button
                  onClick={() => setPhenomenon('refraction')}
                  className={`py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    phenomenon === 'refraction' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Refração
                </button>
                <button
                  onClick={() => setPhenomenon('diffraction')}
                  className={`py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    phenomenon === 'diffraction' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Difração
                </button>
              </div>

              {/* Reflection Controls */}
              {phenomenon === 'reflection' && (
                <div className="flex flex-col gap-2.5 pt-1">
                  <span className="text-xs text-slate-400">Condição da Extremidade Terminal:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setIsFixedEnd(true)}
                      className={`px-3 py-2 rounded text-xs transition-colors border text-left cursor-pointer ${
                        isFixedEnd
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Extremidade Fixa</div>
                      <div className="text-[10px] text-slate-500">Inverte fase (180°)</div>
                    </button>
                    <button
                      onClick={() => setIsFixedEnd(false)}
                      className={`px-3 py-2 rounded text-xs transition-colors border text-left cursor-pointer ${
                        !isFixedEnd
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Extremidade Livre</div>
                      <div className="text-[10px] text-slate-500">Mantém a fase (0°)</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Refraction Controls */}
              {phenomenon === 'refraction' && (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Velocidade Meio 1 (v₁):</span>
                      <span className="font-mono text-cyan-400 font-medium">{v1.toFixed(1)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.5"
                      value={v1}
                      onChange={(e) => setV1(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Velocidade Meio 2 (v₂):</span>
                      <span className="font-mono text-cyan-400 font-medium">{v2.toFixed(1)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.5"
                      value={v2}
                      onChange={(e) => setV2(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Frequência da Fonte (f):</span>
                      <span className="font-mono text-cyan-400 font-medium">{refractFreq.toFixed(1)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={refractFreq}
                      onChange={(e) => setRefractFreq(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500">
                      A frequência permanece inalterada em ambos os meios.
                    </span>
                  </div>
                </div>
              )}

              {/* Diffraction Controls */}
              {phenomenon === 'diffraction' && (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Largura da Fenda (a):</span>
                      <span className="font-mono text-cyan-400 font-medium">{slitWidth.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="3.0"
                      step="0.1"
                      value={slitWidth}
                      onChange={(e) => setSlitWidth(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Comprimento de Onda (λ):</span>
                      <span className="font-mono text-cyan-400 font-medium">{diffractWavelength.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.5"
                      step="0.1"
                      value={diffractWavelength}
                      onChange={(e) => setDiffractWavelength(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Relações Físicas</span>
                  {phenomenon === 'refraction' ? (
                    <>
                      <KaTeXMath math="\frac{v_1}{v_2} = \frac{\lambda_1}{\lambda_2} = \frac{n_2}{n_1}" block />
                      <KaTeXMath math="f_1 = f_2 = \text{constante}" block />
                    </>
                  ) : phenomenon === 'diffraction' ? (
                    <>
                      <KaTeXMath math="I(\theta) = I_0 \left(\frac{\sin\beta}{\beta}\right)^2" block />
                      <KaTeXMath math="\beta = \frac{\pi a}{\lambda}\sin\theta" block />
                    </>
                  ) : (
                    <>
                      <KaTeXMath math="\text{Fixa: } \Delta\phi = \pi \text{ rad (inversão)}" block />
                      <KaTeXMath math="\text{Livre: } \Delta\phi = 0 \text{ rad (concordância)}" block />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Graphs */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  {phenomenon === 'diffraction'
                    ? 'Intensidade Difratada I(θ)'
                    : phenomenon === 'refraction'
                    ? 'Descontinuidade de Onda y(x)'
                    : 'Pulso Refletido'}
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Tempo Real</span>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={clock.time}
                height={260}
                title={
                  phenomenon === 'diffraction'
                    ? 'Padrão Angular de Intensidade Difratada I(θ)'
                    : phenomenon === 'refraction'
                    ? 'Perfil Espacial da Onda com Descontinuidade de Velocidade y(x)'
                    : 'Evolução Espacial do Pulso Refletido'
                }
                xLabel={phenomenon === 'diffraction' ? 'Ângulo θ' : 'Posição x'}
                xUnit={phenomenon === 'diffraction' ? '°' : 'm'}
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Propriedade Física:</span>
                <span>• Na difração, quanto mais próxima a largura da fenda (a) for de λ, mais intensa e aberta é a difração.</span>
                <span>• Na refração, a frequência f é constante e a variação de velocidade altera o comprimento de onda λ.</span>
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
            cameraAngleRef.current = { theta: 0.3, phi: 0.55, radius: 10.5 };
          }}
        />
      </div>
    </div>
  );
};

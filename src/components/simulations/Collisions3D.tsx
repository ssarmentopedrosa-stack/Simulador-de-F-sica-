import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateCollision1D, calculateCollision2D, Collision1DState, Collision2DState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Target, GitCommit, Activity } from 'lucide-react';
import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface Collisions3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const Collisions3D: React.FC<Collisions3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [dimension, setDimension] = useState<'1D' | '2D'>(
    () => (initialParams?.dimension as '1D' | '2D') || '1D'
  );
  const [restitution, setRestitution] = useState<number>(
    () => (initialParams?.restitution != null ? Number(initialParams.restitution) : 1.0)
  );
  const [m1, setM1] = useState<number>(
    () => (initialParams?.m1 != null ? Number(initialParams.m1) : 3.0)
  );
  const [m2, setM2] = useState<number>(
    () => (initialParams?.m2 != null ? Number(initialParams.m2) : 2.0)
  );
  const [v1i, setV1i] = useState<number>(
    () => (initialParams?.v1i != null ? Number(initialParams.v1i) : 4.0)
  );
  const [v2i, setV2i] = useState<number>(
    () => (initialParams?.v2i != null ? Number(initialParams.v2i) : -2.0)
  );
  const [impactAngle2D, setImpactAngle2D] = useState<number>(
    () => (initialParams?.impactAngle2D != null ? Number(initialParams.impactAngle2D) : 30.0)
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.dimension !== undefined) setDimension(p.dimension);
    if (p.restitution !== undefined) setRestitution(Number(p.restitution));
    if (p.m1 !== undefined) setM1(Number(p.m1));
    if (p.m2 !== undefined) setM2(Number(p.m2));
    if (p.v1i !== undefined) setV1i(Number(p.v1i));
    if (p.v2i !== undefined) setV2i(Number(p.v2i));
    if (p.impactAngle2D !== undefined) setImpactAngle2D(Number(p.impactAngle2D));
  }, []);

  useEffect(() => {
    onParamsChange?.({ dimension, restitution, m1, m2, v1i, v2i, impactAngle2D });
  }, [dimension, restitution, m1, m2, v1i, v2i, impactAngle2D, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.dimension !== undefined) setDimension(initialParams.dimension);
      if (initialParams.restitution !== undefined) setRestitution(Number(initialParams.restitution));
      if (initialParams.m1 !== undefined) setM1(Number(initialParams.m1));
      if (initialParams.m2 !== undefined) setM2(Number(initialParams.m2));
      if (initialParams.v1i !== undefined) setV1i(Number(initialParams.v1i));
      if (initialParams.v2i !== undefined) setV2i(Number(initialParams.v2i));
      if (initialParams.impactAngle2D !== undefined) setImpactAngle2D(Number(initialParams.impactAngle2D));
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

  const timeRef = useRef<number>(clock.time);
  timeRef.current = clock.time;

  // 1D Collision Solution
  const col1D: Collision1DState = useMemo(() => {
    return calculateCollision1D(m1, m2, v1i, v2i, restitution);
  }, [m1, m2, v1i, v2i, restitution]);

  // 2D Collision Solution
  const col2D: Collision2DState = useMemo(() => {
    const v1Vec = { x: v1i, y: 0, z: 0 };
    const v2Vec = { x: v2i, y: 0, z: 0 };
    return calculateCollision2D(m1, m2, v1Vec, v2Vec, impactAngle2D, restitution);
  }, [m1, m2, v1i, v2i, impactAngle2D, restitution]);

  // Collision timeline dynamics
  const timeline = useMemo(() => {
    const approachSpeed = Math.max(0.5, Math.abs(v1i - v2i));
    const initialSeparation = 7.0; // meters in 3D
    const timeToCollision = initialSeparation / approachSpeed;
    const postCollisionTime = 2.0;
    const cyclePeriod = timeToCollision + postCollisionTime;

    const modTime = clock.time % cyclePeriod;
    const isPostCollision = modTime >= timeToCollision;
    const tRelative = isPostCollision ? modTime - timeToCollision : modTime - timeToCollision; // < 0 before, >= 0 after

    // Calculate positions
    let pos1 = { x: 0, y: 0.35, z: 0 };
    let pos2 = { x: 0, y: 0.35, z: 0 };
    let vel1 = { x: v1i, y: 0, z: 0 };
    let vel2 = { x: v2i, y: 0, z: 0 };

    if (!isPostCollision) {
      // Approaching each other
      pos1.x = -approachSpeed * (timeToCollision - modTime) * (v1i / approachSpeed);
      pos2.x = approachSpeed * (timeToCollision - modTime) * (-v2i / approachSpeed);
      if (dimension === '2D') {
        // Slight vertical offset for impact parameter
        const b = 0.5 * Math.sin((impactAngle2D * Math.PI) / 180);
        pos1.z = -b;
        pos2.z = b;
      }
      vel1 = { x: v1i, y: 0, z: 0 };
      vel2 = { x: v2i, y: 0, z: 0 };
    } else {
      // Rebounding after impact
      const dtPost = modTime - timeToCollision;
      if (dimension === '1D') {
        pos1.x = col1D.v1f * dtPost;
        pos2.x = col1D.v2f * dtPost;
        vel1 = { x: col1D.v1f, y: 0, z: 0 };
        vel2 = { x: col1D.v2f, y: 0, z: 0 };
      } else {
        pos1.x = col2D.v1f.x * dtPost;
        pos1.z = col2D.v1f.z * dtPost;
        pos2.x = col2D.v2f.x * dtPost;
        pos2.z = col2D.v2f.z * dtPost;
        vel1 = col2D.v1f;
        vel2 = col2D.v2f;
      }
    }

    return {
      timeToCollision,
      isPostCollision,
      tRelative,
      pos1,
      pos2,
      vel1,
      vel2,
    };
  }, [v1i, v2i, clock.time, dimension, impactAngle2D, col1D, col2D]);

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const puck1MeshRef = useRef<THREE.Group | null>(null);
  const puck2MeshRef = useRef<THREE.Group | null>(null);
  const impactFlashRef = useRef<THREE.Mesh | null>(null);
  const v1ArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const v2ArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const pTotalArrowRef = useRef<THREE.ArrowHelper | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.3,
    phi: 0.55,
    radius: 14.0,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Update telemetry data for momentum & energy charts
  useEffect(() => {
    setDataBuffer((prev) => {
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].t - clock.time) < 0.0001) {
        return prev;
      }
      const isPost = timeline.isPostCollision;
      const p1 = dimension === '1D' ? (isPost ? m1 * col1D.v1f : m1 * v1i) : isPost ? m1 * timeline.vel1.x : m1 * v1i;
      const p2 = dimension === '1D' ? (isPost ? m2 * col1D.v2f : m2 * v2i) : isPost ? m2 * timeline.vel2.x : m2 * v2i;
      const pTotal = p1 + p2;
      const ecTotal =
        dimension === '1D'
          ? isPost
            ? col1D.finalKineticEnergy
            : col1D.initialKineticEnergy
          : isPost
          ? col2D.finalKineticEnergy
          : col2D.initialKineticEnergy;

      const newPt: DataPoint = {
        t: Number(clock.time.toFixed(2)),
        p1: Number(p1.toFixed(2)),
        p2: Number(p2.toFixed(2)),
        pTotal: Number(pTotal.toFixed(2)),
        ecTotal: Number(ecTotal.toFixed(2)),
      };
      const updated = [...prev, newPt];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [clock.time, timeline, dimension, m1, m2, v1i, v2i, col1D, col2D]);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(8, 16, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const floorLight = new THREE.PointLight(0x0284c7, 1.5, 30);
    floorLight.position.set(0, 4, 0);
    scene.add(floorLight);

    // Air Table Surface
    const tableGeo = new THREE.BoxGeometry(22, 0.4, 12);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.3,
      metalness: 0.7,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    const grid = new THREE.GridHelper(22, 22, 0x0284c7, 0x1e293b);
    grid.position.y = 0.005;
    scene.add(grid);

    // Center origin cross marker
    const originGeo = new THREE.RingGeometry(0.35, 0.38, 32);
    const originMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const originMesh = new THREE.Mesh(originGeo, originMat);
    originMesh.rotation.x = -Math.PI / 2;
    originMesh.position.y = 0.01;
    scene.add(originMesh);

    // Impact Flash Effect (shows briefly at collision instant)
    const flashGeo = new THREE.RingGeometry(0.1, 0.9, 32);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.rotation.x = -Math.PI / 2;
    flash.position.y = 0.02;
    impactFlashRef.current = flash;
    scene.add(flash);

    // Puck 1 Group (Cyan / Mass 1)
    const puck1Group = new THREE.Group();
    puck1MeshRef.current = puck1Group;

    const p1Geo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 24);
    const p1Mat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const p1Body = new THREE.Mesh(p1Geo, p1Mat);
    p1Body.castShadow = true;
    puck1Group.add(p1Body);

    const ring1Geo = new THREE.RingGeometry(0.25, 0.35, 16);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.18;
    puck1Group.add(ring1);

    scene.add(puck1Group);

    // Puck 2 Group (Emerald / Mass 2)
    const puck2Group = new THREE.Group();
    puck2MeshRef.current = puck2Group;

    const p2Geo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 24);
    const p2Mat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8, roughness: 0.2 });
    const p2Body = new THREE.Mesh(p2Geo, p2Mat);
    p2Body.castShadow = true;
    puck2Group.add(p2Body);

    const ring2Geo = new THREE.RingGeometry(0.25, 0.35, 16);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.18;
    puck2Group.add(ring2);

    scene.add(puck2Group);

    // Vector Arrows
    const arrV1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x38bdf8, 0.3, 0.12);
    v1ArrowRef.current = arrV1;
    scene.add(arrV1);

    const arrV2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x34d399, 0.3, 0.12);
    v2ArrowRef.current = arrV2;
    scene.add(arrV2);

    const arrPtot = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.05, -3), 2.0, 0xf59e0b, 0.35, 0.14);
    pTotalArrowRef.current = arrPtot;
    scene.add(arrPtot);

    // Mouse Interaction
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(6, Math.min(28, cameraAngleRef.current.radius + e.deltaY * 0.02));
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
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

      const { pos1, pos2, vel1, vel2, tRelative } = timeline;

      // Position pucks
      if (puck1MeshRef.current) {
        puck1MeshRef.current.position.set(pos1.x, 0.18, pos1.z);
        // Scale with mass cube root
        const s1 = Math.pow(m1 / 3.0, 1 / 3);
        puck1MeshRef.current.scale.set(s1, 1, s1);
      }

      if (puck2MeshRef.current) {
        puck2MeshRef.current.position.set(pos2.x, 0.18, pos2.z);
        const s2 = Math.pow(m2 / 2.0, 1 / 3);
        puck2MeshRef.current.scale.set(s2, 1, s2);
      }

      // Flash ring at moment of impact
      if (impactFlashRef.current) {
        const impactAge = tRelative;
        if (impactAge >= 0 && impactAge < 0.25) {
          const flashMat = impactFlashRef.current.material as THREE.MeshBasicMaterial;
          flashMat.opacity = 1.0 - impactAge / 0.25;
          const s = 1.0 + impactAge * 4.0;
          impactFlashRef.current.scale.set(s, s, s);
          impactFlashRef.current.visible = true;
        } else {
          impactFlashRef.current.visible = false;
        }
      }

      // Vector Arrows
      if (clock.showVectors) {
        const velScale = 0.25;

        // V1 arrow
        if (v1ArrowRef.current) {
          v1ArrowRef.current.visible = true;
          v1ArrowRef.current.position.set(pos1.x, 0.45, pos1.z);
          const dir1 = new THREE.Vector3(vel1.x, 0, vel1.z);
          const mag1 = dir1.length();
          if (mag1 > 0.05) {
            dir1.normalize();
            v1ArrowRef.current.setDirection(dir1);
            v1ArrowRef.current.setLength(Math.max(0.3, mag1 * velScale), 0.25, 0.1);
          }
        }

        // V2 arrow
        if (v2ArrowRef.current) {
          v2ArrowRef.current.visible = true;
          v2ArrowRef.current.position.set(pos2.x, 0.45, pos2.z);
          const dir2 = new THREE.Vector3(vel2.x, 0, vel2.z);
          const mag2 = dir2.length();
          if (mag2 > 0.05) {
            dir2.normalize();
            v2ArrowRef.current.setDirection(dir2);
            v2ArrowRef.current.setLength(Math.max(0.3, mag2 * velScale), 0.25, 0.1);
          }
        }

        // Total momentum arrow p_total
        if (pTotalArrowRef.current) {
          pTotalArrowRef.current.visible = true;
          const pTot =
            dimension === '1D'
              ? new THREE.Vector3(col1D.initialMomentum, 0, 0)
              : new THREE.Vector3(col2D.initialMomentum.x, 0, col2D.initialMomentum.z);
          const pMag = pTot.length();
          if (pMag > 0.05) {
            pTot.normalize();
            pTotalArrowRef.current.setDirection(pTot);
            pTotalArrowRef.current.setLength(Math.max(0.4, pMag * 0.15), 0.3, 0.12);
          }
        }
      } else {
        if (v1ArrowRef.current) v1ArrowRef.current.visible = false;
        if (v2ArrowRef.current) v2ArrowRef.current.visible = false;
        if (pTotalArrowRef.current) pTotalArrowRef.current.visible = false;
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
  }, [clock.isRunning, clock.speed, clock.is2DView, clock.showVectors, timeline, m1, m2, dimension, col1D, col2D]);

  const chartSeries: ChartSeries[] = [
    { key: 'p1', label: 'Momento p₁ = m₁·v₁', color: '#38bdf8', unit: 'kg·m/s' },
    { key: 'p2', label: 'Momento p₂ = m₂·v₂', color: '#34d399', unit: 'kg·m/s' },
    { key: 'pTotal', label: 'Momento Total p_total (Invariante)', color: '#f59e0b', unit: 'kg·m/s' },
    { key: 'ecTotal', label: 'Energia Cinética Total Ec', color: '#f43f5e', unit: 'J' },
  ];

  const activeCol = dimension === '1D' ? col1D : col2D;
  const initialP = dimension === '1D' ? col1D.initialMomentum : col2D.initialMomentum.x;
  const finalP = dimension === '1D' ? col1D.finalMomentum : col2D.finalMomentum.x;
  const initialEc = activeCol.initialKineticEnergy;
  const finalEc = activeCol.finalKineticEnergy;
  const lossPct = initialEc > 0 ? (activeCol.dissipatedEnergy / initialEc) * 100 : 0;

  const quantities: PhysicalQuantity[] = [
    { label: 'Momento Total Inicial', symbol: 'p_i', value: initialP, unit: 'kg·m/s', precision: 2, highlight: true },
    { label: 'Momento Total Final', symbol: 'p_f', value: finalP, unit: 'kg·m/s', precision: 2, highlight: true },
    { label: 'Energia Cinética Inicial', symbol: 'Ec_i', value: initialEc, unit: 'J', precision: 1 },
    { label: 'Energia Cinética Final', symbol: 'Ec_f', value: finalEc, unit: 'J', precision: 1 },
    { label: 'Energia Dissipada', symbol: 'ΔEc', value: activeCol.dissipatedEnergy, unit: 'J', precision: 1 },
    { label: 'Perda de Ec', symbol: '%', value: lossPct, unit: '%', precision: 1 },
    { label: 'v1 Final', symbol: 'v1f', value: dimension === '1D' ? col1D.v1f : col2D.v1f.x, unit: 'm/s', precision: 2 },
    { label: 'v2 Final', symbol: 'v2f', value: dimension === '1D' ? col1D.v2f : col2D.v2f.x, unit: 'm/s', precision: 2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[380px]">
        {/* 3D Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Header Tag */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">MECÂNICA CLÁSSICA · COLISÕES</span>
              <span className="text-xs text-slate-300">Choques 1D e 2D, Coeficiente de Restituição e Conservação do Momento</span>
            </div>
          </div>

          {/* Guided Experiment Button */}
          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-lg transition-colors border border-blue-400/40 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Experimento Guiado</span>
            </button>
          )}

          {/* Collision Regime Pill Badge */}
          <div className="absolute top-16 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            <div className="bg-slate-950/85 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md shadow-lg flex flex-col gap-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Regime de Colisão:</span>
              <span className={`font-bold ${
                restitution === 1 ? 'text-emerald-400' : restitution === 0 ? 'text-rose-400' : 'text-sky-400'
              }`}>
                {col1D.typeLabel}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-amber-400 backdrop-blur-sm">
              <span>Vetor Momento Total p_total = {initialP.toFixed(2)} kg·m/s (Constante)</span>
            </div>
          </div>

          {/* Quantities Overlay Bar */}
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
                moduleId="collisions"
                onApplyPreset={applyPreset}
                currentParams={{ dimension, restitution, m1, m2, v1i, v2i, impactAngle2D }}
              />

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Parâmetros de Colisão</span>
                <span className="text-[10px] text-cyan-400 font-mono">Colisor 3D</span>
              </div>

              {/* 1D vs 2D Mode */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Dimensionalidade:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setDimension('1D')}
                    className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                      dimension === '1D' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1D (Frontal)
                  </button>
                  <button
                    onClick={() => setDimension('2D')}
                    className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                      dimension === '2D' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2D (Oblíquo)
                  </button>
                </div>
              </div>

              {/* Restitution presets */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Coef. de Restituição (e):</span>
                  <span className="font-mono text-cyan-400 font-bold">{restitution.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={restitution}
                  onChange={(e) => setRestitution(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {[
                    { label: 'Elástica (e=1)', val: 1.0 },
                    { label: 'Parcial (e=0.6)', val: 0.6 },
                    { label: 'Inelástica (e=0)', val: 0.0 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setRestitution(p.val)}
                      className={`py-1 rounded cursor-pointer font-mono ${
                        Math.abs(restitution - p.val) < 0.02
                          ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Masses (m1 and m2) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400">Massa m₁:</span>
                    <span className="font-mono text-white text-[11px]">{m1.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8.0"
                    step="0.5"
                    value={m1}
                    onChange={(e) => setM1(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400">Massa m₂:</span>
                    <span className="font-mono text-white text-[11px]">{m2.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8.0"
                    step="0.5"
                    value={m2}
                    onChange={(e) => setM2(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Velocities (v1 and v2) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400">Vel. v₁:</span>
                    <span className="font-mono text-white text-[11px]">{v1i.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8.0"
                    step="0.5"
                    value={v1i}
                    onChange={(e) => setV1i(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400">Vel. v₂:</span>
                    <span className="font-mono text-white text-[11px]">{v2i.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="-6.0"
                    max="2.0"
                    step="0.5"
                    value={v2i}
                    onChange={(e) => setV2i(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* 2D Impact Angle */}
              {dimension === '2D' && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Ângulo de Impacto:</span>
                    <span className="font-mono text-amber-400 font-medium">{impactAngle2D.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={impactAngle2D}
                    onChange={(e) => setImpactAngle2D(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Formulas Card */}
              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações de Colisão</span>
                  <KaTeXMath math="\vec{p}_{\text{total}} = m_1\vec{v}_1 + m_2\vec{v}_2 = \text{constante}" block />
                  <KaTeXMath math="e = \frac{|v_{2f} - v_{1f}|}{|v_{1i} - v_{2i}|} \in [0, 1]" block />
                  <KaTeXMath math="\Delta E_c = E_{c,f} - E_{c,i} \le 0 \quad (\Delta E_c = 0 \text{ se } e=1)" block />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Graphs */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Momento & Energia Cinética</span>
                <span className="text-[10px] font-mono text-cyan-400">Tempo Real</span>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={clock.time}
                height={260}
                title="Evolução Temporal do Momento Linear p(t) e Energia Cinética Total Ec(t)"
                xLabel="Tempo t"
                xUnit="s"
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Invariantes Fundamentais:</span>
                <span>• O Momento Linear total p(t) é estritamente conservado em qualquer colisão (e = 0 a 1).</span>
                <span>• Na colisão perfeitamente inelástica (e = 0), os corpos se unem e a perda de energia cinética ΔEc é máxima.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls Bar */}
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
            cameraAngleRef.current = { theta: 0.3, phi: 0.55, radius: 14.0 };
          }}
        />
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateSHM } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, HelpCircle, Activity, Layers, RotateCw, Compass } from 'lucide-react';

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface SHM3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const SHM3D: React.FC<SHM3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Physical Parameters
  const [amplitude, setAmplitude] = useState<number>(
    () => (initialParams?.amplitude != null ? Number(initialParams.amplitude) : 1.2)
  );
  const [frequency, setFrequency] = useState<number>(
    () => (initialParams?.frequency != null ? Number(initialParams.frequency) : 0.8)
  );
  const [initialPhaseDeg, setInitialPhaseDeg] = useState<number>(
    () => (initialParams?.initialPhaseDeg != null ? Number(initialParams.initialPhaseDeg) : 0)
  );
  const [compareSecond, setCompareSecond] = useState<boolean>(
    () => (initialParams?.compareSecond != null ? Boolean(initialParams.compareSecond) : false)
  );
  const [phaseDiffDeg, setPhaseDiffDeg] = useState<number>(
    () => (initialParams?.phaseDiffDeg != null ? Number(initialParams.phaseDiffDeg) : 90)
  );
  const [showPhasor, setShowPhasor] = useState<boolean>(true);
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.amplitude !== undefined) setAmplitude(Number(p.amplitude));
    if (p.frequency !== undefined) setFrequency(Number(p.frequency));
    if (p.initialPhaseDeg !== undefined) setInitialPhaseDeg(Number(p.initialPhaseDeg));
    if (p.compareSecond !== undefined) setCompareSecond(Boolean(p.compareSecond));
    if (p.phaseDiffDeg !== undefined) setPhaseDiffDeg(Number(p.phaseDiffDeg));
  }, []);

  useEffect(() => {
    onParamsChange?.({ amplitude, frequency, initialPhaseDeg, compareSecond, phaseDiffDeg });
  }, [amplitude, frequency, initialPhaseDeg, compareSecond, phaseDiffDeg, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.amplitude !== undefined) setAmplitude(Number(initialParams.amplitude));
      if (initialParams.frequency !== undefined) setFrequency(Number(initialParams.frequency));
      if (initialParams.initialPhaseDeg !== undefined) setInitialPhaseDeg(Number(initialParams.initialPhaseDeg));
      if (initialParams.compareSecond !== undefined) setCompareSecond(Boolean(initialParams.compareSecond));
      if (initialParams.phaseDiffDeg !== undefined) setPhaseDiffDeg(Number(initialParams.phaseDiffDeg));
    }
  }, [initialParams]);

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

  const timeRef = useRef<number>(0);
  timeRef.current = clock.time;

  // Telemetry buffer for charts
  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);

  // Synchronous pure derived state
  const phiRad = (initialPhaseDeg * Math.PI) / 180;
  const currentState = useMemo(
    () => calculateSHM(clock.time, amplitude, frequency, phiRad),
    [clock.time, amplitude, frequency, phiRad]
  );

  // Mutable refs for Three.js render loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blockMeshRef = useRef<THREE.Group | null>(null);
  const block2MeshRef = useRef<THREE.Group | null>(null);
  const springMeshRef = useRef<THREE.Line | null>(null);
  const phasorPedestalRef = useRef<THREE.Group | null>(null);
  const phasorPointerRef = useRef<THREE.Group | null>(null);
  const dropLineRef = useRef<THREE.Line | null>(null);
  const velArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const accArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const posArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Rich 3D Camera coordinates
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.75, // side angle (depth)
    phi: 1.15,  // elevated perspective
    radius: 9.2,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset simulation
  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setClock((prev) => ({ ...prev, time: 0 }));
    setDataBuffer([]);
  }, []);

  // Synchronize telemetry buffer on tick
  useEffect(() => {
    setDataBuffer((prev) => {
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].t - clock.time) < 0.0001) {
        return prev;
      }
      const phi2Rad = ((initialPhaseDeg + phaseDiffDeg) * Math.PI) / 180;
      const st2 = calculateSHM(clock.time, amplitude, frequency, phi2Rad);
      const newPt: DataPoint = {
        t: Number(clock.time.toFixed(2)),
        x: Number(currentState.x.toFixed(3)),
        v: Number(currentState.v.toFixed(3)),
        a: Number(currentState.a.toFixed(3)),
        x2: Number(st2.x.toFixed(3)),
      };
      const updated = [...prev, newPt];
      return updated.length > 250 ? updated.slice(-250) : updated;
    });
  }, [clock.time, amplitude, frequency, initialPhaseDeg, phaseDiffDeg, currentState]);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-8, 5, -5);
    scene.add(rimLight);

    // 3D Laboratory Optical Bench Slab
    const benchGeo = new THREE.BoxGeometry(8.5, 0.35, 4.2);
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const benchMesh = new THREE.Mesh(benchGeo, benchMat);
    benchMesh.position.y = -0.7;
    benchMesh.receiveShadow = true;
    scene.add(benchMesh);

    // Top Grid Pattern on Bench
    const grid = new THREE.GridHelper(8.5, 34, 0x0284c7, 0x1e293b);
    grid.position.y = -0.52;
    scene.add(grid);

    // Twin Cylindrical Chrome Linear Rails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
    });
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 7.2, 24);
    railGeo.rotateZ(Math.PI / 2);

    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(0, -0.4, 0.35);
    rail1.castShadow = true;

    const rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(0, -0.4, -0.35);
    rail2.castShadow = true;
    scene.add(rail1, rail2);

    // Rail End Support Stanchions (x = -3.6 and x = +3.6)
    const postGeo = new THREE.BoxGeometry(0.2, 0.5, 1.1);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(-3.6, -0.35, 0);
    postLeft.castShadow = true;

    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(3.6, -0.35, 0);
    postRight.castShadow = true;
    scene.add(postLeft, postRight);

    // Equilibrium Marker Post (x = 0)
    const eqGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12);
    const eqMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const eqMesh = new THREE.Mesh(eqGeo, eqMat);
    eqMesh.position.set(0, -0.35, 0);
    scene.add(eqMesh);

    // Primary 3D Glider Body
    const blockGroup = new THREE.Group();
    blockMeshRef.current = blockGroup;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.25,
    });
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.45, 0.9);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    blockGroup.add(bodyMesh);

    // Chrome Linear Bearings / Bushings
    const bushingMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const bGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.82, 16);
    bGeo.rotateZ(Math.PI / 2);
    const b1 = new THREE.Mesh(bGeo, bushingMat);
    b1.position.set(0, 0, 0.35);
    const b2 = new THREE.Mesh(bGeo, bushingMat);
    b2.position.set(0, 0, -0.35);
    blockGroup.add(b1, b2);

    // Glowing Optical Index Pin
    const indexGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const indexMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const indexMesh = new THREE.Mesh(indexGeo, indexMat);
    indexMesh.position.y = 0.3;
    blockGroup.add(indexMesh);

    blockGroup.position.set(0, -0.4, 0);
    scene.add(blockGroup);

    // Secondary Glider (for comparison mode)
    const block2Group = new THREE.Group();
    block2MeshRef.current = block2Group;

    const body2Mat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.8, roughness: 0.25 });
    const b2Mesh = new THREE.Mesh(bodyGeo, body2Mat);
    b2Mesh.castShadow = true;
    block2Group.add(b2Mesh);

    block2Group.position.set(0, -0.4, -1.2);
    block2Group.visible = false;
    scene.add(block2Group);

    // 3D Helical Spring Line
    const springMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const initialSpringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      initialSpringPts.push(new THREE.Vector3(-3.5 + (3.5 * i) / 100, -0.4, 0));
    }
    const springGeo = new THREE.BufferGeometry().setFromPoints(initialSpringPts);
    const springLine = new THREE.Line(springGeo, springMat);
    springMeshRef.current = springLine;
    scene.add(springLine);

    // 3D Phasor Turntable Assembly (mounted in 3D behind track at z = 1.6)
    const phasorGroup = new THREE.Group();
    phasorPedestalRef.current = phasorGroup;
    phasorGroup.position.set(0, 0.8, 1.5);

    // 3D Cylindrical Base Turntable
    const turnTableGeo = new THREE.CylinderGeometry(1.4, 1.45, 0.1, 32);
    const turnTableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const turnTable = new THREE.Mesh(turnTableGeo, turnTableMat);
    turnTable.rotation.x = Math.PI / 2;
    phasorGroup.add(turnTable);

    // Outer reference circumference ring
    const ringGeo = new THREE.RingGeometry(1.2, 1.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    phasorGroup.add(ringMesh);

    // Rotating pointer arm
    const pointerGroup = new THREE.Group();
    phasorPointerRef.current = pointerGroup;

    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16);
    armGeo.translate(0, 0.6, 0);
    armGeo.rotateZ(-Math.PI / 2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    pointerGroup.add(armMesh);

    const tipGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.position.set(1.2, 0, 0);
    pointerGroup.add(tipMesh);

    phasorGroup.add(pointerGroup);
    scene.add(phasorGroup);

    // 3D Projection Drop Line (connecting phasor tip to slider)
    const dropMat = new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 0.12, gapSize: 0.08 });
    const dropGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.8, 1.5),
      new THREE.Vector3(0, -0.4, 0),
    ]);
    const dropLine = new THREE.Line(dropGeo, dropMat);
    dropLine.computeLineDistances();
    dropLineRef.current = dropLine;
    scene.add(dropLine);

    // 3D Vector Arrows
    // Velocity (Emerald)
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x10b981, 0.25, 0.12);
    velArrowRef.current = velArrow;
    scene.add(velArrow);

    // Acceleration (Rose)
    const accArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0xf43f5e, 0.25, 0.12);
    accArrowRef.current = accArrow;
    scene.add(accArrow);

    // Position (Cyan)
    const posArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x38bdf8, 0.2, 0.1);
    posArrowRef.current = posArrow;
    scene.add(posArrow);

    // Mouse and Touch Drag Orbit Controls
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
      cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2.05, cameraAngleRef.current.phi + dy * 0.008));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(4.0, Math.min(20.0, cameraAngleRef.current.radius + e.deltaY * 0.01));
    };

    // Touch support for tablets/mobile
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
      cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2.05, cameraAngleRef.current.phi + dy * 0.008));
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
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

      const simTime = timeRef.current;

      // Update 3D Camera coordinates
      const cam = cameraRef.current;
      if (cam) {
        if (clock.is2DView) {
          cam.position.set(0, 0.3, 10);
          cam.lookAt(0, 0, 0);
        } else {
          const { theta, phi, radius } = cameraAngleRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 0, 0);
        }
      }

      // Update 3D block positions
      const phiRadCurrent = (initialPhaseDeg * Math.PI) / 180;
      const st = calculateSHM(simTime, amplitude, frequency, phiRadCurrent);

      if (blockMeshRef.current) {
        blockMeshRef.current.position.x = st.x;
      }

      if (block2MeshRef.current) {
        if (compareSecond) {
          block2MeshRef.current.visible = true;
          const phi2 = ((initialPhaseDeg + phaseDiffDeg) * Math.PI) / 180;
          const st2 = calculateSHM(simTime, amplitude, frequency, phi2);
          block2MeshRef.current.position.x = st2.x;
        } else {
          block2MeshRef.current.visible = false;
        }
      }

      // Update 3D Dynamic Spring Coil
      if (springMeshRef.current) {
        const springStart = -3.5;
        const springEnd = st.x - 0.4;
        const totalSpan = springEnd - springStart;
        const coils = 18;
        const ptsCount = 120;
        const positions = springMeshRef.current.geometry.attributes.position as THREE.BufferAttribute;

        for (let i = 0; i <= ptsCount; i++) {
          const frac = i / ptsCount;
          const px = springStart + frac * totalSpan;
          const angle = frac * coils * 2 * Math.PI;
          const py = -0.4 + 0.12 * Math.sin(angle);
          const pz = 0.12 * Math.cos(angle);
          positions.setXYZ(i, px, py, pz);
        }
        positions.needsUpdate = true;
      }

      // Phasor Mechanism
      if (phasorPointerRef.current && phasorPedestalRef.current) {
        phasorPedestalRef.current.visible = showPhasor;
        if (showPhasor) {
          const armAngle = st.phase;
          phasorPointerRef.current.rotation.z = armAngle;

          // Update drop projection line
          if (dropLineRef.current) {
            dropLineRef.current.visible = true;
            const tipX = amplitude * Math.cos(armAngle);
            const tipY = 0.8 + amplitude * Math.sin(armAngle);
            const dropPos = dropLineRef.current.geometry.attributes.position as THREE.BufferAttribute;
            dropPos.setXYZ(0, tipX, tipY, 1.5);
            dropPos.setXYZ(1, st.x, -0.1, 0);
            dropPos.needsUpdate = true;
            dropLineRef.current.computeLineDistances();
          }
        } else if (dropLineRef.current) {
          dropLineRef.current.visible = false;
        }
      }

      // Vector Arrows
      if (clock.showVectors) {
        // Velocity (Emerald)
        if (velArrowRef.current) {
          velArrowRef.current.visible = true;
          velArrowRef.current.position.set(st.x, -0.4, 0.45);
          const vDir = new THREE.Vector3(st.v >= 0 ? 1 : -1, 0, 0);
          velArrowRef.current.setDirection(vDir);
          velArrowRef.current.setLength(Math.max(0.2, Math.abs(st.v) * 0.4), 0.25, 0.12);
        }

        // Acceleration (Rose)
        if (accArrowRef.current) {
          accArrowRef.current.visible = true;
          accArrowRef.current.position.set(st.x, -0.4, -0.45);
          const aDir = new THREE.Vector3(st.a >= 0 ? 1 : -1, 0, 0);
          accArrowRef.current.setDirection(aDir);
          accArrowRef.current.setLength(Math.max(0.2, Math.abs(st.a) * 0.25), 0.25, 0.12);
        }

        // Position (Cyan)
        if (posArrowRef.current) {
          posArrowRef.current.visible = true;
          posArrowRef.current.position.set(0, -0.1, 0);
          const pDir = new THREE.Vector3(st.x >= 0 ? 1 : -1, 0, 0);
          posArrowRef.current.setDirection(pDir);
          posArrowRef.current.setLength(Math.max(0.1, Math.abs(st.x)), 0.2, 0.1);
        }
      } else {
        if (velArrowRef.current) velArrowRef.current.visible = false;
        if (accArrowRef.current) accArrowRef.current.visible = false;
        if (posArrowRef.current) posArrowRef.current.visible = false;
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
  }, [clock.isRunning, clock.speed, clock.is2DView, clock.showVectors, amplitude, frequency, initialPhaseDeg, compareSecond, phaseDiffDeg, showPhasor]);

  // Chart Series
  const chartSeries: ChartSeries[] = [
    { key: 'x', label: 'Posição x(t)', color: '#38bdf8', unit: 'm' },
    { key: 'v', label: 'Velocidade v(t)', color: '#10b981', unit: 'm/s' },
    { key: 'a', label: 'Aceleração a(t)', color: '#f43f5e', unit: 'm/s²' },
  ];

  if (compareSecond) {
    chartSeries.push({ key: 'x2', label: 'Oscilador 2 x₂(t)', color: '#c084fc', unit: 'm' });
  }

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
      {/* Main Split: 3D Viewport on Left, Side Deck on Right */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden min-h-[420px]">
        {/* Full-Height 3D Scene Viewport */}
        <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {/* Header Overlay Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">MHS TRIDIMENSIONAL · 3D INTERATIVO</span>
              <span className="text-xs text-slate-300">Trilho Linear, Mola Helicoidal 3D e Rotor Phasorial</span>
            </div>

            <div className="hidden sm:block bg-slate-900/75 border border-slate-800/80 px-2.5 py-1 rounded text-[11px] text-slate-400 max-w-xs">
              {Math.abs(currentState.x) < 0.15 ? (
                <span className="text-emerald-400 font-medium">Equilíbrio (x ≈ 0): Velocidade Máxima | Aceleração Nula</span>
              ) : Math.abs(currentState.x) > amplitude * 0.85 ? (
                <span className="text-rose-400 font-medium">Extremidade (|x| ≈ A): Velocidade Nula | Aceleração Máxima</span>
              ) : (
                <span>Energia cinética e potencial permutando-se continuamente</span>
              )}
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

          {/* 3D Orbit Control Tip */}
          <div className="absolute top-16 right-3 z-10 pointer-events-none hidden lg:block">
            <div className="bg-slate-950/75 border border-slate-800 px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 flex items-center gap-1.5 backdrop-blur-sm">
              <RotateCw className="w-3 h-3 text-cyan-400" />
              <span>Arraste com o mouse para orbitar em 3D</span>
            </div>
          </div>

          {/* Telemetry Instant Values Bar */}
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

        {/* Side Panel: Tabs for Controls and Graphs (Beside 3D Scene) */}
        <div className="w-full md:w-96 lg:w-[420px] bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-full overflow-hidden shrink-0 z-20">
          {/* Side Tab Selector */}
          <div className="flex items-center p-2.5 border-b border-slate-800 bg-slate-950/60 gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSideTab('controls')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSideTab === 'controls'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parâmetros</span>
            </button>
            <button
              onClick={() => setActiveSideTab('graphs')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSideTab === 'graphs'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Gráficos em Tempo Real</span>
            </button>
          </div>

          {/* Tab 1: Controls & Parameters */}
          {activeSideTab === 'controls' && (
            <div className="p-3.5 flex flex-col gap-3.5 overflow-y-auto flex-1">
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="shm"
                onApplyPreset={applyPreset}
                currentParams={{ amplitude, frequency, initialPhaseDeg, compareSecond, phaseDiffDeg }}
              />

              {/* Amplitude (A) */}
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

              {/* Frequency (f) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Frequência (f):</span>
                  <span className="font-mono text-emerald-400 font-medium">{frequency.toFixed(2)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Initial Phase (phi) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Fase Inicial (φ):</span>
                  <span className="font-mono text-amber-400 font-medium">{initialPhaseDeg}°</span>
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

              {/* Phasor mechanism toggle */}
              <div className="flex items-center justify-between py-1 border-t border-slate-800/80">
                <span className="text-xs text-slate-300">Rotor Phasorial 3D (MCU):</span>
                <input
                  type="checkbox"
                  checked={showPhasor}
                  onChange={(e) => setShowPhasor(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              {/* Second Oscillator Comparison */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Comparar 2º Oscilador:</span>
                  <input
                    type="checkbox"
                    checked={compareSecond}
                    onChange={(e) => setCompareSecond(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                  />
                </div>

                {compareSecond && (
                  <div className="flex flex-col gap-1 p-2 bg-slate-950 rounded border border-purple-900/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Defasagem (Δφ):</span>
                      <span className="font-mono text-purple-400">{phaseDiffDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="15"
                      value={phaseDiffDeg}
                      onChange={(e) => setPhaseDiffDeg(parseInt(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Mathematical Formulas Card */}
              {clock.showFormulas && (
                <div className="mt-auto bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Equações Cinemáticas do MHS</span>
                  <KaTeXMath math="x(t) = A\cos(\omega t + \phi)" block />
                  <KaTeXMath math="v(t) = -A\omega\sin(\omega t + \phi)" block />
                  <KaTeXMath math="a(t) = -\omega^2 x(t)" block />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Synchronized Graphs (Beside 3D Scene) */}
          {activeSideTab === 'graphs' && (
            <div className="p-3.5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Painel Gráfico Sincronizado</span>
                <span className="text-[10px] font-mono text-cyan-400">Tempo Real</span>
              </div>

              <ScientificChart
                data={dataBuffer}
                series={chartSeries}
                currentTime={clock.time}
                height={260}
                title="Curvas Cinemáticas x(t), v(t) e a(t)"
                xLabel="Tempo t"
                xUnit="s"
              />

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Relações de Fase:</span>
                <span>• v(t) está adiantada em 90° (π/2) em relação a x(t).</span>
                <span>• a(t) está em oposição de fase (180° / π) em relação a x(t).</span>
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
            cameraAngleRef.current = { theta: 0.75, phi: 1.15, radius: 9.2 };
          }}
        />
      </div>
    </div>
  );
};

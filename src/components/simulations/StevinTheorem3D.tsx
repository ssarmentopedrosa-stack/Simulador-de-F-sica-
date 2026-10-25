import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateStevinPressure, calculateUTubeEquilibrium, StevinState, UTubeState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Droplets, Compass, Layers } from 'lucide-react';

interface StevinTheorem3DProps {
  onOpenExperiment?: () => void;
}

type StevinMode = 'communicating_vessels' | 'u_tube';
type FluidChoice = 'water' | 'oil' | 'alcohol' | 'glycerin' | 'mercury';

const FLUID_PROPERTIES: Record<FluidChoice, { name: string; density: number; color: number; opacity: number }> = {
  water: { name: 'Água Pura', density: 1000, color: 0x0284c7, opacity: 0.75 },
  oil: { name: 'Óleo Vegetal / Mineral', density: 800, color: 0xeab308, opacity: 0.8 },
  alcohol: { name: 'Álcool Etílico', density: 789, color: 0x38bdf8, opacity: 0.65 },
  glycerin: { name: 'Glicerina', density: 1260, color: 0xa855f7, opacity: 0.8 },
  mercury: { name: 'Mercúrio Metálico', density: 13600, color: 0x64748b, opacity: 0.98 },
};

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface StevinTheorem3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const StevinTheorem3D: React.FC<StevinTheorem3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Mode and Tab
  const [mode, setMode] = useState<StevinMode>(
    () => (initialParams?.mode as StevinMode) || 'communicating_vessels'
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  // Shared Parameters
  const [gravity, setGravity] = useState<number>(9.8); // m/s^2
  const [atmPressure, setAtmPressure] = useState<number>(101325); // Pa

  // Communicating Vessels Parameters
  const [vesselFluid, setVesselFluid] = useState<FluidChoice>(
    () => (initialParams?.vesselFluid as FluidChoice) || 'water'
  );
  const [vesselLiquidHeight, setVesselLiquidHeight] = useState<number>(
    () => (initialParams?.vesselLiquidHeight != null ? Number(initialParams.vesselLiquidHeight) : 1.2)
  );
  const [probeDepth, setProbeDepth] = useState<number>(
    () => (initialParams?.probeDepth != null ? Number(initialParams.probeDepth) : 0.8)
  );

  // U-Tube Parameters
  const [uTubeLiquid1, setUTubeLiquid1] = useState<FluidChoice>(
    () => (initialParams?.uTubeLiquid1 as FluidChoice) || 'water'
  );
  const [uTubeLiquid2, setUTubeLiquid2] = useState<FluidChoice>(
    () => (initialParams?.uTubeLiquid2 as FluidChoice) || 'oil'
  );
  const [uTubeH1, setUTubeH1] = useState<number>(
    () => (initialParams?.uTubeH1 != null ? Number(initialParams.uTubeH1) : 0.12)
  );

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.mode !== undefined) setMode(p.mode);
    if (p.vesselFluid !== undefined) setVesselFluid(p.vesselFluid);
    if (p.vesselLiquidHeight !== undefined) setVesselLiquidHeight(Number(p.vesselLiquidHeight));
    if (p.probeDepth !== undefined) setProbeDepth(Number(p.probeDepth));
    if (p.uTubeLiquid1 !== undefined) setUTubeLiquid1(p.uTubeLiquid1);
    if (p.uTubeLiquid2 !== undefined) setUTubeLiquid2(p.uTubeLiquid2);
    if (p.uTubeH1 !== undefined) setUTubeH1(Number(p.uTubeH1));
  }, []);

  useEffect(() => {
    onParamsChange?.({
      mode,
      vesselFluid,
      vesselLiquidHeight,
      probeDepth,
      uTubeLiquid1,
      uTubeLiquid2,
      uTubeH1,
    });
  }, [mode, vesselFluid, vesselLiquidHeight, probeDepth, uTubeLiquid1, uTubeLiquid2, uTubeH1, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.mode !== undefined) setMode(initialParams.mode);
      if (initialParams.vesselFluid !== undefined) setVesselFluid(initialParams.vesselFluid);
      if (initialParams.vesselLiquidHeight !== undefined) setVesselLiquidHeight(Number(initialParams.vesselLiquidHeight));
      if (initialParams.probeDepth !== undefined) setProbeDepth(Number(initialParams.probeDepth));
      if (initialParams.uTubeLiquid1 !== undefined) setUTubeLiquid1(initialParams.uTubeLiquid1);
      if (initialParams.uTubeLiquid2 !== undefined) setUTubeLiquid2(initialParams.uTubeLiquid2);
      if (initialParams.uTubeH1 !== undefined) setUTubeH1(Number(initialParams.uTubeH1));
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

  // Derived Physical States
  const stevinState: StevinState = useMemo(() => {
    const rho = FLUID_PROPERTIES[vesselFluid].density;
    return calculateStevinPressure(probeDepth, rho, gravity, atmPressure);
  }, [probeDepth, vesselFluid, gravity, atmPressure]);

  const uTubeState: UTubeState = useMemo(() => {
    const r1 = FLUID_PROPERTIES[uTubeLiquid1].density;
    const r2 = FLUID_PROPERTIES[uTubeLiquid2].density;
    return calculateUTubeEquilibrium(r1, uTubeH1, r2, atmPressure, gravity);
  }, [uTubeLiquid1, uTubeLiquid2, uTubeH1, atmPressure, gravity]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Group references
  const vesselsGroupRef = useRef<THREE.Group | null>(null);
  const uTubeGroupRef = useRef<THREE.Group | null>(null);
  const probeMeshRef = useRef<THREE.Group | null>(null);

  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.4,
    phi: 0.7,
    radius: 4.2,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.4, phi: 0.7, radius: 4.2 };
  }, []);

  // Update telemetry
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number((now % 100000 / 1000).toFixed(2)),
        depthM: probeDepth,
        deltaP_KPa: stevinState.deltaP / 1000,
        pAbs_KPa: stevinState.pAbs / 1000,
        h1Cm: uTubeState.h1 * 100,
        h2Cm: uTubeState.h2 * 100,
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, probeDepth, stevinState, uTubeState]);

  // Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.Fog(0x090d16, 9, 25);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    // Floor Grid & Shadow Plane
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.002;
    scene.add(shadowMesh);

    // ==========================================
    // 1. COMMUNICATING VESSELS GROUP
    // ==========================================
    const vesselsGroup = new THREE.Group();
    vesselsGroup.name = 'vesselsGroup';
    scene.add(vesselsGroup);
    vesselsGroupRef.current = vesselsGroup;

    // Base Stand
    const standGeo = new THREE.BoxGeometry(3.2, 0.1, 0.8);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.5 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.05;
    stand.receiveShadow = true;
    vesselsGroup.add(stand);

    // Bottom Connecting Manifold Tube (Horizontal glass)
    const manifoldGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 24);
    const manifoldGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      depthWrite: false,
    });
    const manifoldGlass = new THREE.Mesh(manifoldGeo, manifoldGlassMat);
    manifoldGlass.rotation.z = Math.PI / 2;
    manifoldGlass.position.set(0, 0.18, 0);
    vesselsGroup.add(manifoldGlass);

    // Liquid in Bottom Manifold
    const manifoldLiquidGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.38, 24);
    const manifoldLiquidMat = new THREE.MeshStandardMaterial({
      color: FLUID_PROPERTIES.water.color,
      transparent: true,
      opacity: 0.8,
    });
    const manifoldLiquid = new THREE.Mesh(manifoldLiquidGeo, manifoldLiquidMat);
    manifoldLiquid.name = 'manifoldLiquid';
    manifoldLiquid.rotation.z = Math.PI / 2;
    manifoldLiquid.position.set(0, 0.18, 0);
    vesselsGroup.add(manifoldLiquid);

    // 4 Vessels with Different Geometries:
    // Vessel 1: Straight Cylinder (x = -0.9)
    // Vessel 2: Conical Expanding (x = -0.3)
    // Vessel 3: Stepped Bulbs (x = 0.3)
    // Vessel 4: Conical Narrowing / Slanted (x = 0.9)
    const vesselXPositions = [-0.9, -0.3, 0.3, 0.9];

    // Vessel 1 (Cylindrical)
    const v1GlassGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.8, 24, 1, true);
    const v1Glass = new THREE.Mesh(v1GlassGeo, manifoldGlassMat);
    v1Glass.position.set(vesselXPositions[0], 1.08, 0);
    vesselsGroup.add(v1Glass);

    const v1LiquidGeo = new THREE.CylinderGeometry(0.13, 0.13, 1, 24);
    const v1Liquid = new THREE.Mesh(v1LiquidGeo, manifoldLiquidMat);
    v1Liquid.name = 'v1Liquid';
    v1Liquid.position.set(vesselXPositions[0], 0.68, 0);
    vesselsGroup.add(v1Liquid);

    // Vessel 2 (Conical Expanding upward)
    const v2GlassGeo = new THREE.CylinderGeometry(0.24, 0.10, 1.8, 24, 1, true);
    const v2Glass = new THREE.Mesh(v2GlassGeo, manifoldGlassMat);
    v2Glass.position.set(vesselXPositions[1], 1.08, 0);
    vesselsGroup.add(v2Glass);

    const v2LiquidGeo = new THREE.CylinderGeometry(0.23, 0.09, 1, 24);
    const v2Liquid = new THREE.Mesh(v2LiquidGeo, manifoldLiquidMat);
    v2Liquid.name = 'v2Liquid';
    v2Liquid.position.set(vesselXPositions[1], 0.68, 0);
    vesselsGroup.add(v2Liquid);

    // Vessel 3 (Stepped Double Cylinder)
    const v3GlassGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.8, 24, 1, true);
    const v3Glass = new THREE.Mesh(v3GlassGeo, manifoldGlassMat);
    v3Glass.position.set(vesselXPositions[2], 1.08, 0);
    vesselsGroup.add(v3Glass);

    const v3LiquidGeo = new THREE.CylinderGeometry(0.21, 0.21, 1, 24);
    const v3Liquid = new THREE.Mesh(v3LiquidGeo, manifoldLiquidMat);
    v3Liquid.name = 'v3Liquid';
    v3Liquid.position.set(vesselXPositions[2], 0.68, 0);
    vesselsGroup.add(v3Liquid);

    // Vessel 4 (Conical Inverted / Narrow)
    const v4GlassGeo = new THREE.CylinderGeometry(0.10, 0.22, 1.8, 24, 1, true);
    const v4Glass = new THREE.Mesh(v4GlassGeo, manifoldGlassMat);
    v4Glass.position.set(vesselXPositions[3], 1.08, 0);
    vesselsGroup.add(v4Glass);

    const v4LiquidGeo = new THREE.CylinderGeometry(0.09, 0.21, 1, 24);
    const v4Liquid = new THREE.Mesh(v4LiquidGeo, manifoldLiquidMat);
    v4Liquid.name = 'v4Liquid';
    v4Liquid.position.set(vesselXPositions[3], 0.68, 0);
    vesselsGroup.add(v4Liquid);

    // Equipotential Liquid Surface Line (Showing h_A = h_B = h_C = h_D)
    const eqLineGeo = new THREE.CylinderGeometry(0.008, 0.008, 2.4, 8);
    const eqLineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eqLine = new THREE.Mesh(eqLineGeo, eqLineMat);
    eqLine.name = 'eqLine';
    eqLine.rotation.z = Math.PI / 2;
    eqLine.position.set(0, 1.38, 0);
    vesselsGroup.add(eqLine);

    // Movable Pressure Sensor Probe inside Vessel 1
    const probeGrp = new THREE.Group();
    probeGrp.name = 'probeGroup';
    const pSphereGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const pSphereMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const pSphere = new THREE.Mesh(pSphereGeo, pSphereMat);
    const pRodGeo = new THREE.CylinderGeometry(0.01, 0.01, 2.0, 16);
    const pRodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const pRod = new THREE.Mesh(pRodGeo, pRodMat);
    pRod.position.y = 1.0;
    probeGrp.add(pSphere);
    probeGrp.add(pRod);
    probeGrp.position.set(vesselXPositions[0], 0.6, 0);
    vesselsGroup.add(probeGrp);
    probeMeshRef.current = probeGrp;

    // ==========================================
    // 2. U-TUBE GROUP (LÍQUIDOS IMISCÍVEIS)
    // ==========================================
    const uTubeGroup = new THREE.Group();
    uTubeGroup.name = 'uTubeGroup';
    scene.add(uTubeGroup);
    uTubeGroupRef.current = uTubeGroup;

    // U-Tube Base Stand
    const uStandGeo = new THREE.BoxGeometry(1.6, 0.1, 0.6);
    const uStand = new THREE.Mesh(uStandGeo, standMat);
    uStand.position.y = 0.05;
    uStand.receiveShadow = true;
    uTubeGroup.add(uStand);

    // Glass U-Tube Left Arm (x = -0.4), Right Arm (x = 0.4), Bottom Connector
    const leftArmGlassGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 24, 1, true);
    const leftArmGlass = new THREE.Mesh(leftArmGlassGeo, manifoldGlassMat);
    leftArmGlass.position.set(-0.4, 1.15, 0);
    uTubeGroup.add(leftArmGlass);

    const rightArmGlassGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 24, 1, true);
    const rightArmGlass = new THREE.Mesh(rightArmGlassGeo, manifoldGlassMat);
    rightArmGlass.position.set(0.4, 1.15, 0);
    uTubeGroup.add(rightArmGlass);

    const uBottomGlassGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 24);
    const uBottomGlass = new THREE.Mesh(uBottomGlassGeo, manifoldGlassMat);
    uBottomGlass.rotation.z = Math.PI / 2;
    uBottomGlass.position.set(0, 0.21, 0);
    uTubeGroup.add(uBottomGlass);

    // Liquid 1 (Left + Bottom Interface)
    const uLiq1BottomGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.8, 24);
    const uLiq1BottomMat = new THREE.MeshStandardMaterial({
      color: FLUID_PROPERTIES.water.color,
      transparent: true,
      opacity: 0.8,
    });
    const uLiq1Bottom = new THREE.Mesh(uLiq1BottomGeo, uLiq1BottomMat);
    uLiq1Bottom.name = 'uLiq1Bottom';
    uLiq1Bottom.rotation.z = Math.PI / 2;
    uLiq1Bottom.position.set(0, 0.21, 0);
    uTubeGroup.add(uLiq1Bottom);

    const uLiq1LeftGeo = new THREE.CylinderGeometry(0.11, 0.11, 1, 24);
    const uLiq1Left = new THREE.Mesh(uLiq1LeftGeo, uLiq1BottomMat);
    uLiq1Left.name = 'uLiq1Left';
    uLiq1Left.position.set(-0.4, 0.7, 0);
    uTubeGroup.add(uLiq1Left);

    // Liquid 2 (Right Column above interface)
    const uLiq2Mat = new THREE.MeshStandardMaterial({
      color: FLUID_PROPERTIES.oil.color,
      transparent: true,
      opacity: 0.8,
    });
    const uLiq2RightGeo = new THREE.CylinderGeometry(0.11, 0.11, 1, 24);
    const uLiq2Right = new THREE.Mesh(uLiq2RightGeo, uLiq2Mat);
    uLiq2Right.name = 'uLiq2Right';
    uLiq2Right.position.set(0.4, 0.7, 0);
    uTubeGroup.add(uLiq2Right);

    // Interface marker line (Horizontal dashed reference)
    const interfaceLineGeo = new THREE.CylinderGeometry(0.006, 0.006, 1.2, 8);
    const interfaceLineMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const interfaceLine = new THREE.Mesh(interfaceLineGeo, interfaceLineMat);
    interfaceLine.name = 'interfaceLine';
    interfaceLine.rotation.z = Math.PI / 2;
    interfaceLine.position.set(0, 0.5, 0);
    uTubeGroup.add(interfaceLine);

    // Ruler along arm
    for (let y = 0.2; y <= 2.0; y += 0.2) {
      const markGeo = new THREE.BoxGeometry(0.04, 0.005, 0.01);
      const markMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const markL = new THREE.Mesh(markGeo, markMat);
      markL.position.set(-0.55, y, 0);
      uTubeGroup.add(markL);

      const markR = new THREE.Mesh(markGeo, markMat);
      markR.position.set(0.55, y, 0);
      uTubeGroup.add(markR);
    }

    // Camera Orbit Mouse / Touch Handlers
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
      cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(2.0, Math.min(8.0, cameraAngleRef.current.radius + e.deltaY * 0.003));
    };

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
      cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 0.9;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0.9, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, []);

  // Update dynamic meshes on state/mode changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const vesselsGroup = scene.getObjectByName('vesselsGroup');
    const uTubeGroup = scene.getObjectByName('uTubeGroup');

    if (vesselsGroup) vesselsGroup.visible = mode === 'communicating_vessels';
    if (uTubeGroup) uTubeGroup.visible = mode === 'u_tube';

    if (mode === 'communicating_vessels' && vesselsGroup) {
      const clampedH = Math.max(0.2, Math.min(1.6, vesselLiquidHeight));
      const liquidY = 0.18 + clampedH / 2;

      // Update color
      const color = FLUID_PROPERTIES[vesselFluid].color;
      ['manifoldLiquid', 'v1Liquid', 'v2Liquid', 'v3Liquid', 'v4Liquid'].forEach((name) => {
        const mesh = vesselsGroup.getObjectByName(name) as THREE.Mesh;
        if (mesh) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
        }
      });

      // Update liquid columns height
      ['v1Liquid', 'v2Liquid', 'v3Liquid', 'v4Liquid'].forEach((name) => {
        const mesh = vesselsGroup.getObjectByName(name) as THREE.Mesh;
        if (mesh) {
          mesh.scale.set(1, clampedH, 1);
          mesh.position.y = liquidY;
        }
      });

      // Equipotential surface line at top of liquid
      const eqLine = vesselsGroup.getObjectByName('eqLine') as THREE.Mesh;
      if (eqLine) {
        eqLine.position.y = 0.18 + clampedH;
      }

      // Sensor probe position at depth probeDepth
      if (probeMeshRef.current) {
        const probeY = Math.max(0.22, 0.18 + clampedH - probeDepth);
        probeMeshRef.current.position.y = probeY;
      }
    } else if (mode === 'u_tube' && uTubeGroup) {
      const col1Color = FLUID_PROPERTIES[uTubeLiquid1].color;
      const col2Color = FLUID_PROPERTIES[uTubeLiquid2].color;

      const uLiq1Bottom = uTubeGroup.getObjectByName('uLiq1Bottom') as THREE.Mesh;
      const uLiq1Left = uTubeGroup.getObjectByName('uLiq1Left') as THREE.Mesh;
      const uLiq2Right = uTubeGroup.getObjectByName('uLiq2Right') as THREE.Mesh;

      if (uLiq1Bottom) (uLiq1Bottom.material as THREE.MeshStandardMaterial).color.setHex(col1Color);
      if (uLiq1Left) (uLiq1Left.material as THREE.MeshStandardMaterial).color.setHex(col1Color);
      if (uLiq2Right) (uLiq2Right.material as THREE.MeshStandardMaterial).color.setHex(col2Color);

      // Heights representation: Interface at y = 0.5
      // Left liquid column height = h1 * 4 (visual scaling)
      // Right liquid column height = h2 * 4
      const visualH1 = Math.max(0.1, Math.min(1.4, uTubeState.h1 * 5));
      const visualH2 = Math.max(0.1, Math.min(1.4, uTubeState.h2 * 5));

      if (uLiq1Left) {
        uLiq1Left.scale.set(1, visualH1 + 0.3, 1);
        uLiq1Left.position.y = 0.2 + (visualH1 + 0.3) / 2;
      }

      if (uLiq2Right) {
        uLiq2Right.scale.set(1, visualH2, 1);
        uLiq2Right.position.y = 0.5 + visualH2 / 2;
      }

      const interfaceLine = uTubeGroup.getObjectByName('interfaceLine') as THREE.Mesh;
      if (interfaceLine) {
        interfaceLine.position.y = 0.5;
      }
    }
  }, [mode, vesselLiquidHeight, vesselFluid, probeDepth, uTubeState, uTubeLiquid1, uTubeLiquid2]);

  // Chart series
  const chartSeries: ChartSeries[] = useMemo(() => {
    if (mode === 'communicating_vessels') {
      return [
        { key: 'deltaP_KPa', label: 'Pressão Hidrostática ΔP (kPa)', color: '#0ea5e9', unit: 'kPa' },
        { key: 'depthM', label: 'Profundidade h (m)', color: '#10b981', unit: 'm' },
      ];
    } else {
      return [
        { key: 'h1Cm', label: 'Coluna Líquido 1 (cm)', color: '#0ea5e9', unit: 'cm' },
        { key: 'h2Cm', label: 'Coluna Líquido 2 (cm)', color: '#eab308', unit: 'cm' },
      ];
    }
  }, [mode]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
      {/* 3D Viewport */}
      <div className="flex-1 relative flex flex-col min-h-[360px] md:min-h-0">
        <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing outline-none" />

        {/* Floating Top Badge with Camera Reset */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {mode === 'communicating_vessels' ? 'Vasos Comunicantes & Paradoxo de Stevin' : 'Tubo em U & Líquidos Imiscíveis'}
            </span>
          </div>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Redefinir Câmera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live HUD Cards over 3D Scene */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-[250px]">
          {mode === 'communicating_vessels' ? (
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-sm">
              <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold mb-1">Pressão na Sonda</div>
              <div className="text-xl font-bold font-mono text-white">
                {(stevinState.deltaP / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400">kPa</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Pressão Absoluta:</span>
                <span className="font-mono text-emerald-400">{(stevinState.pAbs / 1000).toFixed(1)} kPa</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Em Atmosferas:</span>
                <span className="font-mono text-cyan-300">{stevinState.pAbsAtm.toFixed(2)} atm</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Profundidade:</span>
                <span className="font-mono text-amber-400">{probeDepth.toFixed(2)} m</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-sm">
              <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold mb-1">Equilíbrio Hidrostático</div>
              <div className="text-xl font-bold font-mono text-white">
                ρ₁·h₁ = ρ₂·h₂
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Coluna Líquido 1:</span>
                <span className="font-mono text-cyan-400">{(uTubeState.h1 * 100).toFixed(1)} cm</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Coluna Líquido 2:</span>
                <span className="font-mono text-amber-400">{(uTubeState.h2 * 100).toFixed(1)} cm</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Razão de Alturas:</span>
                <span className="font-mono text-emerald-400">{(uTubeState.h2 / uTubeState.h1).toFixed(2)}x</span>
              </div>
            </div>
          )}
        </div>

        {/* Playback Control Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80">
          <PlaybackBar
            clock={clock}
            onTogglePlay={() => setClock((p) => ({ ...p, isRunning: !p.isRunning }))}
            onReset={() => setDataBuffer([])}
            onStepForward={() => setClock((p) => ({ ...p, time: p.time + 0.05 }))}
            onChangeSpeed={(s: number) => setClock((p) => ({ ...p, speed: s }))}
            onToggleVectors={() => setClock((p) => ({ ...p, showVectors: !p.showVectors }))}
            onToggleTrajectories={() => setClock((p) => ({ ...p, showTrajectories: !p.showTrajectories }))}
            onToggleFormulas={() => setClock((p) => ({ ...p, showFormulas: !p.showFormulas }))}
            onToggle2DView={() => setClock((p) => ({ ...p, is2DView: !p.is2DView }))}
            onResetCamera={handleResetCamera}
          />
        </div>
      </div>


      {/* Side Panel Tabs */}
      <div className="w-full md:w-96 lg:w-[420px] bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 z-20">
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveSideTab('controls')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'controls' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parâmetros</span>
          </button>
          <button
            onClick={() => setActiveSideTab('graphs')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'graphs' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Gráficos em Tempo Real</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs">
          {activeSideTab === 'controls' ? (
            <>
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="stevin_theorem"
                onApplyPreset={applyPreset}
                currentParams={{
                  mode,
                  vesselFluid,
                  vesselLiquidHeight,
                  probeDepth,
                  uTubeLiquid1,
                  uTubeLiquid2,
                  uTubeH1,
                }}
              />

              {/* Mode Selector */}
              <div>
                <label className="text-slate-400 font-semibold mb-2 block uppercase text-[10px] tracking-wider font-mono">
                  Configuração Experimental
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('communicating_vessels')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      mode === 'communicating_vessels'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0 text-cyan-400" />
                    <div>
                      <div className="text-[11px]">Vasos Comunicantes</div>
                      <div className="text-[9px] text-slate-400">h_A = h_B = h_C</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('u_tube')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      mode === 'u_tube'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Compass className="w-4 h-4 shrink-0 text-amber-400" />
                    <div>
                      <div className="text-[11px]">Tubo em U</div>
                      <div className="text-[9px] text-slate-400">Líquidos Imiscíveis</div>
                    </div>
                  </button>
                </div>
              </div>

              {mode === 'communicating_vessels' ? (
                <>
                  {/* Fluid Choice */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                      Fluido nos Vasos
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(FLUID_PROPERTIES) as FluidChoice[]).map((fKey) => {
                        const info = FLUID_PROPERTIES[fKey];
                        const isSelected = vesselFluid === fKey;
                        return (
                          <button
                            key={fKey}
                            onClick={() => setVesselFluid(fKey)}
                            className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-medium'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="font-semibold text-[11px] truncate">{info.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{info.density} kg/m³</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level and Depth Sliders */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                    <div>
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-slate-400">Nível do Líquido (h_total):</span>
                        <span className="font-mono text-cyan-400 font-bold">{vesselLiquidHeight.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="1.6"
                        step="0.05"
                        value={vesselLiquidHeight}
                        onChange={(e) => setVesselLiquidHeight(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-slate-400">Profundidade da Sonda (h):</span>
                        <span className="font-mono text-amber-400 font-bold">{probeDepth.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max={Math.max(0.2, vesselLiquidHeight)}
                        step="0.05"
                        value={probeDepth}
                        onChange={(e) => setProbeDepth(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* U-Tube Liquids */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                      Líquido 1 (Coluna Esquerda)
                    </label>
                    <select
                      value={uTubeLiquid1}
                      onChange={(e) => setUTubeLiquid1(e.target.value as FluidChoice)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      {(Object.keys(FLUID_PROPERTIES) as FluidChoice[]).map((k) => (
                        <option key={k} value={k}>
                          {FLUID_PROPERTIES[k].name} ({FLUID_PROPERTIES[k].density} kg/m³)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                      Líquido 2 (Coluna Direita, Imiscível)
                    </label>
                    <select
                      value={uTubeLiquid2}
                      onChange={(e) => setUTubeLiquid2(e.target.value as FluidChoice)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      {(Object.keys(FLUID_PROPERTIES) as FluidChoice[]).map((k) => (
                        <option key={k} value={k}>
                          {FLUID_PROPERTIES[k].name} ({FLUID_PROPERTIES[k].density} kg/m³)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Height of Liquid 1 */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Altura Coluna 1 (h₁):</span>
                      <span className="font-mono text-cyan-400 font-bold">{(uTubeH1 * 100).toFixed(1)} cm</span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.25"
                      step="0.01"
                      value={uTubeH1}
                      onChange={(e) => setUTubeH1(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Altura Resultante (h₂):</span>
                      <span className="font-mono text-amber-400 font-bold">{(uTubeState.h2 * 100).toFixed(1)} cm</span>
                    </div>
                  </div>
                </>
              )}

              {/* Gravity Environment */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Gravidade (g)</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Terra', val: 9.8 },
                    { label: 'Lua', val: 1.62 },
                    { label: 'Júpiter', val: 24.8 },
                  ].map((gPreset) => (
                    <button
                      key={gPreset.label}
                      onClick={() => setGravity(gPreset.val)}
                      className={`p-1.5 rounded text-center border cursor-pointer ${
                        gravity === gPreset.val
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {gPreset.label} ({gPreset.val})
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulations */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Formulação de Stevin</span>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <KaTeXMath math="\Delta P = \rho \cdot g \cdot \Delta h" />
                  <KaTeXMath math="P_{\text{abs}} = P_{\text{atm}} + \rho g h" />
                  <KaTeXMath math="\rho_1 h_1 = \rho_2 h_2 \quad (\text{Tubo em U})" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Charts */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    {mode === 'communicating_vessels' ? 'Pressão vs Profundidade' : 'Colunas de Líquidos no Tubo em U'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{dataBuffer.length} amostras</span>
                </div>

                <div className="h-64 w-full bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title={mode === 'communicating_vessels' ? 'P(h) = P_atm + ρ g h' : 'ρ₁ h₁ = ρ₂ h₂'}
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-2">
                  <span className="font-bold text-slate-200">Paradoxo Hidrostático:</span>
                  <p>
                    Embora os recipientes contenham volumes e massas de líquido totalmente distintas devido às suas formas
                    cônicas, cilíndricas ou escalonadas, a pressão no fundo depende exclusivamente da altura da coluna{' '}
                    <KaTeXMath math="\Delta P = \rho g h" />, mantendo a mesma linha horizontal equipotencial.
                  </p>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

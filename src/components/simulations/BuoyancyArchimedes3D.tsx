import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateBuoyancyState, BuoyancyState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Scale, LifeBuoy, ArrowDown, ArrowUp } from 'lucide-react';

interface BuoyancyArchimedes3DProps {
  onOpenExperiment?: () => void;
}

type BodyMaterialChoice = 'wood' | 'ice' | 'aluminum' | 'iron' | 'gold' | 'custom';
type FluidChoice = 'water' | 'salt_water' | 'oil' | 'glycerin';

const BODY_PRESETS: Record<BodyMaterialChoice, { name: string; density: number; color: number; roughness: number; metalness: number }> = {
  wood: { name: 'Madeira (Flutua)', density: 650, color: 0xd97706, roughness: 0.8, metalness: 0.05 },
  ice: { name: 'Gelo Polar (90% Submerso)', density: 917, color: 0xbae6fd, roughness: 0.1, metalness: 0.1 },
  aluminum: { name: 'Alumínio (Afunda)', density: 2700, color: 0xd0d5dd, roughness: 0.35, metalness: 0.8 },
  iron: { name: 'Ferro (Afunda)', density: 7870, color: 0x475467, roughness: 0.5, metalness: 0.7 },
  gold: { name: 'Ouro (Muito Denso)', density: 19300, color: 0xf59e0b, roughness: 0.25, metalness: 0.9 },
  custom: { name: 'Personalizado', density: 1000, color: 0x38bdf8, roughness: 0.4, metalness: 0.4 },
};

const FLUID_PRESETS: Record<FluidChoice, { name: string; density: number; color: number; opacity: number }> = {
  water: { name: 'Água Doce', density: 1000, color: 0x0284c7, opacity: 0.7 },
  salt_water: { name: 'Água do Mar', density: 1030, color: 0x0369a1, opacity: 0.75 },
  oil: { name: 'Óleo Mineral', density: 850, color: 0xeab308, opacity: 0.78 },
  glycerin: { name: 'Glicerina', density: 1260, color: 0xa855f7, opacity: 0.8 },
};

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface BuoyancyArchimedes3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const BuoyancyArchimedes3D: React.FC<BuoyancyArchimedes3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Parameters
  const [bodyMaterial, setBodyMaterial] = useState<BodyMaterialChoice>(
    () => (initialParams?.bodyMaterial as BodyMaterialChoice) || 'aluminum'
  );
  const [customBodyDensity, setCustomBodyDensity] = useState<number>(1000);
  const [bodyVolumeLiters, setBodyVolumeLiters] = useState<number>(
    () => (initialParams?.bodyVolumeLiters != null ? Number(initialParams.bodyVolumeLiters) : 2.0)
  );
  const [fluidType, setFluidType] = useState<FluidChoice>(
    () => (initialParams?.fluidType as FluidChoice) || 'water'
  );
  const [gravity, setGravity] = useState<number>(9.8);
  const [mode, setMode] = useState<'free_floating' | 'forced_immersion'>(
    () => (initialParams?.mode as 'free_floating' | 'forced_immersion') || 'forced_immersion'
  );
  const [immersionPercentage, setImmersionPercentage] = useState<number>(
    () => (initialParams?.immersionPercentage != null ? Number(initialParams.immersionPercentage) : 100)
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.bodyMaterial !== undefined) setBodyMaterial(p.bodyMaterial);
    if (p.bodyVolumeLiters !== undefined) setBodyVolumeLiters(Number(p.bodyVolumeLiters));
    if (p.fluidType !== undefined) setFluidType(p.fluidType);
    if (p.mode !== undefined) setMode(p.mode);
    if (p.immersionPercentage !== undefined) setImmersionPercentage(Number(p.immersionPercentage));
  }, []);

  useEffect(() => {
    onParamsChange?.({ bodyMaterial, bodyVolumeLiters, fluidType, mode, immersionPercentage });
  }, [bodyMaterial, bodyVolumeLiters, fluidType, mode, immersionPercentage, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.bodyMaterial !== undefined) setBodyMaterial(initialParams.bodyMaterial);
      if (initialParams.bodyVolumeLiters !== undefined) setBodyVolumeLiters(Number(initialParams.bodyVolumeLiters));
      if (initialParams.fluidType !== undefined) setFluidType(initialParams.fluidType);
      if (initialParams.mode !== undefined) setMode(initialParams.mode);
      if (initialParams.immersionPercentage !== undefined) setImmersionPercentage(Number(initialParams.immersionPercentage));
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

  // Body density and mass calculation
  const currentBodyDensity = bodyMaterial === 'custom' ? customBodyDensity : BODY_PRESETS[bodyMaterial].density;
  const bodyVolumeM3 = bodyVolumeLiters / 1000.0;
  const bodyMassKg = currentBodyDensity * bodyVolumeM3;
  const fluidDensityKgM3 = FLUID_PRESETS[fluidType].density;

  // Derived Physical State
  const state: BuoyancyState = useMemo(() => {
    const manualFraction = mode === 'forced_immersion' ? immersionPercentage / 100.0 : undefined;
    return calculateBuoyancyState(bodyMassKg, bodyVolumeM3, fluidDensityKgM3, gravity, manualFraction);
  }, [bodyMassKg, bodyVolumeM3, fluidDensityKgM3, gravity, mode, immersionPercentage]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Object refs
  const bodyMeshRef = useRef<THREE.Mesh | null>(null);
  const dynamometerSpringRef = useRef<THREE.Mesh | null>(null);
  const suspensionWireRef = useRef<THREE.Line | null>(null);
  const overflowFluidMeshRef = useRef<THREE.Mesh | null>(null);
  const arrowWeightRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowBuoyancyRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowTensionRef = useRef<THREE.ArrowHelper | null>(null);

  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.5,
    phi: 0.7,
    radius: 4.6,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.5, phi: 0.7, radius: 4.6 };
  }, []);

  // Telemetry buffer for charts
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number((now % 100000 / 1000).toFixed(2)),
        buoyantForceN: state.buoyantForce,
        apparentWeightN: state.apparentWeight,
        displacedWeightN: state.displacedWeight,
        submergedPercent: state.submergedFraction * 100,
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, state]);

  // Setup Three.js Scene
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

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Base Stand for Eureka Can & Scale
    const standGeo = new THREE.BoxGeometry(3.2, 0.1, 1.2);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(0, 0.05, 0);
    stand.receiveShadow = true;
    scene.add(stand);

    // ==========================================
    // 1. EUREKA TANK (BÉQUER LADRÃO COM BICO ESCOADOR)
    // ==========================================
    const tankGroup = new THREE.Group();
    tankGroup.position.set(-0.4, 0.1, 0);
    scene.add(tankGroup);

    // Main Transparent Glass Cylinder
    const tankGlassGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.4, 32, 1, true);
    const tankGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      depthWrite: false,
    });
    const tankGlass = new THREE.Mesh(tankGlassGeo, tankGlassMat);
    tankGlass.position.y = 0.7;
    tankGroup.add(tankGlass);

    // Tank Base
    const tankBaseGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.05, 32);
    const tankBase = new THREE.Mesh(tankBaseGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
    tankBase.position.y = 0.025;
    tankGroup.add(tankBase);

    // Main Tank Fluid (filled to spout at y = 1.1)
    const tankFluidGeo = new THREE.CylinderGeometry(0.53, 0.53, 1.05, 32);
    const tankFluidMat = new THREE.MeshStandardMaterial({
      color: FLUID_PRESETS.water.color,
      transparent: true,
      opacity: FLUID_PRESETS.water.opacity,
    });
    const tankFluid = new THREE.Mesh(tankFluidGeo, tankFluidMat);
    tankFluid.name = 'tankFluid';
    tankFluid.position.y = 0.55;
    tankGroup.add(tankFluid);

    // Overflow Spout (Angled downward towards collection beaker)
    const spoutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 16);
    const spout = new THREE.Mesh(spoutGeo, tankGlassMat);
    spout.rotation.z = -Math.PI / 4;
    spout.position.set(0.68, 1.0, 0);
    tankGroup.add(spout);

    // ==========================================
    // 2. COLLECTION BEAKER & DIGITAL SCALE
    // ==========================================
    const scaleGroup = new THREE.Group();
    scaleGroup.position.set(0.9, 0.1, 0);
    scene.add(scaleGroup);

    // Digital Scale Platform
    const scaleBodyGeo = new THREE.BoxGeometry(0.7, 0.08, 0.7);
    const scaleBodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.3 });
    const scaleBody = new THREE.Mesh(scaleBodyGeo, scaleBodyMat);
    scaleBody.position.y = 0.04;
    scaleGroup.add(scaleBody);

    const scalePlateGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32);
    const scalePlateMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const scalePlate = new THREE.Mesh(scalePlateGeo, scalePlateMat);
    scalePlate.position.y = 0.095;
    scaleGroup.add(scalePlate);

    // Collection Beaker
    const beakerGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.7, 24, 1, true);
    const beaker = new THREE.Mesh(beakerGeo, tankGlassMat);
    beaker.position.y = 0.46;
    scaleGroup.add(beaker);

    // Fluid Extravasated in Collection Beaker
    const overflowFluidGeo = new THREE.CylinderGeometry(0.22, 0.22, 1, 24);
    const overflowFluid = new THREE.Mesh(overflowFluidGeo, tankFluidMat);
    overflowFluid.position.y = 0.11;
    overflowFluid.scale.set(1, 0.05, 1);
    scaleGroup.add(overflowFluid);
    overflowFluidMeshRef.current = overflowFluid;

    // ==========================================
    // 3. LABORATORY STAND & DYNAMOMETER
    // ==========================================
    const standRigGroup = new THREE.Group();
    standRigGroup.position.set(-0.4, 0.1, 0);
    scene.add(standRigGroup);

    // Vertical Steel Rod
    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.8, 16);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });
    const vertRod = new THREE.Mesh(rodGeo, rodMat);
    vertRod.position.set(-0.65, 1.4, 0);
    standRigGroup.add(vertRod);

    // Horizontal Support Arm
    const armGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.75, 16);
    const horizArm = new THREE.Mesh(armGeo, rodMat);
    horizArm.rotation.z = Math.PI / 2;
    horizArm.position.set(-0.3, 2.7, 0);
    standRigGroup.add(horizArm);

    // Dynamometer Cylinder Body
    const dynoBodyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 24);
    const dynoBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const dynoBody = new THREE.Mesh(dynoBodyGeo, dynoBodyMat);
    dynoBody.position.set(0, 2.3, 0);
    standRigGroup.add(dynoBody);

    // Dynamometer Internal Spring / Slider
    const dynoSpringGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 16);
    const dynoSpringMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8, roughness: 0.2 });
    const dynoSpring = new THREE.Mesh(dynoSpringGeo, dynoSpringMat);
    dynoSpring.position.set(0, 1.95, 0);
    standRigGroup.add(dynoSpring);
    dynamometerSpringRef.current = dynoSpring;

    // Suspension Wire down to Test Body
    const wirePoints = [new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(0, 0.9, 0)];
    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    const wire = new THREE.Line(wireGeo, wireMat);
    standRigGroup.add(wire);
    suspensionWireRef.current = wire;

    // ==========================================
    // 4. TEST BODY (IMMERSIBLE CYLINDER/BLOCK)
    // ==========================================
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.45, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: BODY_PRESETS[bodyMaterial].color,
      roughness: BODY_PRESETS[bodyMaterial].roughness,
      metalness: BODY_PRESETS[bodyMaterial].metalness,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.set(0, 0.9, 0);
    standRigGroup.add(bodyMesh);
    bodyMeshRef.current = bodyMesh;

    // Vectors
    const arrowW = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0.9, 0), 0.6, 0xef4444, 0.12, 0.08);
    const arrowE = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.9, 0), 0.5, 0x0ea5e9, 0.12, 0.08);
    const arrowT = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.15, 0), 0.4, 0x10b981, 0.1, 0.06);
    standRigGroup.add(arrowW);
    standRigGroup.add(arrowE);
    standRigGroup.add(arrowT);
    arrowWeightRef.current = arrowW;
    arrowBuoyancyRef.current = arrowE;
    arrowTensionRef.current = arrowT;

    // Orbit Camera Controls
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
      cameraAngleRef.current.radius = Math.max(2.2, Math.min(8.0, cameraAngleRef.current.radius + e.deltaY * 0.003));
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
      camera.position.y = radius * Math.cos(phi) + 1.1;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0.1, 1.0, 0);

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

  // Update dynamic elements when state or parameters change
  useEffect(() => {
    if (!bodyMeshRef.current || !sceneRef.current) return;

    // Update material
    const bConfig = BODY_PRESETS[bodyMaterial];
    const bMat = bodyMeshRef.current.material as THREE.MeshStandardMaterial;
    bMat.color.setHex(bConfig.color);
    bMat.roughness = bConfig.roughness;
    bMat.metalness = bConfig.metalness;

    // Body Y position:
    // Water surface is at y = 1.07
    // Submerged height of body = state.submergedFraction * 0.45
    // Top of body = 1.07 + (1 - submergedFraction) * 0.45
    // Center of body = Top - 0.225
    const bodyHeight = 0.45;
    const submergedH = state.submergedFraction * bodyHeight;
    const bodyTop = 1.07 + (bodyHeight - submergedH);
    const bodyY = bodyTop - bodyHeight / 2;
    bodyMeshRef.current.position.y = bodyY;

    // Update wire down to top of body
    if (suspensionWireRef.current) {
      const positions = new Float32Array([0, 1.8, 0, 0, bodyTop, 0]);
      suspensionWireRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }

    // Overflow beaker liquid level (grows as fluid is displaced)
    if (overflowFluidMeshRef.current) {
      const overflowRatio = Math.max(0.04, Math.min(0.6, state.submergedFraction * 0.5));
      overflowFluidMeshRef.current.scale.set(1, overflowRatio, 1);
      overflowFluidMeshRef.current.position.y = 0.11 + overflowRatio / 2;
    }

    // Update force arrows
    if (arrowWeightRef.current && arrowBuoyancyRef.current && arrowTensionRef.current) {
      const scaleN = 0.015; // 100 N -> 1.5 m
      const lenW = Math.max(0.2, Math.min(1.2, state.trueWeight * scaleN));
      arrowWeightRef.current.position.set(0, bodyY, 0);
      arrowWeightRef.current.setLength(lenW, lenW * 0.25, lenW * 0.15);
      arrowWeightRef.current.visible = clock.showVectors;

      const lenE = Math.max(0.01, Math.min(1.2, state.buoyantForce * scaleN));
      arrowBuoyancyRef.current.position.set(0, bodyY, 0);
      arrowBuoyancyRef.current.setLength(lenE, lenE * 0.25, lenE * 0.15);
      arrowBuoyancyRef.current.visible = clock.showVectors && state.buoyantForce > 0.1;

      const lenT = Math.max(0.01, Math.min(1.2, state.apparentWeight * scaleN));
      arrowTensionRef.current.position.set(0, bodyTop, 0);
      arrowTensionRef.current.setLength(lenT, lenT * 0.25, lenT * 0.15);
      arrowTensionRef.current.visible = clock.showVectors && state.apparentWeight > 0.1;
    }
  }, [bodyMaterial, state, clock.showVectors]);

  // Chart Series
  const chartSeries: ChartSeries[] = useMemo(() => [
    { key: 'buoyantForceN', label: 'Empuxo E = ρ·V_sub·g (N)', color: '#0ea5e9', unit: 'N' },
    { key: 'apparentWeightN', label: 'Peso Aparente P_ap = P - E (N)', color: '#10b981', unit: 'N' },
    { key: 'displacedWeightN', label: 'Peso Fluido Deslocado (N)', color: '#f59e0b', unit: 'N' },
  ], []);

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
              Empuxo & Princípio de Arquimedes
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
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-[260px]">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-sm">
            <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold mb-1">
              Balanço de Forças & Arquimedes
            </div>
            <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
              {state.buoyantForce.toFixed(1)} <span className="text-xs font-normal text-slate-400">N (Empuxo)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Peso Real (P):</span>
              <span className="font-mono text-rose-400 font-semibold">{state.trueWeight.toFixed(1)} N</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Peso Aparente (P_ap):</span>
              <span className="font-mono text-emerald-400 font-semibold">{state.apparentWeight.toFixed(1)} N</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Balança (Água Deslocada):</span>
              <span className="font-mono text-amber-400 font-semibold">{state.displacedWeight.toFixed(1)} N</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Fração Submersa:</span>
              <span className="font-mono text-cyan-300">{(state.submergedFraction * 100).toFixed(1)}%</span>
            </div>
          </div>
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
                moduleId="buoyancy_archimedes"
                onApplyPreset={applyPreset}
                currentParams={{
                  bodyMaterial,
                  bodyVolumeLiters,
                  fluidType,
                  mode,
                  immersionPercentage,
                }}
              />

              {/* Material Preset */}
              <div>
                <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                  Material do Corpo Submerso
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(BODY_PRESETS) as BodyMaterialChoice[]).filter((k) => k !== 'custom').map((matKey) => {
                    const info = BODY_PRESETS[matKey];
                    const isSelected = bodyMaterial === matKey;
                    return (
                      <button
                        key={matKey}
                        onClick={() => setBodyMaterial(matKey)}
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

              {/* Fluid Selector */}
              <div>
                <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                  Fluido do Tanque
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(FLUID_PRESETS) as FluidChoice[]).map((fKey) => {
                    const info = FLUID_PRESETS[fKey];
                    const isSelected = fluidType === fKey;
                    return (
                      <button
                        key={fKey}
                        onClick={() => setFluidType(fKey)}
                        className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-950/80 border-sky-500 text-sky-300 font-medium'
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

              {/* Immersion Mode */}
              <div>
                <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                  Modo de Imersão
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('forced_immersion')}
                    className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                      mode === 'forced_immersion'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Mergulho Guiado (Dinamômetro)
                  </button>
                  <button
                    onClick={() => setMode('free_floating')}
                    className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                      mode === 'free_floating'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Flutuação Livre Estática
                  </button>
                </div>
              </div>

              {/* Immersion Percentage Slider */}
              {mode === 'forced_immersion' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Grau de Submersão:</span>
                    <span className="font-mono text-cyan-400 font-bold">{immersionPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={immersionPercentage}
                    onChange={(e) => setImmersionPercentage(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>0% (Emerso no ar)</span>
                    <span>100% (Totalmente submerso)</span>
                  </div>
                </div>
              )}

              {/* Volume Slider */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Volume Total do Corpo:</span>
                  <span className="font-mono text-emerald-400 font-bold">{bodyVolumeLiters.toFixed(1)} L</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={bodyVolumeLiters}
                  onChange={(e) => setBodyVolumeLiters(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Strict Verification: Archimedes Principle Card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <LifeBuoy className="w-4 h-4" />
                  <span>Princípio de Arquimedes Comprovado</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O empuxo <strong className="text-white">{state.buoyantForce.toFixed(2)} N</strong> é rigorosamente
                  idêntico ao peso do líquido extravasado para a balança:{' '}
                  <strong className="text-amber-400">{state.displacedWeight.toFixed(2)} N</strong> (massa deslocada:{' '}
                  <span className="font-mono">{state.displacedMass.toFixed(3)} kg</span>).
                </p>
              </div>

              {/* Formulas */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Formulação Física</span>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <KaTeXMath math="E = \rho_{\text{fluido}} \cdot V_{\text{sub}} \cdot g" />
                  <KaTeXMath math="P_{\text{aparente}} = P_{\text{real}} - E" />
                  <KaTeXMath math="\frac{V_{\text{sub}}}{V_{\text{total}}} = \frac{\rho_c}{\rho_f} \quad (\text{se } \rho_c < \rho_f)" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Charts */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Empuxo vs Peso Aparente
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{dataBuffer.length} amostras</span>
                </div>

                <div className="h-64 w-full bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title="Balanço de Forças Hidrostáticas"
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-2">
                  <span className="font-bold text-slate-200">Peso Aparente e Flutuação:</span>
                  <p>
                    Quando o corpo está totalmente submerso, a leitura do dinamômetro é dada por{' '}
                    <KaTeXMath math="P_{\text{ap}} = P - E" />. Se a densidade do corpo for menor que a do fluido
                    (<KaTeXMath math="\rho_c < \rho_f" />), o empuxo supera o peso na submersão completa, impulsionando o corpo para a superfície até que{' '}
                    <KaTeXMath math="E = P" /> na flutuação livre.
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

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { calculateDensityAndPressure, DensityPressureState } from '../../physics/math';
import { SimulationClock, DataPoint, ChartSeries, PhysicalQuantity } from '../../types/physics';
import { ScientificChart } from '../common/ScientificChart';
import { KaTeXMath } from '../common/KaTeXMath';
import { PlaybackBar } from '../common/PlaybackBar';
import { Sliders, RotateCcw, Activity, Eye, Box, Droplets, Layers } from 'lucide-react';

interface DensityPressure3DProps {
  onOpenExperiment?: () => void;
}

type ExperimentMode = 'contact_block' | 'fluid_column';
type SolidMaterial = 'aluminum' | 'wood' | 'iron' | 'gold' | 'ice' | 'lead';
type FluidType = 'water' | 'oil' | 'alcohol' | 'glycerin' | 'mercury';

const SOLID_PRESETS: Record<SolidMaterial, { name: string; density: number; color: number; roughness: number; metalness: number }> = {
  aluminum: { name: 'Alumínio', density: 2700, color: 0xd0d5dd, roughness: 0.35, metalness: 0.8 },
  wood: { name: 'Madeira (Pinho)', density: 600, color: 0xc49a45, roughness: 0.85, metalness: 0.05 },
  iron: { name: 'Ferro Fundido', density: 7870, color: 0x475467, roughness: 0.5, metalness: 0.7 },
  gold: { name: 'Ouro Puro', density: 19300, color: 0xf59e0b, roughness: 0.25, metalness: 0.9 },
  ice: { name: 'Gelo Cristalino', density: 917, color: 0xa5f3fc, roughness: 0.1, metalness: 0.1 },
  lead: { name: 'Chumbo', density: 11340, color: 0x334155, roughness: 0.6, metalness: 0.6 },
};

const FLUID_PRESETS: Record<FluidType, { name: string; density: number; color: number; opacity: number }> = {
  water: { name: 'Água Pura', density: 1000, color: 0x0ea5e9, opacity: 0.65 },
  oil: { name: 'Óleo Mineral', density: 800, color: 0xeab308, opacity: 0.75 },
  alcohol: { name: 'Álcool Etílico', density: 789, color: 0x38bdf8, opacity: 0.5 },
  glycerin: { name: 'Glicerina', density: 1260, color: 0xa855f7, opacity: 0.7 },
  mercury: { name: 'Mercúrio Líquido', density: 13600, color: 0x94a3b8, opacity: 0.95 },
};

import { ClassicPresetsBar } from '../common/ClassicPresetsBar';

interface DensityPressure3DProps {
  onOpenExperiment?: () => void;
  initialParams?: Record<string, any>;
  onParamsChange?: (params: Record<string, any>) => void;
}

export const DensityPressure3D: React.FC<DensityPressure3DProps> = ({
  onOpenExperiment,
  initialParams,
  onParamsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Simulation Mode & Active Tab
  const [mode, setMode] = useState<ExperimentMode>(
    () => (initialParams?.mode as ExperimentMode) || 'contact_block'
  );
  const [activeSideTab, setActiveSideTab] = useState<'controls' | 'graphs'>('controls');

  // Solid Block Parameters
  const [solidMaterial, setSolidMaterial] = useState<SolidMaterial>(
    () => (initialParams?.solidMaterial as SolidMaterial) || 'iron'
  );
  const [blockDimL, setBlockDimL] = useState<number>(
    () => (initialParams?.blockDimL != null ? Number(initialParams.blockDimL) : 0.4)
  );
  const [blockDimW, setBlockDimW] = useState<number>(
    () => (initialParams?.blockDimW != null ? Number(initialParams.blockDimW) : 0.2)
  );
  const [blockDimH, setBlockDimH] = useState<number>(
    () => (initialParams?.blockDimH != null ? Number(initialParams.blockDimH) : 0.1)
  );
  const [supportFace, setSupportFace] = useState<'large' | 'medium' | 'small'>(
    () => (initialParams?.supportFace as 'large' | 'medium' | 'small') || 'large'
  );
  const [customMassOverride, setCustomMassOverride] = useState<number>(0);

  // Fluid Column Parameters
  const [fluidType, setFluidType] = useState<FluidType>(
    () => (initialParams?.fluidType as FluidType) || 'water'
  );
  const [fluidDepth, setFluidDepth] = useState<number>(
    () => (initialParams?.fluidDepth != null ? Number(initialParams.fluidDepth) : 1.5)
  );
  const [gravity, setGravity] = useState<number>(9.8);
  const [atmPressure, setAtmPressure] = useState<number>(101325);

  const applyPreset = useCallback((p: Record<string, any>) => {
    if (p.mode !== undefined) setMode(p.mode);
    if (p.solidMaterial !== undefined) setSolidMaterial(p.solidMaterial);
    if (p.supportFace !== undefined) setSupportFace(p.supportFace);
    if (p.blockDimL !== undefined) setBlockDimL(Number(p.blockDimL));
    if (p.blockDimW !== undefined) setBlockDimW(Number(p.blockDimW));
    if (p.blockDimH !== undefined) setBlockDimH(Number(p.blockDimH));
    if (p.fluidType !== undefined) setFluidType(p.fluidType);
    if (p.fluidDepth !== undefined) setFluidDepth(Number(p.fluidDepth));
  }, []);

  useEffect(() => {
    onParamsChange?.({
      mode,
      solidMaterial,
      supportFace,
      blockDimL,
      blockDimW,
      blockDimH,
      fluidType,
      fluidDepth,
    });
  }, [mode, solidMaterial, supportFace, blockDimL, blockDimW, blockDimH, fluidType, fluidDepth, onParamsChange]);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.mode !== undefined) setMode(initialParams.mode);
      if (initialParams.solidMaterial !== undefined) setSolidMaterial(initialParams.solidMaterial);
      if (initialParams.supportFace !== undefined) setSupportFace(initialParams.supportFace);
      if (initialParams.blockDimL !== undefined) setBlockDimL(Number(initialParams.blockDimL));
      if (initialParams.blockDimW !== undefined) setBlockDimW(Number(initialParams.blockDimW));
      if (initialParams.blockDimH !== undefined) setBlockDimH(Number(initialParams.blockDimH));
      if (initialParams.fluidType !== undefined) setFluidType(initialParams.fluidType);
      if (initialParams.fluidDepth !== undefined) setFluidDepth(Number(initialParams.fluidDepth));
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

  // Calculate dimensions and contact area based on chosen face orientation
  const blockDimensions = useMemo(() => {
    // Face choices:
    // 'large' -> L x W (Base), H (height)
    // 'medium' -> L x H (Base), W (height)
    // 'small' -> W x H (Base), L (height)
    let baseDimX = blockDimL;
    let baseDimZ = blockDimW;
    let heightY = blockDimH;

    if (supportFace === 'medium') {
      baseDimX = blockDimL;
      baseDimZ = blockDimH;
      heightY = blockDimW;
    } else if (supportFace === 'small') {
      baseDimX = blockDimW;
      baseDimZ = blockDimH;
      heightY = blockDimL;
    }

    const area = baseDimX * baseDimZ;
    const volume = blockDimL * blockDimW * blockDimH;
    const presetRho = SOLID_PRESETS[solidMaterial].density;
    const mass = customMassOverride > 0 ? customMassOverride : presetRho * volume;

    return {
      baseDimX,
      baseDimZ,
      heightY,
      area,
      volume,
      mass,
    };
  }, [blockDimL, blockDimW, blockDimH, supportFace, solidMaterial, customMassOverride]);

  // Derived Physical State
  const state: DensityPressureState = useMemo(() => {
    const fRho = FLUID_PRESETS[fluidType].density;
    return calculateDensityAndPressure(
      blockDimensions.mass,
      blockDimensions.volume,
      blockDimensions.area,
      fRho,
      fluidDepth,
      gravity,
      atmPressure
    );
  }, [blockDimensions, fluidType, fluidDepth, gravity, atmPressure]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blockMeshRef = useRef<THREE.Mesh | null>(null);
  const pressurePadRef = useRef<THREE.Mesh | null>(null);
  const fluidMeshRef = useRef<THREE.Mesh | null>(null);
  const probeGroupRef = useRef<THREE.Group | null>(null);
  const arrowNormalRef = useRef<THREE.ArrowHelper | null>(null);
  const arrowWeightRef = useRef<THREE.ArrowHelper | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0.6,
    phi: 0.75,
    radius: 3.5,
  });
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleResetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.6, phi: 0.75, radius: 3.5 };
  }, []);

  // Update telemetry for graphs
  useEffect(() => {
    if (!clock.isRunning) return;
    const now = Date.now();
    setDataBuffer((prev) => {
      const nextPoint: DataPoint = {
        t: Number((now % 100000 / 1000).toFixed(2)),
        areaCm2: blockDimensions.area * 10000,
        pressureKPa: state.mechanicalPressureKPa,
        fluidDepthM: fluidDepth,
        hydrostaticKPa: state.hydrostaticPressure / 1000,
      };
      const updated = [...prev, nextPoint];
      return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
    });
  }, [clock.isRunning, blockDimensions.area, state.mechanicalPressureKPa, fluidDepth, state.hydrostaticPressure]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.Fog(0x090d16, 8, 20);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5eb, 2.2);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Soft Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.002;
    scene.add(shadowMesh);

    // --- Mode 1: Block on Ground Mat ---
    const blockGroup = new THREE.Group();
    blockGroup.name = 'blockGroup';
    scene.add(blockGroup);

    // Pressure-Sensitive Mat (Changes color depending on pressure)
    const padGeo = new THREE.BoxGeometry(1.2, 0.04, 1.2);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.1,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.y = 0.02;
    padMesh.receiveShadow = true;
    blockGroup.add(padMesh);
    pressurePadRef.current = padMesh;

    // Contact Grid Lines on Mat
    const matGrid = new THREE.GridHelper(1.2, 12, 0x38bdf8, 0x334155);
    matGrid.position.y = 0.041;
    blockGroup.add(matGrid);

    // 3D Solid Block
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockMat = new THREE.MeshStandardMaterial({
      color: SOLID_PRESETS[solidMaterial].color,
      roughness: SOLID_PRESETS[solidMaterial].roughness,
      metalness: SOLID_PRESETS[solidMaterial].metalness,
    });
    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    blockMesh.castShadow = true;
    blockMesh.receiveShadow = true;
    blockGroup.add(blockMesh);
    blockMeshRef.current = blockMesh;

    // Vectors for Block
    const arrowW = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 0.5, 0xef4444, 0.08, 0.05);
    const arrowN = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.5, 0x10b981, 0.08, 0.05);
    blockGroup.add(arrowW);
    blockGroup.add(arrowN);
    arrowWeightRef.current = arrowW;
    arrowNormalRef.current = arrowN;

    // --- Mode 2: Graduated Fluid Column ---
    const fluidGroup = new THREE.Group();
    fluidGroup.name = 'fluidGroup';
    scene.add(fluidGroup);

    // Glass Tank Base
    const tankBaseGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.08, 32);
    const tankBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.3 });
    const tankBase = new THREE.Mesh(tankBaseGeo, tankBaseMat);
    tankBase.position.y = 0.04;
    tankBase.receiveShadow = true;
    fluidGroup.add(tankBase);

    // Outer Glass Cylinder (Transparent)
    const glassGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.2, 32, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
      depthWrite: false,
    });
    const glassCyl = new THREE.Mesh(glassGeo, glassMat);
    glassCyl.position.y = 1.14;
    fluidGroup.add(glassCyl);

    // Graduated Ruler Rings on Glass
    for (let h = 0.2; h <= 2.0; h += 0.2) {
      const ringGeo = new THREE.RingGeometry(0.595, 0.605, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.04 + h;
      fluidGroup.add(ring);
    }

    // Fluid Body (Dynamic height)
    const fluidGeo = new THREE.CylinderGeometry(0.58, 0.58, 1, 32);
    const fluidMat = new THREE.MeshPhysicalMaterial({
      color: FLUID_PRESETS[fluidType].color,
      transparent: true,
      opacity: FLUID_PRESETS[fluidType].opacity,
      roughness: 0.1,
      metalness: 0.1,
    });
    const fluidMesh = new THREE.Mesh(fluidGeo, fluidMat);
    fluidMesh.position.y = 0.5;
    fluidGroup.add(fluidMesh);
    fluidMeshRef.current = fluidMesh;

    // Submerged Pressure Sensor Probe
    const probeGroup = new THREE.Group();
    const probeHeadGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const probeHeadMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const probeHead = new THREE.Mesh(probeHeadGeo, probeHeadMat);
    const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.4, 16);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.y = 1.2;
    probeGroup.add(probeHead);
    probeGroup.add(rod);
    fluidGroup.add(probeGroup);
    probeGroupRef.current = probeGroup;

    // Orbit Camera Interaction handlers
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
      cameraAngleRef.current.radius = Math.max(1.5, Math.min(7.0, cameraAngleRef.current.radius + e.deltaY * 0.003));
    };

    // Touch Support
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

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Camera Spherical Position
      const { theta, phi, radius } = cameraAngleRef.current;
      const targetY = mode === 'contact_block' ? 0.35 : 0.9;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + targetY * 0.6;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, targetY, 0);

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

  // Update 3D Visuals when state/mode changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const blockGroup = scene.getObjectByName('blockGroup');
    const fluidGroup = scene.getObjectByName('fluidGroup');

    if (blockGroup) blockGroup.visible = mode === 'contact_block';
    if (fluidGroup) fluidGroup.visible = mode === 'fluid_column';

    if (mode === 'contact_block' && blockMeshRef.current) {
      const mesh = blockMeshRef.current;
      const { baseDimX, baseDimZ, heightY } = blockDimensions;
      mesh.scale.set(baseDimX, heightY, baseDimZ);
      mesh.position.set(0, 0.04 + heightY / 2, 0);

      // Update material
      const matConfig = SOLID_PRESETS[solidMaterial];
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(matConfig.color);
      mat.roughness = matConfig.roughness;
      mat.metalness = matConfig.metalness;

      // Colorize contact pad based on mechanical pressure level
      // Green (low) -> Yellow (moderate) -> Red (very high pressure)
      if (pressurePadRef.current) {
        const padMat = pressurePadRef.current.material as THREE.MeshStandardMaterial;
        const normP = Math.min(1.0, state.mechanicalPressureKPa / 20.0);
        const col = new THREE.Color().setHSL(0.33 * (1 - normP), 0.9, 0.45);
        padMat.color.copy(col);
      }

      // Arrows
      if (arrowWeightRef.current && arrowNormalRef.current) {
        const arrowLen = Math.max(0.2, Math.min(0.9, (state.contactForce / 300) * 0.8));
        arrowWeightRef.current.position.set(0, 0.04 + heightY, 0);
        arrowWeightRef.current.setLength(arrowLen, arrowLen * 0.25, arrowLen * 0.15);
        arrowWeightRef.current.visible = clock.showVectors;

        arrowNormalRef.current.position.set(0, 0.04, 0);
        arrowNormalRef.current.setLength(arrowLen, arrowLen * 0.25, arrowLen * 0.15);
        arrowNormalRef.current.visible = clock.showVectors;
      }
    } else if (mode === 'fluid_column' && fluidMeshRef.current) {
      const fMesh = fluidMeshRef.current;
      const clampedHeight = Math.max(0.1, Math.min(2.0, fluidDepth));
      fMesh.scale.set(1, clampedHeight, 1);
      fMesh.position.set(0, 0.04 + clampedHeight / 2, 0);

      const fConfig = FLUID_PRESETS[fluidType];
      const fMat = fMesh.material as THREE.MeshPhysicalMaterial;
      fMat.color.setHex(fConfig.color);
      fMat.opacity = fConfig.opacity;

      // Probe position (submerged to current depth)
      if (probeGroupRef.current) {
        const probeY = 0.04 + clampedHeight;
        probeGroupRef.current.position.set(0, probeY - clampedHeight * 0.85, 0);
      }
    }
  }, [mode, blockDimensions, solidMaterial, state, fluidDepth, fluidType, clock.showVectors]);

  // Chart configuration
  const chartSeries: ChartSeries[] = useMemo(() => {
    if (mode === 'contact_block') {
      return [
        { key: 'pressureKPa', label: 'Pressão Mecânica P (kPa)', color: '#38bdf8', unit: 'kPa' },
        { key: 'areaCm2', label: 'Área de Contato A (cm²)', color: '#f59e0b', unit: 'cm²' },
      ];
    } else {
      return [
        { key: 'hydrostaticKPa', label: 'Pressão Hidrostática ΔP (kPa)', color: '#0ea5e9', unit: 'kPa' },
        { key: 'fluidDepthM', label: 'Profundidade h (m)', color: '#10b981', unit: 'm' },
      ];
    }
  }, [mode]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
      {/* 3D Viewport Zone */}
      <div className="flex-1 relative flex flex-col min-h-[360px] md:min-h-0">
        <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing outline-none" />

        {/* Floating Top Badge with Camera Reset */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {mode === 'contact_block' ? 'Bloco Sólido & Pressão de Contato' : 'Coluna de Fluido & Hidrostática'}
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
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-[240px]">
          {mode === 'contact_block' ? (
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-sm">
              <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold mb-1">Pressão de Contato</div>
              <div className="text-xl font-bold font-mono text-white">
                {state.mechanicalPressureKPa.toFixed(2)} <span className="text-xs font-normal text-slate-400">kPa</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Força Peso:</span>
                <span className="font-mono text-slate-200">{state.contactForce.toFixed(1)} N</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Área Contato:</span>
                <span className="font-mono text-amber-400">{(blockDimensions.area * 10000).toFixed(0)} cm²</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Densidade ρ:</span>
                <span className="font-mono text-emerald-400">{state.density.toFixed(0)} kg/m³</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-sm">
              <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold mb-1">Pressão Hidrostática</div>
              <div className="text-xl font-bold font-mono text-white">
                {(state.hydrostaticPressure / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400">kPa</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Pressão Total:</span>
                <span className="font-mono text-emerald-400">{(state.totalPressure / 1000).toFixed(1)} kPa</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Profundidade h:</span>
                <span className="font-mono text-amber-400">{fluidDepth.toFixed(2)} m</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Densidade Fluido:</span>
                <span className="font-mono text-cyan-400">{state.fluidDensity} kg/m³</span>
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


      {/* Side Panel with Tabs: [Parâmetros | Gráficos em Tempo Real] */}
      <div className="w-full md:w-96 lg:w-[420px] bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 z-20">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveSideTab('controls')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'controls'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parâmetros</span>
          </button>
          <button
            onClick={() => setActiveSideTab('graphs')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'graphs'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Gráficos em Tempo Real</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs">
          {activeSideTab === 'controls' ? (
            <>
              {/* Classic Didactic Presets Bar */}
              <ClassicPresetsBar
                moduleId="density_pressure"
                onApplyPreset={applyPreset}
                currentParams={{
                  mode,
                  solidMaterial,
                  supportFace,
                  blockDimL,
                  blockDimW,
                  blockDimH,
                  fluidType,
                  fluidDepth,
                }}
              />

              {/* Mode Selector */}
              <div>
                <label className="text-slate-400 font-semibold mb-2 block uppercase text-[10px] tracking-wider font-mono">
                  Fenômeno em Investigação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('contact_block')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      mode === 'contact_block'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Box className="w-4 h-4 shrink-0 text-cyan-400" />
                    <div>
                      <div className="text-[11px]">Pressão Mecânica</div>
                      <div className="text-[9px] text-slate-400">P = F / A (Bloco)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('fluid_column')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      mode === 'fluid_column'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Droplets className="w-4 h-4 shrink-0 text-sky-400" />
                    <div>
                      <div className="text-[11px]">Hidrostática</div>
                      <div className="text-[9px] text-slate-400">P = ρ·g·h (Coluna)</div>
                    </div>
                  </button>
                </div>
              </div>

              {mode === 'contact_block' ? (
                <>
                  {/* Material Preset */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                      Material do Bloco Sólido (Densidade ρ)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(SOLID_PRESETS) as SolidMaterial[]).map((matKey) => {
                        const info = SOLID_PRESETS[matKey];
                        const isSelected = solidMaterial === matKey;
                        return (
                          <button
                            key={matKey}
                            onClick={() => setSolidMaterial(matKey)}
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

                  {/* Face Orientation Selector (Area change) */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                      Orientação da Face de Apoio (Área de Contato)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setSupportFace('large')}
                        className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                          supportFace === 'large'
                            ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-[11px]">Face Larga</div>
                        <div className="text-[9px] text-slate-400">{(blockDimL * blockDimW * 10000).toFixed(0)} cm²</div>
                      </button>

                      <button
                        onClick={() => setSupportFace('medium')}
                        className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                          supportFace === 'medium'
                            ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-[11px]">Face Média</div>
                        <div className="text-[9px] text-slate-400">{(blockDimL * blockDimH * 10000).toFixed(0)} cm²</div>
                      </button>

                      <button
                        onClick={() => setSupportFace('small')}
                        className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                          supportFace === 'small'
                            ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-[11px]">Face Estreita</div>
                        <div className="text-[9px] text-slate-400">{(blockDimW * blockDimH * 10000).toFixed(0)} cm²</div>
                      </button>
                    </div>
                  </div>

                  {/* Sliders for Block Dimensions */}
                  <div className="flex flex-col gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Comprimento (L):</span>
                        <span className="font-mono text-cyan-400 font-semibold">{blockDimL.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={blockDimL}
                        onChange={(e) => setBlockDimL(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Largura (W):</span>
                        <span className="font-mono text-cyan-400 font-semibold">{blockDimW.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={blockDimW}
                        onChange={(e) => setBlockDimW(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Altura (H):</span>
                        <span className="font-mono text-cyan-400 font-semibold">{blockDimH.toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.4"
                        step="0.05"
                        value={blockDimH}
                        onChange={(e) => setBlockDimH(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Fluid Type Selector */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block uppercase text-[10px] tracking-wider font-mono">
                      Fluido Líquido (Densidade ρ)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(FLUID_PRESETS) as FluidType[]).map((fKey) => {
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

                  {/* Fluid Depth Slider */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Altura da Coluna d'Água (h):</span>
                      <span className="font-mono text-cyan-400 font-bold">{fluidDepth.toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.05"
                      value={fluidDepth}
                      onChange={(e) => setFluidDepth(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>0.2 m</span>
                      <span>2.0 m</span>
                    </div>
                  </div>
                </>
              )}

              {/* Gravity & Scientific Formulas */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Formulação Matemática</span>
                {mode === 'contact_block' ? (
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    <KaTeXMath math="P = \frac{F_{\text{normal}}}{A} = \frac{m \cdot g}{A}" />
                    <KaTeXMath math="\rho = \frac{m}{V}" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    <KaTeXMath math="P_h = \rho_{\text{fluido}} \cdot g \cdot h" />
                    <KaTeXMath math="P_{\text{total}} = P_{\text{atm}} + \rho g h" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Scientific Charts */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    {mode === 'contact_block' ? 'Pressão vs Área de Contato' : 'Pressão vs Profundidade'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{dataBuffer.length} amostras</span>
                </div>

                <div className="h-64 w-full bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <ScientificChart
                    data={dataBuffer}
                    series={chartSeries}
                    currentTime={clock.time}
                    title={mode === 'contact_block' ? 'P(A) = F / A' : 'ΔP(h) = ρ·g·h'}
                    xLabel="Tempo"
                    xUnit="s"
                    height={220}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-2">
                  <span className="font-bold text-slate-200">Análise Física Qualitativa:</span>
                  {mode === 'contact_block' ? (
                    <p>
                      Para um sólido com peso constante de <strong className="text-cyan-400">{state.contactForce.toFixed(1)} N</strong>,
                      a pressão mecânica aumenta drasticamente ao orientar o bloco para sua face menor, pois{' '}
                      <KaTeXMath math="P \propto \frac{1}{A}" />.
                    </p>
                  ) : (
                    <p>
                      Em fluidos homogêneos, o aumento de pressão é linearmente proporcional à profundidade{' '}
                      <KaTeXMath math="\Delta P = \rho g h" />, independente da largura ou geometria do recipiente.
                    </p>
                  )}
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

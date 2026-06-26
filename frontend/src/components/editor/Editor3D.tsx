// frontend/src/components/editor/Editor3D.tsx
import React, { useEffect, useRef } from 'react';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  PointLight,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  Shape,
  ExtrudeGeometry,
  Vector2,
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Group,
  Raycaster,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { useEditorStore, type Placement } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { imagePxToMeters, cmToMeters } from '../../lib/units';
import { tokens } from '../../lib/tokens';
import './Editor3D.css';

const ROOM_HEIGHT_CM = 243.84; // 8 ft default ceiling

const materials = {
  floor: new MeshStandardMaterial({ color: tokens.threeFloor, roughness: 0.9, metalness: 0.1 }),
  walls: new MeshStandardMaterial({ color: tokens.threeWalls, roughness: 0.8, metalness: 0.3 }),
};

function buildRoomShell(
  polygonPx: Array<{ x: number; y: number }>,
  pixelsPerCm: number,
): Group {
  const group = new Group();
  const polygonM = polygonPx.map((pt) => ({
    x: imagePxToMeters(pt.x, pixelsPerCm),
    y: imagePxToMeters(pt.y, pixelsPerCm),
  }));
  const roomHeightM = cmToMeters(ROOM_HEIGHT_CM);

  // Floor
  const shape = new Shape(polygonM.map((pt) => new Vector2(pt.x, pt.y)));
  const floorGeo = new ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  const floor = new Mesh(floorGeo, materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Walls
  for (let i = 0; i < polygonM.length; i++) {
    const a = polygonM[i];
    const b = polygonM[(i + 1) % polygonM.length];
    const wallLength = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    const wallAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    const wallGeo = new BoxGeometry(wallLength, roomHeightM, 0.15);
    const wall = new Mesh(wallGeo, materials.walls);
    wall.position.set(midX, roomHeightM / 2, midY);
    wall.rotation.y = -wallAngle;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }

  return group;
}

function buildFurnitureBox(
  placement: Placement,
  pixelsPerCm: number,
  selected: boolean,
): Group {
  const group = new Group();
  const w = cmToMeters(placement.widthCm);
  const d = cmToMeters(placement.depthCm);
  const h = cmToMeters(placement.heightCm);
  const elev = cmToMeters(placement.elevationCm);

  const geo = new BoxGeometry(w, h, d);
  const mat = new MeshStandardMaterial({
    color: new Color(placement.colorHex),
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
    emissive: selected ? new Color(tokens.threeAccentDim) : new Color(0x000000),
  });
  const mesh = new Mesh(geo, mat);
  mesh.position.y = h / 2 + elev;
  mesh.castShadow = true;
  mesh.userData.placementId = placement.id;

  const edges = new EdgesGeometry(geo);
  const lineMat = new LineBasicMaterial({ color: tokens.threeBorderStrong });
  const wireframe = new LineSegments(edges, lineMat);
  wireframe.position.y = mesh.position.y;
  wireframe.userData.placementId = placement.id;

  // CSS2D label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'dimension-label';
  labelDiv.textContent = placement.label;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, h + elev + 0.1, 0);

  group.add(mesh, wireframe, label);
  group.position.x = imagePxToMeters(placement.positionXPx, pixelsPerCm);
  group.position.z = imagePxToMeters(placement.positionYPx, pixelsPerCm);
  group.rotation.y = -(placement.rotationDeg * Math.PI) / 180;
  group.userData.placementId = placement.id;

  return group;
}

function disposeGroup(group: Group) {
  group.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

export function Editor3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cssRendererRef = useRef<CSS2DRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const roomGroupRef = useRef<Group | null>(null);
  const furnitureGroupsRef = useRef<Map<string, Group>>(new Map());
  const needsUpdateRef = useRef(false);
  const frameRef = useRef<number>(0);

  const placements = useEditorStore((s) => s.placements);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setSelected = useEditorStore((s) => s.setSelected);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const project = useProjectStore((s) => s.project);
  const activeRoomId = useProjectStore((s) => s.activeRoomId);
  const activeRoom = project?.rooms.find((r) => r.id === activeRoomId);
  const pixelsPerCm = project?.calibration?.pixelsPerCm ?? 1;

  // ── Init Three.js scene ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 600;

    const scene = new Scene();
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(5, 8, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x0e0e0e, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // CSS2D label renderer
    const cssRenderer = new CSS2DRenderer();
    cssRenderer.setSize(w, h);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(cssRenderer.domElement);
    cssRendererRef.current = cssRenderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controlsRef.current = controls;

    // Lighting
    scene.add(new AmbientLight(0x161616, 0.5));
    const keyLight = new DirectionalLight(tokens.threeTextPrimary, 1.2);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new PointLight(tokens.threeAccent, 0.8, 20);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);

    // Resize
    function onResize() {
      const w2 = mount!.clientWidth;
      const h2 = mount!.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
      cssRenderer.setSize(w2, h2);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Click → select via raycasting
    function onClick(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const meshes: Mesh[] = [];
      scene.traverse((obj) => {
        if (obj instanceof Mesh && obj.userData.placementId) meshes.push(obj);
      });
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.placementId as string;
        setSelected(id);
        setSidebarTab('properties');
      } else {
        setSelected(null);
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();

      if (needsUpdateRef.current) {
        needsUpdateRef.current = false;
        syncFurniture();
      }

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      if (cssRenderer.domElement.parentNode === mount) {
        mount.removeChild(cssRenderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build room shell when active room changes ────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (roomGroupRef.current) {
      disposeGroup(roomGroupRef.current);
      scene.remove(roomGroupRef.current);
      roomGroupRef.current = null;
    }

    if (activeRoom && activeRoom.polygonPx.length >= 3) {
      const shell = buildRoomShell(activeRoom.polygonPx, pixelsPerCm);
      scene.add(shell);
      roomGroupRef.current = shell;
    }
  }, [activeRoom, pixelsPerCm]);

  // ── Sync furniture when placements or selectedId changes ─────────────────
  function syncFurniture() {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(placements.map((p) => p.id));

    // Remove groups that no longer exist
    furnitureGroupsRef.current.forEach((group, id) => {
      if (!currentIds.has(id)) {
        disposeGroup(group);
        scene.remove(group);
        furnitureGroupsRef.current.delete(id);
      }
    });

    // Add or update
    placements.forEach((p) => {
      const existing = furnitureGroupsRef.current.get(p.id);
      if (existing) {
        disposeGroup(existing);
        scene.remove(existing);
      }
      const group = buildFurnitureBox(p, pixelsPerCm, p.id === selectedId);
      scene.add(group);
      furnitureGroupsRef.current.set(p.id, group);
    });
  }

  useEffect(() => {
    needsUpdateRef.current = true;
  }, [placements, selectedId]);

  return (
    <div ref={mountRef} className="editor-3d" aria-label="3D room view" />
  );
}

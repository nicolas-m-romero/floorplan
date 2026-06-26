// frontend/src/components/hero/HeroScrollSync.ts
// Isolated interaction logic for the hero 3D model:
//  - scroll-driven rotation from isometric → top-down (Design System 6.3)
//  - cursor parallax drift on hover, max ±8° per axis (6.4)
//  - accent rim light intensifies on hover (0.8 → 1.4)
//  - grab / grabbing cursor on the canvas
// Respects prefers-reduced-motion: the model holds a static isometric pose and
// all scroll/hover motion is disabled.
import * as THREE from 'three';

// Negative X tilt looks DOWN into the open-topped maquette (we see the room
// interiors), rather than up at its underside. Scroll flattens it to top-down.
const START_ROTATION = { x: -Math.PI / 4, y: Math.PI / 6, z: 0 }; // Isometric
const END_ROTATION = { x: 0, y: 0, z: 0 }; // Top-down / 2D

const PARALLAX_MAX = THREE.MathUtils.degToRad(8);
const RIM_BASE = 0.8;
const RIM_HOVER = 1.4;
const SMOOTHING = 0.08;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface HeroScrollSyncOptions {
  model: THREE.Object3D;
  rimLight: THREE.PointLight;
  canvas: HTMLElement;
  prefersReduced: boolean;
}

export function createHeroScrollSync({
  model,
  rimLight,
  canvas,
  prefersReduced,
}: HeroScrollSyncOptions) {
  let scrollT = 0; // 0 → isometric, 1 → top-down
  let targetParallaxX = 0;
  let targetParallaxY = 0;
  let parallaxX = 0;
  let parallaxY = 0;
  let rimTarget = RIM_BASE;
  let rimCurrent = RIM_BASE;
  let hovering = false;

  const onScroll = () => {
    const ratio = window.scrollY / window.innerHeight;
    scrollT = Math.min(ratio * 2, 1); // Complete by 50% scroll
  };

  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1; // -1..1
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1; // -1..1
    targetParallaxY = nx * PARALLAX_MAX; // horizontal cursor → spin around Y
    targetParallaxX = ny * PARALLAX_MAX; // vertical cursor → tilt around X
  };

  const onPointerEnter = () => {
    hovering = true;
    rimTarget = RIM_HOVER;
    canvas.style.cursor = 'grab';
  };

  const onPointerLeave = () => {
    hovering = false;
    targetParallaxX = 0;
    targetParallaxY = 0;
    rimTarget = RIM_BASE;
    canvas.style.cursor = 'default';
  };

  const onPointerDown = () => {
    canvas.style.cursor = 'grabbing';
  };

  const onPointerUp = () => {
    canvas.style.cursor = hovering ? 'grab' : 'default';
  };

  if (prefersReduced) {
    // Static isometric pose; no listeners, no motion.
    model.rotation.set(START_ROTATION.x, START_ROTATION.y, START_ROTATION.z);
    rimLight.intensity = RIM_BASE;
  } else {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
  }

  const update = () => {
    if (prefersReduced) return;

    const t = easeInOutCubic(scrollT);
    const baseX = lerp(START_ROTATION.x, END_ROTATION.x, t);
    const baseY = lerp(START_ROTATION.y, END_ROTATION.y, t);
    const baseZ = lerp(START_ROTATION.z, END_ROTATION.z, t);

    parallaxX += (targetParallaxX - parallaxX) * SMOOTHING;
    parallaxY += (targetParallaxY - parallaxY) * SMOOTHING;

    model.rotation.x = baseX + parallaxX;
    model.rotation.y = baseY + parallaxY;
    model.rotation.z = baseZ;

    rimCurrent += (rimTarget - rimCurrent) * SMOOTHING;
    rimLight.intensity = rimCurrent;
  };

  const dispose = () => {
    window.removeEventListener('scroll', onScroll);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerenter', onPointerEnter);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
  };

  return { update, dispose };
}

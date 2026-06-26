// frontend/src/components/hero/HeroCanvas.tsx
// Three.js hero: an isometric apartment floor-plan maquette that rotates to a
// top-down 2D view on scroll. Materials and lighting follow Design System 6.2;
// interaction logic lives in HeroScrollSync.ts.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createHeroScrollSync } from './HeroScrollSync';
import './HeroCanvas.css';

export function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // ── Scene / camera / renderer ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 21, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ── Materials (Design System 6.2) ──
    const materials = {
      walls: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.3 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9, metalness: 0.1 }),
      accentEdge: new THREE.MeshStandardMaterial({ color: 0x4a7fd4, roughness: 0.3, metalness: 0.8, emissive: 0x1e3a5f }),
      grid: new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 1.0, metalness: 0.0 }),
    };

    // ── Model: apartment maquette ──
    const model = new THREE.Group();
    scene.add(model);

    // Base slab (reads as the grid/ground of the plan)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 7.5), materials.grid);
    slab.position.y = -0.06;
    model.add(slab);

    // Rooms — flat planes at slightly different elevations
    const rooms = [
      { x: -2.25, z: -1.4, w: 4.4, d: 4.2, y: 0.0 },
      { x: 2.4, z: -2.0, w: 3.6, d: 2.6, y: 0.05 },
      { x: 2.4, z: 1.4, w: 3.6, d: 3.2, y: 0.1 },
    ];
    rooms.forEach((r) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.12, r.d), materials.floor);
      mesh.position.set(r.x, r.y, r.z);
      model.add(mesh);
    });

    // Walls — thin extruded boxes. [x, z, width, depth]
    const WALL_H = 0.75;
    const T = 0.14; // wall thickness
    const addWall = (x: number, z: number, w: number, d: number, mat = materials.walls) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), mat);
      mesh.position.set(x, WALL_H / 2, z);
      model.add(mesh);
    };

    // Outer perimeter (bounds roughly x:-4.5..4.5, z:-3.5..3.5)
    addWall(0, -3.5, 9, T); // back
    addWall(0, 3.5, 9, T); // front
    addWall(-4.5, 0, T, 7); // left
    addWall(4.5, 0, T, 7); // right
    // Interior partitions
    addWall(0.05, 0, T, 7); // central divider
    addWall(2.4, -0.3, 3.6, T); // horizontal partition (right side)
    addWall(-1.0, 0.7, 2.0, T); // small interior nib

    // Accent edge — a highlighted threshold/doorway beam (Design System accent)
    addWall(0.05, 2.4, T, 1.4, materials.accentEdge);

    // ── Lighting — three-point (Design System 6.2) ──
    const keyLight = new THREE.DirectionalLight(0xf0ede8, 1.2);
    keyLight.position.set(6, 10, 4);
    const fillLight = new THREE.AmbientLight(0x161616, 0.5);
    const rimLight = new THREE.PointLight(0x4a7fd4, 0.8, 10);
    rimLight.position.set(-5, 7, -5);
    scene.add(keyLight, fillLight, rimLight);

    // Identity transform while we capture the local bounding box below.
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.setScalar(1);

    // Fit the maquette into the vertical band between the wordmark's baseline
    // and the intro, measured from the actual DOM. We project the model's real
    // geometry corners (rotated) to screen and iteratively adjust scale + depth
    // so its top grazes the letters and its height fills the band — correct at
    // any viewport, accounting for the model's tilt.
    //
    // Capture the LOCAL bounding box once (identity transform) so we can later
    // project its true corners through the model's world matrix. Using the
    // local box avoids the empty-space overshoot of a world-axis-aligned box.
    model.updateWorldMatrix(true, true);
    const localBox = new THREE.Box3().setFromObject(model);
    const localCorners = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (i) =>
        new THREE.Vector3(
          i & 1 ? localBox.max.x : localBox.min.x,
          i & 2 ? localBox.max.y : localBox.min.y,
          i & 4 ? localBox.max.z : localBox.min.z
        )
    );
    const corner = new THREE.Vector3();

    // Returns the model's [minScreenY, maxScreenY] in CSS pixels.
    const measureScreenBounds = (h: number): [number, number] => {
      model.updateWorldMatrix(true, true);
      let minY = Infinity;
      let maxY = -Infinity;
      for (const lc of localCorners) {
        corner.copy(lc).applyMatrix4(model.matrixWorld).project(camera);
        const y = ((1 - corner.y) / 2) * h;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      return [minY, maxY];
    };

    const frameModel = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;

      const wordEl = document.querySelector('.hero__word');
      const introEl = document.querySelector('.hero__intro');
      const wordRect = wordEl?.getBoundingClientRect();
      const wordBottom = wordRect ? wordRect.bottom : 96 + 0.18 * w;
      const wordHeight = wordRect ? wordRect.height : 0.18 * w;
      const introTop = introEl ? introEl.getBoundingClientRect().top : h - 160;

      // Rise a little into the visible glyphs so the model just grazes the
      // letters (Bebas's line box extends below the baseline, so we offset up
      // by a fraction of the wordmark height). Keep a gap above the intro.
      const targetTop = wordBottom - 0.2 * wordHeight;
      const targetBottom = introTop - 28;
      const targetH = Math.max(targetBottom - targetTop, 80);

      // Measure at the rest (isometric) pose for stable framing.
      camera.updateMatrixWorld();
      model.rotation.set(-Math.PI / 4, Math.PI / 6, 0);

      // 1) Scale so the model's screen height matches the band.
      for (let i = 0; i < 4; i++) {
        const [t, b] = measureScreenBounds(h);
        const curH = b - t;
        if (curH > 1) {
          const next = THREE.MathUtils.clamp(
            model.scale.x * (targetH / curH),
            0.4,
            2.2
          );
          model.scale.setScalar(next);
        }
      }

      // 2) Translate in depth so the model's top grazes the letters.
      for (let i = 0; i < 4; i++) {
        const [t0] = measureScreenBounds(h);
        const z0 = model.position.z;
        model.position.z = z0 + 0.5;
        const [t1] = measureScreenBounds(h);
        model.position.z = z0;
        const dydz = (t1 - t0) / 0.5; // px per world unit
        if (Math.abs(dydz) > 1e-3) {
          model.position.z = z0 + (targetTop - t0) / dydz;
        }
      }
    };

    // ── Resize handling ──
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frameModel();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ── Interaction + render loop ──
    const sync = createHeroScrollSync({
      model,
      rimLight,
      canvas: renderer.domElement,
      prefersReduced,
    });

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      sync.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      sync.dispose();
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      Object.values(materials).forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="hero-canvas" ref={mountRef} aria-hidden="true" />;
}

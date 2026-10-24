// Mouse-reactive WebGL particle field. Three.js is resolved by the import map in head-common.html.
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, ShaderMaterial,
  Points, Raycaster, Plane, Vector2, Vector3, AdditiveBlending,
} from 'three';
import { vertex, fragment } from './shaders.js';
import { pointer } from './pointer.js';

export function initParticles(canvas, { fade = true } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 100);

  // Grid of points on the XZ plane. Fewer points on small screens.
  const small = innerWidth < 700;
  const cols = small ? 120 : 230, rows = small ? 90 : 150, W = 36, D = 26;
  const pos = new Float32Array(cols * rows * 3);
  const rnd = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      pos[k * 3] = (i / (cols - 1) - 0.5) * W;
      pos[k * 3 + 1] = 0;
      pos[k * 3 + 2] = (j / (rows - 1) - 0.5) * D;
      rnd[k] = Math.random();
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aRand', new BufferAttribute(rnd, 1));

  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new Vector3() },
      uScroll: { value: 0 },
      uPx: { value: dpr },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);

  const ray = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 0);
  const hit = new Vector3();
  const ndc = new Vector2();
  const smooth = new Vector3();
  let camX = 0;
  let scrollP = 0;

  function size() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    mat.uniforms.uPx.value = dpr * (innerWidth < 700 ? 1.25 : 1);
  }

  function onScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollP = Math.min(1, scrollY / max);
    // Home page: field fades as you leave the hero. Other pages keep it calm and dim.
    const opacity = fade ? Math.max(0.32, 1 - scrollY / (innerHeight * 1.1)) : 0.4;
    canvas.style.opacity = opacity.toFixed(3);
  }

  function render(now) {
    const t = reduce ? 3 : now / 1000;
    // With no recent pointer movement (touch screens, idle mouse) the ripple drifts on its own.
    const idle = performance.now() - pointer.last > 2500;
    const mx = idle ? Math.sin(t * 0.35) * 0.55 : pointer.x;
    const my = idle ? Math.cos(t * 0.27) * 0.35 + 0.1 : pointer.y;

    pts.rotation.y = scrollP * 1.1 + Math.sin(t * 0.1) * 0.05;
    camera.position.set(camX, 6.2 - scrollP * 2.2, 12.5 - scrollP * 3);
    camX += (mx * 1.6 - camX) * 0.04;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    pts.updateMatrixWorld();

    ndc.set(mx, my);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      pts.worldToLocal(hit);
      smooth.lerp(hit, reduce ? 1 : 0.1);
    }
    mat.uniforms.uMouse.value.copy(smooth);
    mat.uniforms.uTime.value = t;
    mat.uniforms.uScroll.value = scrollP;
    renderer.render(scene, camera);
  }

  size();
  onScroll();
  render(0);
  addEventListener('resize', () => { size(); onScroll(); if (reduce) render(0); });
  addEventListener('scroll', () => { onScroll(); if (reduce) render(0); }, { passive: true });

  if (!reduce) {
    const loop = (now) => {
      if (!document.hidden) render(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

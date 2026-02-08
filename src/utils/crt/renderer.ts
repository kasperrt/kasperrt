import type { CrtConfig } from "~/utils/crt/types";
import { fragmentShader, vertexShader } from "~/utils/crt/shader";
import type { LinkRect } from "~/utils/crt/console2d";

type ThreeModule = typeof import("three");

export type PickedLink = { href: string; external: boolean };

export type CrtRenderer = {
  resize: (w: number, h: number, dpr: number) => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
  updateTexture: () => void;
  setMotionScale: (motionScale: number) => void;
  setLinkRects: (rects: LinkRect[]) => void;
  pickLinkAt: (clientX: number, clientY: number) => PickedLink | null;
  setOpen: (open: number) => void;
};

type CreateProps = {
  canvas: HTMLCanvasElement;
  sourceCanvas: HTMLCanvasElement;
  config: CrtConfig;
};

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

// Must match the shader's mapping order: overscan then barrel distortion.
function applyOverscanUv(uv: { x: number; y: number }, overscan: number) {
  const s = 1 + overscan;
  return {
    x: (uv.x - 0.5) * s + 0.5,
    y: (uv.y - 0.5) * s + 0.5,
  };
}

function barrelDistortUv(uv: { x: number; y: number }, k: number) {
  const ccx = uv.x * 2 - 1;
  const ccy = uv.y * 2 - 1;
  const r2 = ccx * ccx + ccy * ccy;
  const k1 = k;
  const k2 = k * 0.35;
  const f = 1 + k1 * r2 + k2 * r2 * r2;
  const dx = ccx * f;
  const dy = ccy * f;
  return { x: dx * 0.5 + 0.5, y: dy * 0.5 + 0.5 };
}

function mapClientToSourceUv(canvas: HTMLCanvasElement, clientX: number, clientY: number, config: CrtConfig) {
  const r = canvas.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const u = (clientX - r.left) / r.width;
  const v = 1 - (clientY - r.top) / r.height;
  const uv0 = { x: clamp01(u), y: clamp01(v) };

  // vUv in shader is bottom-left? Our full-screen quad uses uv as provided by three
  // (0..1 bottom-left depends on geometry). We'll treat vUv as 0..1 with y up,
  // but three's PlaneGeometry uv.y is typically 1 at top. We compensate by flipping
  // to match the shader (which assumes vUv.y increases upward).
  const uv = { x: uv0.x, y: uv0.y };

  let sUv = applyOverscanUv(uv, config.overscan);
  sUv = barrelDistortUv(sUv, config.curvature);
  return sUv;
}

export function createCrtRenderer(THREE: ThreeModule, { canvas, sourceCanvas, config }: CreateProps): CrtRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let texture = new THREE.CanvasTexture(sourceCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const uniforms = {
    uTexture: { value: texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uDpr: { value: 1 },
    uOpen: { value: 0 }, // Start closed
    uCurvature: { value: config.curvature },
    uOverscan: { value: config.overscan },
    uPixelSize: { value: config.pixelSize },
    uScanSpeed: { value: config.scanline.speed },
    uScanDepth: { value: config.scanline.depth },
    uNoiseAmount: { value: config.noise.amount },
    uTearAmount: { value: config.tear.amount },
    uTearFreq: { value: config.tear.frequency },
    uTearPeriod: { value: config.tear.period },
    uVignette: { value: config.vignette.amount },
    uChroma: { value: config.chroma.amount },
    uGlow: { value: config.glow.amount },
    uMotionScale: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });

  const geom = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);

  let running = false;
  let raf = 0;
  const startTime = performance.now();
  let linkRects: LinkRect[] = [];

  function renderFrame(now: number) {
    uniforms.uTime.value = (now - startTime) / 1000;
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    if (!running) return;
    renderFrame(now);
    raf = requestAnimationFrame(loop);
  }

  function resize(w: number, h: number, dpr: number) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
    uniforms.uDpr.value = dpr;

    // sourceCanvas has been resized by console2d.resize() just before this call.
    // Recreate the texture to ensure it matches the new dimensions.
    texture.dispose();
    texture = new THREE.CanvasTexture(sourceCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    uniforms.uTexture.value = texture;
  }

  function setMotionScale(motionScale: number) {
    uniforms.uMotionScale.value = motionScale;
  }
  
  function setOpen(open: number) {
    uniforms.uOpen.value = open;
  }

  function setLinkRects(rects: LinkRect[]) {
    linkRects = rects;
  }

  function updateTexture() {
    texture.needsUpdate = true;
  }

  function pickLinkAt(clientX: number, clientY: number): PickedLink | null {
    const uv = mapClientToSourceUv(canvas, clientX, clientY, config);
    if (!uv) return null;
    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) return null;

    // Map to source canvas pixels in CSS pixel space (the 2D renderer uses CSS px coordinates).
    const x = uv.x * canvas.clientWidth;
    const y = (1 - uv.y) * canvas.clientHeight;

    for (const lr of linkRects) {
      const r = lr.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { href: lr.href, external: lr.external };
      }
    }
    return null;
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function dispose() {
    stop();
    geom.dispose();
    material.dispose();
    texture.dispose();
    renderer.dispose();
  }

  return {
    resize,
    start,
    stop,
    dispose,
    updateTexture,
    setMotionScale,
    setLinkRects,
    pickLinkAt,
    setOpen,
  };
}

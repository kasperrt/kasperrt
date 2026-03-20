import type {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  CanvasTexture,
  IUniform,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
} from "three";
import type { CrtConfig } from "~/utils/crt/types";
import { fragmentShader, vertexShader } from "~/utils/crt/shader";
import type { LinkRect } from "~/utils/crt/console2d";

type ThreeModule = typeof import("three");

type PickedLink = { href: string; external: boolean };

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

export class CrtRenderer {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: OrthographicCamera;
  private texture: CanvasTexture;
  private uniforms: Record<string, IUniform>;
  private material: ShaderMaterial;
  private geom: PlaneGeometry;
  private mesh: Mesh;

  private running = false;
  private raf = 0;
  private startTime: number;
  private linkRects: LinkRect[] = [];

  public constructor(
    private THREE: ThreeModule,
    private canvas: HTMLCanvasElement,
    private sourceCanvas: HTMLCanvasElement,
    private config: CrtConfig,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.texture = new THREE.CanvasTexture(this.sourceCanvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.uniforms = {
      uTexture: { value: this.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uOpen: { value: 0 }, // Start closed
      uCurvature: { value: this.config.curvature },
      uOverscan: { value: this.config.overscan },
      uPixelSize: { value: this.config.pixelSize },
      uScanSpeed: { value: this.config.scanline.speed },
      uScanDepth: { value: this.config.scanline.depth },
      uNoiseAmount: { value: this.config.noise.amount },
      uTearAmount: { value: this.config.tear.amount },
      uTearFreq: { value: this.config.tear.frequency },
      uTearPeriod: { value: this.config.tear.period },
      uVignette: { value: this.config.vignette.amount },
      uChroma: { value: this.config.chroma.amount },
      uGlow: { value: this.config.glow.amount },
      uMotionScale: { value: 1 },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
    });

    this.geom = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(this.geom, this.material);
    this.scene.add(this.mesh);

    this.startTime = performance.now();
  }

  public renderFrame = (now: number) => {
    this.uniforms.uTime.value = (now - this.startTime) / 1000;
    this.renderer.render(this.scene, this.camera);
  };

  private loop = (now: number) => {
    if (!this.running) {
      return;
    }
    this.renderFrame(now);
    this.raf = requestAnimationFrame(this.loop);
  };

  public resize = (w: number, h: number, dpr: number) => {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.uniforms.uResolution.value.set(w * dpr, h * dpr);

    // sourceCanvas has been resized by console2d.resize() just before this call.
    // Recreate the texture to ensure it matches the new dimensions.
    this.texture.dispose();
    this.texture = new this.THREE.CanvasTexture(this.sourceCanvas);
    this.texture.colorSpace = this.THREE.SRGBColorSpace;
    this.texture.wrapS = this.THREE.ClampToEdgeWrapping;
    this.texture.wrapT = this.THREE.ClampToEdgeWrapping;
    this.texture.minFilter = this.THREE.LinearFilter;
    this.texture.magFilter = this.THREE.LinearFilter;
    this.uniforms.uTexture.value = this.texture;
  };

  public setMotionScale = (motionScale: number) => {
    this.uniforms.uMotionScale.value = motionScale;
  };

  public setOpen = (open: number) => {
    this.uniforms.uOpen.value = open;
  };

  public setLinkRects = (rects: LinkRect[]) => {
    this.linkRects = rects;
  };

  public updateTexture = () => {
    this.texture.needsUpdate = true;
  };

  private mapClientToSourceUv(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      return null;
    }
    const u = (clientX - r.left) / r.width;
    const v = 1 - (clientY - r.top) / r.height;
    const uv0 = { x: clamp01(u), y: clamp01(v) };
    const uv = { x: uv0.x, y: uv0.y };

    let sUv = applyOverscanUv(uv, this.config.overscan);
    sUv = barrelDistortUv(sUv, this.config.curvature);
    return sUv;
  }

  public pickLinkAt = (clientX: number, clientY: number): PickedLink | null => {
    const uv = this.mapClientToSourceUv(clientX, clientY);
    if (!uv) {
      return null;
    }
    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
      return null;
    }

    // Map to source canvas pixels in CSS pixel space (the 2D renderer uses CSS px coordinates).
    const x = uv.x * this.canvas.clientWidth;
    const y = (1 - uv.y) * this.canvas.clientHeight;

    for (const lr of this.linkRects) {
      const r = lr.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { href: lr.href, external: lr.external };
      }
    }
    return null;
  };

  public start = () => {
    if (this.running) {
      return;
    }
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  };

  public stop = () => {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    this.raf = 0;
  };

  public dispose = () => {
    this.stop();
    this.geom.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.renderer.dispose();
  };
}

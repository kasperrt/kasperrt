export type CrtConfig = {
  intensity: "authentic";
  dprMax: number;
  pixelSize: number;
  curvature: number;
  overscan: number;
  scanline: { speed: number; depth: number };
  noise: { amount: number };
  vignette: { amount: number };
  chroma: { amount: number };
  glow: { amount: number };
};

export function getDefaultCrtConfig(): CrtConfig {
  // Tuned for "authentic but readable" while preserving the console's existing palette.
  return {
    intensity: "authentic",
    dprMax: 1.75,
    pixelSize: 1.35,
    curvature: 0.12,
    overscan: 0.06,
    scanline: { speed: 0.9, depth: 0.18 },
    noise: { amount: 0.09 },
    vignette: { amount: 0.34 },
    chroma: { amount: 0.0025 },
    glow: { amount: 0.16 },
  };
}

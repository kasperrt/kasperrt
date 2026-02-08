export type CrtConfig = {
  intensity: "authentic";
  dprMax: number;
  pixelSize: number;
  curvature: number;
  overscan: number;
  scanline: { speed: number; depth: number };
  noise: { amount: number };
  tear: { amount: number; frequency: number; period: number };
  vignette: { amount: number };
  chroma: { amount: number };
  glow: { amount: number };
};

export function getDefaultCrtConfig(): CrtConfig {
  // Tuned for "authentic but readable" while preserving the console's existing palette,
  // but with strong, visible CRT anomalies (scanlines/noise/tear).
  return {
    intensity: "authentic",
    dprMax: 1.75,
    pixelSize: 1.25,
    curvature: 0.14,
    overscan: 0.07,
    scanline: { speed: 1.05, depth: 0.6 },
    noise: { amount: 0.14 },
    // "frequency" here is roll speed in cycles/sec (top-to-bottom passes).
    // Keep the roll speed, but reduce how much it distorts.
    // "period" is total cycle length (portion > 1.0 is wait time).
    tear: { amount: 0.34, frequency: 0.12, period: 5.0 },
    vignette: { amount: 0.42 },
    chroma: { amount: 0.0025 },
    glow: { amount: 0.2 },
  };
}

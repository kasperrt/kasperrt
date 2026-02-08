export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDpr;

uniform float uCurvature;
uniform float uOverscan;
uniform float uPixelSize;
uniform float uScanSpeed;
uniform float uScanDepth;
uniform float uNoiseAmount;
uniform float uTearAmount;
uniform float uTearFreq;
uniform float uTearPeriod;
uniform float uVignette;
uniform float uChroma;
uniform float uGlow;
uniform float uMotionScale;

varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 barrelDistort(vec2 uv, float k) {
  // uv in 0..1
  vec2 cc = uv * 2.0 - 1.0;
  float r2 = dot(cc, cc);
  float k1 = k;
  float k2 = k * 0.35;
  cc *= 1.0 + k1 * r2 + k2 * r2 * r2;
  return cc * 0.5 + 0.5;
}

vec2 applyOverscan(vec2 uv, float o) {
  // o ~ 0..0.1, scale uv outward so edges get cropped
  float s = 1.0 + o;
  return (uv - 0.5) * s + 0.5;
}

vec3 samplePixelated(vec2 uv) {
  vec2 px = vec2(max(1.0, uPixelSize));
  vec2 grid = uResolution / px;
  vec2 q = (floor(uv * grid) + 0.5) / grid;
  return texture2D(uTexture, q).rgb;
}

vec3 sampleWithChroma(vec2 uv) {
  float ca = uChroma;
  vec2 cc = uv - 0.5;
  float r = dot(cc, cc);
  vec2 off = cc * (ca * (0.5 + r * 2.0));
  vec3 col;
  col.r = samplePixelated(uv + off).r;
  col.g = samplePixelated(uv).g;
  col.b = samplePixelated(uv - off).b;
  return col;
}

vec3 cheapGlow(vec2 uv, vec3 base) {
  float g = uGlow;
  if (g <= 0.0001) return base;
  vec2 texel = 1.0 / uResolution;
  vec3 s = vec3(0.0);
  s += sampleWithChroma(uv + texel * vec2( 1.0,  0.0));
  s += sampleWithChroma(uv + texel * vec2(-1.0,  0.0));
  s += sampleWithChroma(uv + texel * vec2( 0.0,  1.0));
  s += sampleWithChroma(uv + texel * vec2( 0.0, -1.0));
  s *= 0.25;
  return base + (s - base) * g;
}

float vignette(vec2 uv) {
  vec2 p = uv - 0.5;
  float r = dot(p, p);
  return smoothstep(0.85, 0.25, r) * (1.0 - uVignette) + (1.0 - uVignette) * 0.0 + (uVignette) * smoothstep(0.85, 0.25, r);
}

float scanlines(vec2 uv, float t) {
  // Mix of static fine scanlines and a slower rolling bar.
  float y = uv.y * uResolution.y;
  float fine = 0.5 + 0.5 * sin(y * 3.14159);
  float roll = 0.5 + 0.5 * sin((uv.y * 12.0 - t * uScanSpeed) * 3.14159);
  float bar = exp(-abs(roll - 0.5) * 10.0);
  float m = mix(fine, 1.0, 0.12) * (1.0 - 0.22 * bar);
  return 1.0 - uScanDepth * (1.0 - m);
}

vec3 shadowMask(vec2 uv, vec3 col) {
  float x = uv.x * uResolution.x;
  float triad = fract(x / 3.0);
  vec3 mask = vec3(1.0);
  if (triad < 0.333) mask = vec3(1.0, 0.88, 0.88);
  else if (triad < 0.666) mask = vec3(0.88, 1.0, 0.88);
  else mask = vec3(0.88, 0.88, 1.0);
  return col * mix(vec3(1.0), mask, 0.12);
}

vec2 applyTear(vec2 uv, float t) {
  // A rolling sync tear band that moves from top to bottom.
  // Use a period to introduce a dead zone where no tear happens.
  float speed = max(0.001, uTearFreq);
  float totalCycle = max(1.0, uTearPeriod); 
  float drive = t * speed;
  float cyclePos = mod(drive, totalCycle);

  // If we are in the "wait" time (cyclePos > 1.0), do nothing.
  if (cyclePos > 1.0) return uv;

  float roll = cyclePos; // 0..1
  float bandY = 1.0 - roll;
  
  // Tearing is more like a thin scanline moving down.
  float bandH = 0.04;
  
  // Sharp drop-off for a distinct line edge.
  float dist = abs(uv.y - bandY);
  float band = smoothstep(bandH, bandH * 0.1, dist);

  float line = floor(uv.y * uResolution.y);
  float phase = floor(t * 60.0);
  
  // Unidirectional shift based on scanline noise.
  // Always shift in one direction (e.g. subtracting from x -> pulling content right)
  float noise = hash12(vec2(line, phase));
  float shift = (0.2 + 0.8 * noise) * uTearAmount * band * 0.15; 
  
  // Add slight "drag" to the shift at the trailing edge of the band?
  // Let's keep it simple: just a hard shift.

  uv.x -= shift;

  return uv;
}


void main() {
  vec2 uv = vUv;

  // Overscan first, then curvature.
  uv = applyOverscan(uv, uOverscan);
  uv = barrelDistort(uv, uCurvature);

  // Outside becomes black (overscan crop + curvature corners).
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float t = uTime * max(0.0, uMotionScale);

  // Tear after warping so it reads as a "sync" artifact.
  uv = applyTear(uv, t);

  vec3 col = sampleWithChroma(uv);
  col = cheapGlow(uv, col);

  // Scanlines (animated).
  col *= scanlines(uv, t);

  // Noise (animated; reduced motion -> static).
  float n1 = hash12(uv * uResolution + vec2(t * 60.0, t * 37.0));
  float n2 = hash12(uv * (uResolution * 2.3) + vec2(t * 211.0, t * 151.0));
  float n = (n1 * 0.65 + n2 * 0.35);
  col += (n - 0.5) * uNoiseAmount;

  // Subtle horizontal "sparkle" noise.
  float hn = hash12(vec2(uv.y * uResolution.y, t * 120.0));
  col += (hn - 0.5) * (uNoiseAmount * 0.25);

  // Vignette.
  vec2 p = vUv - 0.5;
  float r = dot(p, p);
  float vig = smoothstep(0.85, 0.25, r);
  col *= mix(1.0, vig, uVignette);

  // Shadow mask.
  col = shadowMask(vUv, col);

  // Boot-up feel: brightness ramp + slight vertical jitter.
  float boot = clamp(uTime / 0.6, 0.0, 1.0);
  float bootEase = boot * boot * (3.0 - 2.0 * boot);
  float jitter = (hash12(vec2(uTime * 12.0, 1.23)) - 0.5) * (1.0 - bootEase) * 0.02 * uMotionScale;
  col *= bootEase;
  col += vec3(jitter);

  gl_FragColor = vec4(col, 1.0);
}
`;

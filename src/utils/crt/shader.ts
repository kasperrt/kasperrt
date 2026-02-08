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
uniform float uOpen; // 0.0 (off) -> 1.0 (on)

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

// CRT opening/closing animation mapping
vec2 applyOpenEffect(vec2 uv, float open) {
  // We want the screen to start as a horizontal line or point in the center, 
  // then expand horizontally, then vertically (or both, but maybe non-uniformly).
  
  // open goes 0->1
  // To avoid division by zero, clamp minimum scale.
  
  // Nonlinear curve for "pop" effect.
  float t = smoothstep(0.0, 1.0, open);
  
  // Horizontal expansion finishes faster than vertical?
  // Or maybe a "blink" where it's a white dot, then a line, then full screen.
  
  // Simulating the electron beam sweep constraints.
  // Let's vary scaleX and scaleY.
  
  // Phase 1: vertical line opens up (0.0 to 0.5 of open)
  // Phase 2: horizontal sweep fills (0.2 to 1.0 of open)
  
  // Actually, standard CRT turn on usually:
  // 1. Center dot appears.
  // 2. Expands horizontally to a line.
  // 3. Expands vertically to fill screen.
  
  // Let's map 'open' to these phases.
  // But doing it all in shader might be tricky if we want perfect timing control.
  // A simple approach: Scale UVs away from center.
  
  float vert = smoothstep(0.0, 0.8, open); // vertical expansion 0->0.8
  float horz = smoothstep(0.0, 1.0, open); // horizontal expansion 0->1.0
  // Or enable non-uniform scaling closer to real CRT:
  // Often it's Height first then Width, or Width then Height.
  // Let's say it expands from a thin horizontal line.
  
  float scaleY = vert * 0.99 + 0.01; 
  float scaleX = horz * 0.99 + 0.01;
  
  // Remap uv so that [0,1] corresponds to the visible part of the "opening" screen.
  // uv = (vUv - 0.5) / scale + 0.5
  vec2 centered = uv - 0.5;
  centered.y /= scaleY;
  centered.x /= scaleX;
  
  // If we are outside the "beam", it's black.
  return centered + 0.5;
}


void main() {
  vec2 uv = vUv;
  
  // 1. Apply Open/Close Logic (Geometric scaling)
  // When uOpen < 1.0, we are "zoomed in" to a portion of the screen, 
  // or rather, the screen content is compressed into a smaller area.
  // Wait, if we want the content to be compressed, we should scale UVs UP?
  // No, if the screen area is small, we are seeing the whole content *sqeezed*.
  
  // Let's simulate the "raster" being confined to a small box.
  // So the *quad* is full screen, but we only draw pixels in the center.
  // The content inside that center box should be the full texture.
  
  // Logic:
  // uOpen = 0.1 -> We want the full texture (0..1) to be mapped to a small box in the center of the viewport (e.g. 0.45..0.55).
  // So for a fragment at 0.5 (center), it samples texture at 0.5.
  // For a fragment at 0.0 (edge), it's outside the box -> black.
  
  // Define the "visible box" size based on uOpen.
  float openCurve = uOpen * uOpen * (3.0 - 2.0 * uOpen); // smoothstep-ish
  
  // Let's try expanding from a horizontal line.
  float scaleX = smoothstep(0.0, 1.0, uOpen); // Width expands immediately?
  // Maybe width expands quickly 0.0->0.4, height 0.3->1.0
  
  // Refined "Turn On" curve:
  // 0.0 -> 0.2: Dot grows to short line
  // 0.2 -> 0.6: Line hits full width
  // 0.4 -> 1.0: Height opens up
  
  float animScaleX = smoothstep(0.0, 0.4, uOpen); 
  float animScaleY = smoothstep(0.3, 1.0, uOpen); 
  
  // Add a tiny bit of base scale so it's not singular.
  float sx = 0.005 + 0.995 * animScaleX;
  float sy = 0.002 + 0.998 * animScaleY;
  
  // Inverse scale: we map viewport coordinate *into* texture space.
  // if uv.y is 0.5 (center), texture.y = 0.5.
  // if uv.y is 0.6 (slightly up), and sy is small (0.1),
  // distance from center is 0.1. in texture space that's 0.1 / 0.1 = 1.0 (top edge).
  
  vec2 centered = uv - 0.5;
  vec2 texUv = vec2(centered.x / sx, centered.y / sy) + 0.5;
  
  // Check bounds
  if (texUv.x < 0.0 || texUv.x > 1.0 || texUv.y < 0.0 || texUv.y > 1.0) {
    // We are outside the active beam area.
    // Making it completely black is one way. 
    // During "turn off", CRTs often have a bright white dot/line.
    // If we want that flash:
    
    // Simple approach: just black for now, maybe add bloom later.
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  
  // Update uv to the "squeezed" texture coordinate
  uv = texUv;

  // Overscan first, then curvature.
  uv = applyOverscan(uv, uOverscan);
  uv = barrelDistort(uv, uCurvature);

  // Outside becomes black (overscan crop + curvature corners).
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Time for effects
  float t = uTime * max(0.0, uMotionScale);

  // Tear.
  uv = applyTear(uv, t);

  // Sample.
  vec3 col = sampleWithChroma(uv);
  col = cheapGlow(uv, col);

  // Scanlines.
  col *= scanlines(uv, t);

  // Noise.
  float n1 = hash12(uv * uResolution + vec2(t * 60.0, t * 37.0));
  float n2 = hash12(uv * (uResolution * 2.3) + vec2(t * 211.0, t * 151.0));
  float n = (n1 * 0.65 + n2 * 0.35);
  col += (n - 0.5) * uNoiseAmount;

  // Vignette.
  float vig = vignette(vUv); // Use original vUv for vignette? 
  // No, vignette usually follows the screen tube, which is physically consistent.
  // But if we are shrinking the image, does the vignette shrink too?
  // For a "turn on" effect, the beam is illuminating a small part of the phosphor.
  // So the vignette (corner darkness) might not apply to the center dot.
  // Let's use the transformed 'uv' for vignette if we want "screen look" on the minimal image,
  // OR use 'vUv' if we want the physical tube edges to be dark.
  // Since we black out outside the beam, let's just vignette the content.
  col *= mix(1.0, vignette(uv), uVignette); 

  // Shadow mask.
  col = shadowMask(vUv, col);

  // Brightness boost when compressed (conservation of energy-ish)
  float compressionBoost = 1.0 + (1.0 - animScaleX * animScaleY) * 2.0; 
  col *= compressionBoost;
  
  // Fade in/out at extremes to avoid hard pop
  float fade = smoothstep(0.0, 0.05, uOpen);
  col *= fade;

  gl_FragColor = vec4(col, 1.0);
}
`;

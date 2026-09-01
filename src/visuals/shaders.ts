export const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const fragmentShader = /* glsl */ `
varying vec2 vUv;

uniform float uTime;
uniform float uFlowTime;
uniform vec2 uResolution;

uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform float uBeat;
uniform float uBeatAge;
uniform float uBeatPunch;
uniform float uHit;

uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform float uPaletteShift;
uniform float uHueShift;
uniform float uColorSpread;

uniform float uMode;
uniform float uWarp;
uniform float uChaos;
uniform float uScale;
uniform float uDetail;
uniform float uTexture;

uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;

uniform float uVignette;
uniform float uGrain;
uniform float uChroma;
uniform float uGlow;

//
// Textureless GLSL 2D simplex noise — Ian McEwan, Ashima Arts. MIT License.
//
vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(
    0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
    0.0
  );
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// 3-octave fbm — the only multi-octave primitive, kept deliberately small.
float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += snoise(p) * a;
    p = p * 2.03 + vec2(7.3, 1.7);
    a *= 0.5;
  }
  return s;
}

// Two-pass domain warp — cheap, but folds the plane enough to look chaotic.
vec2 warp(vec2 p, float t, float amt) {
  vec2 q1 = vec2(
    fbm3(p + vec2(0.0, t * 0.4)),
    fbm3(p + vec2(3.1, 1.7) - t * 0.35)
  );
  p += q1 * amt;
  vec2 q2 = vec2(
    fbm3(p * 1.5 + 2.0 + t * 0.2),
    fbm3(p * 1.5 + vec2(6.0, 9.0))
  );
  p += q2 * amt * 0.55;
  return p;
}

// -- Palette --------------------------------------------------------------

vec3 stopAt(int i) {
  if (i <= 0) return uC0;
  if (i == 1) return uC1;
  if (i == 2) return uC2;
  if (i == 3) return uC3;
  return uC4;
}

vec3 palette(float x) {
  x = fract(x) * 5.0;
  vec3 col = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 5; i++) {
    float d = abs(x - float(i));
    d = min(d, 5.0 - d);
    float w = smoothstep(1.6, 0.0, d);
    col += stopAt(i) * w;
    wsum += w;
  }
  return col / max(wsum, 0.0001);
}

vec3 hueRotate(vec3 c, float a) {
  const vec3 k = vec3(0.57735026);
  float cosA = cos(a);
  return c * cosA + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - cosA);
}

vec3 adjustSaturation(vec3 c, float s) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), c, s);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  uv.x *= aspect;

  // Mechanical hit — whole-frame shake (only strong hits, uHit^2).
  uv += vec2(sin(uTime * 137.0), cos(uTime * 119.0)) * (uHit * uHit) * 0.02;

  float t = uFlowTime;

  // Warp amount is nearly static — audio barely nudges it, so the wave field
  // never turns into high-frequency mush when the music is loud.
  float warpAmt = 0.26 + uWarp * 0.36 + uChaos * 0.5;
  warpAmt *= 1.0 + uBass * 0.14 + uBeat * 0.12;

  float rot = t * 0.05 + uMid * 0.12;
  float cs = cos(rot);
  float sn = sin(rot);
  vec2 p = mat2(cs, -sn, sn, cs) * (uv * uScale);
  // Bass thump — a sharp inward zoom pop on the hit.
  p *= 1.0 - uBass * 0.04 - uBeat * 0.075;

  vec2 wp = warp(p, t, warpAmt);

  // -- Two-scale field --------------------------------------------------
  // wave  = big, low-frequency structure. This is what must stay visible.
  // detail = finer structure that rides on top, lifted by the music.
  float wave = fbm3(wp * 0.62 + vec2(t * 0.18, t * 0.07));
  float detail = fbm3(wp * 2.1 + vec2(-t * 0.25, t * 0.2));
  float fold = abs(snoise(wp * 1.5 - t * 0.2));
  float detailAmt = uDetail * (0.14 + uMid * 0.28 + uTreble * 0.4);

  // Surface texture veil — applied to the final color only, never the field.
  float texDrive = uTexture * (0.08 + uMid * 0.3 + uTreble * 0.42 + uLevel * 0.16);
  vec2 tp = wp * (2.2 + uDetail * 2.6) + vec2(t * 0.5, -t * 0.35);
  float tex = abs(snoise(tp)) * 0.6 + abs(snoise(tp * 2.05 + 4.0)) * 0.4;
  tex -= 0.45;

  int mode = int(uMode + 0.5);
  float f;
  if (mode == 1) {
    // Nebula — soft billow.
    f = smoothstep(-0.15, 1.05, abs(wave) * 1.7 + fold * 0.45 - 0.05);
  } else if (mode == 2) {
    // Plasma — interference riding on the warped field.
    float s1 = sin(wp.x * 2.2 + t * 1.4);
    float s2 = sin(wp.y * 1.8 - t * 1.1);
    float s3 = sin((wp.x + wp.y) * 1.4 + wave * 3.0);
    f = (s1 + s2 + s3) * 0.17 + 0.5;
  } else if (mode == 3) {
    // Ridgeline — sharp veins.
    float r = 1.0 - abs(wave);
    f = smoothstep(0.12, 1.0, r * r * 1.7 + fold * 0.4);
  } else if (mode == 4) {
    // Kaleidoscope — six-fold radial mirror symmetry.
    float ang = atan(wp.y, wp.x);
    float rad = length(wp);
    float seg = 6.2831853 / 6.0;
    ang = abs(mod(ang + t * 0.15, seg) - seg * 0.5);
    vec2 kp = vec2(cos(ang), sin(ang)) * rad;
    float kn = fbm3(kp * 1.5 + t * 0.2);
    f = 0.5 + 0.5 * sin(kn * 3.5 + rad * 3.2 - t * 0.8);
  } else if (mode == 5) {
    // Tunnel — rings and spokes receding into the distance.
    float ang = atan(wp.y, wp.x);
    float rad = length(wp) + 0.12;
    float depth = 0.4 / rad + t * 0.6;
    float rings = 0.5 + 0.5 * sin(depth * 10.0);
    float spokes = 0.5 + 0.5 * sin(ang * 8.0 + depth * 2.0);
    f = mix(rings, rings * spokes, 0.45) * smoothstep(0.0, 0.5, rad);
  } else if (mode == 6) {
    // Cells — animated Voronoi mosaic.
    vec2 gp = wp * 2.0;
    vec2 gi = floor(gp);
    vec2 gf = fract(gp);
    float md = 1.5;
    for (int y = 0; y < 3; y++) {
      for (int x = 0; x < 3; x++) {
        vec2 o = vec2(float(x) - 1.0, float(y) - 1.0);
        vec2 rnd = vec2(hash21(gi + o), hash21(gi + o + 21.3));
        rnd = 0.5 + 0.45 * sin(t * 0.8 + 6.2831853 * rnd);
        md = min(md, length(o + rnd - gf));
      }
    }
    f = smoothstep(0.05, 0.95, md);
  } else if (mode == 7) {
    // Contours — stepped topographic map.
    float h = 0.5 + 0.55 * wave + fold * 0.22;
    float steps = floor(h * 6.0) / 6.0;
    float edge = fract(h * 6.0 - t * 0.25);
    float rim = smoothstep(0.0, 0.12, edge) * smoothstep(0.4, 0.14, edge);
    f = steps + rim * 0.55;
  } else if (mode == 8) {
    // Marble — turbulent veined stone.
    float veins = sin((wp.x - wp.y) * 1.8 + (fold * 2.0 + detail) * 3.5 + t * 0.3);
    f = pow(0.5 + 0.5 * veins, 1.4) * 0.9 + 0.08;
  } else {
    // Lava Lamp — big folded blobs / ribbons (the default look).
    float ribbons = 0.5 + 0.5 * sin(wave * 5.0 + wp.y * 1.3 + t * 0.7);
    f = mix(0.5 + 0.5 * wave + fold * 0.3, ribbons, 0.5);
  }
  // Detail rides on top of the wave shape (audio-lifted), kept modest.
  f += (detail * 0.5 + fold * 0.3 - 0.15) * detailAmt;
  f = clamp(f, 0.0, 1.15);

  // Wave luminance — GUARANTEES the waves read as light/dark regardless of what
  // the palette / hue rotation are doing. ~3:1 bright-to-dark across the field.
  float waveLum = smoothstep(0.08, 0.92, f);

  // Gradient coordinate. Spread kept gentle now that brightness carries the
  // wave shape — the palette adds color variety without strobing.
  float gBase = uPaletteShift + uBass * 0.05 - uTreble * 0.06 + t * 0.008;
  float spread = 0.22 + uColorSpread * 0.55;
  float cpos = f * spread + gBase;

  float chroma = uChroma * (0.015 + uTreble * 0.04 + uMid * 0.02) + uHit * 0.13;
  vec3 color = vec3(
    palette(cpos + chroma).r,
    palette(cpos).g,
    palette(cpos - chroma).b
  );

  // A second palette read on the crests for extra simultaneous color.
  float crest = smoothstep(0.65, 1.1, f);
  color = mix(color, palette(cpos + 0.33 + uMid * 0.2), crest * 0.4);

  color = hueRotate(color, uHueShift);

  // Impose the wave brightness structure.
  color *= 0.42 + 1.0 * waveLum;

  // Exposure — bounded so loud passages brighten but never blow out to white.
  // Bass beat now punches harder here.
  float exposure = min(1.65, 0.82 + uLevel * 0.36 + uBeat * 0.5);
  color *= exposure;

  float d = length(vUv - 0.5);
  float glow = uGlow * (0.1 + uBass * 0.6 + uBeat * 0.7) * smoothstep(0.85, 0.0, d);
  color += glow * hueRotate(palette(gBase + 0.15) + 0.1, uHueShift);

  // Bass shockwave — a bright ring that expands from the center on each hit and
  // fades in ~0.25 s. uBeatAge is seconds since the last strong beat.
  float ringDist = (d - uBeatAge * 1.15) * 7.0;
  float ring = exp(-uBeatAge * 5.0) * exp(-ringDist * ringDist);
  color += ring * (0.35 + uBeatPunch * 0.7) *
    (hueRotate(palette(gBase + 0.42) + 0.12, uHueShift));

  color += uBeat * uBeat * 0.12;

  // Surface texture as a light luminance veil — grain / filament detail over
  // the color. Kept small so it never buries the waves.
  color *= 1.0 + tex * texDrive * 0.32;

  color = adjustSaturation(color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color *= uBrightness;
  color = max(color, 0.0);

  // Mechanical hit — a brief cold "steel" flash plus sparse white sparks, so a
  // click / snare / metallic transient reads as a sharp crack, not a bloom.
  float steel = uHit * uHit;
  if (steel > 0.001) {
    float lum = dot(color, vec3(0.3, 0.5, 0.2));
    vec3 metal = vec3(lum) * vec3(0.82, 0.9, 1.12) + 0.04;
    color = mix(color, metal, steel * 0.4);
    float spark = step(0.9925, hash21(gl_FragCoord.xy * 0.7 + floor(uTime * 45.0)));
    color += spark * uHit * 0.9;
  }

  // Roll off highlights well before pure white so structure stays readable.
  color = color / (1.0 + max(color - 0.65, 0.0) * 1.3);

  float vig = smoothstep(1.25, 0.3, length(uv * vec2(0.82, 1.0)));
  color *= mix(1.0, vig, uVignette);

  float g = hash21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
  color += g * (uGrain + uLevel * 0.06 * uTexture);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

/**
 * GLSL for the holographic portrait. Framework-free (strings only).
 *
 * Figure: the owner's cut-out photo on a subdivided plane that is displaced by a hand-authored depth map, so the
 * parallax is real geometry. The photo's own lighting is left alone; the depth map's normals only add a little relative
 * relight (a light that follows the cursor), a cyan / amber rim read off the alpha edge, scanlines and a travelling
 * sweep. Output is linear HDR: the composer's bloom and ACES do the rest.
 *
 * Glass: three passes of one rounded-rect shader. 0 = the dark pane behind him, 1 = the hairline border and brackets
 * (drawn under the figure, so the top of his hair breaks out of the frame), 2 = the gloss streak in front of everything.
 */

export const FIGURE_VERT = /* glsl */ `
uniform sampler2D uDepth;
uniform float uDepthScale;
varying vec2 vUv;
varying vec3 vLocal;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).b;
  vec3 p = position;
  p.z += (d - 0.35) * uDepthScale;
  vLocal = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const FIGURE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uTime;
uniform float uIntro;
uniform float uSweep;
uniform float uExposure;
uniform float uRelight;
uniform float uBreath;
uniform float uFade;
uniform vec2 uLight;
uniform vec2 uFrameHalf;
uniform vec2 uFrameCenter;
uniform float uFrameR;
varying vec2 vUv;
varying vec3 vLocal;

const vec3 CYAN = vec3(0.016, 0.65, 0.86);
const vec3 AMBER = vec3(0.91, 0.34, 0.003);

float sdRR(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float sq(float x) { return x * x; }
float alphaAt(vec2 uv) { return texture2D(uMap, uv).a; }

void main() {
  vec2 uv = vUv;

  // Intro: the figure scans in from the feet up. Never fully dark: a dim ghost stands there first.
  float scanY = uIntro * 1.25 - 0.1;
  float live = mix(0.32, 1.0, smoothstep(scanY, scanY - 0.14, uv.y));
  float introBand = exp(-sq((uv.y - scanY) / 0.018)) * (1.0 - smoothstep(0.85, 1.0, uIntro)) * step(0.001, uIntro);

  // Travelling sweep: a thin cyan band; the photo splits a hair of chroma inside it.
  float sweepY = -0.15 + 1.3 * uSweep;
  float band = exp(-sq((uv.y - sweepY) / 0.022)) * step(0.001, uSweep) * step(uSweep, 0.999);
  float ca = 0.0006 + 0.0035 * band;
  vec4 c = texture2D(uMap, uv);
  vec3 col = vec3(texture2D(uMap, uv + vec2(ca, 0.0)).r, c.g, texture2D(uMap, uv - vec2(ca, 0.0)).b);
  float a = c.a;

  // Silhouette: how close this pixel is to the edge, and which way is out.
  vec2 o = uTexel * 10.0;
  float m = 0.0;
  m += alphaAt(uv + vec2(o.x, 0.0));
  m += alphaAt(uv - vec2(o.x, 0.0));
  m += alphaAt(uv + vec2(0.0, o.y));
  m += alphaAt(uv - vec2(0.0, o.y));
  m += alphaAt(uv + o * 0.7071);
  m += alphaAt(uv - o * 0.7071);
  m += alphaAt(uv + vec2(o.x, -o.y) * 0.7071);
  m += alphaAt(uv + vec2(-o.x, o.y) * 0.7071);
  float edge = a * (1.0 - m * 0.125);
  vec2 g = vec2(
    alphaAt(uv + vec2(o.x, 0.0)) - alphaAt(uv - vec2(o.x, 0.0)),
    alphaAt(uv + vec2(0.0, o.y)) - alphaAt(uv - vec2(0.0, o.y))
  );
  vec2 outward = -g / (length(g) + 1e-4);

  // Normals baked from the authored depth (R,G), for a relight that is relative to the photo's own lighting.
  vec2 nxy = (texture2D(uDepth, uv).rg - 0.5) * 2.0;
  vec3 n = vec3(nxy, sqrt(max(0.0, 1.0 - dot(nxy, nxy))));
  vec3 L = normalize(vec3(-0.5 + uLight.x * 0.9, 0.6 + uLight.y * 0.5, 0.8));
  float relit = dot(n, L) - dot(vec3(0.0, 0.0, 1.0), L);
  col *= 1.0 + uRelight * relit;

  // Sit the photo in the scene's palette without turning the skin blue: a faint cool lift in the shadows.
  float lum = dot(col, vec3(0.3, 0.6, 0.1));
  col = mix(col, col * vec3(0.9, 1.0, 1.08), 0.35 * (1.0 - smoothstep(0.0, 0.5, lum)));

  // Rims: cyan from the upper right (structure), amber from the lower left (the agent's warmth).
  float rimMask = smoothstep(0.0, 0.5, edge) * 0.8;
  float wc = 0.28 + 0.72 * clamp(dot(outward, normalize(vec2(0.8, 0.6))), 0.0, 1.0);
  float wa = clamp(dot(outward, normalize(vec2(-0.8, -0.5))), 0.0, 1.0);
  col += (CYAN * wc * 0.55 + AMBER * wa * 0.3) * rimMask * uBreath;

  // Scanlines and a slow flicker band; both light.
  float lines = 0.5 + 0.5 * sin(uv.y * 220.0 * 6.2832 + uTime * 0.6);
  col *= 1.0 - 0.07 * lines;
  col *= 1.0 + 0.025 * sin(uv.y * 22.0 - uTime * 0.9);

  col += CYAN * band * 0.32 * a;
  col += mix(CYAN, vec3(1.0), 0.5) * introBand * 1.4 * a;
  col *= uExposure * live;

  // Clip to the glass, except above the shoulders: his hair breaks out of the top of the frame.
  float d = sdRR(vLocal.xy - uFrameCenter, uFrameHalf, uFrameR);
  float inside = 1.0 - smoothstep(-0.004, 0.003, d);
  float pop = smoothstep(0.74, 0.82, uv.y);
  a *= max(inside, pop);
  a *= mix(0.55, 1.0, live) * uFade;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}
`;

export const GLASS_VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLASS_FRAG = /* glsl */ `
uniform float uMode;
uniform float uFade;
uniform float uTime;
uniform float uBreath;
uniform float uSheen;
uniform float uIntro;
uniform vec2 uHalf;
uniform float uR;
varying vec2 vP;

const vec3 CYAN = vec3(0.016, 0.65, 0.86);
const vec3 AMBER = vec3(0.91, 0.34, 0.003);

float sdRR(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float sq(float x) { return x * x; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  float d = sdRR(vP, uHalf, uR);
  vec2 q = vP / (uHalf * 2.0) + 0.5; // 0..1 across the frame, y up

  if (uMode < 0.5) {
    // The pane behind him: dark glass, faint grid, a cyan well at the foot, a slow scan band.
    float fill = 1.0 - smoothstep(-0.002, 0.003, d);
    vec3 base = mix(vec3(0.004, 0.012, 0.018), vec3(0.012, 0.05, 0.065), pow(clamp(1.0 - q.y, 0.0, 1.0), 2.2));
    vec2 gp = vP * 11.0;
    vec2 gl = abs(fract(gp) - 0.5);
    float grid = (1.0 - smoothstep(0.0, 0.03, min(gl.x, gl.y))) * 0.5;
    base += CYAN * grid * 0.035;
    base += CYAN * pow(clamp(1.0 - q.y, 0.0, 1.0), 3.0) * 0.08 * uBreath;
    base += AMBER * pow(max(0.0, 1.0 - length(q - vec2(0.12, 0.08)) * 2.2), 2.0) * 0.03;
    float sweep = exp(-sq((q.y - fract(uTime * 0.07)) / 0.05)) * 0.05;
    base += CYAN * sweep;
    base += (hash(floor(vP * 380.0) + floor(uTime * 12.0)) - 0.5) * 0.012;
    gl_FragColor = vec4(base, 0.74 * fill * mix(0.4, 1.0, uIntro) * uFade);
    return;
  }

  if (uMode < 1.5) {
    // Hairline and brackets, just outside the figure's clip (d > 0), so the figure never covers the line.
    float line = 1.0 - smoothstep(0.0015, 0.0045, abs(d - 0.004));
    float glow = exp(-max(d, 0.0) * 55.0) * step(0.0, d) * 0.18;
    vec2 e = abs(vP) - uHalf;
    float corner = step(-0.17, e.x) * step(-0.17, e.y);
    float thick = 1.0 - smoothstep(0.004, 0.009, abs(d - 0.007));
    float diag = 0.55 + 0.45 * sin(atan(vP.y, vP.x) * 1.0 + 0.6);
    vec3 col = CYAN * (line * 1.2 * diag + glow * uBreath);
    col += AMBER * thick * corner * 1.25;
    // Ticks inside the right and left edges: a ruler.
    float ruleBand = (1.0 - smoothstep(0.0, 0.012, abs(abs(vP.x) - (uHalf.x + 0.03)))) * step(abs(vP.y), uHalf.y - 0.2);
    float tick = step(0.82, fract(vP.y * 24.0)) * (0.5 + 0.5 * step(0.96, fract(vP.y * 4.0 + 0.5)));
    col += CYAN * ruleBand * tick * 0.5;
    float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0) * mix(0.3, 1.0, uIntro);
    gl_FragColor = vec4(col * uFade, a * uFade);
    return;
  }

  // Gloss in front of everything: a soft diagonal streak that slides with the tilt, and a top-left corner sheen.
  float inside = 1.0 - smoothstep(-0.004, 0.0, d);
  float s = dot(q - 0.5, normalize(vec2(1.0, 0.55)));
  float streak = exp(-sq((s - uSheen) / 0.07)) * 0.1 + exp(-sq((s - uSheen - 0.2) / 0.025)) * 0.06;
  float corner2 = pow(max(0.0, 1.0 - length(q - vec2(0.0, 1.0)) * 1.1), 2.0) * 0.07;
  float v = (streak + corner2) * inside;
  gl_FragColor = vec4(vec3(0.75, 0.93, 1.0) * v * uFade, v * uFade);
}
`;

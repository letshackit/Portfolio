/**
 * Glass-panel and conduit materials. Plain ShaderMaterials (no transmission pass, no extra render target): a rounded
 * panel with a glowing rim, a faint grid, an optional content texture and a scan-line reveal that "materialises" it.
 * They take part in the scene fog so distant panels sink into the dark like everything else.
 */
import { Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils, type Texture } from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uTint;
uniform float uReveal;
uniform float uAlpha;
uniform float uGlow;
uniform float uTime;
uniform vec2 uSize;
uniform float uRadius;
uniform float uHasMap;
uniform sampler2D uMap;
varying vec2 vUv;
#include <fog_pars_fragment>

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float d = sdRound(p, uSize * 0.5, uRadius);
  float inside = 1.0 - smoothstep(-0.004, 0.004, d);
  if (inside < 0.01) discard;

  // The reveal sweeps from the lower left to the upper right; a bright band rides its leading edge.
  float k = vUv.y * 0.72 + vUv.x * 0.28;
  float front = uReveal * 1.35 - 0.18;
  float vis = 1.0 - smoothstep(front - 0.1, front, k);
  float band = smoothstep(front - 0.14, front - 0.02, k) * (1.0 - smoothstep(front - 0.02, front + 0.03, k));

  float rim = exp(-abs(d) * 46.0);
  vec2 g = abs(fract(p * 5.0) - 0.5);
  float grid = (1.0 - smoothstep(0.0, 0.025, min(g.x, g.y))) * 0.05;
  float sheen = 0.5 + 0.5 * sin((vUv.x * 1.4 - vUv.y * 0.9) * 6.0 + uTime * 0.6);

  vec3 body = vec3(0.015, 0.05, 0.065) + uTint * 0.05 * (0.55 + 0.45 * vUv.y);
  vec3 col = body + uTint * (rim * 1.7 * uGlow + grid) + uTint * sheen * 0.025;
  vec4 m = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(0.0);
  col = mix(col, m.rgb * 1.15, m.a);
  col += vec3(0.55, 0.92, 1.0) * band * 1.8;

  float alpha = (0.5 + rim * 0.6 + m.a * 0.45) * vis + band * 0.8;
  gl_FragColor = vec4(col, clamp(alpha * uAlpha, 0.0, 1.0) * inside);
  #include <fog_fragment>
}`;

export interface GlassOptions {
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
  readonly map?: Texture | null;
  readonly tint?: Color;
  readonly glow?: number;
}

export type GlassMaterial = ShaderMaterial;

export function createGlassMaterial(o: GlassOptions): GlassMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTint: { value: (o.tint ?? new Color('#22d3ee')).clone() },
        uReveal: { value: 0 },
        uAlpha: { value: 1 },
        uGlow: { value: o.glow ?? 1 },
        uTime: { value: 0 },
        uSize: { value: [o.width, o.height] },
        uRadius: { value: o.radius ?? 0.08 },
        uHasMap: { value: o.map ? 1 : 0 },
        uMap: { value: o.map ?? null },
      },
    ]),
  });
}

const RAIL_VERT = /* glsl */ `
varying float vAlong;
#include <fog_pars_vertex>
void main() {
  vAlong = uv.x;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const RAIL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uHead;
uniform float uPacket;
uniform float uBoost;
uniform float uTime;
varying float vAlong;
#include <fog_pars_fragment>
void main() {
  // Behind the head the rail is lit; ahead of it, dim. The packet is a hot amber bead just in front of the head.
  float lit = 1.0 - smoothstep(uHead - 0.004, uHead + 0.004, vAlong);
  float d = (vAlong - uPacket) * 800.0;
  float bead = exp(-d * d);
  float flow = 0.5 + 0.5 * sin(vAlong * 900.0 - uTime * 6.0);
  vec3 col = uColor * (0.16 + lit * (0.9 + 0.45 * flow) * uBoost) + uHot * bead * 2.4;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

export function createRailMaterial(color: Color, hot: Color): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: RAIL_VERT,
    fragmentShader: RAIL_FRAG,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uColor: { value: color.clone() },
        uHot: { value: hot.clone() },
        uHead: { value: 0 },
        uPacket: { value: 0 },
        uBoost: { value: 1 },
        uTime: { value: 0 },
      },
    ]),
  });
}

import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  FrontSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { DIM, type BadgeKind } from '../slots';
import type { Quality } from './quality';
import { chamferPoints, circleGeometry, roundedPolygon, slab } from './shapes';
import { createSoftTexture } from './textures';

/** Slab depth and bevel in world units. The front face sits at depth / 2 + bevel. */
export const SLAB = { depth: 0.07, bevel: 0.025 } as const;
export const FRONT_Z = SLAB.depth / 2 + SLAB.bevel;

/** A colour pushed past 1.0 so the bloom pass picks it up. */
export function hdr(hex: string, boost: number): Color {
  return new Color(hex).multiplyScalar(boost);
}

/** How much of each slab's shorter side the cut corners take. */
const CHAMFER = 0.13;

/** Everything the slabs share: materials, geometries, textures. Built once per quality tier, disposed with it. */
export interface Kit {
  readonly q: Quality;
  /** Smoked glass body, one tinted cool and one warm (the paper). */
  readonly glass: MeshPhysicalMaterial;
  readonly glassPaper: MeshPhysicalMaterial;
  /** Fresnel shells: the silhouette and bevels glow, the face stays clear. */
  readonly rim: ShaderMaterial;
  readonly rimGold: ShaderMaterial;
  readonly edge: LineBasicMaterial;
  readonly edgeGold: LineBasicMaterial;
  readonly ghost: LineBasicMaterial;
  readonly ghostGold: LineBasicMaterial;
  readonly ringCyan: LineBasicMaterial;
  readonly ringAmber: LineBasicMaterial;
  readonly satCyan: MeshBasicMaterial;
  readonly satAmber: MeshBasicMaterial;
  readonly geo: Readonly<Record<BadgeKind, { readonly body: ExtrudeGeometry; readonly edges: EdgesGeometry<ExtrudeGeometry> }>>;
  readonly sat: SphereGeometry;
  readonly circle: BufferGeometry;
  readonly soft: CanvasTexture;
  dispose(): void;
}

function glassFor(warm: boolean): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(warm ? '#0d0a04' : '#010a0e'),
    emissive: new Color(warm ? '#5a3604' : '#06424f'),
    emissiveIntensity: warm ? 0.14 : 0.12,
    metalness: 0.1,
    roughness: 0.22,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.35,
    specularIntensity: 0.5,
    transparent: true,
    opacity: 0.93,
    side: FrontSide,
    depthWrite: false,
  });
}

/** Fresnel rim: `base` on the silhouette, the other half of the palette on the lower right edges. */
function makeRim(base: string, other: string, mixAmount: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(base) }, uWarm: { value: new Color(other) }, uMix: { value: mixAmount } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uWarm; uniform float uMix; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        float f = pow(1.0 - abs(dot(n, normalize(vV))), 2.2);
        float side = smoothstep(0.05, 0.75, n.x * 0.85 - n.y * 0.5);
        vec3 c = mix(uColor, uWarm * 1.1, side * uMix);
        gl_FragColor = vec4(c * (0.06 + f * 3.6), 1.0);
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
}

export function createKit(q: Quality): Kit {
  const make = (kind: BadgeKind) => {
    const { w, h } = DIM[kind];
    const body = slab(roundedPolygon(chamferPoints(w, h, Math.min(w, h) * CHAMFER), 0.03), SLAB.depth, SLAB.bevel);
    return { body, edges: new EdgesGeometry(body, 28) };
  };
  const geo = { hero: make('hero'), stone: make('stone'), cert: make('cert'), paper: make('paper') };
  const line = (hex: string, boost: number, opacity: number) => new LineBasicMaterial({ color: hdr(hex, boost), transparent: true, opacity, depthWrite: false });
  const edge = line('#67e8f9', 2.2, 0.95);
  const edgeGold = line('#fbbf24', 2.2, 0.95);
  const ghost = line('#22d3ee', 1.4, 0.3);
  const ghostGold = line('#f59e0b', 1.4, 0.3);
  const ringCyan = line('#67e8f9', 2.2, 0.75);
  const ringAmber = line('#fbbf24', 2.2, 0.75);
  const satCyan = new MeshBasicMaterial({ color: hdr('#67e8f9', 3), toneMapped: false });
  const satAmber = new MeshBasicMaterial({ color: hdr('#f59e0b', 3.2), toneMapped: false });
  const glass = glassFor(false);
  const glassPaper = glassFor(true);
  const rim = makeRim('#22d3ee', '#f59e0b', 0.5);
  const rimGold = makeRim('#f59e0b', '#22d3ee', 0.4);
  const sat = new SphereGeometry(1, 16, 12);
  const circle = circleGeometry();
  const soft = createSoftTexture();
  return {
    q,
    glass,
    glassPaper,
    rim,
    rimGold,
    edge,
    edgeGold,
    ghost,
    ghostGold,
    ringCyan,
    ringAmber,
    satCyan,
    satAmber,
    geo,
    sat,
    circle,
    soft,
    dispose() {
      for (const m of [glass, glassPaper, rim, rimGold, edge, edgeGold, ghost, ghostGold, ringCyan, ringAmber, satCyan, satAmber]) m.dispose();
      for (const g of Object.values(geo)) {
        g.body.dispose();
        g.edges.dispose();
      }
      sat.dispose();
      circle.dispose();
      soft.dispose();
    },
  };
}

/**
 * The face of a slab: the painted texture lit like a hologram. Scanlines roll slowly down it, a diagonal sheen sweeps
 * across it, a thin bright line travels top to bottom, and on entrance it boots up as a wipe from the top. The text
 * is pushed past 1.0 so bloom turns it into light; hover lifts all of it.
 */
export function createFaceMaterial(map: CanvasTexture, gold: boolean, phase: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uEnter: { value: 1 },
      uPhase: { value: phase },
      uTint: { value: new Color(gold ? '#fbbf24' : '#22d3ee') },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uTime; uniform float uHover; uniform float uEnter; uniform float uPhase; uniform vec3 uTint; varying vec2 vUv;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        float rows = 0.9 + 0.1 * sin(vUv.y * 340.0 - uTime * 2.2);
        float sweepPos = fract(uTime * 0.11 + uPhase);
        float diag = vUv.x * 0.8 - vUv.y * 0.45 + 0.6;
        float sweep = exp(-pow((diag - sweepPos * 2.0) * 5.0, 2.0));
        float scanY = fract(uTime * 0.16 + uPhase * 1.7);
        float scan = exp(-pow((vUv.y - (1.0 - scanY)) * 38.0, 2.0));
        float wipe = 1.0 - smoothstep(uEnter * 1.2 - 0.18, uEnter * 1.2, 1.0 - vUv.y);
        float lift = 1.55 + uHover * 0.7;
        vec3 col = t.rgb * lift * rows + t.rgb * sweep * (0.9 + uHover) + uTint * scan * 0.6 * (0.15 + t.a);
        float a = clamp(t.a + scan * 0.18 + sweep * 0.05 * t.a, 0.0, 1.0) * wipe;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

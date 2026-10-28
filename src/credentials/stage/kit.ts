import {
  BufferGeometry,
  CanvasTexture,
  Color,
  FrontSide,
  LineBasicMaterial,
  LineDashedMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  AdditiveBlending,
  EdgesGeometry,
  ShaderMaterial,
  type ExtrudeGeometry,
} from 'three';
import type { BodyKey } from '../slots';
import { createSoftTexture } from './glyph';
import type { Quality } from './quality';
import { circleGeometry, monolithPoints, rectPoints, regularPolygon, roundedPolygon, shieldPoints, slab } from './shapes';

/** Bevelled slab depth and bevel per kind, in badge units (half-height 1). The front face sits at depth / 2 + bevel. */
export const BODY: Readonly<Record<BodyKey, { depth: number; bevel: number }>> = {
  hex: { depth: 0.3, bevel: 0.075 },
  octa: { depth: 0.3, bevel: 0.075 },
  shield: { depth: 0.3, bevel: 0.075 },
  disc: { depth: 0.3, bevel: 0.075 },
  square: { depth: 0.3, bevel: 0.075 },
  stone: { depth: 0.46, bevel: 0.075 },
  hero: { depth: 0.62, bevel: 0.085 },
  paper: { depth: 0.1, bevel: 0.04 },
};

export function frontZ(kind: BodyKey): number {
  return BODY[kind].depth / 2 + BODY[kind].bevel;
}

/** A colour pushed past 1.0 so the bloom pass picks it up. */
export function hdr(hex: string, boost: number): Color {
  return new Color(hex).multiplyScalar(boost);
}

/** Everything the badges share: materials, geometries, textures. Built once per quality tier, disposed with it. */
export interface Kit {
  readonly glass: Readonly<Record<BodyKey, MeshPhysicalMaterial>>;
  readonly body: Readonly<Record<BodyKey, ExtrudeGeometry>>;
  readonly edges: Readonly<Record<BodyKey, EdgesGeometry>>;
  readonly edge: LineBasicMaterial;
  /** Fresnel shell per body: cyan on the silhouette, with a warm amber rim on the lower right (more on the hero). */
  readonly rim: Readonly<Record<BodyKey, ShaderMaterial>>;
  readonly cyanBasic: MeshBasicMaterial;
  readonly cyanSolid: MeshStandardMaterial;
  readonly cyanLine: LineBasicMaterial;
  readonly amber: MeshBasicMaterial;
  readonly ring: LineBasicMaterial;
  readonly dash: LineDashedMaterial;
  readonly circle: BufferGeometry;
  readonly soft: CanvasTexture;
  dispose(): void;
}

function glassFor(q: Quality, kind: BodyKey): MeshPhysicalMaterial {
  const hero = kind === 'hero';
  return new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    emissive: new Color(kind === 'paper' ? '#0f7a8c' : '#0b4a58'),
    emissiveIntensity: kind === 'paper' ? 0.5 : hero ? 0.16 : 0.12,
    metalness: 0,
    roughness: hero ? 0.04 : 0.03,
    transmission: q.transmission ? 1 : 0,
    thickness: kind === 'paper' ? 0.4 : hero ? 0.9 : 0.7,
    ior: 1.5,
    attenuationColor: new Color('#22d3ee'),
    attenuationDistance: hero ? 6 : 8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: hero ? 2 : 1.7,
    specularIntensity: 1,
    iridescence: q.transmission ? 0.35 : 0,
    iridescenceIOR: 1.3,
    transparent: !q.transmission,
    opacity: q.transmission ? 1 : 0.34,
    side: FrontSide,
    // What sits inside the glass (drawn as transparent, so it is not blurred by the refraction) must show through it.
    depthWrite: false,
  });
}

export function createKit(q: Quality): Kit {
  const kinds: BodyKey[] = ['hex', 'octa', 'shield', 'disc', 'square', 'stone', 'hero', 'paper'];
  const glass = Object.fromEntries(kinds.map((k) => [k, glassFor(q, k)])) as Record<BodyKey, MeshPhysicalMaterial>;
  const body = {
    hex: slab(roundedPolygon(regularPolygon(6), 0.16), BODY.hex.depth, BODY.hex.bevel),
    octa: slab(roundedPolygon(regularPolygon(8, Math.PI / 8), 0.14), BODY.octa.depth, BODY.octa.bevel),
    shield: slab(roundedPolygon(shieldPoints(), 0.12), BODY.shield.depth, BODY.shield.bevel),
    disc: slab(roundedPolygon(regularPolygon(48), 0.3), BODY.disc.depth, BODY.disc.bevel),
    square: slab(roundedPolygon(rectPoints(1.64, 1.64), 0.2), BODY.square.depth, BODY.square.bevel),
    stone: slab(roundedPolygon(rectPoints(1.5, 2), 0.09), BODY.stone.depth, BODY.stone.bevel),
    hero: slab(roundedPolygon(monolithPoints(), 0.07), BODY.hero.depth, BODY.hero.bevel),
    paper: slab(roundedPolygon(rectPoints(1.4, 2), 0.05), BODY.paper.depth, BODY.paper.bevel),
  } satisfies Record<BodyKey, ExtrudeGeometry>;
  const edges = Object.fromEntries(kinds.map((k) => [k, new EdgesGeometry(body[k], 28)])) as unknown as Record<BodyKey, EdgesGeometry>;
  const edge = new LineBasicMaterial({ color: hdr('#8ff1ff', 1.7), transparent: true, opacity: 0.8 });
  // Fresnel shell: the glass's silhouette and bevels glow cyan, the face stays almost clear. Edges that face the lower
  // right take a warm amber instead, so the object is lit cyan from one side and amber from the other, like the hero.
  const makeRim = (warm: number) =>
    new ShaderMaterial({
      uniforms: { uColor: { value: new Color('#22d3ee') }, uWarm: { value: new Color('#f59e0b') }, uMix: { value: warm } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform vec3 uWarm; uniform float uMix; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        float f = pow(1.0 - abs(dot(n, normalize(vV))), 2.4);
        float side = smoothstep(0.05, 0.75, n.x * 0.85 - n.y * 0.5);
        vec3 c = mix(uColor, uWarm * 1.15, side * uMix);
        gl_FragColor = vec4(c * (0.1 + f * 3.2), 1.0);
      }`,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  const WARM: Record<BodyKey, number> = { hero: 0.75, stone: 0.7, hex: 0.5, octa: 0.5, shield: 0.5, disc: 0.5, square: 0.5, paper: 1 };
  const rim = Object.fromEntries(kinds.map((k) => [k, makeRim(WARM[k])])) as Record<BodyKey, ShaderMaterial>;
  const cyanBasic = new MeshBasicMaterial({ color: hdr('#22d3ee', 2.4), toneMapped: false, transparent: true });
  const cyanSolid = new MeshStandardMaterial({
    color: new Color('#062a31'),
    emissive: new Color('#22d3ee'),
    emissiveIntensity: 1.5,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
  });
  const cyanLine = new LineBasicMaterial({ color: hdr('#67e8f9', 2), transparent: true });
  const amber = new MeshBasicMaterial({ color: hdr('#f59e0b', 3), toneMapped: false, transparent: true });
  const ring = new LineBasicMaterial({ color: new Color('#22d3ee'), transparent: true, opacity: 0.34, depthWrite: false });
  const dash = new LineDashedMaterial({
    color: new Color('#67e8f9'),
    dashSize: 0.05,
    gapSize: 0.04,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const circle = circleGeometry();
  const soft = createSoftTexture();
  return {
    glass,
    body,
    edges,
    edge,
    rim,
    cyanBasic,
    cyanSolid,
    cyanLine,
    amber,
    ring,
    dash,
    circle,
    soft,
    dispose() {
      for (const m of Object.values(glass)) m.dispose();
      for (const g of Object.values(body)) g.dispose();
      for (const g of Object.values(edges)) g.dispose();
      for (const m of Object.values(rim)) m.dispose();
      for (const m of [edge, cyanBasic, cyanSolid, cyanLine, amber, ring, dash]) m.dispose();
      circle.dispose();
      soft.dispose();
    },
  };
}

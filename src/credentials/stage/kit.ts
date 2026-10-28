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
import type { BadgeKind } from '../slots';
import { createSoftTexture } from './glyph';
import type { Quality } from './quality';
import { circleGeometry, monolithPoints, rectPoints, regularPolygon, roundedPolygon, slab } from './shapes';

/** Bevelled slab depth and bevel per kind, in badge units (half-height 1). The front face sits at depth / 2 + bevel. */
export const BODY: Readonly<Record<BadgeKind, { depth: number; bevel: number }>> = {
  cert: { depth: 0.3, bevel: 0.075 },
  stone: { depth: 0.46, bevel: 0.075 },
  hero: { depth: 0.62, bevel: 0.085 },
  paper: { depth: 0.1, bevel: 0.04 },
};

export function frontZ(kind: BadgeKind): number {
  return BODY[kind].depth / 2 + BODY[kind].bevel;
}

/** A colour pushed past 1.0 so the bloom pass picks it up. */
export function hdr(hex: string, boost: number): Color {
  return new Color(hex).multiplyScalar(boost);
}

/** Everything the badges share: materials, geometries, textures. Built once per quality tier, disposed with it. */
export interface Kit {
  readonly glass: Readonly<Record<BadgeKind, MeshPhysicalMaterial>>;
  readonly body: Readonly<Record<BadgeKind, ExtrudeGeometry>>;
  readonly edges: Readonly<Record<BadgeKind, EdgesGeometry>>;
  readonly edge: LineBasicMaterial;
  readonly rim: ShaderMaterial;
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

function glassFor(q: Quality, kind: BadgeKind): MeshPhysicalMaterial {
  const hero = kind === 'hero';
  return new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    emissive: new Color('#0b4a58'),
    emissiveIntensity: hero ? 0.14 : 0.1,
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
  const kinds: BadgeKind[] = ['cert', 'stone', 'hero', 'paper'];
  const glass = Object.fromEntries(kinds.map((k) => [k, glassFor(q, k)])) as Record<BadgeKind, MeshPhysicalMaterial>;
  const body = {
    cert: slab(roundedPolygon(regularPolygon(6), 0.16), BODY.cert.depth, BODY.cert.bevel),
    stone: slab(roundedPolygon(rectPoints(1.5, 2), 0.09), BODY.stone.depth, BODY.stone.bevel),
    hero: slab(roundedPolygon(monolithPoints(), 0.07), BODY.hero.depth, BODY.hero.bevel),
    paper: slab(roundedPolygon(rectPoints(1.4, 2), 0.05), BODY.paper.depth, BODY.paper.bevel),
  } satisfies Record<BadgeKind, ExtrudeGeometry>;
  const edges = Object.fromEntries(kinds.map((k) => [k, new EdgesGeometry(body[k], 28)])) as unknown as Record<BadgeKind, EdgesGeometry>;
  const edge = new LineBasicMaterial({ color: hdr('#8ff1ff', 1.7), transparent: true, opacity: 0.8 });
  // Fresnel shell: the glass's silhouette and bevels glow cyan, the face stays almost clear.
  const rim = new ShaderMaterial({
    uniforms: { uColor: { value: new Color('#22d3ee') } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4); gl_FragColor = vec4(uColor * (0.1 + f * 3.2), 1.0); }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
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
      for (const m of [rim, edge, cyanBasic, cyanSolid, cyanLine, amber, ring, dash]) m.dispose();
      circle.dispose();
      soft.dispose();
    },
  };
}

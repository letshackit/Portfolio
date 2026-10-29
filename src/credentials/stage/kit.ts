import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  FrontSide,
  LatheGeometry,
  LineBasicMaterial,
  LineDashedMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  TorusGeometry,
} from 'three';
import type { Quality } from './quality';
import { circleGeometry, coinGeometry, monolithPoints, rectPoints, roundedPolygon, slab } from './shapes';
import { createPlinthTexture, createSoftTexture } from './textures';

/** Slab depth and bevel, in each object's own units. The front face sits at depth / 2 + bevel. */
export const SLAB = {
  hero: { depth: 0.56, bevel: 0.075 },
  stone: { depth: 0.5, bevel: 0.07 },
  paper: { depth: 0.1, bevel: 0.04 },
} as const;

export function frontZ(kind: keyof typeof SLAB): number {
  return SLAB[kind].depth / 2 + SLAB[kind].bevel;
}

/** A colour pushed past 1.0 so the bloom pass picks it up. */
export function hdr(hex: string, boost: number): Color {
  return new Color(hex).multiplyScalar(boost);
}

/** Everything the objects share: materials, geometries, textures. Built once per quality tier, disposed with it. */
export interface Kit {
  readonly q: Quality;
  readonly glassHero: MeshPhysicalMaterial;
  readonly glassPaper: MeshPhysicalMaterial;
  /** Fresnel shells: cyan on the silhouette with a warm amber rim on the lower right. */
  readonly rimHero: ShaderMaterial;
  readonly rimPaper: ShaderMaterial;
  readonly stone: MeshPhysicalMaterial;
  readonly plinth: MeshStandardMaterial;
  readonly gold: MeshPhysicalMaterial;
  readonly steel: MeshPhysicalMaterial;
  readonly edge: LineBasicMaterial;
  readonly amberEdge: LineBasicMaterial;
  readonly cyanBasic: MeshBasicMaterial;
  readonly cyanSolid: MeshStandardMaterial;
  readonly cyanLine: LineBasicMaterial;
  readonly amber: MeshBasicMaterial;
  readonly ring: LineBasicMaterial;
  readonly dash: LineDashedMaterial;
  readonly geo: {
    readonly hero: ExtrudeGeometry;
    readonly heroEdges: EdgesGeometry;
    readonly stone: ExtrudeGeometry;
    readonly stoneEdges: EdgesGeometry;
    readonly paper: ExtrudeGeometry;
    readonly paperEdges: EdgesGeometry;
    readonly coin: LatheGeometry;
    readonly tier: CylinderGeometry;
    readonly tierRing: TorusGeometry;
    readonly beam: CylinderGeometry;
  };
  readonly circle: BufferGeometry;
  readonly soft: CanvasTexture;
  readonly plinthTex: CanvasTexture;
  dispose(): void;
}

function glassFor(q: Quality, paper: boolean): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(paper ? '#ffffff' : '#cfeff5'),
    emissive: new Color(paper ? '#7a4a06' : '#0b4a58'),
    emissiveIntensity: paper ? 0.28 : 0.1,
    metalness: 0,
    roughness: paper ? 0.04 : 0.1,
    transmission: q.transmission ? 1 : 0,
    thickness: paper ? 0.4 : 1.1,
    ior: 1.5,
    attenuationColor: new Color(paper ? '#f59e0b' : '#0e9db8'),
    attenuationDistance: paper ? 5 : 2.4,
    clearcoat: paper ? 1 : 0.3,
    clearcoatRoughness: 0.05,
    envMapIntensity: paper ? 1.6 : 0.8,
    specularIntensity: paper ? 1 : 0.4,
    iridescence: q.transmission && paper ? 0.35 : 0,
    iridescenceIOR: 1.3,
    transparent: !q.transmission,
    opacity: q.transmission ? 1 : 0.34,
    side: FrontSide,
    // What sits inside the glass (drawn as transparent, so it is not blurred by the refraction) must show through it.
    depthWrite: false,
  });
}

/** `warm` is a little self-light on the metal: gold reflecting the cyan strips would otherwise turn green at the edge. */
function metal(color: string, rough: number, env: number, warm = '#000000'): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ color: new Color(color), metalness: 1, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: env, emissive: new Color(warm), emissiveIntensity: 1 });
}

export function createKit(q: Quality): Kit {
  const heroGeo = slab(roundedPolygon(monolithPoints(), 0.05), SLAB.hero.depth, SLAB.hero.bevel);
  const stoneGeo = slab(roundedPolygon(rectPoints(1.34, 2), 0.06), SLAB.stone.depth, SLAB.stone.bevel);
  const paperGeo = slab(roundedPolygon(rectPoints(1.4, 2), 0.05), SLAB.paper.depth, SLAB.paper.bevel);
  const geo = {
    hero: heroGeo,
    heroEdges: new EdgesGeometry(heroGeo, 28),
    stone: stoneGeo,
    stoneEdges: new EdgesGeometry(stoneGeo, 28),
    paper: paperGeo,
    paperEdges: new EdgesGeometry(paperGeo, 28),
    coin: coinGeometry(),
    tier: new CylinderGeometry(1, 1, 1, 72, 1),
    tierRing: new TorusGeometry(1, 0.012, 8, 120),
    beam: new CylinderGeometry(0.62, 1, 1, 48, 1, true),
  };
  const edge = new LineBasicMaterial({ color: hdr('#8ff1ff', 1.7), transparent: true, opacity: 0.8 });
  const amberEdge = new LineBasicMaterial({ color: hdr('#fbbf24', 1.8), transparent: true, opacity: 0.85 });
  // Fresnel shell: the glass's silhouette and bevels glow cyan, the face stays almost clear. Edges that face the lower
  // right take a warm amber instead, so the object is lit cyan from one side and amber from the other, like the hero.
  const makeRim = (warm: number, base: string) =>
    new ShaderMaterial({
      uniforms: { uColor: { value: new Color(base) }, uWarm: { value: new Color('#f59e0b') }, uMix: { value: warm } },
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
  const stone = new MeshPhysicalMaterial({
    color: new Color('#05080a'),
    metalness: 0.3,
    roughness: 0.34,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.65,
  });
  const plinth = new MeshStandardMaterial({ color: new Color('#0d1419'), metalness: 0.85, roughness: 0.34, envMapIntensity: 1.3 });
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
  const dash = new LineDashedMaterial({ color: new Color('#67e8f9'), dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0.4, depthWrite: false });
  const circle = circleGeometry();
  const soft = createSoftTexture();
  const plinthTex = createPlinthTexture();
  const glassHero = glassFor(q, false);
  const glassPaper = glassFor(q, true);
  const rimHero = makeRim(0.45, '#22d3ee');
  const rimPaper = makeRim(1, '#22d3ee');
  const gold = metal('#d9993a', 0.28, 1.25, '#4a2a00');
  const steel = metal('#9fb4bd', 0.22, 1.7);
  return {
    q,
    glassHero,
    glassPaper,
    rimHero,
    rimPaper,
    stone,
    plinth,
    gold,
    steel,
    edge,
    amberEdge,
    cyanBasic,
    cyanSolid,
    cyanLine,
    amber,
    ring,
    dash,
    geo,
    circle,
    soft,
    plinthTex,
    dispose() {
      for (const m of [glassHero, glassPaper, rimHero, rimPaper, stone, plinth, gold, steel, edge, amberEdge, cyanBasic, cyanSolid, cyanLine, amber, ring, dash]) m.dispose();
      for (const g of Object.values(geo)) g.dispose();
      circle.dispose();
      for (const t of [soft, plinthTex]) t.dispose();
    },
  };
}

/**
 * The shaft of light over a plinth: additive, brightest at the base and fading to nothing at the top, and fading toward
 * the silhouette too, so it reads as a volume of light and not a hard-edged cone. Drive `uniforms.uOpacity`.
 */
export function beamMaterial(hex: string, boost = 1.4): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: hdr(hex, boost) }, uOpacity: { value: 0.2 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main() { vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main() {
      float side = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
      float rise = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.4);
      gl_FragColor = vec4(uColor * side * rise, side * rise * uOpacity);
    }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
}

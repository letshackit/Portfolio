import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  QuadraticBezierCurve3,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { smoothstep, store } from '../../store';
import { getSoftTexture } from '../glow';
import { clamp01, easeInOutQuad, easeOutBack } from './ease';
import { BLOCKS, NODES, type NodeDef } from './layout';
import { BASE_Y, COLORS, GLOW, sceneNow } from './state';

/** World-size of a satellite relative to B's prototype (the city shrank to ~a third, so did they). */
const S = 0.3;
const PACKETS_PER_BEAM = 4;
const LABEL_FONT = '500 44px "Geist Mono", ui-monospace, Menlo, monospace';

export interface CityTransform {
  readonly position: Vector3;
  readonly scale: number;
  readonly rotationY: number;
}

/** Where the node sits (stage frame): the floating octahedron's height above its ground ring. */
function nodeTop(n: NodeDef): Vector3 {
  return new Vector3(n.pos[0], 1.35 * S, n.pos[2]);
}

/** World position of the top of a block, through the city's own transform. */
function blockTopWorld(n: NodeDef, city: CityTransform): Vector3 {
  const b = BLOCKS[n.block];
  const holder = new Object3D();
  holder.position.copy(city.position);
  holder.scale.setScalar(city.scale);
  holder.rotation.y = city.rotationY;
  holder.updateMatrixWorld(true);
  return holder.localToWorld(new Vector3(b.x, BASE_Y + b.h + 0.04, b.z));
}

/** Satellite label: drawn once to a canvas after the page font has loaded, so no text engine ships in the 3D chunk. */
function useLabel(text: string): CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 96;
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => {
    let live = true;
    const paint = () => {
      const c = tex.image as HTMLCanvasElement;
      const g = c.getContext('2d');
      if (!g || !live) return;
      g.clearRect(0, 0, c.width, c.height);
      g.font = LABEL_FONT;
      g.letterSpacing = '7px';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(34,211,238,0.7)';
      g.shadowBlur = 14;
      g.fillStyle = '#67E8F9';
      g.fillText(text, c.width / 2, c.height / 2 + 2);
      tex.needsUpdate = true;
    };
    paint();
    void document.fonts.load(LABEL_FONT).then(paint);
    return () => {
      live = false;
    };
  }, [tex, text]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Beam({ node, index, city, packets, fade }: { node: NodeDef; index: number; city: CityTransform; packets: number; fade: MutableRefObject<number> }) {
  const curve = useMemo(() => {
    const a = nodeTop(node);
    const b = blockTopWorld(node, city);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 0.75;
    return new QuadraticBezierCurve3(a, mid, b);
  }, [node, city]);
  const geo = useMemo(() => new TubeGeometry(curve, 96, 0.009, 6, false), [curve]);
  const mat = useMemo(
    () => new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(1.1 * GLOW.city * 1.6), toneMapped: false, transparent: true, opacity: 0.8 }),
    [],
  );
  const packetMat = useMemo(() => new MeshBasicMaterial({ color: new Color('#F59E0B').multiplyScalar(2.4), toneMapped: false, fog: false }), []);
  const packetRefs = useRef<Array<Mesh | null>>([]);
  const prevU = useRef<number[]>(Array.from({ length: PACKETS_PER_BEAM }, () => 0));
  const indexCount = geo.index ? geo.index.count : 0;

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      packetMat.dispose();
    },
    [geo, mat, packetMat],
  );

  useFrame(() => {
    const now = sceneNow();
    // The beam draws itself from the satellite to the city, one after another.
    const grown = store.reduced ? 1 : easeInOutQuad(clamp01((now - (2.3 + index * 0.45)) / 1.6));
    geo.setDrawRange(0, Math.floor((indexCount * grown) / 3) * 3);
    mat.opacity = 0.8 * fade.current;
    packetRefs.current.forEach((m, k) => {
      if (!m) return;
      const visible = grown >= 1 && k < packets && fade.current > 0.02;
      m.visible = visible;
      if (!visible) return;
      let u = (now * (0.16 + index * 0.02) + k / PACKETS_PER_BEAM) % 1;
      // Alternate direction so data flows both ways: requests in, results out.
      if (k % 2 === 1) u = 1 - u;
      curve.getPoint(u, m.position);
      if (Math.abs(u - prevU.current[k]) > 0.5) store.packets += 1;
      prevU.current[k] = u;
      m.scale.setScalar(0.85 + Math.sin(now * 8 + k) * 0.15);
    });
  });

  return (
    <group>
      <mesh geometry={geo} material={mat} frustumCulled={false} />
      {Array.from({ length: PACKETS_PER_BEAM }, (_, k) => (
        <mesh key={k} ref={(m) => (packetRefs.current[k] = m)} material={packetMat} visible={false}>
          <sphereGeometry args={[0.026, 10, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function NodeMarker({ node, index, fade }: { node: NodeDef; index: number; fade: MutableRefObject<number> }) {
  const root = useRef<Group>(null);
  const floater = useRef<Group>(null);
  const label = useLabel(node.label);
  const o = useMemo(() => {
    const geo = new OctahedronGeometry(0.8 * S, 0);
    return {
      geo,
      edges: new EdgesGeometry(geo),
      edgeMat: new LineBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(1.5 * GLOW.city * 1.6), toneMapped: false, transparent: true }),
      coreMat: new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(1.8 * GLOW.city * 1.6), toneMapped: false, transparent: true }),
      ringMat: new MeshBasicMaterial({ color: COLORS.cyan, toneMapped: false, transparent: true, opacity: 0.4 }),
      labelMat: new SpriteMaterial({ map: label, transparent: true, depthWrite: false, toneMapped: false, fog: true }),
      haloMat: new SpriteMaterial({
        map: getSoftTexture(),
        color: COLORS.cyan.clone().multiplyScalar(0.9),
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        transparent: true,
        opacity: 0.35,
      }),
    };
  }, [label]);
  const halo = useRef<Sprite>(null);

  useEffect(
    () => () => {
      o.geo.dispose();
      o.edges.dispose();
      o.edgeMat.dispose();
      o.coreMat.dispose();
      o.ringMat.dispose();
      o.labelMat.dispose();
      o.haloMat.dispose();
    },
    [o],
  );

  useFrame((_, dt) => {
    const f = floater.current;
    if (!f) return;
    const now = sceneNow();
    // Pops in after the first blocks have landed.
    const pop = store.reduced ? 1 : Math.max(0.0001, easeOutBack(clamp01((now - (1.2 + index * 0.4)) / 1.1), 1.8));
    root.current?.scale.setScalar(pop);
    f.position.y = 1.35 * S + Math.sin(now * 1.2 + index * 2) * 0.04;
    if (!store.reduced) f.rotation.y += dt * 0.35;
    const k = fade.current;
    o.edgeMat.opacity = k;
    o.coreMat.opacity = k;
    o.ringMat.opacity = 0.4 * k;
    o.labelMat.opacity = k;
    o.haloMat.opacity = 0.35 * k;
    if (root.current) root.current.visible = k > 0.01;
    halo.current?.position.copy(f.position);
  });

  return (
    <group ref={root} position={[node.pos[0], 0, node.pos[2]]}>
      <group ref={floater} position={[0, 1.35 * S, 0]}>
        <lineSegments geometry={o.edges} material={o.edgeMat} />
        <mesh material={o.coreMat}>
          <icosahedronGeometry args={[0.24 * S, 1]} />
        </mesh>
      </group>
      <sprite ref={halo} scale={0.9} material={o.haloMat} position={[0, 1.35 * S, 0]} />
      {/* Ground rings and the thin column of light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={o.ringMat}>
        <ringGeometry args={[1.05 * S, 1.1 * S, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={o.ringMat}>
        <ringGeometry args={[1.5 * S, 1.52 * S, 64]} />
      </mesh>
      <mesh position={[0, 0.55 * S, 0]} material={o.ringMat}>
        <cylinderGeometry args={[0.004, 0.004, 1.7 * S, 6]} />
      </mesh>
      <sprite position={[0, 2.35 * S, 0]} scale={[1.45 * S * 1.4, 0.22 * S * 1.4, 1]} material={o.labelMat} />
    </group>
  );
}

/** The three satellite systems with arcing beams to the city. They fade out as the scroll beat dives into the city. */
export function Nodes({ city, packets, spread }: { city: CityTransform; packets: number; spread: number }) {
  const fade = useRef(1);
  const placed = useMemo<NodeDef[]>(
    () => NODES.map((n) => ({ ...n, pos: [n.pos[0] * spread, n.pos[1], n.pos[2] * spread] })),
    [spread],
  );
  useFrame(() => {
    fade.current = 1 - smoothstep(0.35, 0.7, store.progress);
  });
  return (
    <group>
      {placed.map((n, i) => (
        <group key={n.id}>
          <NodeMarker node={n} index={i} fade={fade} />
          <Beam node={n} index={i} city={city} packets={packets} fade={fade} />
        </group>
      ))}
    </group>
  );
}

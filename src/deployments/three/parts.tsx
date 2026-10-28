/**
 * Declarative pieces of a bay scene: a node, a route, a plate, and the decor (floor, gyro, bus loop, voice ribbons).
 * They only build objects and register refs; every per-frame change is written by the one loop in BayScene.
 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineDashedMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  RingGeometry,
  Vector2,
  Vector3,
  type CanvasTexture,
  type Group,
  type LineSegments,
  type Mesh,
} from 'three';
import { fontsReady, makeFaceTexture } from './faceTexture';
import type { SceneNode, ScenePlate, SceneRoute, SceneSpec } from './spec';
import { noRaycast, ROUTE_STYLE, TONES } from './style';

const BOX = new BoxGeometry(1, 1, 1);
const GEO = {
  box: BOX,
  boxEdges: new EdgesGeometry(BOX),
  cyl: new CylinderGeometry(0.5, 0.5, 1, 48),
  cylEdges: new EdgesGeometry(new CylinderGeometry(0.5, 0.5, 1, 48), 25),
  oct: new OctahedronGeometry(0.5, 0),
  octEdges: new EdgesGeometry(new OctahedronGeometry(0.5, 0)),
  annulus: new RingGeometry(0.92, 1, 128, 1),
  plane: new PlaneGeometry(1, 1),
};

export interface NodeRefs {
  readonly group: Group;
  readonly body: Group;
  readonly body_mat: MeshPhysicalMaterial | MeshBasicMaterial;
  readonly edge_mat: LineBasicMaterial | LineDashedMaterial | null;
  readonly label_mat: MeshBasicMaterial | null;
}

export type Register = (id: string, refs: NodeRefs) => void;

export interface NodeHandlers {
  readonly onOver: (id: string) => void;
  readonly onOut: (id: string) => void;
  readonly onClick: (id: string) => void;
}

/** One architecture node: a glass body in its shape, a glowing outline, and a text face. */
export const NodeView = memo(function NodeView({ node, register, handlers }: { node: SceneNode; register: Register; handlers: NodeHandlers }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const tone = TONES[node.tone];
  const ring = node.shape === 'ring';
  const shell = node.shape === 'shell';

  const mats = useMemo(() => {
    const body_mat = ring
      ? new MeshBasicMaterial({ color: tone.edge, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, blending: AdditiveBlending, toneMapped: false })
      : new MeshPhysicalMaterial({
          color: tone.fill,
          transparent: true,
          opacity: 0,
          roughness: 0.16,
          metalness: 0.3,
          clearcoat: 1,
          clearcoatRoughness: 0.2,
          emissive: tone.emissive,
          emissiveIntensity: 0.05,
          depthWrite: false,
          envMapIntensity: 1.4,
        });
    const edge_mat = ring
      ? null
      : node.ghost
        ? new LineDashedMaterial({ color: tone.edge, transparent: true, opacity: 0, dashSize: 0.09, gapSize: 0.07 })
        : new LineBasicMaterial({ color: tone.edge, transparent: true, opacity: 0 });
    const label_mat = node.labelSize > 0 ? new MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: false }) : null;
    return { body_mat, edge_mat, label_mat };
  }, [node.ghost, node.labelSize, ring, tone]);

  useEffect(
    () => () => {
      mats.body_mat.dispose();
      mats.edge_mat?.dispose();
      mats.label_mat?.dispose();
    },
    [mats],
  );

  // Label texture, once the page font is ready.
  useEffect(() => {
    if (!mats.label_mat || node.labelSize <= 0) return;
    let live = true;
    let made: CanvasTexture | null = null;
    void fontsReady().then(() => {
      if (!live || !mats.label_mat) return;
      made = makeFaceTexture({
        title: node.label,
        sub: node.sub,
        width: node.labelBox[0],
        height: node.labelBox[1],
        fontSize: node.labelSize,
        color: tone.title,
        subColor: tone.sub,
      });
      mats.label_mat.map = made;
      mats.label_mat.needsUpdate = true;
    });
    return () => {
      live = false;
      made?.dispose();
      if (mats.label_mat) mats.label_mat.map = null;
    };
  }, [mats, node.label, node.sub, node.labelBox, node.labelSize, tone]);

  useLayoutEffect(() => {
    if (group.current && body.current) {
      register(node.id, { group: group.current, body: body.current, body_mat: mats.body_mat, edge_mat: mats.edge_mat, label_mat: mats.label_mat });
    }
  }, [node.id, mats, register]);

  const over = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    handlers.onOver(node.id);
  };
  const out = () => handlers.onOut(node.id);
  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    handlers.onClick(node.id);
  };
  const pick = node.pick ? { onPointerOver: over, onPointerOut: out, onClick: click } : {};
  const dashFix = (l: LineSegments | null) => {
    if (l && node.ghost) l.computeLineDistances();
  };

  const stack = node.shape === 'stack';
  return (
    <group ref={group} position={node.scatter as unknown as [number, number, number]}>
      <group ref={body} {...pick}>
        {ring ? (
          <mesh geometry={GEO.annulus} material={mats.body_mat} rotation={[-Math.PI / 2, 0, 0]} scale={[node.size[0] / 2, node.size[2] / 2, 1]} />
        ) : stack ? (
          [-0.36, 0, 0.36].map((y) => (
            <group key={y} position={[0, y, 0]} scale={[1, 0.24, 1]}>
              <mesh geometry={GEO.box} material={mats.body_mat} />
              <lineSegments geometry={GEO.boxEdges} material={mats.edge_mat as LineBasicMaterial} raycast={noRaycast} />
            </group>
          ))
        ) : (
          <>
            <mesh
              geometry={node.shape === 'cyl' ? GEO.cyl : node.shape === 'oct' ? GEO.oct : GEO.box}
              material={mats.body_mat}
              raycast={shell ? noRaycast : undefined}
            />
            <lineSegments
              ref={dashFix}
              geometry={node.shape === 'cyl' ? GEO.cylEdges : node.shape === 'oct' ? GEO.octEdges : GEO.boxEdges}
              material={mats.edge_mat as LineBasicMaterial}
              raycast={noRaycast}
            />
          </>
        )}
      </group>
      {mats.label_mat ? (
        <mesh
          geometry={GEO.plane}
          material={mats.label_mat}
          position={node.labelAt as unknown as [number, number, number]}
          scale={[node.labelBox[0], node.labelBox[1], 1]}
          renderOrder={3}
          raycast={noRaycast}
        />
      ) : null}
    </group>
  );
});

export interface RouteRefs {
  line: { visible: boolean; material: { opacity: number; color: Color; linewidth: number } } | null;
}

export const RouteView = memo(function RouteView({ route, bind }: { route: SceneRoute; bind: (id: string, line: RouteRefs['line']) => void }) {
  const style = ROUTE_STYLE[route.kind];
  return (
    <Line
      ref={(l) => bind(route.id, l as unknown as RouteRefs['line'])}
      points={route.points as unknown as [number, number, number][]}
      color={style.color}
      lineWidth={route.backplane ? 1 : style.width}
      transparent
      opacity={0}
      depthWrite={false}
      dashed={style.dashed}
      dashSize={route.kind === 'phase2' ? 0.16 : 0.07}
      gapSize={route.kind === 'phase2' ? 0.12 : 0.1}
    />
  );
});

/** A faint glass strip or wall behind a group of nodes, with a mono caption in its corner. */
export const PlateView = memo(function PlateView({ plate, mat }: { plate: ScenePlate; mat: MutableRefObject<Map<string, { opacity: number }>> }) {
  const tone = TONES[plate.tone];
  const [w, h] = plate.size;
  const flat = plate.plane === 'xz';
  const fill = useMemo(() => new MeshBasicMaterial({ color: tone.edge, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [tone]);
  const line = useMemo(() => new LineBasicMaterial({ color: tone.edge, transparent: true, opacity: 0, toneMapped: false }), [tone]);
  const label = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), []);
  const outline = useMemo(() => {
    const g = new BufferGeometry().setFromPoints([new Vector3(-0.5, -0.5, 0), new Vector3(0.5, -0.5, 0), new Vector3(0.5, 0.5, 0), new Vector3(-0.5, 0.5, 0)]);
    return g;
  }, []);
  useEffect(() => {
    mat.current.set(`${plate.id}:fill`, fill);
    mat.current.set(`${plate.id}:line`, line);
    mat.current.set(`${plate.id}:label`, label);
    const reg = mat.current;
    return () => {
      reg.delete(`${plate.id}:fill`);
      reg.delete(`${plate.id}:line`);
      reg.delete(`${plate.id}:label`);
    };
  }, [fill, line, label, mat, plate.id]);
  useEffect(() => {
    let live = true;
    let made: CanvasTexture | null = null;
    void fontsReady().then(() => {
      if (!live) return;
      made = makeFaceTexture({ title: plate.label, width: 3.4, height: 0.3, fontSize: 0.15, color: tone.sub, subColor: tone.sub, align: 'left' });
      label.map = made;
      label.needsUpdate = true;
    });
    return () => {
      live = false;
      made?.dispose();
      label.map = null;
    };
  }, [label, plate.label, tone]);
  useEffect(
    () => () => {
      fill.dispose();
      line.dispose();
      label.dispose();
      outline.dispose();
    },
    [fill, line, label, outline],
  );
  return (
    <group position={plate.pos as unknown as [number, number, number]} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <mesh geometry={GEO.plane} material={fill} scale={[w, h, 1]} raycast={noRaycast} renderOrder={0} />
      <lineLoop geometry={outline} material={line} scale={[w, h, 1]} raycast={noRaycast} renderOrder={0} />
      <mesh geometry={GEO.plane} material={label} position={[-w / 2 + 1.75, h / 2 - 0.2, 0.01]} scale={[3.4, 0.3, 1]} raycast={noRaycast} renderOrder={1} />
    </group>
  );
});

/** Grid floor with an expanding scan ring: the "bay" the system stands in. */
export function Floor({ y, centre, opacity }: { y: number; centre: readonly [number, number]; opacity: MutableRefObject<number> }) {
  // The uniforms object must stay the same object for the life of the material: three keeps the one it compiled with.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCenter: { value: new Vector2(0, 0) },
      uCyan: { value: new Color('#22d3ee') },
      uAmber: { value: new Color('#f59e0b') },
    }),
    [],
  );
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    uniforms.uOpacity.value = opacity.current;
    uniforms.uCenter.value.set(centre[0], centre[1]);
  });
  return (
    <mesh position={[centre[0], y, centre[1]]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} renderOrder={-2}>
      <planeGeometry args={[90, 90]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
        vertexShader={`varying vec2 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xz; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }`}
        fragmentShader={`
          varying vec2 vP; uniform float uTime; uniform float uOpacity; uniform vec2 uCenter; uniform vec3 uCyan; uniform vec3 uAmber;
          float gridLine(vec2 p, float s){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
          void main(){
            vec2 p = vP - uCenter;
            float minor = gridLine(p, 1.0);
            float major = gridLine(p, 5.0);
            float r = length(p);
            float fade = 1.0 - smoothstep(2.0, 14.0, r);
            float ringR = mod(uTime * 2.8, 24.0);
            float ring = exp(-pow((r - ringR) * 1.1, 2.0)) * (1.0 - smoothstep(6.0, 24.0, ringR));
            vec3 col = uCyan * (minor * 0.16 + major * 0.5) + uAmber * ring * (minor * 0.9 + major * 1.1);
            gl_FragColor = vec4(col * fade * uOpacity, 1.0);
          }`}
      />
    </mesh>
  );
}

/** Two thin gyroscope rings that turn around the core of a mesh: the one decorative flourish with a job (it says "core"). */
export function Gyro({ spec, frozen }: { spec: SceneSpec; frozen: boolean }) {
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  const core = spec.nodes.find((n) => n.kind === 'core');
  const pts = useMemo(() => Array.from({ length: 97 }, (_, i) => [Math.cos((i / 96) * Math.PI * 2), Math.sin((i / 96) * Math.PI * 2), 0] as [number, number, number]), []);
  useFrame((_, dt) => {
    if (frozen) return;
    if (a.current) a.current.rotation.set(a.current.rotation.x + dt * 0.5, 0.9, 0);
    if (b.current) b.current.rotation.set(0.4, b.current.rotation.y + dt * 0.35, a.current ? a.current.rotation.x * 0.2 : 0);
  });
  if (!core) return null;
  return (
    <group position={core.pos as unknown as [number, number, number]}>
      <group ref={a} scale={1.55}>
        <Line points={pts} color="#67e8f9" lineWidth={1.1} transparent opacity={0.55} depthWrite={false} />
      </group>
      <group ref={b} scale={1.9}>
        <Line points={pts} color="#22d3ee" lineWidth={1} transparent opacity={0.35} depthWrite={false} dashed dashSize={0.1} gapSize={0.12} />
      </group>
    </group>
  );
}

/** Amber dots circling the event-bus belt, so the bus reads as a live ring even between outbox events. */
export function BusLoop({ spec, frozen, opacity }: { spec: SceneSpec; frozen: boolean; opacity: MutableRefObject<number> }) {
  const bus = spec.nodes.find((n) => n.kind === 'bus');
  const refs = useRef<(Mesh | null)[]>([]);
  const t = useRef(0.3);
  const mat = useMemo(() => new MeshBasicMaterial({ color: new Color('#f59e0b').multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0 }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_, dt) => {
    if (!bus) return;
    if (!frozen) t.current += dt * 0.42;
    mat.opacity = opacity.current;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const a = t.current + (i / 3) * Math.PI * 2;
      m.position.set(bus.pos[0] + Math.cos(a) * (bus.size[0] / 2 - 0.15), bus.pos[1], bus.pos[2] + Math.sin(a) * (bus.size[2] / 2 - 0.15));
    });
  });
  if (!bus) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} material={mat} raycast={noRaycast}>
          <sphereGeometry args={[0.07, 12, 12]} />
        </mesh>
      ))}
    </>
  );
}

/** Voice and IVR signals arriving at their adapters: a sine ribbon and a stepped tone ribbon. Shader only, no geometry cost. */
export function Waves({ spec, frozen, opacity }: { spec: SceneSpec; frozen: boolean; opacity: MutableRefObject<number> }) {
  const t = useRef(0);
  const targets = useMemo(
    () =>
      ['voice', 'ivr']
        .map((id, i) => ({ node: spec.nodes.find((n) => n.id === id), mode: i }))
        .filter((x): x is { node: SceneNode; mode: number } => x.node !== undefined)
        .map((x) => ({
          ...x,
          uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uMode: { value: x.mode }, uColor: { value: new Color(x.mode === 0 ? '#67e8f9' : '#22d3ee') } },
        })),
    [spec],
  );
  useFrame((_, dt) => {
    if (!frozen) t.current += dt;
    for (const x of targets) {
      x.uniforms.uTime.value = t.current + 3;
      x.uniforms.uOpacity.value = opacity.current;
    }
  });
  return (
    <>
      {targets.map(({ node, uniforms }) => (
        <mesh key={node.id} position={[node.pos[0] - node.size[0] / 2 - 0.78, node.pos[1] + 0.17, node.pos[2]]} scale={[1.5, 0.9, 1]} raycast={noRaycast}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
            uniforms={uniforms}
            vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
            fragmentShader={`
              varying vec2 vUv; uniform float uTime; uniform float uOpacity; uniform float uMode; uniform vec3 uColor;
              void main(){
                float x = vUv.x;
                float amp = 0.34 * (0.35 + 0.65 * x) * (0.6 + 0.4 * sin(uTime * 1.7 + x * 5.0));
                float y = uMode < 0.5 ? amp * sin(x * 34.0 - uTime * 7.0) * (0.7 + 0.3 * sin(x * 9.0 + uTime)) : amp * 0.55 * sign(sin(x * 26.0 - uTime * 5.0));
                float d = abs((vUv.y - 0.5) - y);
                float core = exp(-d * d * 2600.0);
                float glow = exp(-d * d * 220.0) * 0.22;
                float env = smoothstep(0.0, 0.18, x) * (1.0 - smoothstep(0.86, 1.0, x));
                gl_FragColor = vec4(uColor * (0.7 + core), (core + glow) * env * uOpacity);
              }`}
          />
        </mesh>
      ))}
    </>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';
import { store } from '../../store';
import { clamp01, easeOutExpo } from './ease';
import { BLOCKS, PLATFORM, type BlockDef } from './layout';
import { BASE_Y, blockLook, COLORS, GLOW, lineUpAmount, resetBlockStates, sceneNow, START_RISE, type BlockLook } from './state';

const tmp = new Color();
const tmp2 = new Color();
const look: BlockLook = { rise: 0, flash: 0, amber: 0, built: 0 };

/**
 * Light glass: a faint transparent skin, not a transmissive material. Transmission re-renders the whole scene per
 * frame and fights the reflective floor's own mirror pass, so the cheap version is also the stable one.
 */
function useGlass(): MeshStandardMaterial {
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#0d3a47'),
        transparent: true,
        opacity: 0.34,
        // Matte on purpose: the scene's light probe has warm patches, and a polished face mirrors them as pink streaks.
        // (A material's envMapIntensity is ignored for scene.environment; roughness is the lever that works.)
        roughness: 0.75,
        metalness: 0,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

function Block({ def, glass }: { def: BlockDef; glass: MeshStandardMaterial }) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);

  const o = useMemo(() => {
    const box = new BoxGeometry(def.w, def.h, def.d);
    const coreBox = new BoxGeometry(def.w * 0.42, def.h * 0.62, def.d * 0.42);
    return {
      boxGeo: box,
      edges: new EdgesGeometry(box),
      edgeMat: new LineBasicMaterial({ color: COLORS.cyan, toneMapped: false, transparent: true }),
      coreGeo: coreBox,
      coreEdges: new EdgesGeometry(coreBox),
      coreEdgeMat: new LineBasicMaterial({ color: COLORS.cyan, toneMapped: false }),
      coreMat: new MeshBasicMaterial({ color: COLORS.cyanDim, toneMapped: false }),
      ringMat: new MeshBasicMaterial({ color: COLORS.amber, toneMapped: false, transparent: true, opacity: 0, depthWrite: false }),
    };
  }, [def]);

  useEffect(
    () => () => {
      o.boxGeo.dispose();
      o.edges.dispose();
      o.coreGeo.dispose();
      o.coreEdges.dispose();
      o.edgeMat.dispose();
      o.coreEdgeMat.dispose();
      o.coreMat.dispose();
      o.ringMat.dispose();
    },
    [o],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const k = lineUpAmount();
    const h = MathUtils.lerp(def.h, def.tidyH, k);
    const st = blockLook(def, sceneNow(), look);
    g.scale.y = h / def.h;
    g.position.set(def.x * (1 + 0.1 * k), BASE_Y + h / 2 + st.rise, def.z);
    g.visible = st.rise > START_RISE + 0.05;

    // Edge colour: dim cyan scaffold, brighter once built, white flash on snap. Amber is added on top (not lerped
    // through the colour wheel, which would pass through green) while a drone is docked.
    const a = st.amber;
    const keep = Math.pow(1 - a, 2.5);
    const level = (0.6 + st.built * 0.7 + st.flash * 1.5) * GLOW.city;
    tmp.copy(COLORS.cyan).lerp(COLORS.white, Math.min(st.flash, 1) * 0.6).multiplyScalar(level * keep);
    o.edgeMat.color.copy(tmp).add(tmp2.copy(COLORS.amberHot).multiplyScalar(a * 1.9 * GLOW.amber));

    // Inner core: the service glowing inside the glass, a soft solid plus a wire frame.
    tmp.copy(COLORS.cyan).multiplyScalar((0.16 + st.built * 0.3 + st.flash * 0.9) * GLOW.city * keep);
    o.coreMat.color.copy(tmp).add(tmp2.copy(COLORS.amberHot).multiplyScalar(a * 1.5 * GLOW.amber));
    tmp.copy(COLORS.cyan).multiplyScalar((0.55 + st.built * 0.8 + st.flash * 1.2) * GLOW.city * keep);
    o.coreEdgeMat.color.copy(tmp).add(tmp2.copy(COLORS.amberHot).multiplyScalar(a * 2.4 * GLOW.amber));

    const r = ring.current;
    if (r) {
      r.scale.setScalar(1 + (1 - st.amber) * 1.1);
      o.ringMat.opacity = st.amber * 0.9;
    }
    if (core.current) core.current.scale.y = 0.9 + st.built * 0.1 + st.amber * 0.06;
  });

  return (
    <group ref={group} position={[def.x, BASE_Y + def.h / 2 + START_RISE, def.z]} visible={false}>
      <mesh geometry={o.boxGeo} material={glass} />
      <lineSegments geometry={o.edges} material={o.edgeMat} />
      <mesh ref={core} geometry={o.coreGeo} material={o.coreMat} />
      <lineSegments geometry={o.coreEdges} material={o.coreEdgeMat} />
      <mesh ref={ring} position={[0, def.h / 2 + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={o.ringMat}>
        <ringGeometry args={[0.52, 0.58, 48]} />
      </mesh>
    </group>
  );
}

/** The service city: a glass slab and 18 blocks that rise from below the floor one after another, then settle. */
export function Blocks() {
  const glass = useGlass();
  const slabGeo = useMemo(() => new BoxGeometry(PLATFORM.w, 0.12, PLATFORM.d), []);
  const slabEdges = useMemo(() => new EdgesGeometry(slabGeo), [slabGeo]);
  const slabEdgeMat = useMemo(
    () => new LineBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(0.9 * GLOW.city), toneMapped: false, transparent: true, opacity: 0.8 }),
    [],
  );
  const slabRef = useRef<Group>(null);

  useEffect(
    () => () => {
      slabGeo.dispose();
      slabEdges.dispose();
      slabEdgeMat.dispose();
    },
    [slabGeo, slabEdges, slabEdgeMat],
  );

  useEffect(() => {
    resetBlockStates();
    store.assembled = 0;
  }, []);

  useFrame(() => {
    const s = slabRef.current;
    if (!s) return;
    const grow = store.reduced ? 1 : 0.2 + 0.8 * easeOutExpo(clamp01(sceneNow() / 1.2));
    s.scale.set(grow, 1, grow);
  });

  return (
    <group>
      <group ref={slabRef}>
        <mesh position={[0, -0.12, 0]} geometry={slabGeo} material={glass} />
        <lineSegments position={[0, -0.12, 0]} geometry={slabEdges} material={slabEdgeMat} />
      </group>
      {BLOCKS.map((b) => (
        <Block key={b.id} def={b} glass={glass} />
      ))}
    </group>
  );
}

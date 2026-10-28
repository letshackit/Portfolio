import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, MathUtils, MeshBasicMaterial, type Group, type Sprite } from 'three';
import { FILL, type BadgeSpec } from '../slots';
import type { VaultStore } from '../vaultStore';
import { createGlyphTexture } from './glyph';
import { frontZ, hdr, type Kit } from './kit';
import { MotifBody } from './Motifs';

interface BadgeProps {
  readonly spec: BadgeSpec;
  readonly index: number;
  readonly store: VaultStore;
  readonly kit: Kit;
  /** Reduced motion: a fixed, flattering pose; no sway, spin or entrance. */
  readonly still: boolean;
}

/** Where the mark sits on each body, and how big. */
const GLYPH = {
  cert: { y: -0.5, w: 1.4 },
  stone: { y: -0.62, w: 1.25 },
  hero: { y: -0.6, w: 1.3 },
  paper: { y: 0, w: 0 },
} as const;

const TAU = Math.PI * 2;
/** Poses for reduced motion: each badge turned a little differently so the row does not look stamped. */
const STILL_YAW = [-0.3, -0.3, -0.16, -0.44, -0.52, -0.2, -0.32, -0.28];

function easeOutBack(t: number): number {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** The thin rings and ticks that frame a badge like a reticle. Sits behind the glass, so the glass refracts them. */
function Reticle({ kit, still, big }: { kit: Kit; still: boolean; big: boolean }) {
  const dashed = useRef<Group>(null);
  useFrame((_, dt) => {
    if (still || !dashed.current) return;
    dashed.current.rotation.z -= Math.min(dt, 0.05) * 0.12;
  });
  const r = big ? 1.22 : 1.16;
  return (
    <group position={[0, 0, -0.55]}>
      <lineLoop geometry={kit.circle} material={kit.ring} scale={r} />
      <group ref={dashed}>
        <lineLoop
          geometry={kit.circle}
          material={kit.dash}
          scale={r * 1.09}
          onUpdate={(l) => l.computeLineDistances()}
        />
      </group>
    </group>
  );
}

/** The cornerstone's orbit: two tilted rings and a satellite crossing the glass. */
function Orbits({ kit, still }: { kit: Kit; still: boolean }) {
  const sat = useRef<Group>(null);
  const sat2 = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = still ? 1.6 : clock.elapsedTime;
    if (sat.current) sat.current.rotation.z = t * 0.5;
    if (sat2.current) sat2.current.rotation.z = -t * 0.35 + 1;
  });
  return (
    <group>
      <group rotation={[1.2, 0.15, 0.35]}>
        <mesh material={kit.cyanBasic}>
          <torusGeometry args={[1.18, 0.0065, 8, 200]} />
        </mesh>
        <group ref={sat}>
          <mesh position={[1.18, 0, 0]} material={kit.cyanBasic}>
            <sphereGeometry args={[0.04, 12, 10]} />
          </mesh>
        </group>
      </group>
      <group rotation={[1.0, -0.5, -0.5]}>
        <mesh material={kit.ring}>
          <torusGeometry args={[1.34, 0.004, 8, 200]} />
        </mesh>
        <group ref={sat2}>
          <mesh position={[1.34, 0, 0]} material={kit.cyanBasic}>
            <sphereGeometry args={[0.025, 10, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * One credential as a floating glass object, placed in its DOM slot. Sways and bobs on its own, leans toward the
 * cursor, and on hover (or tap) turns a full circle and swells. The entrance plays once the vault is on screen.
 */
export function Badge({ spec, index, store, kit, still }: BadgeProps) {
  const root = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const halo = useRef<Sprite>(null);
  const s = useRef({ t: 0, hover: 0, spin: 0, spinTarget: 0, was: false, tx: 0, ty: 0 });
  const { kind } = spec;
  const front = frontZ(kind) + 0.012;
  const glyph = useMemo(() => (spec.main ? createGlyphTexture(spec.top, spec.main) : null), [spec.top, spec.main]);
  const glyphMat = useMemo(
    () =>
      glyph
        ? new MeshBasicMaterial({ map: glyph, transparent: true, depthWrite: false, toneMapped: false, color: new Color(1.7, 1.7, 1.7) })
        : null,
    [glyph],
  );
  const haloColor = useMemo(() => hdr('#22d3ee', 1), []);
  useEffect(
    () => () => {
      glyph?.dispose();
      glyphMat?.dispose();
    },
    [glyph, glyphMat],
  );

  useFrame(({ clock }, rawDt) => {
    const g = root.current;
    const w = sway.current;
    if (!g || !w) return;
    const r = store.rects.get(spec.id);
    if (!r) {
      g.visible = false;
      return;
    }
    const dt = Math.min(rawDt, 0.05);
    const st = s.current;
    if (still) st.t = 10;
    else if (store.inView) st.t += dt;
    const local = MathUtils.clamp((st.t - index * 0.09) / 1.15, 0, 1);
    g.visible = local > 0;
    if (!g.visible) return;
    const e = 1 - (1 - local) ** 3;

    const time = still ? 0 : clock.elapsedTime;
    const phase = index * 1.9;
    const hovered = !still && store.hover === spec.id;
    if (hovered && !st.was) st.spinTarget += TAU;
    st.was = hovered;
    st.hover = MathUtils.damp(st.hover, hovered ? 1 : 0, 6, dt);
    st.spin = MathUtils.damp(st.spin, st.spinTarget, 2.4, dt);

    const base = (Math.min(r.w, r.h) * FILL[kind]) / 2;
    const swell = 1 + 0.13 * st.hover;
    g.position.set(r.cx, -r.cy - (1 - e) * 34 + Math.sin(time * 0.9 + phase) * base * 0.035, 0);
    g.scale.setScalar(base * swell * (0.55 + 0.45 * easeOutBack(local)));

    // Lean toward the cursor: more yaw than pitch, damped.
    const p = store.pointer;
    const wantX = still ? 0 : MathUtils.clamp((p.x - r.cx) / 520, -1, 1) * 0.5;
    const wantY = still ? 0 : MathUtils.clamp((p.y - r.cy) / 520, -1, 1) * 0.3;
    st.tx = MathUtils.damp(st.tx, wantX, 4, dt);
    st.ty = MathUtils.damp(st.ty, wantY, 4, dt);
    const amp = kind === 'hero' ? 0.27 : kind === 'stone' ? 0.32 : 0.4;
    const swing = still ? STILL_YAW[index % STILL_YAW.length] : Math.sin(time * 0.45 + phase) * amp;
    w.rotation.y = swing + st.tx + st.spin + (1 - e) * 1.5;
    w.rotation.x = (still ? 0.1 : Math.sin(time * 0.33 + phase) * 0.07) + st.ty;

    if (halo.current) halo.current.material.opacity = 0.13 + 0.17 * st.hover;
  });

  const gl = GLYPH[kind];
  return (
    <group ref={root} visible={false}>
      <sprite ref={halo} scale={[4.6, 4.6, 1]} position={[0, 0, -0.9]}>
        <spriteMaterial map={kit.soft} color={haloColor} transparent opacity={0.13} blending={AdditiveBlending} depthWrite={false} />
      </sprite>
      {kind === 'paper' ? null : <Reticle kit={kit} still={still} big={kind === 'hero'} />}
      {kind === 'hero' ? <Orbits kit={kit} still={still} /> : null}
      <group ref={sway}>
        <mesh geometry={kit.body[kind]} material={kit.glass[kind]} />
        <mesh geometry={kit.body[kind]} material={kit.rim} />
        <lineSegments geometry={kit.edges[kind]} material={kit.edge} />
        <MotifBody motif={spec.motif} kit={kit} still={still} />
        {glyphMat ? (
          <>
            <mesh position={[0, gl.y, front]} material={glyphMat}>
              <planeGeometry args={[gl.w, gl.w / 2]} />
            </mesh>
            <mesh position={[0, gl.y, -front]} rotation={[0, Math.PI, 0]} material={glyphMat}>
              <planeGeometry args={[gl.w, gl.w / 2]} />
            </mesh>
          </>
        ) : null}
      </group>
    </group>
  );
}

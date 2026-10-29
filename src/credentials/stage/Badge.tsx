import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, SpriteMaterial, type Group, type Sprite } from 'three';
import { EXTENT, FILL, type BadgeSpec } from '../slots';
import type { VaultStore } from '../vaultStore';
import { createAnim } from './anim';
import { Codex } from './Codex';
import { hdr, type Kit } from './kit';
import { Medallion } from './Medallion';
import { Monument } from './Monument';
import { Stone } from './Stone';

interface BadgeProps {
  readonly spec: BadgeSpec;
  readonly index: number;
  readonly store: VaultStore;
  readonly kit: Kit;
  /** Reduced motion: a fixed, flattering pose; no sway, spin or entrance. */
  readonly still: boolean;
}

const TAU = Math.PI * 2;
/** The objects are tipped toward the camera by this much, so the plinths read as seen from a little above. */
const TILT = 0.2;
/** Poses for reduced motion: each object turned a little differently so the shelf does not look stamped. */
const STILL_YAW = [-0.3, -0.34, -0.38, 0.34, -0.32, 0.36, -0.28, -0.32];
/** How far the turntable swings from side to side (radians): the medallions swing wide, the monuments barely. */
const SWING = { hero: 0.3, stone: 0.34, cert: 0.8, paper: 0.4 } as const;
/** Scroll turns the objects through this many radians from the vault entering to leaving. */
const SCROLL_TURN = 0.7;

function easeOutBack(t: number): number {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * One credential as a lit object placed in its DOM slot. Owns what every object shares: the entrance (once the vault is
 * on screen), hover or spotlight (a full turn and a swell), the lean toward the cursor, the slow turn with scroll, and the
 * halo behind it. The object itself (monument, stone, medallion, codex) reads the result and poses its own parts.
 */
export function Badge({ spec, index, store, kit, still }: BadgeProps) {
  const root = useRef<Group>(null);
  const halo = useRef<Sprite>(null);
  const warm = useRef<Sprite>(null);
  const anim = useRef(createAnim());
  const s = useRef({ t: 0, hover: 0, spin: 0, spinTarget: 0, was: false, tx: 0, ty: 0 });
  const { kind } = spec;
  const haloMat = useMemo(
    () => new SpriteMaterial({ map: kit.soft, color: hdr(spec.metal === 'gold' && kind !== 'hero' ? '#f59e0b' : '#22d3ee', 1), transparent: true, opacity: 0.13, blending: AdditiveBlending, depthWrite: false }),
    [kit.soft, spec.metal, kind],
  );
  const warmMat = useMemo(
    () => new SpriteMaterial({ map: kit.soft, color: hdr(kind === 'hero' ? '#f59e0b' : '#22d3ee', 1), transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false }),
    [kit.soft, kind],
  );
  useEffect(
    () => () => {
      haloMat.dispose();
      warmMat.dispose();
    },
    [haloMat, warmMat],
  );

  useFrame(({ clock }, rawDt) => {
    const g = root.current;
    if (!g) return;
    const r = store.rects.get(spec.id);
    if (!r) {
      g.visible = false;
      return;
    }
    const dt = Math.min(rawDt, 0.05);
    const st = s.current;
    if (still) st.t = 10;
    else if (store.inView) st.t += dt;
    const local = MathUtils.clamp((st.t - index * 0.09) / 1.2, 0, 1);
    g.visible = local > 0;
    if (!g.visible) return;
    const e = 1 - (1 - local) ** 3;

    const time = still ? 0 : clock.elapsedTime;
    const phase = index * 1.9;
    const active = !still && (store.hover === spec.id || store.pinned === spec.id);
    if (active && !st.was) st.spinTarget += TAU;
    st.was = active;
    st.hover = MathUtils.damp(st.hover, active ? 1 : 0, 6, dt);
    st.spin = MathUtils.damp(st.spin, st.spinTarget, 2.4, dt);

    const ext = EXTENT[kind];
    const unit = Math.min(r.w / ext.w, r.h / ext.h) * FILL[kind];
    g.position.set(r.cx, -r.cy - (1 - e) * 34, 0);
    g.scale.setScalar(unit * (1 + 0.07 * st.hover) * (0.55 + 0.45 * easeOutBack(local)));

    // Lean toward the cursor: more yaw than pitch, damped.
    const p = store.pointer;
    const wantX = still ? 0 : MathUtils.clamp((p.x - r.cx) / 520, -1, 1) * 0.45;
    const wantY = still ? 0 : MathUtils.clamp((p.y - r.cy) / 520, -1, 1) * 0.22;
    st.tx = MathUtils.damp(st.tx, wantX, 4, dt);
    st.ty = MathUtils.damp(st.ty, wantY, 4, dt);
    const swing = still ? STILL_YAW[index % STILL_YAW.length] : Math.sin(time * 0.45 + phase) * SWING[kind];
    const a = anim.current;
    a.hover = st.hover;
    a.time = still ? 0 : st.t;
    a.yaw = swing + st.tx + st.spin + (1 - e) * 1.5 + (still ? 0 : (store.progress - 0.5) * SCROLL_TURN);
    a.pitch = still ? 0 : Math.sin(time * 0.33 + phase) * 0.05 + st.ty;

    if (halo.current) halo.current.material.opacity = 0.13 + 0.17 * st.hover;
    if (warm.current) warm.current.material.opacity = (kind === 'paper' ? 0.2 : kind === 'cert' ? 0.07 : 0.16) + 0.14 * st.hover;
  });

  const big = kind === 'hero' ? 7 : kind === 'cert' ? 4.6 : 5.4;
  return (
    <group ref={root} visible={false}>
      <sprite ref={halo} scale={[big, big, 1]} position={[0, 0, -1.4]} material={haloMat} />
      <sprite ref={warm} scale={[big * 0.7, big * 0.7, 1]} position={[0.9, -0.9, -1.2]} material={warmMat} />
      <group rotation={[TILT, 0, 0]}>
        {kind === 'hero' ? <Monument spec={spec} kit={kit} anim={anim} still={still} /> : null}
        {kind === 'stone' ? <Stone spec={spec} kit={kit} anim={anim} still={still} /> : null}
        {kind === 'cert' ? <Medallion spec={spec} kit={kit} anim={anim} still={still} /> : null}
        {kind === 'paper' ? <Codex spec={spec} kit={kit} anim={anim} still={still} /> : null}
      </group>
    </group>
  );
}

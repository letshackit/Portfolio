import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, SpriteMaterial, type Group, type Sprite } from 'three';
import { DIM, EXTENT, FILL, type BadgeSpec } from '../slots';
import type { VaultStore } from '../vaultStore';
import { createAnim } from './anim';
import { hdr, type Kit } from './kit';
import { Slab } from './Slab';

interface BadgeProps {
  readonly spec: BadgeSpec;
  readonly index: number;
  readonly store: VaultStore;
  readonly kit: Kit;
  /** Reduced motion: a fixed, flattering pose; no sway, spin or entrance. */
  readonly still: boolean;
}

const TAU = Math.PI * 2;
/** Poses for reduced motion: each slab turned a little differently so the row does not look stamped. */
const STILL_YAW = [-0.16, 0.16, -0.12, 0.14, -0.14, 0.12, -0.1, -0.16];
/** How far each slab sways from side to side (radians): small, so the wordmark stays face-on. */
const SWING = { hero: 0.07, stone: 0.08, cert: 0.1, paper: 0.08 } as const;
/** Scroll turns the slabs through this many radians from the vault entering to leaving. */
const SCROLL_TURN = 0.22;

function easeOutBack(t: number): number {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * One credential as a slab placed in its DOM slot. Owns what every slab shares: the entrance (once the vault is on
 * screen), hover or spotlight (a flip and a swell), the lean toward the cursor, the slow turn with scroll, and the light
 * around it (a halo behind, a glow pool and an emitter line on the floor under it). The slab itself poses its own parts.
 */
export function Badge({ spec, index, store, kit, still }: BadgeProps) {
  const root = useRef<Group>(null);
  const halo = useRef<Sprite>(null);
  const floor = useRef<Sprite>(null);
  const line = useRef<Sprite>(null);
  const anim = useRef(createAnim());
  const s = useRef({ t: 0, hover: 0, spin: 0, spinTarget: 0, was: false, tx: 0, ty: 0 });
  const { kind } = spec;
  const gold = spec.metal === 'gold';
  const { w, h } = DIM[kind];
  const mats = useMemo(() => {
    const sprite = (hex: string, boost: number, opacity: number) =>
      new SpriteMaterial({ map: kit.soft, color: hdr(hex, boost), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });
    return {
      halo: sprite(gold ? '#f59e0b' : '#22d3ee', 1, 0.15),
      floor: sprite(gold ? '#f59e0b' : '#22d3ee', 1.8, 0.55),
      line: sprite(gold ? '#fde68a' : '#a5f3fc', 2.6, 0.9),
    };
  }, [kit.soft, gold]);
  useEffect(
    () => () => {
      mats.halo.dispose();
      mats.floor.dispose();
      mats.line.dispose();
    },
    [mats],
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
    const local = MathUtils.clamp((st.t - index * 0.09) / 1.3, 0, 1);
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
    g.position.set(r.cx, -r.cy - (1 - e) * 30, 0);
    g.scale.setScalar(unit * (1 + 0.06 * st.hover) * (0.6 + 0.4 * easeOutBack(local)));

    // Lean toward the cursor: more yaw than pitch, damped.
    const p = store.pointer;
    const live = !still && p.x > -1000;
    const wantX = live ? MathUtils.clamp((p.x - r.cx) / 520, -1, 1) * 0.4 : 0;
    const wantY = live ? MathUtils.clamp((p.y - r.cy) / 520, -1, 1) * 0.2 : 0;
    st.tx = MathUtils.damp(st.tx, wantX, 4, dt);
    st.ty = MathUtils.damp(st.ty, wantY, 4, dt);
    const swing = still ? STILL_YAW[index % STILL_YAW.length] : Math.sin(time * 0.45 + phase) * SWING[kind];
    const a = anim.current;
    a.hover = st.hover;
    a.enter = still ? 1 : local;
    a.time = still ? 0 : st.t;
    a.yaw = swing + st.tx + st.spin + (1 - e) * 0.9 + (still ? 0 : (store.progress - 0.5) * SCROLL_TURN);
    a.pitch = still ? 0 : Math.sin(time * 0.33 + phase) * 0.03 + st.ty;

    const pulse = still ? 0 : Math.sin(time * 1.4 + phase) * 0.04;
    if (halo.current) halo.current.material.opacity = (kind === 'hero' ? 0.2 : 0.14) + 0.14 * st.hover;
    if (floor.current) floor.current.material.opacity = 0.5 + pulse + 0.3 * st.hover;
    if (line.current) line.current.material.opacity = 0.8 + 0.2 * st.hover;
  });

  const big = Math.max(w, h) * (kind === 'hero' ? 2.3 : 2.1);
  const floorY = -h / 2 - 0.2;
  return (
    <group ref={root} visible={false}>
      <sprite ref={halo} scale={[big * 1.15, big * 0.9, 1]} position={[0, 0, -0.7]} material={mats.halo} renderOrder={-2} />
      <sprite ref={floor} scale={[w * 1.5, 0.62, 1]} position={[0, floorY, -0.1]} material={mats.floor} renderOrder={-1} />
      <sprite ref={line} scale={[w * 0.78, 0.035, 1]} position={[0, floorY + 0.02, 0]} material={mats.line} renderOrder={-1} />
      <Slab spec={spec} index={index} kit={kit} anim={anim} still={still} />
    </group>
  );
}

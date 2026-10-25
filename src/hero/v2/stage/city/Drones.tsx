import { createRef, useEffect, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, Sprite, SpriteMaterial, Vector3 } from 'three';
import { store } from '../../store';
import { getSoftTexture } from '../glow';
import { BLOCKS, type BlockDef } from './layout';
import { BASE_Y, blockHeight, dockedAt, readyAt, sceneNow } from './state';

export const MAX_DRONES = 6;
const HOLD = 1.05;
const HOVER = 0.62;
/** Comet tail: dots spaced this many seconds of travel behind the drone, so its length follows speed, not frame rate. */
const TAIL_DOTS = [0.035, 0.07, 0.11] as const;
/** Sprite sizes as a fraction of the screen height: the glow stays a dot at any camera distance. */
const HALO_SIZE = 0.03;
const TAIL_SIZE = [0.021, 0.015, 0.01] as const;
const MAX_TAIL = 3.2;

/**
 * Where each drone enters from (city-local units): over and behind the city, so a flight never crosses in front of the
 * operator. The camera is in front, so they arrive across the back of the skyline.
 */
const ENTRY: ReadonlyArray<readonly [number, number, number]> = [
  [-24, 13, -26],
  [26, 10, -22],
  [-12, 16, -30],
  [14, 14, -28],
  [2, 18, -34],
  [-30, 9, -18],
];

type Phase = 'wait' | 'fly' | 'dock';

interface Drone {
  phase: Phase;
  startAt: number;
  t0: number;
  dur: number;
  from: Vector3;
  to: Vector3;
  ctrl: Vector3;
  pos: Vector3;
  prev: Vector3;
  block: number;
  queue: number[];
  last: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function dockPoint(b: BlockDef, out: Vector3): Vector3 {
  return out.set(b.x, BASE_Y + blockHeight(b) + HOVER, b.z);
}

function bezier(a: Vector3, c: Vector3, b: Vector3, t: number, out: Vector3): Vector3 {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    u * u * a.z + 2 * u * t * b.z + t * t * c.z,
  );
}

function makeDrones(count: number): Drone[] {
  // Blocks in assembly order; drone d takes every sixth one first, so all 18 get built in the first pass.
  const byOrder = [...BLOCKS].sort((a, b) => a.order - b.order).map((b) => b.id);
  return Array.from({ length: count }, (_, d) => ({
    phase: 'wait' as Phase,
    startAt: 0.4 + d * 0.28,
    t0: 0,
    dur: 0,
    from: new Vector3(...ENTRY[d]),
    to: new Vector3(),
    ctrl: new Vector3(),
    pos: new Vector3(...ENTRY[d]),
    prev: new Vector3(...ENTRY[d]),
    block: -1,
    queue: [byOrder[d], byOrder[d + 6], byOrder[d + 12]],
    last: -1,
  }));
}

function planFlight(d: Drone, now: number, next: number): void {
  const b = BLOCKS[next];
  d.block = next;
  d.from.copy(d.pos);
  dockPoint(b, d.to);
  const dist = d.from.distanceTo(d.to);
  let dur = 1.5 + Math.min(dist, 30) * 0.045;
  // Never arrive before the block has risen far enough to dock on.
  dur = Math.max(dur, readyAt(b) - now);
  d.dur = dur;
  d.t0 = now;
  d.ctrl
    .copy(d.from)
    .add(d.to)
    .multiplyScalar(0.5)
    .add(new Vector3((Math.random() - 0.5) * 3, 2.2 + dist * 0.12, (Math.random() - 0.5) * 3));
  d.phase = 'fly';
}

/** Amber agent drones: fly in over the back of the city, dock on a block, light it, move on. */
export function Drones({ count }: { count: number }) {
  const n = Math.min(MAX_DRONES, Math.max(0, count));
  const drones = useMemo(() => makeDrones(n), [n]);
  const bodies = useMemo<Array<RefObject<Mesh>>>(() => Array.from({ length: n }, () => createRef<Mesh>()), [n]);
  const halos = useMemo<Array<RefObject<Sprite>>>(() => Array.from({ length: n }, () => createRef<Sprite>()), [n]);
  const tails = useMemo<Array<Array<RefObject<Sprite>>>>(
    () => Array.from({ length: n }, () => TAIL_DOTS.map(() => createRef<Sprite>())),
    [n],
  );
  const mat = useMemo(() => new MeshBasicMaterial({ color: new Color('#F59E0B').multiplyScalar(2.6), toneMapped: false, fog: false }), []);
  const haloMat = useMemo(
    () =>
      new SpriteMaterial({
        map: getSoftTexture(),
        color: new Color('#F59E0B').multiplyScalar(1.5),
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: false,
      }),
    [],
  );
  const tailMat = useMemo(() => haloMat.clone(), [haloMat]);
  const tmp = useMemo(() => new Vector3(), []);
  const vel = useMemo(() => new Vector3(), []);

  useEffect(
    () => () => {
      mat.dispose();
      haloMat.dispose();
      tailMat.dispose();
    },
    [mat, haloMat, tailMat],
  );

  useFrame((_, dt) => {
    const now = sceneNow();
    const step = Math.max(dt, 1 / 120);
    drones.forEach((d, i) => {
      d.prev.copy(d.pos);
      if (d.phase === 'wait') {
        if (now >= d.startAt) planFlight(d, now, d.queue.shift() as number);
      } else if (d.phase === 'fly') {
        const u = Math.min((now - d.t0) / d.dur, 1);
        bezier(d.from, d.ctrl, d.to, easeInOut(u), d.pos);
        if (u >= 1) {
          d.phase = 'dock';
          d.t0 = now;
          store.docks += 1;
          dockedAt[d.block] = now;
        }
      } else {
        const b = BLOCKS[d.block];
        const bob = Math.sin((now - d.t0) * 6) * 0.04;
        dockPoint(b, tmp);
        d.pos.set(tmp.x, tmp.y + bob, tmp.z);
        if (now - d.t0 > HOLD) {
          let next = d.queue.shift();
          if (next === undefined) {
            do next = Math.floor(Math.random() * BLOCKS.length);
            while (next === d.block || next === d.last);
          }
          d.last = d.block;
          planFlight(d, now, next);
        }
      }
      bodies[i].current?.position.copy(d.pos);
      halos[i].current?.position.copy(d.pos);
      // Velocity from the real elapsed time between frames, so a slow frame does not stretch the tail.
      vel.copy(d.pos).sub(d.prev).divideScalar(step);
      TAIL_DOTS.forEach((lag, k) => {
        const dot = tails[i][k].current;
        if (!dot) return;
        tmp.copy(vel).multiplyScalar(-lag);
        if (tmp.length() > MAX_TAIL) tmp.setLength(MAX_TAIL);
        dot.position.copy(d.pos).add(tmp);
      });
    });
  });

  return (
    <group>
      {drones.map((d, i) => (
        <group key={i}>
          <mesh ref={bodies[i]} position={d.pos} material={mat}>
            <sphereGeometry args={[0.13, 16, 16]} />
          </mesh>
          <sprite ref={halos[i]} position={d.pos} scale={HALO_SIZE} material={haloMat} />
          {TAIL_DOTS.map((_, k) => (
            <sprite key={k} ref={tails[i][k]} position={d.pos} scale={TAIL_SIZE[k]} material={tailMat} />
          ))}
        </group>
      ))}
    </group>
  );
}

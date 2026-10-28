import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { hstore, smoothstep } from '../historyStore';
import type { TimelineModel } from '../timelineModel';
import { GATE_R, OVERVIEW_SCALE } from './gate';
import { monthsBack, pathPoint } from './path';
import type { RigMode } from './Rig';

interface TagProjectorProps {
  readonly model: TimelineModel;
  readonly mode: RigMode;
  /** The DOM layer that holds one `[data-tag]` element per station (`s<i>`) and per year (`y<year>`). */
  readonly layer: RefObject<HTMLElement | null>;
}

interface Tag {
  readonly el: HTMLElement;
  readonly anchor: Vector3;
  readonly kind: 'station' | 'year';
  readonly index: number;
}

/**
 * The scene's words are DOM, not texture: each frame the 3D anchors are projected to the stage box and the matching
 * element is moved with a transform. The type is as crisp as the rest of the page at any pixel ratio, and only the
 * station the visitor is at carries a full label, so nothing stacks while the camera travels. Years sit on the left
 * of the path, clear of the names above the gates. Hidden entirely on the phone strip, whose HUD already names the station.
 */
export function TagProjector({ model, mode, layer }: TagProjectorProps) {
  const tags = useMemo<Tag[]>(() => {
    const root = layer.current;
    if (!root) return [];
    const out: Tag[] = [];
    model.stations.forEach((s, i) => {
      const el = root.querySelector<HTMLElement>(`[data-tag="s${i}"]`);
      if (el) out.push({ el, kind: 'station', index: i, anchor: pathPoint(monthsBack(model, s.end)).add(new Vector3(0, GATE_R + 0.9, 0)) });
    });
    model.years.forEach((y, i) => {
      const el = root.querySelector<HTMLElement>(`[data-tag="y${y.year}"]`);
      if (el) out.push({ el, kind: 'year', index: i, anchor: pathPoint(monthsBack(model, y.at)).add(new Vector3(-GATE_R - 0.9, -GATE_R + 0.1, 0)) });
    });
    return out;
  }, [model, layer]);

  // Park every tag when the projector goes away (mode change, unmount): never leave a label frozen mid-scene.
  useEffect(
    () => () => {
      for (const t of tags) t.el.style.opacity = '0';
    },
    [tags],
  );

  const tmp = useMemo(() => new Vector3(), []);
  useFrame((state) => {
    const { camera, size } = state;
    camera.updateMatrixWorld();
    for (const t of tags) {
      let o = 0;
      // The strip (phone, or the phone's overview) is too small for words in the scene: its HUD names the station.
      if (mode !== 'side' && size.height > 420) {
        tmp.copy(t.anchor);
        // The overview's gates are bigger: lift the names clear of them, and alternate two heights so neighbours never touch.
        if (mode === 'overview' && t.kind === 'station') tmp.y += (OVERVIEW_SCALE - 1) * GATE_R + (t.index % 2 === 0 ? 0 : 1.4);
        tmp.project(camera);
        const d = camera.position.distanceTo(t.anchor);
        const inFront = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        if (inFront) {
          let x = (tmp.x * 0.5 + 0.5) * size.width;
          // The overview shows every name at once: keep each one inside the stage.
          if (mode === 'overview') {
            const half = t.el.offsetWidth / 2 + 16;
            x = Math.min(size.width - half, Math.max(half, x));
          }
          x = Math.round(x * 2) / 2;
          const y = Math.round(((-tmp.y * 0.5 + 0.5) * size.height) * 2) / 2;
          t.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
          if (mode === 'overview') o = t.kind === 'station' ? 1 : 0;
          else if (t.kind === 'station') {
            // Only the station at the camera's focus: the label leaves as the visitor moves on and the next one arrives.
            const present = 1 - smoothstep(0.3, 0.95, hstore.fs - t.index);
            o = smoothstep(0.5, 0.12, Math.abs(hstore.fs - t.index)) * smoothstep(5.5, 7.5, d) * smoothstep(22, 15, d) * present;
          } else {
            // Years fade toward the lower and left edges, where the stage readout lives.
            o = smoothstep(7, 11, d) * smoothstep(30, 16, d) * smoothstep(-0.6, -0.15, tmp.y) * smoothstep(-0.85, -0.45, tmp.x) * 0.75;
          }
        }
      }
      const v = o < 0.01 ? '0' : o.toFixed(3);
      if (t.el.style.opacity !== v) t.el.style.opacity = v;
    }
  });
  return null;
}

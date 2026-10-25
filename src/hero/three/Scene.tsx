import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { Vector3 } from 'three';
import { createWatchdog } from './FrameWatchdog';
import { Edges } from './Edges';
import { Packets } from './Packets';
import { StageNodes } from './StageNodes';
import { buildCurves, cameraDistance, nodePositions, type SceneColors } from './sceneGeometry';
import type { Pipeline3DProps } from './types';

/** Tilt limits in radians: 6 degrees about y, 3 degrees about x (architecture C.3). */
const TILT_Y = 0.105;
const TILT_X = 0.052;
const TILT_LERP = 0.08;
/** Re-project nodes only when the rotation moved more than this. */
const REPROJECT_EPS = 1e-4;

interface SceneProps extends Pick<Pipeline3DProps, 'layout' | 'frameEl' | 'hoveredStage' | 'onArrive' | 'pointerFine' | 'onReady' | 'onFail'> {
  readonly colors: SceneColors;
  readonly maxLive: number;
  readonly onDegrade: () => void;
}

function setNodeVars(frameEl: HTMLElement, i: number, left: string, top: string): void {
  frameEl.style.setProperty(`--px-${i}`, left);
  frameEl.style.setProperty(`--py-${i}`, top);
}

export function Scene({ layout, frameEl, hoveredStage, onArrive, pointerFine, onReady, onFail, colors, maxLive, onDegrade }: SceneProps) {
  const root = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  const curves = useMemo(() => buildCurves(layout), [layout]);
  const positions = useMemo(() => nodePositions(layout), [layout]);
  const pulses = useMemo(() => new Float32Array(positions.length), [positions]);
  const watchdog = useMemo(() => createWatchdog({ onDegrade, onFail: () => onFail('slow') }), [onDegrade, onFail]);

  const target = useRef({ x: 0, y: 0 });
  const projected = useRef({ rx: Number.NaN, ry: Number.NaN, w: 0, h: 0 });
  const ready = useRef(false);
  const scratch = useMemo(() => new Vector3(), []);

  // Fit the camera to the frame width on every resize.
  useEffect(() => {
    camera.position.set(0, 0, cameraDistance(size.width / Math.max(size.height, 1)));
    camera.updateMatrixWorld();
  }, [camera, size.width, size.height]);

  // Cursor tilt targets come from the frame's pointer events (fine pointers only).
  useEffect(() => {
    if (!pointerFine) return;
    const move = (e: PointerEvent) => {
      const r = frameEl.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      target.current = { x: -Math.max(-1, Math.min(1, py)) * TILT_X, y: Math.max(-1, Math.min(1, px)) * TILT_Y };
    };
    const leave = () => {
      target.current = { x: 0, y: 0 };
    };
    frameEl.addEventListener('pointermove', move);
    frameEl.addEventListener('pointerleave', leave);
    return () => {
      frameEl.removeEventListener('pointermove', move);
      frameEl.removeEventListener('pointerleave', leave);
    };
  }, [frameEl, pointerFine]);

  // Context loss: no restore attempt, hand back to the SVG.
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onFail('contextlost');
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFail]);

  // On unmount put the overlay back on the static (SVG) positions and drop the projected variables.
  useEffect(() => {
    return () => {
      layout.nodes.forEach((_, i) => {
        frameEl.style.removeProperty(`--px-${i}`);
        frameEl.style.removeProperty(`--py-${i}`);
      });
    };
  }, [frameEl, layout]);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    group.rotation.x += (target.current.x - group.rotation.x) * TILT_LERP;
    group.rotation.y += (target.current.y - group.rotation.y) * TILT_LERP;

    const p = projected.current;
    const moved =
      Math.abs(group.rotation.x - p.rx) > REPROJECT_EPS ||
      Math.abs(group.rotation.y - p.ry) > REPROJECT_EPS ||
      p.w !== size.width ||
      p.h !== size.height ||
      Number.isNaN(p.rx);
    if (moved) {
      group.updateMatrixWorld(true);
      state.camera.updateMatrixWorld();
      // Anchor the rest pose to the SVG percentages and add only the tilt movement, so the stage buttons do not
      // jump by a pixel when the 3D scene replaces the SVG (S7-AC3).
      const [vbW, vbH] = layout.viewBox;
      positions.forEach((pos, i) => {
        scratch.copy(pos).project(state.camera);
        const restX = scratch.x;
        const restY = scratch.y;
        scratch.copy(pos).applyMatrix4(group.matrixWorld).project(state.camera);
        const left = (layout.nodes[i].x / vbW) * 100 + (scratch.x - restX) * 50;
        const top = (layout.nodes[i].y / vbH) * 100 - (scratch.y - restY) * 50;
        setNodeVars(frameEl, i, `${left.toFixed(2)}%`, `${top.toFixed(2)}%`);
      });
      projected.current = { rx: group.rotation.x, ry: group.rotation.y, w: size.width, h: size.height };
    }

    watchdog.tick(delta);
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return (
    <group ref={root}>
      <Edges curves={curves} colors={colors} />
      <StageNodes positions={positions} colors={colors} hovered={hoveredStage} pulses={pulses} />
      <Packets curves={curves} colors={colors} maxLive={maxLive} pulses={pulses} onArrive={onArrive} />
    </group>
  );
}

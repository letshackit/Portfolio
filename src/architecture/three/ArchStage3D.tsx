import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Highlight } from '../../lib/archLayout';
import type { Layout3D } from './layout3d';
import { ArchScene } from './ArchScene';
import type { Projection } from './projection';

gsap.registerPlugin(ScrollTrigger);

export interface ArchStage3DProps {
  readonly layout: Layout3D;
  readonly proj: Projection;
  readonly lit: Highlight | null;
  readonly frameEl: HTMLElement;
  readonly paused: boolean;
  readonly pointerFine: boolean;
  readonly onReady: () => void;
  readonly onFail: () => void;
}

const ASSEMBLE_START = 'top 90%';
const ASSEMBLE_END = 'top 28%';

/**
 * Lazy chunk: the exploded TravelDesk view. The canvas is decorative (aria-hidden, no pointer events); the DOM node
 * list in the frame owns hover, focus and screen readers. Scroll progress through the frame drives the assembly, so
 * scrolling back up disassembles it: the motion is tied to the visitor, not to a timer.
 */
export default function ArchStage3D({ layout, proj, lit, frameEl, paused, pointerFine, onReady, onFail }: ArchStage3DProps) {
  const progress = useRef(0);
  const [degraded, setDegraded] = useState(false);
  const onDegrade = useCallback(() => setDegraded(true), []);

  useEffect(() => {
    const readout = frameEl.querySelector<HTMLElement>('[data-arch-progress]');
    const write = (p: number) => {
      progress.current = p;
      if (readout) readout.textContent = `${String(Math.round(p * 100)).padStart(3, '0')}%`;
    };
    const trigger = ScrollTrigger.create({
      trigger: frameEl,
      start: ASSEMBLE_START,
      end: ASSEMBLE_END,
      onUpdate: (self) => write(self.progress),
      onRefresh: (self) => write(self.progress),
    });
    write(trigger.progress);
    return () => trigger.kill();
  }, [frameEl]);

  return (
    <Canvas
      dpr={degraded ? 1 : [1, 1.75]}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false, depth: true }}
      camera={{ fov: proj.fov, near: 0.5, far: 220, position: [0, 0, proj.distance] }}
      frameloop={paused ? 'never' : 'always'}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <ArchScene
        layout={layout}
        lit={lit}
        progress={progress}
        frameEl={frameEl}
        pointerFine={pointerFine}
        onReady={onReady}
        onFail={onFail}
        onDegrade={onDegrade}
        degraded={degraded}
      />
    </Canvas>
  );
}

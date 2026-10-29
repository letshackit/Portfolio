/**
 * The hero's scroll beat (motion chunk). One ScrollTrigger over the section's scroll length drives the 3D camera and the
 * DOM together through `store.progress`: the camera orbits from 3/4 to frontal and pushes past the portrait into the
 * city, the headline fades up and out, the HUD panes slide off their edges, the city lines up, a caption strip comes
 * in, the console shrinks to a chip, and the stage resolves to the page background. Not bound under reduced motion
 * (useMotion never loads this chunk then).
 *
 * Every from-state is explicit. The entrance runs as CSS animations on these same elements, and the beat can bind
 * while it is still playing: a tween that read its start value from the computed style would capture the entrance's
 * transparent first frame and leave the element hidden for good.
 */
import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { store } from './store';

/** Width of the console once it has shrunk to a chip, in px. */
const CHIP_WIDTH = 214;

const SHOWN = { autoAlpha: 1 };
const HIDDEN = { autoAlpha: 0 };

export function bindHeroBeat(): () => void {
  const root = document.querySelector<HTMLElement>('.hv2');
  const stage = root?.querySelector<HTMLElement>('.hv2__stage');
  if (!root || !stage) return () => undefined;
  const q = gsap.utils.selector(root);

  // ScrollSmoother transforms its content, which breaks position: sticky, so the stage is pinned by ScrollTrigger there.
  const pinned = ScrollSmoother.get() !== undefined;
  if (pinned) root.setAttribute('data-pinned', '');

  const tl = gsap.timeline({
    defaults: { ease: 'none', immediateRender: false },
    scrollTrigger: {
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      invalidateOnRefresh: true,
      ...(pinned ? { pin: stage, pinSpacing: false } : {}),
    },
  });

  tl.to(store, { progress: 1, duration: 1 }, 0)
    .fromTo(q('.hv2__copy'), { ...SHOWN, yPercent: 0 }, { ...HIDDEN, yPercent: -16, ease: 'power2.in', duration: 0.42 }, 0)
    .fromTo(q('.hv2__badge'), { ...SHOWN, x: 0 }, { ...HIDDEN, x: 48, ease: 'power2.in', duration: 0.32 }, 0.02)
    .fromTo(q('.hv2__pane'), { ...SHOWN, xPercent: 0 }, { ...HIDDEN, xPercent: 135, ease: 'power2.in', duration: 0.4 }, 0.04)
    .fromTo(q('.hv2__cue, .hv2__hint'), SHOWN, { ...HIDDEN, duration: 0.12 }, 0)
    .to(q('.hv2__console'), { width: CHIP_WIDTH, minWidth: 0, ease: 'power2.inOut', duration: 0.34 }, 0.3)
    .to(q('.hv2__console .hv2__term-body'), { height: 0, paddingTop: 0, paddingBottom: 0, autoAlpha: 0, ease: 'power2.inOut', duration: 0.34 }, 0.3)
    .to(q('.hv2__console .hv2__term-meta'), { autoAlpha: 0, duration: 0.2 }, 0.3)
    .fromTo(q('.hv2__caption'), { ...HIDDEN, y: 22 }, { ...SHOWN, y: 0, ease: 'power2.out', duration: 0.22 }, 0.6)
    .fromTo(q('.hv2__caption, .hv2__frame, .hv2__bar, .hv2__console'), SHOWN, { ...HIDDEN, duration: 0.1 }, 0.9)
    .fromTo(q('.hv2__veil'), HIDDEN, { ...SHOWN, duration: 0.14 }, 0.86);

  return () => {
    root.removeAttribute('data-pinned');
    store.progress = 0;
  };
}

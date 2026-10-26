/**
 * Mutable state shared between the DOM (GSAP / ScrollTrigger / pointer) and the WebGL scene (useFrame).
 * Mutated outside React on purpose: it changes every frame and must never trigger a render. Framework-free and
 * three-free, so the entry chunk and the motion chunk can both import it without pulling the 3D chunk in.
 */
export const store = {
  /** Scroll beat 0..1, scrubbed by ScrollTrigger (beat.ts). */
  progress: 0,
  /** "Lights on" 0..1, tweened once the avatar is on screen. The scene starts at a 40 % floor, never dark. */
  intro: 0,
  /** Pointer in -1..1, y up. */
  px: 0,
  py: 0,
  reduced: false,
  /** Arrow-key turns queued by the page for the avatar (signed count, consumed by the frame loop). */
  keyTurn: 0,
  /** The visitor has turned the avatar by drag or key at least once. */
  interacted: false,
  /** Called once, on the first turn; the page fades the hint. */
  onInteract: null as (() => void) | null,
  /** Wakes a demand-rendered stage (reduced motion); set by the avatar while mounted. */
  wake: null as (() => void) | null,
  /** Scene clock in seconds; only advances while frames render. */
  time: 0,
  /** Live counters read by the status bar. */
  assembled: 0,
  docks: 0,
  packets: 0,
};

export function resetCounters(): void {
  store.assembled = 0;
  store.docks = 0;
  store.packets = 0;
}

/** Marks the first drag or key turn, once. */
export function markInteracted(): void {
  if (store.interacted) return;
  store.interacted = true;
  store.onInteract?.();
}

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

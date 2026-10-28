/**
 * The flight's clock. Framework-free and three-free, so the scroll engine (motion chunk) and the scene (3D chunk) share it.
 *
 * Scroll progress p (0..1) maps to a camera position `s` measured in stations: station i sits at s = i. A dwell warp
 * slows the camera as it passes each integer, so every station holds still long enough to be read before the next one
 * starts assembling.
 */

export const STATIONS = 7;
/** The camera starts a little before station 0, so it is already half-built when the frame pins. */
export const S_START = -0.55;
/** The run-in: scroll progress below 0 (the frame sliding up into view) already starts station 1 assembling. */
export const ENTER_P = 0.07;
export const S_END = STATIONS - 1 + 0.45;
/** 0 = constant speed; 0.6 = the camera crawls at 40 % speed on each station. Must stay below 1 (monotonic). */
export const DWELL = 0.6;

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Linear sweep position u (in stations) to the warped camera position s. Monotonic. */
export function warp(u: number): number {
  return u - (DWELL * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
}

export function progressToS(p: number): number {
  return warp(S_START + Math.min(1, Math.max(-ENTER_P, p)) * (S_END - S_START));
}

/** The scroll progress at which the camera rests on station `index` (inverse of progressToS by bisection). */
export function progressForStation(index: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i += 1) {
    const mid = (lo + hi) / 2;
    if (progressToS(mid) < index) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The station the HUD names while the camera is at `s`. */
export function activeStation(s: number): number {
  return Math.min(STATIONS - 1, Math.max(0, Math.round(s)));
}

/** 0 -> 1 as station `i` assembles in front of the camera: starts about a station out, complete just before arrival. */
export function assemble(i: number, s: number): number {
  // Station 1 has no station before it to fly in from: it gets a longer run-in, starting as the frame slides into view.
  return smoothstep(i === 0 ? -1.5 : i - 0.95, i - 0.12, s);
}

/** 0 -> 1 as the camera flies past station `i`; used to dim what is already behind. */
export function passed(i: number, s: number): number {
  return smoothstep(i + 0.4, i + 1.1, s);
}

/** Whether station `i` needs any work at camera position `s`. */
export function stationVisible(i: number, s: number): boolean {
  return s > (i === 0 ? -1.6 : i - 1.1) && s < i + 1.6;
}

/** Shared, mutable flight state: written by the scroll engine, read by the scene each frame. Never triggers a render. */
export const flight = {
  /** Raw scroll progress from ScrollTrigger, 0..1. */
  target: 0,
  /** Damped progress the rail and the scene follow. */
  current: 0,
  /** Camera position in stations, derived from `current`. */
  s: progressToS(0),
  /** Pointer in -1..1, y up. */
  px: 0,
  py: 0,
};

export function resetFlight(): void {
  flight.target = 0;
  flight.current = 0;
  flight.s = progressToS(0);
  flight.px = 0;
  flight.py = 0;
}

/**
 * The hero stage's look, "clean product shot" (look C) with the judged grafts: every lighting, material, post and floor
 * parameter lives in this one object. Framework-free (data only).
 *
 * Intent: a neutral-warm key held low and to the left so the cheek never blows out, a broad soft fill, a faint cyan rim
 * and a fainter amber rim that ties him to the palette (cyan = structure, amber = agent/work). The HDR environment does
 * most of the work. Minimal post (anti-aliasing and a vignette, bloom held above the skin), neutral exposure, a clean
 * soft shadow and a subtle floor reflection.
 */
export type V3 = readonly [number, number, number];

export interface LookPreset {
  /** Global multiplier on every light and the environment. 1 = neutral; ACES runs in post (the Effects stack). */
  readonly exposure: number;
  readonly environment: {
    /** Strength of the studio HDR on the rest of the scene (floor, city). */
    readonly intensity: number;
    /** Euler Y, radians, of the scene's environment (turns the HDR for the floor and the city). */
    readonly rotationY: number;
  };
  readonly lights: {
    readonly key: { readonly color: string; readonly intensity: number; readonly position: V3 };
    readonly fill: { readonly color: string; readonly intensity: number; readonly position: V3 };
    /** Hemisphere wash: sky colour above, ground bounce below. Broad and shadowless. */
    readonly hemi: { readonly sky: string; readonly ground: string; readonly intensity: number };
    /** Cyan rim from behind-right: structure. */
    readonly rim: { readonly color: string; readonly intensity: number; readonly position: V3 };
    /** Amber rim from behind-left: the agent's warmth. */
    readonly rim2: { readonly color: string; readonly intensity: number; readonly position: V3 };
    /** Soft overhead pool: lights the floor around him so the shadow reads, and gives a gentle top light. */
    readonly pool: { readonly color: string; readonly intensity: number; readonly position: V3; readonly angle: number; readonly penumbra: number };
    /** Share of the intensities already on at intro 0 (he is readable the moment he mounts). */
    readonly introFloor: number;
  };
  readonly post: {
    readonly bloom: { readonly intensity: number; readonly threshold: number; readonly smoothing: number; readonly radius: number };
    /** Film grain is off: crisp, smooth skin. */
    readonly noise: boolean;
    readonly vignette: { readonly offset: number; readonly darkness: number };
  };
  /** Multiplier on the drifting sparkle counts: a clean shot wants a few, not a swarm. */
  readonly particles: { readonly sparkleScale: number };
  readonly backdrop: {
    /** Soft halo behind him, to lift the silhouette off the dark: colour and peak alpha; and the warm pool's alpha. */
    readonly haloColor: string;
    readonly haloAlpha: number;
    readonly warmAlpha: number;
  };
  readonly floor: {
    readonly color: string;
    readonly roughness: number;
    readonly metalness: number;
    /** Reflection strength: MeshReflectorMaterial mirror and mix strength. */
    readonly mirror: number;
    readonly mixStrength: number;
    readonly blur: readonly [number, number];
    /** Opacity multiplier on the three floor rings. */
    readonly ringOpacity: number;
    readonly shadow: { readonly opacity: number; readonly blur: number; readonly far: number; readonly scale: number };
  };
}

export const LOOK: LookPreset = {
  exposure: 1,
  environment: { intensity: 0.7, rotationY: 0.6 },
  lights: {
    key: { color: '#ffe8d2', intensity: 1.1, position: [-2.3, 1.9, 3.9] },
    fill: { color: '#f4f7ff', intensity: 0.8, position: [3.2, 1.6, 3.4] },
    hemi: { sky: '#f2f6ff', ground: '#1b2430', intensity: 0.25 },
    rim: { color: '#67e8f9', intensity: 1.7, position: [3.6, 3.0, -3.4] },
    rim2: { color: '#f59e0b', intensity: 0.4, position: [-3.4, 1.6, -3.0] },
    pool: { color: '#ffffff', intensity: 34, position: [0, 4.6, 1.0], angle: 0.5, penumbra: 1 },
    introFloor: 0.4,
  },
  post: {
    bloom: { intensity: 0.12, threshold: 0.92, smoothing: 0.05, radius: 0.6 },
    noise: false,
    vignette: { offset: 0.3, darkness: 0.6 },
  },
  particles: { sparkleScale: 0.4 },
  backdrop: { haloColor: '#cfeaff', haloAlpha: 0.1, warmAlpha: 0 },
  floor: {
    color: '#1c212a',
    roughness: 0.9,
    metalness: 0.3,
    mirror: 0.45,
    mixStrength: 18,
    blur: [380, 120],
    ringOpacity: 0.5,
    shadow: { opacity: 0.55, blur: 3.2, far: 1.5, scale: 5 },
  },
};

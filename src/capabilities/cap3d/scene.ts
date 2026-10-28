/** Shared pieces of the capability scene: palette, per-instance mutable state, the Fresnel aura material. */
import { AdditiveBlending, Color, ShaderMaterial, Vector3 } from 'three';
import type { Tone } from '../domains';

export const COLORS: Readonly<Record<Tone, { readonly base: Color; readonly hot: Color; readonly css: string }>> = {
  cyan: { base: new Color('#22d3ee'), hot: new Color('#67e8f9'), css: '#22d3ee' },
  amber: { base: new Color('#f59e0b'), hot: new Color('#fbbf24'), css: '#f59e0b' },
};

export const BG = '#07080a';

/**
 * Everything the frame loop shares between components. One object per stage instance, mutated in place: React never
 * re-renders for it, so the 60 fps path allocates nothing.
 */
export interface StageState {
  /** Camera azimuth around the ring, radians (unwrapped, so it eases the short way). */
  camAz: number;
  /** Where the camera looks: eases towards the active hub. */
  readonly look: Vector3;
  /** 0..1 per hub: how far its cluster has opened. */
  readonly act: number[];
  /** Hub world positions, bobbing included (the beams read these). */
  readonly hubWorld: Vector3[];
  /** Seconds of stage time. */
  time: number;
  /** 0..1 how far the section has travelled through the viewport. */
  scroll: number;
  /** Seconds since the active domain last changed, per hub (drives the activation shockwave). */
  readonly pulse: number[];
}

export function createState(count: number): StageState {
  return {
    camAz: 0,
    look: new Vector3(),
    act: Array.from({ length: count }, () => 0),
    hubWorld: Array.from({ length: count }, () => new Vector3()),
    time: 0,
    scroll: 0.5,
    pulse: Array.from({ length: count }, () => 9),
  };
}

/** Additive rim glow: bright where the surface turns away from the camera, clear where it faces it. */
export function createAura(color: Color, power = 2.4, gain = 1.5): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { c: { value: color.clone() }, p: { value: power }, k: { value: gain } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 c;
      uniform float p;
      uniform float k;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), p);
        gl_FragColor = vec4(c * f * k, f);
      }`,
  });
}

import { Color } from 'three';
import type { SceneRoute, Tone } from './spec';

export const TONES: Readonly<Record<Tone, { edge: Color; emissive: Color; fill: Color; title: string; sub: string }>> = {
  cyan: { edge: new Color('#22d3ee'), emissive: new Color('#22d3ee'), fill: new Color('#0a1318'), title: '#dcf8ff', sub: '#8aeefc' },
  soft: { edge: new Color('#67e8f9'), emissive: new Color('#67e8f9'), fill: new Color('#0c161b'), title: '#e8fbff', sub: '#9ae9f6' },
  slate: { edge: new Color('#94a3b8'), emissive: new Color('#64748b'), fill: new Color('#0d1014'), title: '#e2e8f0', sub: '#b9c4d3' },
  core: { edge: new Color('#a5f3fc'), emissive: new Color('#22d3ee'), fill: new Color('#0b1c22'), title: '#ffffff', sub: '#a5f3fc' },
};

export const noRaycast = () => null;

export const ROUTE_STYLE: Readonly<Record<SceneRoute['kind'], { color: string; width: number; dashed: boolean; base: number }>> = {
  call: { color: '#22d3ee', width: 1.6, dashed: false, base: 0.5 },
  flow: { color: '#22d3ee', width: 2.1, dashed: false, base: 0.7 },
  event: { color: '#22d3ee', width: 1.7, dashed: true, base: 0.6 },
  return: { color: '#7dd3fc', width: 1.6, dashed: false, base: 0.5 },
  control: { color: '#38bdf8', width: 1.5, dashed: true, base: 0.55 },
  mesh: { color: '#0e7490', width: 1.3, dashed: false, base: 0.4 },
  phase2: { color: '#0891b2', width: 1.5, dashed: true, base: 0.45 },
};


import { Color, QuadraticBezierCurve3, Vector3 } from 'three';
import { toWorld, type PipelineLayout } from '../../lib/pipelineLayout';

/** World width the viewBox spans; must match pipelineLayout.toWorld. */
export const WORLD_WIDTH = 10.4;
export const CAMERA_FOV = 28;

/** Mid-point offset of each 3D edge: the same upward bow as the SVG, plus a dip away from the viewer. */
const EDGE_BOW = new Vector3(0, 0.18, -0.35);

/** Stage node positions in world units, from the shared layout. */
export function nodePositions(layout: PipelineLayout): Vector3[] {
  return layout.nodes.map((n) => new Vector3(...toWorld(n, layout)));
}

/** One curve per layout edge, node i to node i + 1. */
export function buildCurves(layout: PipelineLayout): QuadraticBezierCurve3[] {
  const nodes = nodePositions(layout);
  return layout.edges.map((e) => {
    const a = nodes[e.from];
    const b = nodes[e.to];
    const mid = a.clone().add(b).multiplyScalar(0.5).add(EDGE_BOW);
    const curve = new QuadraticBezierCurve3(a, mid, b);
    curve.arcLengthDivisions = 60;
    return curve;
  });
}

/** Camera distance that fits the world width at the frame's aspect (architecture C.3). */
export function cameraDistance(aspect: number): number {
  return WORLD_WIDTH / aspect / (2 * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)));
}

export interface SceneColors {
  readonly cyan: Color;
  readonly amber: Color;
  readonly surface: Color;
}

function token(style: CSSStyleDeclaration, name: string): Color {
  const value = style.getPropertyValue(name).trim();
  return value ? new Color(value) : new Color();
}

/** Colours come from the design tokens on the frame element, so the 3D scene never carries its own palette. */
export function readSceneColors(el: HTMLElement): SceneColors {
  const style = getComputedStyle(el);
  return { cyan: token(style, '--cyan-500'), amber: token(style, '--amber-500'), surface: token(style, '--surface') };
}

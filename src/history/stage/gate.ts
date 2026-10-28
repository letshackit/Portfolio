import { EdgesGeometry, ExtrudeGeometry, Path, RingGeometry, Shape } from 'three';

export const GATE_R = 0.85;

/** The overview (reduced motion) draws the gates larger, so the still reads as a few big hexes, not a row of specks. */
export const OVERVIEW_SCALE = 1.7;

export function hexPoints(r: number): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

/** The gate: a hexagonal frame with a thick rim, built once and shared by every station. */
export function buildGateGeometry(): { frame: ExtrudeGeometry; edges: EdgesGeometry; face: RingGeometry } {
  const outer = hexPoints(GATE_R);
  const inner = hexPoints(GATE_R - 0.11);
  const shape = new Shape();
  outer.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const hole = new Path();
  inner.forEach(([x, y], i) => (i === 0 ? hole.moveTo(x, y) : hole.lineTo(x, y)));
  hole.closePath();
  shape.holes.push(hole);
  const frame = new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  frame.translate(0, 0, -0.06);
  const edges = new EdgesGeometry(frame, 25);
  const face = new RingGeometry(0.001, GATE_R - 0.11, 6);
  face.rotateZ(Math.PI / 6);
  return { frame, edges, face };
}

export type GateGeometry = ReturnType<typeof buildGateGeometry>;

export function disposeGate(g: GateGeometry): void {
  g.frame.dispose();
  g.edges.dispose();
  g.face.dispose();
}


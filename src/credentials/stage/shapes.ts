import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, Vector2 } from 'three';

/** A closed polygon with every corner rounded by a quadratic curve. `round` is the share of each edge consumed (0..0.5). */
export function roundedPolygon(points: readonly Vector2[], round: number): Shape {
  const shape = new Shape();
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const a = cur.clone().lerp(prev, round);
    const b = cur.clone().lerp(next, round);
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  shape.closePath();
  return shape;
}

/** Pointy-top regular polygon of circumradius 1 (`turn` rotates it, in radians). */
export function regularPolygon(sides: number, turn = 0): Vector2[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = Math.PI / 2 + turn + (i / sides) * Math.PI * 2;
    return new Vector2(Math.cos(a), Math.sin(a));
  });
}

export function rectPoints(w: number, h: number): Vector2[] {
  const x = w / 2;
  const y = h / 2;
  return [new Vector2(-x, y), new Vector2(-x, -y), new Vector2(x, -y), new Vector2(x, y)];
}

/** A heraldic shield: flat shoulders, a low peak on top, a point at the bottom. Half-height 1. */
export function shieldPoints(): Vector2[] {
  return [new Vector2(0, 1), new Vector2(0.84, 0.8), new Vector2(0.84, -0.18), new Vector2(0, -1), new Vector2(-0.84, -0.18), new Vector2(-0.84, 0.8)];
}

/** The cornerstone: a tall slab with a peaked top, like a gate stone or a shield. Half-height 1. */
export function monolithPoints(): Vector2[] {
  return [new Vector2(-0.74, 0.5), new Vector2(-0.74, -1), new Vector2(0.74, -1), new Vector2(0.74, 0.5), new Vector2(0, 1)];
}

/** A shape pushed out to a bevelled, centred slab: the front face at +depth / 2, the back at -depth / 2. */
export function slab(shape: Shape, depth: number, bevel: number): ExtrudeGeometry {
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelOffset: -bevel * 0.9,
    bevelSegments: 5,
    curveSegments: 14,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** A unit-radius circle as a closed polyline in the XY plane. */
export function circleGeometry(segments = 96): BufferGeometry {
  const pos: number[] = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    pos.push(Math.cos(a), Math.sin(a), 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

/** Evenly spread points on a sphere (Fibonacci lattice), radius 1. */
export function spherePoints(count: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}

/** Each point joined to its `k` nearest neighbours, once. */
export function nearestEdges(points: readonly [number, number, number][], k: number): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  points.forEach((p, i) => {
    const order = points
      .map((q, j) => ({ j, d: (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, k);
    for (const { j } of order) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  });
  return edges;
}

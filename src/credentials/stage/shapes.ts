import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, LatheGeometry, Shape, Vector2 } from 'three';

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

/** The cornerstone: a tall stele with a slanted top, like a cut crystal or a trophy plate. Half-height 1. */
export function monolithPoints(): Vector2[] {
  return [new Vector2(-0.66, 1), new Vector2(-0.66, -1), new Vector2(0.66, -1), new Vector2(0.66, 0.6)];
}

/**
 * A medallion as a profile turned about its axis: a flat face, a raised lip, a rounded rim with a shallow groove, mirrored
 * on the back. Radius 1, thickness 0.24, axis along z (faces to +z and -z).
 */
export function coinGeometry(): LatheGeometry {
  const half = [
    [0, 0.12],
    [0.84, 0.12],
    [0.85, 0.14],
    [0.9, 0.145],
    [0.95, 0.13],
    [0.985, 0.095],
    [1, 0.05],
    [1, -0.05],
  ] as const;
  // Lathe wants the profile running up the axis (back centre to front centre) for its normals to face out.
  const pts = [...half, ...[...half].reverse().map(([r, y]) => [r, -y] as const)].reverse().map(([r, y]) => new Vector2(r, y));
  const g = new LatheGeometry(pts, 96);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
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

/** A w x h plate with its top-right and bottom-left corners cut at `c`: the silhouette of every holographic slab. */
export function chamferPoints(w: number, h: number, c: number): Vector2[] {
  const x = w / 2;
  const y = h / 2;
  return [new Vector2(-x, y), new Vector2(x - c, y), new Vector2(x, y - c), new Vector2(x, -y), new Vector2(-x + c, -y), new Vector2(-x, -y + c)];
}

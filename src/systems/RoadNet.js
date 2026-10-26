import { JUNCTIONS, ROADS } from '../data/map.js';
import { WORLD, LANES } from '../config.js';

// Road geometry + graph. Roads are capsules (segment + half width), junctions are circles.
// Everything off these shapes is a wall.
export default class RoadNet {
  constructor() {
    const s = WORLD.mapScale;
    this.junctions = new Map();
    for (const j of JUNCTIONS) {
      this.junctions.set(j.id, { ...j, x: j.x * s, y: j.y * s, roads: [], radius: 0 });
    }

    this.roads = ROADS.map((r, index) => {
      const a = this.junctions.get(r.from);
      const b = this.junctions.get(r.to);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const lanes = LANES[r.type];
      const road = {
        ...r, index, a, b, len, lanes,
        hw: lanes * LANES.width,
        dx: (b.x - a.x) / len,
        dy: (b.y - a.y) / len,
      };
      a.roads.push(road);
      b.roads.push(road);
      return road;
    });

    // Junctions are big enough that the roads leaving them have separated by the edge
    // (shallow-angle roads would otherwise overlap outside the junction and traffic collides).
    for (const j of this.junctions.values()) {
      let r = Math.max(...j.roads.map((road) => road.hw)) + 20;
      const ang = (road) => Math.atan2(this.other(road, j).y - j.y, this.other(road, j).x - j.x);
      for (const p of j.roads) {
        for (const q of j.roads) {
          if (p === q) continue;
          let th = Math.abs(ang(p) - ang(q));
          th = Math.min(th, 2 * Math.PI - th);
          if (th >= Math.PI / 2) continue;
          const t = (q.hw + p.hw * Math.cos(th)) / Math.sin(th); // where the inner kerbs meet
          r = Math.max(r, Math.hypot(t, p.hw) + 10);
        }
      }
      j.radius = Math.round(Math.min(r, 320));
    }
  }

  junction(id) {
    return this.junctions.get(id);
  }

  // Local coords of a point relative to a road: t = distance along from a, n = signed offset
  // (n > 0 is the LEFT side when travelling a → b, screen coords with y down).
  project(road, x, y) {
    const px = x - road.a.x;
    const py = y - road.a.y;
    return { t: px * road.dx + py * road.dy, n: px * road.dy - py * road.dx };
  }

  // World point on a road at distance t along, offset n (left positive, a → b)
  pointAt(road, t, n = 0) {
    return {
      x: road.a.x + road.dx * t + road.dy * n,
      y: road.a.y + road.dy * t - road.dx * n,
    };
  }

  // Deepest-containing shape for a point. pen < 0 means inside by |pen| px.
  nearest(x, y) {
    let best = null;
    for (const j of this.junctions.values()) {
      const d = Math.hypot(x - j.x, y - j.y);
      const pen = d - j.radius;
      if (!best || pen < best.pen) best = { kind: 'junction', shape: j, cx: j.x, cy: j.y, d, r: j.radius, pen };
    }
    for (const r of this.roads) {
      const { t } = this.project(r, x, y);
      const tc = Math.max(0, Math.min(r.len, t));
      const cx = r.a.x + r.dx * tc;
      const cy = r.a.y + r.dy * tc;
      const d = Math.hypot(x - cx, y - cy);
      const pen = d - r.hw;
      if (pen < best.pen) best = { kind: 'road', shape: r, cx, cy, d, r: r.hw, pen };
    }
    return best;
  }

  isOnRoad(x, y, margin = 0) {
    return this.nearest(x, y).pen <= -margin;
  }

  // 'junction' | 'highway' | 'main' | 'gali' | null. Galis only count if nothing faster overlaps.
  surfaceAt(x, y) {
    let gali = false;
    for (const j of this.junctions.values()) {
      if (Math.hypot(x - j.x, y - j.y) <= j.radius) return 'junction';
    }
    let found = null;
    for (const r of this.roads) {
      const { t, n } = this.project(r, x, y);
      if (t < 0 || t > r.len || Math.abs(n) > r.hw) continue;
      if (r.type === 'gali') gali = true;
      else if (found !== 'highway') found = r.type;
    }
    return found || (gali ? 'gali' : null);
  }

  // Road the point is on (closest centreline among containing roads), or null
  roadAt(x, y) {
    let best = null;
    let bestN = Infinity;
    for (const r of this.roads) {
      const { t, n } = this.project(r, x, y);
      if (t < 0 || t > r.len || Math.abs(n) > r.hw) continue;
      if (Math.abs(n) < bestN) {
        bestN = Math.abs(n);
        best = r;
      }
    }
    return best;
  }

  // Push a point back onto the road surface. Returns null if already on road,
  // else { x, y, nx, ny } with the inward normal.
  clamp(x, y, margin) {
    const s = this.nearest(x, y);
    if (s.pen <= -margin) return null;
    const lim = s.r - margin;
    const d = s.d || 1;
    const ux = (x - s.cx) / d;
    const uy = (y - s.cy) / d;
    return { x: s.cx + ux * lim, y: s.cy + uy * lim, nx: -ux, ny: -uy };
  }

  nearestJunction(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const j of this.junctions.values()) {
      const d = Math.hypot(x - j.x, y - j.y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
  }

  other(road, j) {
    return road.a === j ? road.b : road.a;
  }

  // Dijkstra over junctions. Galis cost a bit more (slower). blocked: Set of road indices.
  shortestPath(fromId, toId, blocked = new Set()) {
    const dist = new Map([[fromId, 0]]);
    const prev = new Map();
    const open = new Set(this.junctions.keys());
    while (open.size) {
      let u = null;
      for (const id of open) if (dist.has(id) && (u === null || dist.get(id) < dist.get(u))) u = id;
      if (u === null || u === toId) break;
      open.delete(u);
      for (const r of this.junctions.get(u).roads) {
        if (blocked.has(r.index)) continue;
        const v = this.other(r, this.junctions.get(u)).id;
        const c = dist.get(u) + r.len / (r.type === 'gali' ? 0.7 : 1);
        if (c < (dist.get(v) ?? Infinity)) {
          dist.set(v, c);
          prev.set(v, { from: u, road: r });
        }
      }
    }
    if (!dist.has(toId)) return null;
    const roads = [];
    const ids = [toId];
    let cur = toId;
    while (cur !== fromId) {
      const p = prev.get(cur);
      roads.unshift(p.road);
      ids.unshift(p.from);
      cur = p.from;
    }
    return { ids, roads, cost: dist.get(toId) };
  }
}

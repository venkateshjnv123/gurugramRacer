// Engine-free placement of buildings and trees beside the roads (deterministic per seed).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng, lo, hi) => lo + rng() * (hi - lo);

export function zoneOf(net, x, y) {
  const near = (id, r) => {
    const j = net.junction(id);
    return Math.hypot(x - j.x, y - j.y) < r;
  };
  if (near('gcr', 1500) || near('sector54', 900) || near('cyberhub', 700)) return 'lavish';
  if (near('mgroad', 1100) || near('sikanderpur', 700) || near('subhash', 700)) return 'shops';
  return 'normal';
}

const SIZES = {
  lavish: { w: [90, 160], h: [160, 380] },
  shops: { w: [30, 60], h: [16, 34] },
  normal: { w: [50, 110], h: [30, 90] },
};

// Axis-aligned footprints { x, y (top-left), w, d, h (height), zone }.
// reserved: circles { x, y, r } kept free (landmarks, billboards).
export function layoutBuildings(net, seed = 7, reserved = []) {
  const rng = mulberry32(seed);
  const placed = [];
  const fits = (x, y, w, d) => {
    const pts = [
      [x, y], [x + w, y], [x, y + d], [x + w, y + d],
      [x + w / 2, y], [x + w / 2, y + d], [x, y + d / 2], [x + w, y + d / 2], [x + w / 2, y + d / 2],
    ];
    if (pts.some(([px, py]) => net.nearest(px, py).pen < 26)) return false;
    if (reserved.some((c) => Math.hypot(x + w / 2 - c.x, y + d / 2 - c.y) < c.r + Math.max(w, d) / 2 + 10)) return false;
    return !placed.some((b) => x < b.x + b.w + 8 && x + w + 8 > b.x && y < b.y + b.d + 8 && y + d + 8 > b.y);
  };

  for (const road of net.roads) {
    for (const side of [1, -1]) {
      for (let t = 40; t < road.len; t += between(rng, 70, 130)) {
        const mid = net.pointAt(road, t);
        const zone = zoneOf(net, mid.x, mid.y);
        const s = SIZES[zone];
        const w = between(rng, ...s.w);
        const d = between(rng, ...s.w);
        const off = road.hw + between(rng, 36, 70) + Math.max(w, d) / 2;
        const c = net.pointAt(road, t, off * side);
        const x = c.x - w / 2;
        const y = c.y - d / 2;
        if (!fits(x, y, w, d)) continue;
        placed.push({ x, y, w, d, h: between(rng, ...s.h), zone, tint: rng() });
      }
    }
  }
  return placed;
}

// Trees on the footpath strip, skipping spots taken by buildings or other roads
export function layoutTrees(net, buildings, seed = 11) {
  const rng = mulberry32(seed);
  const trees = [];
  for (const road of net.roads) {
    if (road.type === 'gali') continue;
    for (const side of [1, -1]) {
      for (let t = road.a.radius + 30; t < road.len - road.b.radius - 30; t += between(rng, 60, 140)) {
        const p = net.pointAt(road, t, (road.hw + 22) * side);
        if (net.nearest(p.x, p.y).pen < 12) continue;
        if (buildings.some((b) => p.x > b.x - 10 && p.x < b.x + b.w + 10 && p.y > b.y - 10 && p.y < b.y + b.d + 10)) continue;
        trees.push({ x: p.x, y: p.y, s: between(rng, 0.8, 1.3) });
      }
    }
  }
  return trees;
}

// Gap angles between a junction's roads, biggest gap first: [{ angle, gap }]
export function junctionGaps(net, j) {
  const angles = j.roads.map((r) => {
    const o = net.other(r, j);
    return Math.atan2(o.y - j.y, o.x - j.x);
  }).sort((p, q) => p - q);
  if (angles.length === 1) return [{ angle: angles[0] + Math.PI, gap: Math.PI * 2 }, { angle: angles[0] + Math.PI / 2, gap: Math.PI }];
  const gaps = angles.map((a, i) => {
    const next = i === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[i + 1];
    return { angle: a + (next - a) / 2, gap: next - a };
  });
  return gaps.sort((p, q) => q.gap - p.gap);
}

// Landmark positions: in the chosen gap, pushed out until the footprint is clear of roads.
// Returns [{ ...lm, x, y, facing }] where facing = direction from the landmark toward its junction.
export function placeLandmarks(net, landmarks) {
  return landmarks.map((lm) => {
    const j = net.junction(lm.junction);
    const gaps = junctionGaps(net, j);
    const { angle } = gaps[Math.min(lm.slot, gaps.length - 1)];
    let d = j.radius + 70 + lm.size;
    const clear = (x, y) => {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        if (net.nearest(x + Math.cos(a) * lm.size, y + Math.sin(a) * lm.size).pen < 20) return false;
      }
      return net.nearest(x, y).pen > lm.size * 0.5;
    };
    let x;
    let y;
    for (let i = 0; i < 20; i++, d += 40) {
      x = j.x + Math.cos(angle) * d;
      y = j.y + Math.sin(angle) * d;
      if (clear(x, y)) break;
    }
    return { ...lm, x, y, facing: Math.atan2(j.y - y, j.x - x) };
  });
}

// Metro pillars on the road median along a line of junctions (outside junction circles)
export function metroPillars(net, line, spacing) {
  const pillars = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = net.junction(line[i]);
    const b = net.junction(line[i + 1]);
    const road = net.roads.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
    if (!road) continue;
    for (let t = road.a.radius + 30; t < road.len - road.b.radius - 20; t += spacing) {
      pillars.push(net.pointAt(road, t));
    }
  }
  return pillars;
}

// Street lights on both footpaths of highways and main roads. facing = toward the road.
export function streetLights(net, spacing = 190) {
  const lights = [];
  for (const r of net.roads) {
    if (r.type === 'gali') continue;
    for (const side of [1, -1]) {
      for (let t = r.a.radius + 40; t < r.len - r.b.radius - 40; t += spacing) {
        const p = net.pointAt(r, t, (r.hw + 14) * side);
        if (net.nearest(p.x, p.y).pen < 6) continue;
        const toward = net.pointAt(r, t, 0);
        lights.push({ x: p.x, y: p.y, facing: Math.atan2(toward.y - p.y, toward.x - p.x) });
      }
    }
  }
  return lights;
}

// Hoardings along highways, facing the road
export function billboardSpots(net, count, seed = 5) {
  const rng = mulberry32(seed);
  const highways = net.roads.filter((r) => r.type === 'highway');
  const spots = [];
  for (let i = 0; i < count * 4 && spots.length < count; i++) {
    const r = highways[Math.floor(rng() * highways.length)];
    const t = r.a.radius + 150 + rng() * (r.len - r.a.radius - r.b.radius - 300);
    const side = rng() < 0.5 ? 1 : -1;
    const p = net.pointAt(r, t, (r.hw + 70) * side);
    if (net.nearest(p.x, p.y).pen < 40 || spots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 500)) continue;
    // face traffic coming along the road
    spots.push({ x: p.x, y: p.y, facing: Math.atan2(r.dy, r.dx) + Math.PI * (rng() < 0.5 ? 1 : 0) });
  }
  return spots;
}

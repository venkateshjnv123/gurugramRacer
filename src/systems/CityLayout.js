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

// Axis-aligned footprints { x, y (top-left), w, d, h (height), zone }
export function layoutBuildings(net, seed = 7) {
  const rng = mulberry32(seed);
  const placed = [];
  const fits = (x, y, w, d) => {
    const pts = [
      [x, y], [x + w, y], [x, y + d], [x + w, y + d],
      [x + w / 2, y], [x + w / 2, y + d], [x, y + d / 2], [x + w, y + d / 2], [x + w / 2, y + d / 2],
    ];
    if (pts.some(([px, py]) => net.nearest(px, py).pen < 26)) return false;
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

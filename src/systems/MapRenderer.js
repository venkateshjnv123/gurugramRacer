import Phaser from 'phaser';
import { COLORS, LANES } from '../config.js';

// Draws the whole city once: buildings, roads, markings, junctions, signboards.
export default class MapRenderer {
  constructor(scene, net) {
    this.scene = scene;
    this.net = net;
    this.rng = new Phaser.Math.RandomDataGenerator(['gurugram']);
    this.draw();
  }

  draw() {
    const g = this.scene.add.graphics().setDepth(0);
    this.drawBuildings(g);
    this.drawRoads(g);
    this.drawSigns();
  }

  zoneOf(x, y) {
    const near = (id, r) => {
      const j = this.net.junction(id);
      return Math.hypot(x - j.x, y - j.y) < r;
    };
    if (near('gcr', 1500) || near('sector54', 900) || near('cyberhub', 700)) return 'lavish';
    if (near('mgroad', 1100) || near('sikanderpur', 700) || near('subhash', 700)) return 'shops';
    return 'normal';
  }

  drawBuildings(g) {
    const placed = [];
    const fits = (x, y, w, h) => {
      const pts = [
        [x, y], [x + w, y], [x, y + h], [x + w, y + h],
        [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2], [x + w / 2, y + h / 2],
      ];
      if (pts.some(([px, py]) => this.net.nearest(px, py).pen < 20)) return false;
      return !placed.some((b) => x < b.x + b.w + 8 && x + w + 8 > b.x && y < b.y + b.h + 8 && y + h + 8 > b.y);
    };

    for (const road of this.net.roads) {
      for (const side of [1, -1]) {
        for (let t = 40; t < road.len; t += this.rng.between(70, 130)) {
          const mid = this.net.pointAt(road, t);
          const zone = this.zoneOf(mid.x, mid.y);
          const big = zone === 'lavish';
          const w = big ? this.rng.between(90, 160) : zone === 'shops' ? this.rng.between(30, 60) : this.rng.between(50, 110);
          const h = big ? this.rng.between(90, 160) : zone === 'shops' ? this.rng.between(30, 60) : this.rng.between(50, 110);
          const off = road.hw + this.rng.between(30, 60) + Math.max(w, h) / 2;
          const c = this.net.pointAt(road, t, off * side);
          const x = c.x - w / 2;
          const y = c.y - h / 2;
          if (!fits(x, y, w, h)) continue;
          placed.push({ x, y, w, h });
          this.drawBuilding(g, x, y, w, h, zone);
        }
      }
    }
  }

  drawBuilding(g, x, y, w, h, zone) {
    let fill;
    if (zone === 'lavish') fill = this.rng.pick(COLORS.glass);
    else if (zone === 'shops') fill = this.rng.pick(COLORS.shops);
    else fill = this.rng.pick(COLORS.houses);

    g.fillStyle(0x000000, 0.18).fillRect(x + 6, y + 6, w, h); // shadow
    g.fillStyle(fill, 1).fillRect(x, y, w, h);
    g.lineStyle(2, 0x000000, 0.25).strokeRect(x, y, w, h);

    if (zone === 'lavish') {
      // glassy stripes
      g.fillStyle(0xffffff, 0.18);
      for (let i = 10; i < w - 6; i += 18) g.fillRect(x + i, y + 6, 6, h - 12);
    } else {
      // rooftop water tank / AC box
      g.fillStyle(0x222222, 0.35).fillRect(x + w * 0.6, y + h * 0.15, Math.min(14, w * 0.25), Math.min(14, h * 0.25));
    }
  }

  drawRoads(g) {
    const { roads } = this.net;
    const junctions = [...this.net.junctions.values()];

    const roadPoly = (r, extra) => {
      const hw = r.hw + extra;
      return [
        this.net.pointAt(r, 0, hw), this.net.pointAt(r, r.len, hw),
        this.net.pointAt(r, r.len, -hw), this.net.pointAt(r, 0, -hw),
      ];
    };

    // kerb / footpath
    g.fillStyle(COLORS.kerb, 1);
    for (const r of roads) g.fillPoints(roadPoly(r, 10), true);
    for (const j of junctions) g.fillCircle(j.x, j.y, j.radius + 10);

    // asphalt
    for (const r of roads) {
      g.fillStyle(r.type === 'gali' ? COLORS.gali : COLORS.road, 1);
      g.fillPoints(roadPoly(r, 0), true);
    }
    for (const j of junctions) {
      g.fillStyle(COLORS.road, 1).fillCircle(j.x, j.y, j.radius);
      if (j.hot) g.lineStyle(6, COLORS.hot, 0.8).strokeCircle(j.x, j.y, j.radius - 8);
    }

    // potholes on galis
    for (const r of roads.filter((r) => r.type === 'gali')) {
      for (let t = r.a.radius + 40; t < r.len - r.b.radius; t += this.rng.between(80, 160)) {
        const p = this.net.pointAt(r, t, this.rng.between(-r.hw + 10, r.hw - 10));
        g.fillStyle(0x3b2f22, 1).fillEllipse(p.x, p.y, this.rng.between(10, 20), this.rng.between(8, 14));
      }
    }

    // markings
    for (const r of roads) {
      if (r.type === 'gali') continue;
      const t0 = r.a.radius;
      const t1 = r.len - r.b.radius;
      // centre divider
      g.lineStyle(4, COLORS.divider, 1);
      const p0 = this.net.pointAt(r, t0, 0);
      const p1 = this.net.pointAt(r, t1, 0);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      // dashed lane lines
      g.lineStyle(2, COLORS.lane, 0.7);
      for (let lane = 1; lane < r.lanes; lane++) {
        for (const side of [1, -1]) {
          const n = lane * LANES.width * side;
          for (let t = t0; t < t1 - 20; t += 50) {
            const p = this.net.pointAt(r, t, n);
            const q = this.net.pointAt(r, t + 24, n);
            g.lineBetween(p.x, p.y, q.x, q.y);
          }
        }
      }
    }
  }

  // Direction from a junction with the most room between its roads (for signboards)
  freeAngle(j) {
    const angles = j.roads
      .map((r) => {
        const o = this.net.other(r, j);
        return Math.atan2(o.y - j.y, o.x - j.x);
      })
      .sort((p, q) => p - q);
    if (angles.length === 1) return angles[0] + Math.PI;
    let best = 0;
    let bestGap = -1;
    angles.forEach((ang, i) => {
      const next = i === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[i + 1];
      if (next - ang > bestGap) {
        bestGap = next - ang;
        best = ang + bestGap / 2;
      }
    });
    return best;
  }

  drawSigns() {
    const s = this.scene;
    for (const j of this.net.junctions.values()) {
      const a = this.freeAngle(j);
      const d = j.radius + 60;
      s.add
        .text(j.x + Math.cos(a) * d, j.y + Math.sin(a) * d, j.name, {
          fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'bold',
          color: '#ffffff', backgroundColor: '#1f7a3a', padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5)
        .setDepth(5);
    }

    for (const r of this.net.roads) {
      const p = this.net.pointAt(r, r.len / 2, 0);
      let angle = Math.atan2(r.dy, r.dx);
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI; // keep text upright
      s.add
        .text(p.x, p.y, r.name, {
          fontFamily: 'sans-serif', fontSize: r.type === 'gali' ? '13px' : '16px',
          color: '#ffffff', backgroundColor: r.type === 'gali' ? '#6b4a1f' : '#2c5f8a',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5)
        .setRotation(angle)
        .setAlpha(0.9)
        .setDepth(1);
    }
  }
}

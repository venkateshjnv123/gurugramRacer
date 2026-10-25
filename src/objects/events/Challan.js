import { EVENTS, PENALTY } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// Police naka on a route road. Ride through it = time penalty. Take a gali to dodge it.
export default class Challan {
  constructor(sys) {
    this.sys = sys;
    const road = sys.pickRouteRoad((r) => r.type !== 'gali');
    if (!road) return;
    this.road = road;
    this.t = road.len * 0.4; // a → b frame, off the road-name label at the midpoint
    const s = sys.scene;
    const angle = Math.atan2(road.dy, road.dx);
    for (const side of [1, -1]) {
      const cop = sys.net.pointAt(road, this.t + 20 * side, (road.hw - 18) * side);
      s.add.image(cop.x, cop.y, 'cop').setDepth(9);
      const bar = sys.net.pointAt(road, this.t - 20 * side, (road.hw - 22) * side);
      s.add.image(bar.x, bar.y, 'barrier').setDepth(8).setRotation(angle);
    }
    const sign = sys.net.pointAt(road, this.t, road.hw + 40);
    s.add.text(sign.x, sign.y, LINES.challanSign, {
      fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#1a3c8a', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(8);
    const c = sys.net.pointAt(road, this.t);
    sys.marks.push({ x: c.x, y: c.y, color: 0x3d7bff });
    this.caught = false;
  }

  update() {
    if (!this.road || this.caught) return;
    const b = this.sys.bike;
    const p = this.sys.net.project(this.road, b.x, b.y);
    if (Math.abs(p.t - this.t) < EVENTS.challanZone && Math.abs(p.n) < this.road.hw) {
      this.caught = true;
      this.sys.scene.penalize(PENALTY.challan, LINES.challan);
    }
  }
}

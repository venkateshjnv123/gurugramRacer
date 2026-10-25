import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// Golf Course Road: your side is barricaded and a divider runs down the middle.
// Either ride wrong-side against traffic until the divider ends, or find another way.
export default class UTurn {
  constructor(sys) {
    this.sys = sys;
    const road = sys.pickRouteRoad((r) => r.name === 'Golf Course Road') ?? sys.pickRouteRoad((r) => r.type !== 'gali');
    if (!road) return;
    const dir = sys.routeDir(road);
    const start = dir > 0 ? road.a : road.b;
    const angle = sys.travelAngle(road, dir);
    const t0 = start.radius + 40;
    const L = Math.min(EVENTS.uturnLength, road.len - start.radius * 2 - 80);

    // barricade across your (left) half
    for (let n = 14; n < road.hw; n += 28) {
      const p = sys.travelPoint(road, dir, t0, n);
      sys.props.add('barrier', { x: p.x, y: p.y, rot: angle });
    }
    const bc = sys.travelPoint(road, dir, t0, road.hw / 2);
    sys.addSolid(bc.x, bc.y, 20, road.hw, angle);

    // central divider
    const d0 = sys.travelPoint(road, dir, t0);
    const d1 = sys.travelPoint(road, dir, t0 + L);
    sys.props.add('divider', { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y });
    const dc = sys.travelPoint(road, dir, t0 + L / 2);
    sys.addSolid(dc.x, dc.y, L, 12, angle);

    const sign = sys.travelPoint(road, dir, t0 - 10, road.hw + 60);
    sys.props.add('sign', { x: sign.x, y: sign.y, text: LINES.uturnSign, bg: '#1f7a3a', fg: '#ffffff' });

    // NPCs don't drive into the closed half
    road.closed = new Set([dir]);
    sys.traffic.blockers.push({ road, dir, t: dir > 0 ? t0 : road.len - t0, half: 14 });
    this.center = bc;
    this.warned = false;
  }

  update() {
    if (!this.center || this.warned) return;
    const b = this.sys.bike;
    if (Math.hypot(b.x - this.center.x, b.y - this.center.y) < 500) {
      this.warned = true;
      this.sys.toast(LINES.uturn);
    }
  }
}

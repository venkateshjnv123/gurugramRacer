import { EVENTS, PENALTY } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// Police naka on a route road. Ride through it = time penalty. Take a gali to dodge it.
export default class Challan {
  constructor(sys) {
    this.sys = sys;
    const road = sys.pickRouteRoad((r) => r.type !== 'gali');
    if (!road) return;
    this.road = road;
    this.t = road.len * 0.4; // a → b frame, off the road-name board at the midpoint
    const angle = Math.atan2(road.dy, road.dx);
    for (const side of [1, -1]) {
      const cop = sys.net.pointAt(road, this.t + 20 * side, (road.hw - 18) * side);
      sys.props.add('cop', { x: cop.x, y: cop.y, rot: angle + Math.PI / 2 * side });
      const bar = sys.net.pointAt(road, this.t - 20 * side, (road.hw - 22) * side);
      sys.props.add('barrier', { x: bar.x, y: bar.y, rot: angle });
    }
    const sign = sys.net.pointAt(road, this.t, road.hw + 40);
    sys.props.add('sign', { x: sign.x, y: sign.y, text: LINES.challanSign, bg: '#1a3c8a', fg: '#ffffff' });
    const c = sys.net.pointAt(road, this.t);
    sys.marks.push({ x: c.x, y: c.y, color: '#3d7bff' });
    this.caught = false;
  }

  update() {
    if (!this.road || this.caught) return;
    const b = this.sys.bike;
    const p = this.sys.net.project(this.road, b.x, b.y);
    if (Math.abs(p.t - this.t) < EVENTS.challanZone && Math.abs(p.n) < this.road.hw) {
      this.caught = true;
      this.sys.game.penalize(PENALTY.challan, LINES.challan);
    }
  }
}

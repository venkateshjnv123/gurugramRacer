import { EVENTS as LINES } from '../../data/jokes.js';

// Barriers fully across one route road. Picks the road whose closure costs the smallest detour.
export default class Construction {
  constructor(sys) {
    this.sys = sys;
    const { net, game } = sys;
    const { roads, cost } = game.route;
    let best = null;
    roads.forEach((r, i) => {
      if ((i === 0 && roads.length > 1) || sys.usedRoads.has(r.index)) return;
      const alt = net.shortestPath(game.mission.from, game.mission.to, new Set([r.index]));
      if (alt && (!best || alt.cost < best.cost)) best = { road: r, cost: alt.cost };
    });
    if (!best || best.cost <= cost) return;
    const road = best.road;
    sys.usedRoads.add(road.index);
    road.closed = new Set([1, -1]);
    this.road = road;

    const t = road.len * 0.6; // off the road-name board at the midpoint
    const angle = Math.atan2(road.dy, road.dx);
    for (let n = -road.hw + 20; n < road.hw; n += 40) {
      for (const dt of [-14, 14]) {
        const p = net.pointAt(road, t + dt, n);
        sys.props.add('barrier', { x: p.x, y: p.y, rot: angle });
      }
    }
    this.center = net.pointAt(road, t);
    sys.addSolid(this.center.x, this.center.y, 44, road.hw * 2 + 20, angle);
    sys.traffic.blockers.push({ road, dir: 0, t, half: 26 });
    const sign = net.pointAt(road, t, road.hw + 40);
    sys.props.add('sign', { x: sign.x, y: sign.y, text: LINES.constructionSign, bg: '#ffb000', fg: '#000000' });
    sys.marks.push({ x: this.center.x, y: this.center.y, color: '#ff3b3b', cross: true });
    this.warned = false;
  }

  update() {
    if (!this.road || this.warned) return;
    const b = this.sys.bike;
    if (Math.hypot(b.x - this.center.x, b.y - this.center.y) < 700) {
      this.warned = true;
      this.sys.toast(LINES.construction);
    }
  }
}

import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// The pool at Hero Honda Chowk, plus underpass puddles on the route once it rains.
// Wading through crawls; hitting one fast floods the engine and the bike stalls.
export default class Waterlogging {
  constructor(sys) {
    this.sys = sys;
    this.pools = [];
    this.warned = false;
    this.wasInside = false;
    if (sys.game.mission.special !== 'rainAlways') this.start();
  }

  start() {
    if (this.pools.length) return;
    const { sys } = this;
    const j = sys.net.junction('herohonda');
    this.addPool(j.x, j.y, EVENTS.waterRadius);
    if (sys.game.mission.special === 'rainAlways') {
      for (let i = 0; i < EVENTS.rainPools; i++) {
        const road = sys.pickRouteRoad((r) => r.len > 900);
        if (!road) break;
        const p = sys.net.pointAt(road, road.len * (0.35 + Math.random() * 0.3));
        this.addPool(p.x, p.y, road.hw + 30);
      }
    }
    this.splash = sys.props.add('splash', {});
  }

  addPool(x, y, r) {
    this.pools.push({ x, y, r });
    this.sys.props.add('pool', { x, y, r });
    this.sys.traffic.slowZones.push({ x, y, r, f: 0.3 });
    this.sys.marks.push({ x, y, color: '#4aa3ff' });
  }

  update() {
    const b = this.sys.bike;
    const pool = this.pools.find((p) => Math.hypot(b.x - p.x, b.y - p.y) < p.r);
    b.speedMultiplier = pool ? EVENTS.waterSpeed : 1;
    this.sys.game.inWater = !!pool;
    if (!this.splash) return;
    this.splash.emit(!!pool && Math.abs(b.speed) > 10);
    if (pool && !this.wasInside) {
      this.sys.game.emit('sfx', 'splash');
      if (Math.abs(b.speed) > EVENTS.stallSpeed) {
        b.stall = EVENTS.stallTime;
        this.sys.toast(LINES.stall);
        this.sys.game.emit('sfx', 'stall');
      } else if (!this.warned) {
        this.warned = true;
        this.sys.toast(LINES.waterlogging);
      }
    }
    this.wasInside = !!pool;
  }
}

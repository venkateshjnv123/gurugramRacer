import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// A pool at Hero Honda Chowk. In the rain mission it only appears once the rain starts.
export default class Waterlogging {
  constructor(sys) {
    this.sys = sys;
    this.j = sys.net.junction('herohonda');
    this.active = false;
    this.warned = false;
    if (sys.game.mission.special !== 'rainAlways') this.start();
  }

  start() {
    if (this.active) return;
    this.active = true;
    const { x, y } = this.j;
    this.sys.props.add('pool', { x, y, r: EVENTS.waterRadius });
    this.splash = this.sys.props.add('splash', {});
    this.sys.traffic.slowZones.push({ x, y, r: EVENTS.waterRadius, f: 0.3 });
  }

  update() {
    const b = this.sys.bike;
    if (!this.active) {
      b.speedMultiplier = 1;
      return;
    }
    const inside = Math.hypot(b.x - this.j.x, b.y - this.j.y) < EVENTS.waterRadius;
    b.speedMultiplier = inside ? EVENTS.waterSpeed : 1;
    this.splash.emit(inside && Math.abs(b.speed) > 10);
    if (inside && !this.warned) {
      this.warned = true;
      this.sys.toast(LINES.waterlogging);
    }
  }
}

import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';
import { floatBetween } from '../rand.js';

const WALK_TIME = 2.5;

// Cows sit across a route road just before a junction. They leave EVENTS.cowWait seconds after you arrive.
export default class Cow {
  constructor(sys) {
    this.sys = sys;
    const road = sys.pickRouteRoad();
    if (!road) return;
    const dir = sys.routeDir(road);
    const end = dir > 0 ? road.b : road.a;
    const t = Math.max(road.len / 2, road.len - end.radius - 260);
    const across = sys.travelAngle(road, dir) + Math.PI / 2;
    const count = Math.max(1, Math.ceil((2 * road.hw) / EVENTS.cowSpacing));
    const step = (2 * road.hw) / count;

    this.road = road;
    this.dir = dir;
    this.t = t;
    this.center = sys.travelPoint(road, dir, t);
    this.cows = [];
    for (let k = 0; k < count; k++) {
      const n = -road.hw + step * (k + 0.5);
      const p = sys.travelPoint(road, dir, t + floatBetween(-8, 8), n);
      const rot = across + (Math.random() < 0.5 ? 0 : Math.PI);
      this.cows.push({
        n, from: p, x: p.x, y: p.y, rot,
        prop: sys.props.add('cow', { x: p.x, y: p.y, rot }),
        solid: sys.addSolid(p.x, p.y, 60, 30, across),
      });
    }
    this.blocker = { road, dir: 0, t: dir > 0 ? t : road.len - t, half: 20 };
    sys.traffic.blockers.push(this.blocker);
    this.state = 'sitting';
  }

  update(dt) {
    if (!this.cows) return;
    const b = this.sys.bike;
    if (this.state === 'sitting' && Math.hypot(b.x - this.center.x, b.y - this.center.y) < 350) {
      this.state = 'waiting';
      this.timer = EVENTS.cowWait;
      this.sys.toast(LINES.cow);
    } else if (this.state === 'waiting') {
      this.timer -= dt;
      if (this.timer <= 0) this.leave();
    } else if (this.state === 'leaving') {
      this.walk = Math.min(1, this.walk + dt / WALK_TIME);
      for (const c of this.cows) {
        c.prop.set({ x: c.from.x + (c.to.x - c.from.x) * this.walk, y: c.from.y + (c.to.y - c.from.y) * this.walk, rot: c.walkRot });
      }
      if (this.walk >= 1) this.state = 'gone';
    }
  }

  leave() {
    this.state = 'leaving';
    this.walk = 0;
    const { sys, road } = this;
    for (const c of this.cows) {
      sys.removeSolid(c.solid);
      const side = c.n >= 0 ? 1 : -1;
      c.to = sys.travelPoint(road, this.dir, this.t, side * (road.hw + 90));
      c.walkRot = Math.atan2(c.to.y - c.from.y, c.to.x - c.from.x);
    }
    sys.traffic.blockers = sys.traffic.blockers.filter((x) => x !== this.blocker);
    sys.toast(LINES.cowLeaves);
  }
}

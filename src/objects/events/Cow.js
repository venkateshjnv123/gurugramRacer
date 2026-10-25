import Phaser from 'phaser';
import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

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
    this.center = sys.travelPoint(road, dir, t);
    this.cows = [];
    for (let k = 0; k < count; k++) {
      const n = -road.hw + step * (k + 0.5);
      const p = sys.travelPoint(road, dir, t + Phaser.Math.Between(-8, 8), n);
      const img = sys.scene.add.image(p.x, p.y, 'cow').setDepth(9)
        .setRotation(across + (Math.random() < 0.5 ? 0 : Math.PI));
      this.cows.push({ img, solid: sys.addSolid(p.x, p.y, 60, 30, across), n });
    }
    this.blocker = { road, dir: 0, t: dir > 0 ? t : road.len - t, half: 20 };
    sys.traffic.blockers.push(this.blocker);
    this.state = 'sitting';
    this.dir = dir;
    this.t = t;
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
    }
  }

  leave() {
    this.state = 'gone';
    const { sys, road } = this;
    for (const c of this.cows) {
      sys.removeSolid(c.solid);
      const side = c.n >= 0 ? 1 : -1;
      const p = sys.travelPoint(road, this.dir, this.t, side * (road.hw + 90));
      sys.scene.tweens.add({ targets: c.img, x: p.x, y: p.y, duration: 2500 });
    }
    sys.traffic.blockers = sys.traffic.blockers.filter((x) => x !== this.blocker);
    sys.toast(LINES.cowLeaves);
  }
}

import { EVENTS, LANES } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';
import { clamp } from '../rand.js';

// An auto appears just ahead in the next lane and swerves into yours.
export default class AutoCut {
  constructor(sys) {
    this.sys = sys;
    this.times = [];
    for (let i = 0; i < EVENTS.autoRepeats; i++) this.times.push(sys.randomTime(EVENTS.autoWindow) + i * 0.15 * sys.game.limit);
    this.times.sort((a, b) => a - b);
  }

  update() {
    const { sys } = this;
    if (!this.times.length || sys.elapsed < this.times[0]) return;
    const info = sys.bikeOnRoad();
    if (!info || sys.bike.speed < 60 || info.road.len - info.t < 500) return;
    this.times.shift();

    const { road } = info;
    const limit = road.hw - 14;
    let n = info.n + (Math.random() < 0.5 ? 1 : -1) * LANES.width;
    if (Math.abs(n) > limit) n = info.n - Math.sign(n - info.n) * LANES.width;
    n = clamp(n, -limit, limit);
    const npc = sys.traffic.spawn('auto', road, info.dir, 0, info.t + 170, sys.bike.speed * 0.55);
    npc.n = n;
    npc.targetN = info.n;
    npc.lateralSpeed = 90;
    npc.reckless = true;
    npc.laneChangeTimer = Infinity;
    npc.place();
    sys.toast(LINES.auto);
  }
}

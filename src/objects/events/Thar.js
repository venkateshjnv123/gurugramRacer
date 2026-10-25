import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// A black Thar comes wrong-side, straight at you, in your lane.
export default class Thar {
  constructor(sys) {
    this.sys = sys;
    this.at = sys.randomTime(EVENTS.tharWindow);
    this.fired = false;
  }

  update() {
    const { sys } = this;
    if (!this.fired && sys.elapsed > this.at) {
      const info = sys.bikeOnRoad();
      if (!info || info.road.len - info.t < 1000) return; // wait for a long enough straight
      this.fired = true;
      const dir = -info.dir;
      const t = info.road.len - (info.t + 800);
      const npc = sys.traffic.spawn('thar', info.road, dir, 0, t, EVENTS.tharSpeed);
      npc.n = npc.targetN = -info.n;
      npc.reckless = npc.ignoresSignals = npc.despawnAtEnd = true;
      npc.laneChangeTimer = Infinity;
      npc.lateralSpeed = 30;
      npc.place();
      this.npc = npc;
      sys.toast(LINES.thar);
    }
    // keeps lining up with you until it's close
    const npc = this.npc;
    if (npc && !npc.dead) {
      const b = sys.bike;
      if (Math.hypot(npc.x - b.x, npc.y - b.y) > 260) {
        const p = sys.net.project(npc.road, b.x, b.y);
        npc.targetN = p.n * npc.dir;
      }
    }
  }
}

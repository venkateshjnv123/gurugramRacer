import { NIGHT } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';
import { floatBetween } from '../rand.js';

// Night only: a slow truck with no tail lights, sitting in your lane somewhere in the fog.
export default class InvisibleTruck {
  constructor(sys) {
    this.sys = sys;
    this.at = floatBetween(...NIGHT.truckWindow) * sys.game.limit;
    this.warned = false;
  }

  update() {
    const { sys } = this;
    if (!this.npc && sys.elapsed > this.at) {
      const info = sys.bikeOnRoad();
      if (!info || info.road.len - info.t < 900) return;
      const npc = sys.traffic.spawn('truck', info.road, info.dir, 0, info.t + 600, NIGHT.truckSpeed);
      npc.n = npc.targetN = Math.max(18, info.n);
      npc.noTailLights = true;
      npc.laneChangeTimer = Infinity;
      npc.place();
      this.npc = npc;
    }
    if (this.npc && !this.warned && !this.npc.dead) {
      const b = sys.bike;
      if (Math.hypot(this.npc.x - b.x, this.npc.y - b.y) < 260) {
        this.warned = true;
        sys.toast(LINES.invisibleTruck);
      }
    }
  }
}

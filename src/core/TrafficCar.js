import { COLORS, LANES } from '../config.js';
import { between, floatBetween, pick } from './rand.js';

export const SIZE = { car: [22, 44], thar: [26, 46], auto: [20, 32], bus: [26, 90], truck: [26, 80] };

let nextId = 1;

// An NPC that drives along a road in "travel frame": t = distance from its start junction,
// n = offset to the LEFT of its travel direction (left-hand traffic: normal lanes have n > 0).
export default class TrafficCar {
  constructor(net, kind, road, dir, lane, t, speed) {
    this.id = nextId++;
    this.net = net;
    this.kind = kind;
    this.road = road;
    this.dir = dir;
    this.lane = lane;
    this.t = t;
    this.n = TrafficCar.laneN(lane);
    this.targetN = this.n;
    this.baseSpeed = speed;
    this.speed = speed;
    [this.w, this.h] = SIZE[kind];
    this.turn = null;
    this.despawnAtEnd = false; // one-shot event vehicles leave at the next junction
    this.reckless = false;     // doesn't brake for the bike
    this.ignoresSignals = false;
    this.noTailLights = false;
    this.lateralSpeed = 40;
    this.laneChangeTimer = kind === 'auto' ? floatBetween(2, 5) : Infinity;
    this.color = kind === 'car' ? pick(COLORS.cars) : null;
    this.place();
  }

  static laneN(lane) {
    return (lane + 0.5) * LANES.width;
  }

  get endJ() {
    return this.dir > 0 ? this.road.b : this.road.a;
  }

  get startJ() {
    return this.dir > 0 ? this.road.a : this.road.b;
  }

  // travel frame → world
  worldAt(road, dir, t, n) {
    return this.net.pointAt(road, dir > 0 ? t : road.len - t, n * dir);
  }

  place() {
    const p = this.worldAt(this.road, this.dir, this.t, this.n);
    this.x = p.x;
    this.y = p.y;
    this.heading = Math.atan2(this.road.dy * this.dir, this.road.dx * this.dir);
  }

  update(dt) {
    if (this.turn) {
      const tr = this.turn;
      tr.p += this.speed * dt;
      const k = Math.min(1, tr.p / tr.len);
      this.x = tr.x0 + (tr.x1 - tr.x0) * k;
      this.y = tr.y0 + (tr.y1 - tr.y0) * k;
      if (tr.len > 1) this.heading = Math.atan2(tr.y1 - tr.y0, tr.x1 - tr.x0);
      if (k >= 1) {
        this.road = tr.road;
        this.dir = tr.dir;
        this.lane = tr.lane;
        this.t = tr.t;
        this.n = this.targetN = TrafficCar.laneN(tr.lane);
        this.turn = null;
        this.place();
      }
      return;
    }

    this.t += this.speed * dt;
    this.n = approach(this.n, this.targetN, this.lateralSpeed * dt);

    this.laneChangeTimer -= dt;
    if (this.laneChangeTimer <= 0 && this.road.lanes > 1) {
      // autos: random lane switching, no indicator
      this.lane = between(0, this.road.lanes - 1);
      this.targetN = TrafficCar.laneN(this.lane);
      this.laneChangeTimer = floatBetween(2, 5);
    }

    if (this.t >= this.road.len - this.endJ.radius + 5) {
      if (this.despawnAtEnd || this.endJ.roads.length === 1) {
        this.dead = true;
        return;
      }
      this.startTurn();
    }
    this.place();
  }

  // Pick a random exit at the junction ahead and drive straight across to it.
  startTurn() {
    const j = this.endJ;
    const big = this.kind === 'bus' || this.kind === 'truck';
    const exits = j.roads.filter((r) => r !== this.road && !r.closed?.has(r.a === j ? 1 : -1) && !(big && r.type === 'gali'));
    const next = exits.length ? pick(exits) : this.road; // nowhere to go: U-turn
    const dir = next.a === j ? 1 : -1;
    const lane = Math.min(this.lane, next.lanes - 1);
    const t = j.radius - 5;
    const to = this.worldAt(next, dir, t, TrafficCar.laneN(lane));
    this.turn = {
      x0: this.x, y0: this.y, x1: to.x, y1: to.y,
      len: Math.hypot(to.x - this.x, to.y - this.y), p: 0,
      road: next, dir, lane, t,
    };
  }
}

function approach(v, target, step) {
  return v > target ? Math.max(target, v - step) : Math.min(target, v + step);
}

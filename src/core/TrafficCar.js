import { COLORS, LANES } from '../config.js';
import { floatBetween, pick } from './rand.js';

export const SIZE = { car: [22, 44], thar: [26, 46], auto: [20, 32], bus: [26, 90], truck: [26, 80] };

let nextId = 1;

// An NPC that drives along a road in "travel frame": t = distance from its start junction,
// n = offset to the LEFT of its travel direction (left-hand traffic: normal lanes have n > 0).
// Speed and lane choice are decided by TrafficSystem; this class only moves.
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
    this.reckless = false;     // doesn't brake for the bike, weaves into any gap (even wrong side)
    this.ignoresSignals = false;
    this.noTailLights = false;
    this.lateralSpeed = 40;
    this.laneChangeTimer = kind === 'auto' ? floatBetween(2, 5) : Infinity;
    this.impatient = kind === 'auto' || Math.random() < 0.4; // changes lane when stuck behind someone
    this.blockedFor = 0;  // seconds spent crawling behind another vehicle
    this.stuckFor = 0;    // seconds stopped by another vehicle (gridlock clean-up)
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
      const u = 1 - k;
      ({ x: this.x, y: this.y } = curvePoint(tr, k));
      const hx = u * (tr.cx - tr.x0) + k * (tr.x1 - tr.cx);
      const hy = u * (tr.cy - tr.y0) + k * (tr.y1 - tr.cy);
      if (Math.hypot(hx, hy) > 1e-3) this.heading = Math.atan2(hy, hx);
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

    if (this.t >= this.road.len - this.endJ.radius + 5) {
      if (this.despawnAtEnd || this.endJ.roads.length === 1) {
        this.dead = true;
        return;
      }
      this.startTurn();
    }
    this.place();
  }

  // Pick a random exit at the junction ahead and plan a curve across to it (quadratic bezier
  // whose control point is where the entry and exit lanes would meet). Planned early so
  // TrafficSystem can check it against vehicles already turning in the junction.
  planTurn() {
    if (this.plan) return this.plan;
    const j = this.endJ;
    const big = this.kind === 'bus' || this.kind === 'truck';
    const exits = j.roads.filter((r) => r !== this.road && !r.closed?.has(r.a === j ? 1 : -1) && !(big && r.type === 'gali'));
    const next = exits.length ? pick(exits) : this.road; // nowhere to go: U-turn
    const dir = next.a === j ? 1 : -1;
    const lane = Math.min(this.lane, next.lanes - 1);
    const t = j.radius - 5;
    const from = this.worldAt(this.road, this.dir, this.road.len - j.radius + 5, this.targetN);
    const to = this.worldAt(next, dir, t, TrafficCar.laneN(lane));
    const h0 = Math.atan2(this.road.dy * this.dir, this.road.dx * this.dir);
    const h1 = Math.atan2(next.dy * dir, next.dx * dir);
    let cx = (from.x + to.x) / 2;
    let cy = (from.y + to.y) / 2;
    const cross = Math.cos(h0) * Math.sin(h1) - Math.sin(h0) * Math.cos(h1);
    if (Math.abs(cross) > 0.2) {
      const s = ((to.x - from.x) * Math.sin(h1) - (to.y - from.y) * Math.cos(h1)) / cross;
      const ix = from.x + Math.cos(h0) * s;
      const iy = from.y + Math.sin(h0) * s;
      if (s > 0 && Math.hypot(ix - j.x, iy - j.y) < j.radius * 1.2) {
        cx = ix;
        cy = iy;
      }
    }
    this.plan = { j, x0: from.x, y0: from.y, cx, cy, x1: to.x, y1: to.y, p: 0, road: next, dir, lane, t, src: this.road, srcDir: this.dir };
    this.plan.len = Math.max(1, curveLength(this.plan));
    return this.plan;
  }

  startTurn() {
    const tr = this.planTurn();
    tr.x0 = this.x;
    tr.y0 = this.y;
    tr.len = Math.max(1, curveLength(tr));
    this.plan = null;
    this.turn = tr;
  }
}

// Point on a planned turn at progress k (0..1)
export function curvePoint(tr, k) {
  const u = 1 - k;
  return { x: u * u * tr.x0 + 2 * u * k * tr.cx + k * k * tr.x1, y: u * u * tr.y0 + 2 * u * k * tr.cy + k * k * tr.y1 };
}

function curveLength(tr) {
  let len = 0;
  let prev = curvePoint(tr, 0);
  for (let i = 1; i <= 8; i++) {
    const p = curvePoint(tr, i / 8);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

function approach(v, target, step) {
  return v > target ? Math.max(target, v - step) : Math.min(target, v + step);
}

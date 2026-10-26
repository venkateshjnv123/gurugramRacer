import { TIME, STARS, PENALTY, TRAFFIC, BIKE } from '../config.js';
import { MISSIONS } from '../data/missions.js';
import { UI, FAIL_REASON, CRASH, HORN, EVENTS as LINES, LATE } from '../data/jokes.js';
import RoadNet from '../systems/RoadNet.js';
import BikePhysics from '../objects/BikePhysics.js';
import { recordFail } from '../systems/Save.js';
import Emitter from './Emitter.js';
import TrafficSystem from './TrafficSystem.js';
import EventSystem, { NULL_PROPS } from './EventSystem.js';
import Specials from './Specials.js';
import { pick } from './rand.js';

export const WIN_RADIUS = 80;
const RESULT_DELAY = 0.6;

// One mission, engine-free. Emits: toast(text), crash(npc), honk(result, npc), rain(), pothole(),
// redLight(), sfx(name), finish(result).
export default class Game extends Emitter {
  constructor(missionId, { props = NULL_PROPS, net = new RoadNet(), fog = false } = {}) {
    super();
    this.mission = MISSIONS.find((m) => m.id === missionId) ?? MISSIONS[0];
    this.props = props;
    this.net = net;
    this.fogMode = fog;
    for (const r of net.roads) delete r.closed; // a shared net may carry closures from the last mission
    const m = this.mission;
    this.from = net.junction(m.from);
    this.target = net.junction(m.to);
    this.route = net.shortestPath(m.from, m.to);
    const first = net.junction(this.route.ids[1]);
    this.bike = new BikePhysics(net, this.from.x, this.from.y, Math.atan2(first.y - this.from.y, first.x - this.from.x));

    this.limit = (m.minutes * 60) / TIME.scale; // real seconds
    this.elapsed = 0;
    this.over = false;
    this.result = null;
    this.warnedLow = false;
    this.hornCooldown = 0;
    this.lost = Object.fromEntries(Object.keys(LATE.labels).map((k) => [k, 0])); // real seconds, by cause
    this.inWater = false; // set by the waterlogging event
    this.lastRoad = null;
    this.inJunction = null;

    this.traffic = new TrafficSystem(net, this.bike, { onCrash: (npc) => this.onCrash(npc) });
    this.eventSys = new EventSystem(this);
    this.specials = new Specials(this);
    this.startToasts = [m.brief, UI.start(this.from.name, this.target.name)];
  }

  get timeLeft() {
    return Math.max(0, this.limit - this.elapsed);
  }

  toast(text) {
    this.emit('toast', text);
  }

  // Lose real seconds off the clock
  penalize(realSeconds, text, cause = 'challan') {
    this.elapsed += realSeconds;
    this.lost[cause] += realSeconds;
    const p = UI.penalty(realSeconds * TIME.scale);
    this.toast(text ? `${text}  ${p}` : p);
  }

  // Hit a vehicle (penalty) or a cow/barrier (no penalty). Either way the cake suffers.
  onCrash(npc, { penalty = true } = {}) {
    if (this.over) return;
    if (penalty) {
      this.penalize(PENALTY.crash, pick(CRASH), 'crash');
      this.bike.stun = BIKE.crashStun;
    }
    this.emit('crash', npc);
  }

  honk() {
    const { result, npc } = this.traffic.honk();
    if (result === 'miracle') this.toast(HORN.miracle);
    else if (result === 'ignored' && Math.random() < 0.35) this.toast(pick(HORN.ignored));
    this.emit('honk', result, npc);
  }

  // input: { up, down, left, right, brake, horn }
  update(dt, input) {
    if (this.startToasts.length) this.startToasts.splice(0).forEach((t) => this.toast(t));
    if (this.over) {
      this.bike.step(dt, { brake: true });
      this.resultTimer -= dt;
      if (this.resultTimer <= 0 && !this.resultSent) {
        this.resultSent = true;
        this.emit('finish', this.result);
      }
      return;
    }
    this.elapsed += dt;
    const { pothole } = this.bike.step(dt, input);
    if (pothole) this.emit('pothole');
    this.checkRedLight();
    this.traffic.update(dt);
    this.eventSys.update(dt);
    this.specials.update(dt);
    if (this.over) return;
    this.blame(dt);

    this.hornCooldown -= dt;
    if (input.horn && this.hornCooldown <= 0) {
      this.hornCooldown = TRAFFIC.hornCooldown;
      this.honk();
    }

    if (!this.warnedLow && this.timeLeft * TIME.scale < 120) {
      this.warnedLow = true;
      this.toast(UI.timeLow);
    }
    if (Math.hypot(this.bike.x - this.target.x, this.bike.y - this.target.y) < WIN_RADIUS) this.finish(true);
    else if (this.timeLeft <= 0) this.finish(false, 'time');
  }

  finish(win, reason) {
    if (this.over) return;
    this.over = true;
    if (!win) recordFail(this.net.nearestJunction(this.bike.x, this.bike.y).id);
    const leftFrac = this.timeLeft / this.limit;
    let stars = 0;
    if (win) stars = leftFrac > STARS.three ? 3 : leftFrac > STARS.two ? 2 : 1;
    this.result = {
      missionId: this.mission.id,
      win,
      reason: win ? null : FAIL_REASON[reason],
      taken: Math.round(Math.min(this.elapsed, this.limit) * TIME.scale), // game seconds
      stars,
      extra: this.specials.resultLines(win),
      lost: Object.entries(this.lost)
        .map(([cause, s]) => ({ cause, seconds: Math.round(s * TIME.scale) }))
        .filter((l) => l.seconds >= 10)
        .sort((a, b) => b.seconds - a.seconds),
    };
    this.resultTimer = win ? RESULT_DELAY : RESULT_DELAY / 2;
  }

  // Signal on the road you're riding, if you're heading into a signal junction:
  // { j, state, left, dist } (dist = to the stop line), else null.
  signalAhead() {
    const b = this.bike;
    const road = this.net.roadAt(b.x, b.y);
    if (!road || this.inJunction) return null;
    const along = Math.cos(b.heading) * road.dx + Math.sin(b.heading) * road.dy;
    if (Math.abs(along) < 0.5) return null;
    const j = along > 0 ? road.b : road.a;
    if (!j.hot) return null;
    const { t } = this.net.project(road, b.x, b.y);
    const dist = (along > 0 ? road.len - t : t) - j.radius;
    if (dist > 700) return null;
    return { j, dist, ...this.traffic.light(j, road) };
  }

  // Entering a signal junction on red = camera challan.
  checkRedLight() {
    const b = this.bike;
    const j = this.net.nearestJunction(b.x, b.y);
    if (Math.hypot(b.x - j.x, b.y - j.y) > j.radius - 6) {
      this.lastRoad = this.net.roadAt(b.x, b.y) ?? this.lastRoad;
      this.inJunction = null;
      return;
    }
    if (this.inJunction === j) return;
    this.inJunction = j;
    const road = this.lastRoad;
    if (!j.hot || !road || (road.a !== j && road.b !== j) || b.speed < 15) return;
    if (this.traffic.light(j, road).state === 'red') {
      this.penalize(PENALTY.redLight, LINES.redLight, 'redLight');
      this.emit('redLight');
    }
  }

  // Where did the time go? Every slow second is pinned on whatever is holding you up.
  blame(dt) {
    const b = this.bike;
    if (this.inWater) this.lost.water += dt;
    if (Math.abs(b.speed) > 30 || b.stun > 0) return;
    const sig = this.signalAhead();
    if (sig && sig.state !== 'green' && sig.dist < 300) this.lost.signal += dt;
    else if (this.eventSys.items.some((e) => e.state === 'waiting')) this.lost.cow += dt;
    else if (!this.inWater && this.traffic.npcs.some((n) => Math.hypot(n.x - b.x, n.y - b.y) < 90)) this.lost.jam += dt;
  }

  // GPS: next junction on the best route. On a road, pick whichever end is cheaper to go via
  // (riding the wrong way points you back). Gaaglu Maps lies for a while.
  gpsTarget() {
    const { net, bike, target } = this;
    const j = net.nearestJunction(bike.x, bike.y);
    let next;
    if (Math.hypot(j.x - bike.x, j.y - bike.y) < j.radius) {
      const path = net.shortestPath(j.id, target.id, this.closedRoads());
      next = path && path.ids.length > 1 ? net.junction(path.ids[1]) : target;
    } else {
      const road = net.roadAt(bike.x, bike.y);
      if (!road) return this.lastGps ?? target;
      const via = (end) => Math.hypot(end.x - bike.x, end.y - bike.y) + (net.shortestPath(end.id, target.id, this.closedRoads())?.cost ?? 1e9);
      next = via(road.a) <= via(road.b) ? road.a : road.b;
    }
    if (this.eventSys.gaagluUntil > this.elapsed) {
      // confidently pointing at the nearest jam
      let jam = null;
      let best = Infinity;
      for (const h of net.junctions.values()) {
        const d = Math.hypot(h.x - bike.x, h.y - bike.y);
        if (h.hot && h !== target && h !== next && d > 300 && d < best) {
          best = d;
          jam = h;
        }
      }
      if (jam) next = jam;
    }
    this.lastGps = next;
    return next;
  }

  closedRoads() {
    return new Set(this.net.roads.filter((r) => r.closed?.size === 2).map((r) => r.index));
  }
}

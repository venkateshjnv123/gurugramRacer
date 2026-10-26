import { TRAFFIC, LANES } from '../config.js';
import TrafficCar, { curvePoint } from './TrafficCar.js';
import { between, floatBetween } from './rand.js';

// Spawns NPCs around the bike, runs signal cycles at hot junctions, and detects bike crashes.
// Views read `npcs` and `signals` each frame; `onCrash(npc)` is called on a penalised hit.
export default class TrafficSystem {
  constructor(net, bike, { onCrash }) {
    this.net = net;
    this.bike = bike;
    this.onCrash = onCrash;
    this.npcs = [];
    this.clock = 0;
    this.crashCooldown = 0;
    this.blockers = [];  // static obstacles NPCs queue behind: { road, dir|0, t (a → b), half } (events add these)
    this.slowZones = []; // { x, y, r, f } e.g. waterlogging

    // Hot junctions get signals. Roads that line up (opposite approaches) share a green phase;
    // phases take turns: green → amber → (next phase). One light per approach, on the left kerb.
    this.signals = [...net.junctions.values()].filter((j) => j.hot).map((j) => {
      const phases = [];
      const angle = (r) => Math.atan2(net.other(r, j).y - j.y, net.other(r, j).x - j.x);
      for (const r of j.roads) {
        const mate = phases.find((p) => p.length === 1 && Math.abs(Math.cos(angle(p[0]) - angle(r)) + 1) < 0.25);
        if (mate) mate.push(r);
        else phases.push([r]);
      }
      j.phaseOf = new Map(phases.flatMap((p, i) => p.map((r) => [r, i])));
      j.phaseCount = phases.length;
      j.signalOffset = floatBetween(0, phases.length * (TRAFFIC.signalGreen + TRAFFIC.signalAmber));
      const lights = j.roads.map((r) => {
        const incomingAB = r.b === j;
        const t = incomingAB ? r.len - j.radius : j.radius;
        const p = net.pointAt(r, t, (r.hw + 12) * (incomingAB ? 1 : -1));
        return { road: r, x: p.x, y: p.y, hw: r.hw, facing: Math.atan2(r.dy, r.dx) + (incomingAB ? Math.PI : 0) };
      });
      return { j, lights };
    });

    for (let i = 0; i < TRAFFIC.maxNpcs; i++) this.trySpawn(true);
  }

  // Light shown to traffic arriving at junction j along `road`: { state: 'green'|'amber'|'red', left: s }
  light(j, road) {
    if (!j.hot || !j.phaseOf?.has(road)) return { state: 'green', left: Infinity };
    const slot = TRAFFIC.signalGreen + TRAFFIC.signalAmber;
    const cycle = j.phaseCount * slot;
    const local = (this.clock + j.signalOffset) % cycle;
    const mine = j.phaseOf.get(road);
    const active = Math.floor(local / slot);
    const within = local - active * slot;
    if (active === mine) {
      return within < TRAFFIC.signalGreen
        ? { state: 'green', left: TRAFFIC.signalGreen - within }
        : { state: 'amber', left: slot - within };
    }
    return { state: 'red', left: (mine * slot - local + cycle) % cycle };
  }

  pickKind(type) {
    let r = Math.random();
    for (const [kind, p] of Object.entries(TRAFFIC.mix[type])) {
      r -= p;
      if (r <= 0) return kind;
    }
    return 'car';
  }

  spawn(kind, road, dir, lane, t, speed) {
    const [lo, hi] = TRAFFIC.speed[road.type];
    const npc = new TrafficCar(this.net, kind, road, dir, lane, t, speed ?? between(lo, hi) * TRAFFIC.kindSpeed[kind]);
    npc.fresh = true; // first update clears anything it was dropped on top of
    this.npcs.push(npc);
    return npc;
  }

  trySpawn(initial) {
    const b = this.bike;
    const minD = initial ? 300 : TRAFFIC.spawnMin;
    const roads = this.net.roads.filter((r) => {
      const { t } = this.net.project(r, b.x, b.y);
      const c = this.net.pointAt(r, Math.max(0, Math.min(r.len, t)));
      return Math.hypot(c.x - b.x, c.y - b.y) < TRAFFIC.spawnMax;
    });
    if (!roads.length) return;
    const weight = (r) => TRAFFIC.density[r.type] * r.len * (r.a.hot || r.b.hot ? TRAFFIC.hotDensity : 1);
    const total = roads.reduce((sum, r) => sum + weight(r), 0);

    for (let attempt = 0; attempt < 12; attempt++) {
      let roll = Math.random() * total;
      const road = roads.find((r) => (roll -= weight(r)) <= 0) ?? roads[0];
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (road.closed?.has(dir)) continue;
      const startJ = dir > 0 ? road.a : road.b;
      const endJ = dir > 0 ? road.b : road.a;
      const t = floatBetween(startJ.radius + 30, road.len - endJ.radius - 30);
      if (!(t > 0)) continue;
      const lane = between(0, road.lanes - 1);
      const p = this.net.pointAt(road, dir > 0 ? t : road.len - t, TrafficCar.laneN(lane) * dir);
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < minD || d > TRAFFIC.spawnMax) continue;
      if (this.npcs.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 110)) continue;
      this.spawn(this.pickKind(road.type), road, dir, lane, t);
      return;
    }
  }

  update(dt) {
    this.clock += dt;
    this.crashCooldown -= dt;
    const b = this.bike;

    for (const npc of this.npcs) {
      if (npc.fresh) {
        npc.fresh = false;
        for (const o of this.npcs) if (o !== npc && !o.fresh && this.touching(npc, o, 6)) o.dead = true;
      }
      const d = Math.hypot(npc.x - b.x, npc.y - b.y);
      if (d > TRAFFIC.despawn) npc.dead = true;
      // gridlock clean-up: only vanish where the player can't see it
      const behind = (npc.x - b.x) * Math.cos(b.heading) + (npc.y - b.y) * Math.sin(b.heading) < -150;
      if (npc.stuckFor > TRAFFIC.stuckDespawn && (behind || d > 900)) npc.dead = true;
      // event vehicles (wrong-side Thar etc.) that got boxed in, and true gridlock anywhere
      if (npc.stuckFor > (npc.despawnAtEnd ? 3 : TRAFFIC.stuckDespawn * 2.5)) npc.dead = true;
    }
    this.npcs = this.npcs.filter((n) => !n.dead);
    if (this.npcs.length < TRAFFIC.maxNpcs) this.trySpawn(false);

    for (const npc of this.npcs) {
      const { speed, byVehicle } = this.desiredSpeed(npc);
      npc.speed = approachSpeed(npc.speed, speed, dt);
      const crawling = byVehicle && speed < npc.baseSpeed * 0.4;
      npc.blockedFor = crawling ? npc.blockedFor + dt : 0;
      npc.stuckFor = crawling && npc.speed < 2 ? npc.stuckFor + dt : 0;
      this.steerLanes(npc, dt);
      npc.update(dt);
      this.checkCrash(npc);
    }
  }

  // Does `o` sit in the path of `npc` (shifted `shift` px to its left)? Returns the gap to it
  // along npc's heading, or null. Uses o's rotated box so crossing traffic counts too.
  gapTo(npc, o, shift = 0) {
    const { fwd, side } = this.local(npc, o.x, o.y);
    const rel = o.heading - npc.heading;
    const c = Math.abs(Math.cos(rel));
    const s = Math.abs(Math.sin(rel));
    const across = c * o.w / 2 + s * o.h / 2;
    if (Math.abs(side - shift) > npc.w / 2 + across + TRAFFIC.sideMargin) return null;
    const along = c * o.h / 2 + s * o.w / 2;
    if (fwd + along < 0) return null; // behind us
    return fwd - npc.h / 2 - along;
  }

  touching(a, o, margin) {
    const gap = this.gapTo(a, o);
    return gap !== null && gap < margin && this.local(a, o.x, o.y).fwd > -(a.h + o.h) / 2;
  }

  // Free road ahead of npc in a lane shifted `shift` px to its left (and room alongside to move there)
  freeAhead(npc, shift) {
    let free = TRAFFIC.lookAhead * 2;
    for (const o of this.npcs) {
      if (o === npc || Math.abs(o.x - npc.x) > 400 || Math.abs(o.y - npc.y) > 400) continue;
      const gap = this.gapTo(npc, o, shift);
      if (gap === null) continue;
      if (gap < -npc.h - 10) continue; // well behind
      free = Math.min(free, gap);
    }
    return free;
  }

  desiredSpeed(npc) {
    let d = npc.baseSpeed * (this.wet ? TRAFFIC.wetSpeed : 1);
    let byVehicle = false;
    if (!npc.turn) {
      // stop at red; on amber, go only if too close to stop
      const ej = npc.endJ;
      if (!npc.ignoresSignals) {
        const { state } = this.light(ej, npc.road);
        const dist = npc.road.len - ej.radius - 10 - npc.h / 2 - npc.t;
        if ((state === 'red' || (state === 'amber' && dist > 50)) && dist > -npc.h / 2 && dist < TRAFFIC.jamRadius) {
          d = Math.min(d, Math.max(0, dist * 1.2));
        }
      }
      // wait at the junction edge while someone's turn crosses ours
      const edge = npc.road.len - ej.radius - npc.h / 2 - npc.t;
      if (edge < 120 && !npc.despawnAtEnd && ej.roads.length > 1 && this.junctionBusy(npc)) {
        d = Math.min(d, Math.max(0, (edge - 4) * 1.5));
        byVehicle = true;
      }
      for (const bl of this.blockers) {
        if (bl.road !== npc.road || (bl.dir && bl.dir !== npc.dir)) continue;
        const bt = npc.dir > 0 ? bl.t : npc.road.len - bl.t;
        const gap = bt - npc.t - npc.h / 2 - (bl.half ?? 30);
        if (gap > -10 && gap < 200) d = Math.min(d, Math.max(0, (gap - 10) * 1.5));
      }
    }
    // anything in our path (same lane, merging, crossing a junction). When two vehicles each
    // block the other, the one already turning (else the older one) goes first.
    for (const o of this.npcs) {
      if (o === npc || Math.abs(o.x - npc.x) > TRAFFIC.lookAhead + 60 || Math.abs(o.y - npc.y) > TRAFFIC.lookAhead + 60) continue;
      const gap = this.gapTo(npc, o);
      if (gap === null || gap > TRAFFIC.lookAhead) continue;
      const back = this.gapTo(o, npc);
      const headOn = Math.cos(o.heading - npc.heading) < -0.7; // both must brake
      if (!headOn && back !== null && back < TRAFFIC.lookAhead) {
        const mineFirst = npc.turn && !o.turn ? true : !npc.turn && o.turn ? false : npc.id < o.id;
        if (mineFirst) continue;
      }
      const v = Math.max(0, (gap - TRAFFIC.followGap) * 1.5);
      if (v < d) {
        d = v;
        byVehicle = true;
      }
    }
    for (const z of this.slowZones) {
      if (Math.hypot(npc.x - z.x, npc.y - z.y) < z.r) d = Math.min(d, npc.baseSpeed * z.f);
    }
    // brake for the bike if it's right in front going the same way (unless reckless).
    // Oncoming traffic doesn't stop for a wrong-side bike — that's a crash.
    const b = this.bike;
    const sameWay = Math.cos(b.heading - npc.heading) > 0.3;
    if (!npc.reckless && sameWay) {
      const { fwd, side } = this.local(npc, b.x, b.y);
      if (fwd > 0 && fwd < npc.h / 2 + 90 && Math.abs(side) < npc.w / 2 + 14) {
        d = Math.min(d, Math.max(0, (fwd - npc.h / 2 - 20) * 1.5));
      }
    }
    return { speed: d, byVehicle };
  }

  // Is a vehicle already turning through npc's junction on a path that crosses npc's planned turn?
  junctionBusy(npc) {
    const plan = npc.planTurn();
    for (const o of this.npcs) {
      const tr = o.turn;
      if (!tr || tr.j !== plan.j || o === npc) continue;
      if (tr.src === plan.src && tr.srcDir === plan.srcDir && tr.road === plan.road && tr.lane === plan.lane) continue; // following it
      const clear = (npc.w + o.w) / 2 + 6;
      for (let a = 0; a <= 8; a++) {
        const p = curvePoint(plan, a / 8);
        for (let b = Math.floor((tr.p / tr.len) * 8); b <= 8; b++) {
          const q = curvePoint(tr, b / 8);
          if (Math.hypot(p.x - q.x, p.y - q.y) < clear) return true;
        }
      }
    }
    return false;
  }

  // Autos switch lanes at random (no indicator); impatient drivers pull out from behind a slow
  // vehicle. Either way only into a gap that's actually free.
  steerLanes(npc, dt) {
    if (npc.turn) return;
    if (Math.abs(npc.n - npc.targetN) > 1) {
      // mid-change: someone moved into the gap → go back to where we came from
      if (!this.sideClear(npc, npc.targetN - npc.n)) {
        const back = Math.sign(npc.n - npc.targetN) * TrafficCar.laneN(0);
        npc.targetN = Math.round((npc.n + back - TrafficCar.laneN(0)) / LANES.width) * LANES.width + TrafficCar.laneN(0);
      }
      return;
    }
    npc.laneChangeTimer -= dt;
    const random = npc.laneChangeTimer <= 0;
    const fedUp = npc.impatient && npc.blockedFor > TRAFFIC.weaveAfter;
    if (!random && !fedUp) return;
    if (random) npc.laneChangeTimer = floatBetween(2, 5);

    const road = npc.road;
    const options = [];
    for (let lane = 0; lane < road.lanes; lane++) options.push(TrafficCar.laneN(lane));
    if (npc.reckless) for (let lane = 0; lane < road.lanes; lane++) options.push(-TrafficCar.laneN(lane));
    let best = null;
    let bestFree = fedUp ? this.freeAhead(npc, 0) + 40 : -Infinity;
    for (const n of options) {
      if (Math.abs(n - npc.n) < 4 || !this.sideClear(npc, n - npc.n)) continue;
      const free = this.freeAhead(npc, n - npc.n);
      if (free > bestFree && (!random || free > 60)) {
        bestFree = free;
        best = n;
      }
    }
    if (best === null) return;
    npc.targetN = best;
    npc.lane = Math.max(0, Math.round(Math.abs(best) / TrafficCar.laneN(0) / 2 - 0.5));
    npc.blockedFor = 0;
  }

  // Nothing beside or just behind/ahead along the strip between npc's lane and `shift`
  sideClear(npc, shift) {
    const others = npc.reckless ? this.npcs : [...this.npcs, { x: this.bike.x, y: this.bike.y, w: 14, h: 30 }];
    for (const o of others) {
      if (o === npc || Math.abs(o.x - npc.x) > 200 || Math.abs(o.y - npc.y) > 200) continue;
      const { fwd, side } = this.local(npc, o.x, o.y);
      const lo = Math.min(0, shift) - npc.w / 2 - o.w / 2 - 2;
      const hi = Math.max(0, shift) + npc.w / 2 + o.w / 2 + 2;
      if (side > lo && side < hi && Math.abs(fwd) < (npc.h + o.h) / 2 + 30) return false;
    }
    return true;
  }

  // point relative to an NPC: fwd along its heading, side to its left
  local(npc, x, y) {
    const dx = x - npc.x;
    const dy = y - npc.y;
    const c = Math.cos(npc.heading);
    const s = Math.sin(npc.heading);
    return { fwd: dx * c + dy * s, side: dx * s - dy * c };
  }

  checkCrash(npc) {
    const r = TRAFFIC.bikeHitRadius;
    const { fwd, side } = this.local(npc, this.bike.x, this.bike.y);
    if (Math.abs(fwd) > npc.h / 2 + r || Math.abs(side) > npc.w / 2 + r) return;
    this.bike.bounce(npc.x, npc.y);
    if (this.crashCooldown <= 0) {
      this.crashCooldown = TRAFFIC.crashCooldown;
      this.onCrash(npc);
    }
  }

  // Horn: 90% of the time nobody cares. 10%: the vehicle ahead moves aside.
  honk() {
    const b = this.bike;
    let best = null;
    let bestD = 260;
    for (const npc of this.npcs) {
      const dx = npc.x - b.x;
      const dy = npc.y - b.y;
      const d = Math.hypot(dx, dy);
      const ahead = dx * Math.cos(b.heading) + dy * Math.sin(b.heading) > 0;
      if (ahead && d < bestD) {
        bestD = d;
        best = npc;
      }
    }
    if (!best) return { result: 'nobody' };
    if (Math.random() < TRAFFIC.hornMiracleChance && !best.turn) {
      const lanes = best.road.lanes;
      best.lane = best.lane === lanes - 1 ? Math.max(0, lanes - 2) : lanes - 1;
      best.targetN = lanes > 1 ? TrafficCar.laneN(best.lane) : TrafficCar.laneN(0) + 14;
      best.speed *= 0.5;
      return { result: 'miracle', npc: best };
    }
    return { result: 'ignored', npc: best };
  }
}

function approachSpeed(v, target, dt) {
  return v > target ? Math.max(target, v - TRAFFIC.decel * dt) : Math.min(target, v + TRAFFIC.accel * dt);
}

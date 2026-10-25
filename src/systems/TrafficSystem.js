import Phaser from 'phaser';
import { TRAFFIC } from '../config.js';
import TrafficCar from '../objects/TrafficCar.js';

// Spawns NPCs around the bike, runs signal cycles at hot junctions, and handles bike crashes.
export default class TrafficSystem {
  constructor(scene, net, bike) {
    this.scene = scene;
    this.net = net;
    this.bike = bike;
    this.npcs = [];
    this.clock = 0;
    this.crashCooldown = 0;
    this.blockers = [];  // static obstacles NPCs queue behind: { road, dir|0, t (a → b), half } (events add these)
    this.slowZones = []; // { x, y, r, f } e.g. waterlogging

    this.signals = [...net.junctions.values()].filter((j) => j.hot).map((j) => {
      j.signalOffset = Phaser.Math.FloatBetween(0, TRAFFIC.signalRed + TRAFFIC.signalGreen);
      const lights = j.roads.map((r) => {
        // light on the left kerb of each road, at the stop line, for traffic coming in
        const incomingAB = r.b === j;
        const p = net.pointAt(r, incomingAB ? r.len - j.radius : j.radius, (r.hw + 12) * (incomingAB ? 1 : -1));
        return scene.add.image(p.x, p.y, 'dot').setDepth(6).setScale(1.3);
      });
      return { j, lights };
    });

    for (let i = 0; i < TRAFFIC.maxNpcs; i++) this.trySpawn(true);
  }

  isRed(j) {
    const cycle = TRAFFIC.signalRed + TRAFFIC.signalGreen;
    return j.hot && (this.clock + j.signalOffset) % cycle < TRAFFIC.signalRed;
  }

  pickKind(type) {
    const mix = TRAFFIC.mix[type];
    let r = Math.random();
    for (const [kind, p] of Object.entries(mix)) {
      r -= p;
      if (r <= 0) return kind;
    }
    return 'car';
  }

  spawn(kind, road, dir, lane, t, speed) {
    const [lo, hi] = TRAFFIC.speed[road.type];
    const npc = new TrafficCar(this.scene, this.net, kind, road, dir, lane, t,
      speed ?? Phaser.Math.Between(lo, hi) * TRAFFIC.kindSpeed[kind]);
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
    const total = roads.reduce((sum, r) => sum + TRAFFIC.density[r.type] * r.len, 0);

    for (let attempt = 0; attempt < 12; attempt++) {
      let pick = Math.random() * total;
      const road = roads.find((r) => (pick -= TRAFFIC.density[r.type] * r.len) <= 0) ?? roads[0];
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (road.closed?.has(dir)) continue;
      const startJ = dir > 0 ? road.a : road.b;
      const endJ = dir > 0 ? road.b : road.a;
      const t = Phaser.Math.FloatBetween(startJ.radius + 30, road.len - endJ.radius - 30);
      if (!(t > 0)) continue;
      const lane = Phaser.Math.Between(0, road.lanes - 1);
      const p = this.net.pointAt(road, dir > 0 ? t : road.len - t, TrafficCar.laneN(lane) * dir);
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < minD || d > TRAFFIC.spawnMax) continue;
      const crowded = this.npcs.some((o) => o.road === road && o.dir === dir && o.lane === lane && Math.abs(o.t - t) < 110);
      if (crowded) continue;
      const kind = this.pickKind(road.type);
      this.spawn(kind, road, dir, lane, t);
      return;
    }
  }

  update(dt) {
    this.clock += dt;
    this.crashCooldown -= dt;
    const b = this.bike;

    for (const s of this.signals) {
      const tint = this.isRed(s.j) ? 0xff2222 : 0x22ff55;
      for (const l of s.lights) l.setTint(tint);
    }

    for (const npc of this.npcs) {
      if (npc.dead || Math.hypot(npc.x - b.x, npc.y - b.y) > TRAFFIC.despawn) {
        npc.dead = true;
        npc.destroy();
      }
    }
    this.npcs = this.npcs.filter((n) => !n.dead);
    if (this.npcs.length < TRAFFIC.maxNpcs) this.trySpawn(false);

    for (const npc of this.npcs) {
      npc.speed = approachSpeed(npc.speed, this.desiredSpeed(npc), dt);
      npc.update(dt);
      this.checkCrash(npc);
    }
  }

  desiredSpeed(npc) {
    let d = npc.baseSpeed;
    if (!npc.turn) {
      // queue at red signals
      const ej = npc.endJ;
      if (!npc.ignoresSignals && this.isRed(ej)) {
        const dist = npc.road.len - ej.radius - 10 - npc.h / 2 - npc.t;
        if (dist > -npc.h / 2 && dist < TRAFFIC.jamRadius) d = Math.min(d, Math.max(0, dist * 1.2));
      }
      // follow the vehicle ahead in the same lane
      for (const o of this.npcs) {
        if (o === npc || o.turn || o.road !== npc.road || o.dir !== npc.dir || Math.abs(o.n - npc.n) > 24) continue;
        const gap = o.t - npc.t - (o.h + npc.h) / 2;
        if (gap > -5 && gap < 160) d = Math.min(d, Math.max(0, (gap - 14) * 1.5));
      }
      for (const bl of this.blockers) {
        if (bl.road !== npc.road || (bl.dir && bl.dir !== npc.dir)) continue;
        const bt = npc.dir > 0 ? bl.t : npc.road.len - bl.t;
        const gap = bt - npc.t - npc.h / 2 - (bl.half ?? 30);
        if (gap > -10 && gap < 200) d = Math.min(d, Math.max(0, (gap - 10) * 1.5));
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
    return d;
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
      this.scene.onCrash(npc);
    }
  }

  // Space: 90% of the time nobody cares. 10%: the vehicle ahead moves aside.
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
    if (!best) return 'nobody';
    if (Math.random() < TRAFFIC.hornMiracleChance && !best.turn) {
      const lanes = best.road.lanes;
      best.lane = best.lane === lanes - 1 ? Math.max(0, lanes - 2) : lanes - 1;
      best.targetN = lanes > 1 ? TrafficCar.laneN(best.lane) : TrafficCar.laneN(0) + 14;
      best.speed *= 0.5;
      return 'miracle';
    }
    return 'ignored';
  }
}

function approachSpeed(v, target, dt) {
  return v > target ? Math.max(target, v - TRAFFIC.decel * dt) : Math.min(target, v + TRAFFIC.accel * dt);
}

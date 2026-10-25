import { EVENTS } from '../config.js';
import { floatBetween, pick } from './rand.js';
import Cow from './events/Cow.js';
import Thar from './events/Thar.js';
import AutoCut from './events/AutoCut.js';
import Challan from './events/Challan.js';
import Construction from './events/Construction.js';
import Waterlogging from './events/Waterlogging.js';
import GaagluMaps from './events/GaagluMaps.js';
import UTurn from './events/UTurn.js';
import InvisibleTruck from './events/InvisibleTruck.js';

const TYPES = {
  cow: Cow, thar: Thar, auto: AutoCut, challan: Challan, construction: Construction,
  waterlogging: Waterlogging, gaaglu: GaagluMaps, uturn: UTurn, invisibleTruck: InvisibleTruck,
};

// No-op props for headless runs (tests). Views pass a real implementation.
export const NULL_PROPS = {
  add: () => ({ set() {}, remove() {}, emit() {} }),
};

// Runs the humor events listed in the mission. Owns solid obstacles (cows, barriers)
// and minimap marks, which events add. Visuals go through `game.props`.
export default class EventSystem {
  constructor(game) {
    this.game = game;
    this.net = game.net;
    this.bike = game.bike;
    this.traffic = game.traffic;
    this.props = game.props;
    this.solids = [];
    this.marks = [];          // minimap: { x, y, color, cross? }
    this.usedRoads = new Set();
    this.hitCooldown = 0;
    this.gaagluUntil = -1;
    this.items = [];
    for (const id of game.mission.events) {
      if (TYPES[id]) this.items.push(new TYPES[id](this));
    }
  }

  get elapsed() {
    return this.game.elapsed;
  }

  toast(text) {
    this.game.toast(text);
  }

  randomTime([a, b]) {
    return floatBetween(a, b) * this.game.limit;
  }

  // Direction the mission route travels along a road (1 = a → b), or null if not on route
  routeDir(road) {
    const { roads, ids } = this.game.route;
    const i = roads.indexOf(road);
    if (i < 0) return null;
    return road.a.id === ids[i] ? 1 : -1;
  }

  // A random route road not used by another event. Skips the first road (where you spawn)
  // unless the route is too short to spare it.
  pickRouteRoad(filter = () => true) {
    const { roads } = this.game.route;
    const options = roads.filter((r, i) => (i > 0 || roads.length <= 2) && !this.usedRoads.has(r.index) && filter(r));
    if (!options.length) return null;
    const road = pick(options);
    this.usedRoads.add(road.index);
    return road;
  }

  // World point from travel frame (t from the start junction, n to the left of travel)
  travelPoint(road, dir, t, n = 0) {
    return this.net.pointAt(road, dir > 0 ? t : road.len - t, n * dir);
  }

  travelAngle(road, dir) {
    return Math.atan2(road.dy * dir, road.dx * dir);
  }

  // Where the bike is in its own travel frame, or null in a junction
  bikeOnRoad() {
    const b = this.bike;
    const road = this.net.roadAt(b.x, b.y);
    if (!road || this.net.surfaceAt(b.x, b.y) === 'junction') return null;
    const dir = Math.cos(b.heading) * road.dx + Math.sin(b.heading) * road.dy >= 0 ? 1 : -1;
    const p = this.net.project(road, b.x, b.y);
    return { road, dir, t: dir > 0 ? p.t : road.len - p.t, n: p.n * dir };
  }

  // Oriented box; local x runs along `rot`
  addSolid(x, y, w, h, rot) {
    const s = { x, y, hw: w / 2, hh: h / 2, rot };
    this.solids.push(s);
    return s;
  }

  removeSolid(s) {
    this.solids = this.solids.filter((o) => o !== s);
  }

  update(dt) {
    this.hitCooldown -= dt;
    for (const e of this.items) e.update?.(dt);
    this.collideSolids();
  }

  collideSolids() {
    const b = this.bike;
    const r = EVENTS.solidHitRadius;
    for (const s of this.solids) {
      const c = Math.cos(s.rot);
      const sn = Math.sin(s.rot);
      const dx = b.x - s.x;
      const dy = b.y - s.y;
      let lx = dx * c + dy * sn;
      let ly = -dx * sn + dy * c;
      const px = s.hw + r - Math.abs(lx);
      const py = s.hh + r - Math.abs(ly);
      if (px <= 0 || py <= 0) continue;
      if (px < py) lx += Math.sign(lx || 1) * px;
      else ly += Math.sign(ly || 1) * py;
      b.x = s.x + lx * c - ly * sn;
      b.y = s.y + lx * sn + ly * c;
      const hard = Math.abs(b.speed) > 40;
      b.speed = -Math.abs(b.speed) * 0.3;
      if (hard && this.hitCooldown <= 0) {
        this.hitCooldown = 1.2;
        this.game.onCrash(null, { penalty: false });
      }
    }
  }
}

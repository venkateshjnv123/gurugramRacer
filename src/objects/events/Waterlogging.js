import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// A pool at Hero Honda Chowk. In the rain mission it only appears once the rain starts.
export default class Waterlogging {
  constructor(sys) {
    this.sys = sys;
    this.j = sys.net.junction('herohonda');
    this.active = false;
    this.warned = false;
    if (sys.scene.mission.special !== 'rainAlways') this.start();
  }

  start() {
    if (this.active) return;
    this.active = true;
    const { scene } = this.sys;
    const { x, y } = this.j;
    const R = EVENTS.waterRadius;
    const g = scene.add.graphics().setDepth(7).setAlpha(0);
    g.fillStyle(0x3f7fbf, 0.75).fillEllipse(x, y, R * 2, R * 1.8);
    g.fillStyle(0x5fa0df, 0.6).fillEllipse(x - 20, y - 10, R * 1.4, R * 1.2);
    g.lineStyle(3, 0xbfe0ff, 0.6).strokeEllipse(x + 40, y + 20, R * 0.6, R * 0.4).strokeEllipse(x - 60, y - 30, R * 0.5, R * 0.3);
    scene.tweens.add({ targets: g, alpha: 1, duration: 3000 });

    this.splash = scene.add.particles(0, 0, 'dot', {
      speed: { min: 40, max: 120 }, lifespan: 400, scale: { start: 0.5, end: 0 },
      tint: 0x9fd3ff, frequency: 40, quantity: 2, emitting: false,
    }).setDepth(11);
    this.splash.startFollow(this.sys.bike.sprite);
    this.sys.traffic.slowZones.push({ x, y, r: R, f: 0.3 });
  }

  update() {
    const b = this.sys.bike;
    if (!this.active) {
      b.speedMultiplier = 1;
      return;
    }
    const inside = Math.hypot(b.x - this.j.x, b.y - this.j.y) < EVENTS.waterRadius;
    b.speedMultiplier = inside ? EVENTS.waterSpeed : 1;
    this.splash.emitting = inside && Math.abs(b.speed) > 10;
    if (inside && !this.warned) {
      this.warned = true;
      this.sys.toast(LINES.waterlogging);
    }
  }
}

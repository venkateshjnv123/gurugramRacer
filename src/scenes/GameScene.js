import Phaser from 'phaser';
import { WORLD, COLORS, TIME, STARS, PENALTY, TRAFFIC } from '../config.js';
import { MISSIONS } from '../data/missions.js';
import { UI, FAIL_REASON, CRASH, HORN } from '../data/jokes.js';
import RoadNet from '../systems/RoadNet.js';
import MapRenderer from '../systems/MapRenderer.js';
import Bike from '../objects/Bike.js';
import TrafficSystem from '../systems/TrafficSystem.js';
import EventSystem from '../systems/EventSystem.js';
import Specials from '../systems/Specials.js';

const WIN_RADIUS = 80;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.mission = MISSIONS.find((m) => m.id === data?.missionId) ?? MISSIONS[0];
  }

  create() {
    const m = this.mission;
    this.net = new RoadNet();
    new MapRenderer(this, this.net);

    this.from = this.net.junction(m.from);
    this.target = this.net.junction(m.to);
    this.route = this.net.shortestPath(m.from, m.to);
    const first = this.net.junction(this.route.ids[1]);
    this.bike = new Bike(this, this.net, this.from.x, this.from.y,
      Math.atan2(first.y - this.from.y, first.x - this.from.x));

    this.traffic = new TrafficSystem(this, this.net, this.bike);
    this.hornCooldown = 0;

    this.limit = (m.minutes * 60) / TIME.scale; // real seconds
    this.elapsed = 0;
    this.over = false;
    this.warnedLow = false;

    this.eventSys = new EventSystem(this);
    this.specials = new Specials(this);

    this.marker = this.add.image(this.target.x, this.target.y, 'target').setDepth(8);
    this.tweens.add({ targets: this.marker, scale: 1.25, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    this.add.text(this.target.x, this.target.y + 75, UI.reachHere, {
      fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#2ecc71', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(8);

    const cam = this.cameras.main;
    cam.setBackgroundColor(COLORS.ground);
    cam.setBounds(0, 0, WORLD.width, WORLD.height);
    cam.startFollow(this.bike.sprite, true, 0.12, 0.12);

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SHIFT,SPACE,ESC,M');

    this.scene.launch('HUD');
    this.events.once('shutdown', () => this.scene.stop('HUD'));
    this.time.delayedCall(300, () => {
      this.toast(m.brief);
      this.toast(UI.start(this.from.name, this.target.name));
    });

    if (import.meta.env.DEV) window.__game = this;
  }

  get timeLeft() {
    return Math.max(0, this.limit - this.elapsed);
  }

  toast(text) {
    this.events.emit('toast', text);
  }

  // Lose real seconds off the clock
  penalize(realSeconds, text) {
    this.elapsed += realSeconds;
    this.toast(text ? `${text}  ${UI.penalty(realSeconds * TIME.scale)}` : UI.penalty(realSeconds * TIME.scale));
  }

  // Hit a vehicle (penalty) or a cow/barrier (no penalty). Either way the cake suffers.
  onCrash(npc, { penalty = true } = {}) {
    if (this.over) return;
    this.cameras.main.shake(150, 0.008);
    if (penalty) this.penalize(PENALTY.crash, Phaser.Utils.Array.GetRandom(CRASH));
    this.events.emit('crash');
  }

  honk() {
    const ring = this.add.image(this.bike.x, this.bike.y, 'ring').setDepth(11).setScale(0.3);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
    const result = this.traffic.honk();
    if (result === 'miracle') this.toast(HORN.miracle);
    else if (result === 'ignored' && Math.random() < 0.35) this.toast(Phaser.Utils.Array.GetRandom(HORN.ignored));
  }

  readInput() {
    const k = this.keys;
    return {
      up: k.UP.isDown || k.W.isDown,
      down: k.DOWN.isDown || k.S.isDown,
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      brake: k.SHIFT.isDown,
    };
  }

  update(time, delta) {
    if (this.over) return;
    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += dt;
    this.bike.update(dt, this.readInput());
    this.traffic.update(dt);
    this.eventSys.update(dt);
    this.specials.update(dt);
    if (this.over) return;

    this.hornCooldown -= dt;
    if (this.keys.SPACE.isDown && this.hornCooldown <= 0) {
      this.hornCooldown = TRAFFIC.hornCooldown;
      this.honk();
    }

    if (!this.warnedLow && this.timeLeft * TIME.scale < 120) {
      this.warnedLow = true;
      this.toast(UI.timeLow);
    }

    if (Math.hypot(this.bike.x - this.target.x, this.bike.y - this.target.y) < WIN_RADIUS) {
      this.finish(true);
    } else if (this.timeLeft <= 0) {
      this.finish(false, 'time');
    }
  }

  finish(win, reason) {
    if (this.over) return;
    this.over = true;
    const leftFrac = this.timeLeft / this.limit;
    let stars = 0;
    if (win) stars = leftFrac > STARS.three ? 3 : leftFrac > STARS.two ? 2 : 1;
    this.time.delayedCall(win ? 600 : 300, () => {
      this.scene.start('Result', {
        missionId: this.mission.id,
        win,
        reason: win ? null : FAIL_REASON[reason],
        taken: Math.round(Math.min(this.elapsed, this.limit) * TIME.scale), // game seconds
        stars,
        extra: this.specials.resultLines(win),
      });
    });
  }
}

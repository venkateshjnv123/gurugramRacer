import Phaser from 'phaser';
import { BIKE, WORLD, TIME } from '../config.js';
import { UI } from '../data/jokes.js';
import { formatClock, formatDuration } from '../systems/Clock.js';

const FONT = 'sans-serif';
const MINI_W = 260;

// Runs on top of GameScene and reads its state every frame.
export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    this.g = this.scene.get('Game');
    const m = this.g.mission;
    const style = (size, color = '#ffffff') => ({
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color,
      stroke: '#000000', strokeThickness: 4,
    });

    this.titleText = this.add.text(16, 14, m.title, style(20));
    this.clockText = this.add.text(16, 42, '', style(18, '#dddddd'));
    this.leftText = this.add.text(16, 66, '', style(30));
    this.speedText = this.add.text(0, 14, '', style(30)).setOrigin(1, 0);

    this.toasts = [];
    this.g.events.on('toast', this.addToast, this);

    this.arrow = this.add.image(0, 0, 'arrow').setVisible(false);

    this.mini = { scale: MINI_W / WORLD.width, h: (MINI_W * WORLD.height) / WORLD.width };
    this.miniStatic = this.add.graphics();
    this.miniDots = this.add.graphics();

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.g.events.off('toast', this.addToast, this);
    });
  }

  layout() {
    const { width, height } = this.scale;
    this.speedText.setX(width - 16);
    this.mini.x = width - MINI_W - 16;
    this.mini.y = height - this.mini.h - 16;
    this.drawMiniStatic();
    this.layoutToasts();
  }

  miniPoint(x, y) {
    return { x: this.mini.x + x * this.mini.scale, y: this.mini.y + y * this.mini.scale };
  }

  drawMiniStatic() {
    const g = this.miniStatic.clear();
    const { x, y, h } = this.mini;
    g.fillStyle(0x000000, 0.55).fillRect(x - 6, y - 6, MINI_W + 12, h + 12);
    for (const r of this.g.net.roads) {
      const a = this.miniPoint(r.a.x, r.a.y);
      const b = this.miniPoint(r.b.x, r.b.y);
      g.lineStyle(r.type === 'highway' ? 4 : r.type === 'main' ? 3 : 2, r.type === 'gali' ? 0x9c7a4a : 0xcccccc, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  addToast(text) {
    const t = this.add.text(this.scale.width / 2, 0, text, {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 14, y: 8 },
      align: 'center', wordWrap: { width: Math.min(700, this.scale.width - 40) },
    }).setOrigin(0.5, 0);
    this.toasts.push(t);
    if (this.toasts.length > 4) this.removeToast(this.toasts[0]);
    this.layoutToasts();
    this.time.delayedCall(2500, () => {
      this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => this.removeToast(t) });
    });
  }

  removeToast(t) {
    this.toasts = this.toasts.filter((x) => x !== t);
    t.destroy();
    this.layoutToasts();
  }

  layoutToasts() {
    let y = 16;
    for (const t of this.toasts) {
      t.setPosition(this.scale.width / 2, y);
      y += t.height + 8;
    }
  }

  update() {
    const g = this.g;
    if (!g || !g.bike) return;
    const gameElapsed = g.elapsed * TIME.scale;
    const gameLeft = g.timeLeft * TIME.scale;

    this.clockText.setText(formatClock(g.mission.startsAt, gameElapsed));
    this.leftText.setText(UI.left(formatDuration(gameLeft)));
    this.leftText.setColor(gameLeft < 120 ? '#ff4d4d' : '#ffffff');
    this.speedText.setText(`${Math.round(Math.abs(g.bike.speed) * BIKE.kmhPerPx)} km/h`);

    this.updateArrow();
    this.updateMiniDots();
  }

  // Points at the destination when it's off screen
  updateArrow() {
    const g = this.g;
    const cam = g.cameras.main;
    const view = cam.worldView;
    const t = g.target;
    const visible = view.contains(t.x, t.y);
    this.arrow.setVisible(!visible && !g.over);
    if (visible) return;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const angle = this.arrowAngle(Math.atan2(t.y - g.bike.y, t.x - g.bike.x));
    // push to the screen edge along that angle
    const margin = 50;
    const hw = cx - margin;
    const hh = cy - margin;
    const k = Math.min(hw / Math.abs(Math.cos(angle) || 1e-6), hh / Math.abs(Math.sin(angle) || 1e-6));
    this.arrow.setPosition(cx + Math.cos(angle) * k, cy + Math.sin(angle) * k).setRotation(angle);
  }

  // Hook for events that lie about direction (Gaaglu Maps)
  arrowAngle(trueAngle) {
    return trueAngle;
  }

  updateMiniDots() {
    const g = this.g;
    const d = this.miniDots.clear();
    const t = this.miniPoint(g.target.x, g.target.y);
    const pulse = 4 + Math.sin(this.time.now / 150) * 1.5;
    d.fillStyle(0x2ecc71, 1).fillCircle(t.x, t.y, pulse + 2);
    const b = this.miniPoint(g.bike.x, g.bike.y);
    d.fillStyle(0xff3b3b, 1).fillCircle(b.x, b.y, 4);
  }
}

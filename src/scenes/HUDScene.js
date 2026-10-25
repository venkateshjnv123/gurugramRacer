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
    this.barGfx = this.add.graphics();
    this.barText = this.add.text(16, 110, '', style(18));

    this.rainTint = this.add.rectangle(0, 0, 10, 10, 0x1a2a4a, 0.25).setOrigin(0).setVisible(false).setDepth(-2);
    this.rain = null;
    this.g.events.on('rain', this.startRain, this);

    this.toasts = [];
    this.g.events.on('toast', this.addToast, this);

    this.arrow = this.add.image(0, 0, 'arrow').setVisible(false);

    this.mini = { scale: MINI_W / WORLD.width, h: (MINI_W * WORLD.height) / WORLD.width };
    this.miniStatic = this.add.graphics();
    this.miniDots = this.add.graphics();

    this.pause = this.add.container(0, 0).setVisible(false).setDepth(100);
    this.pauseBg = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.7).setOrigin(0);
    this.pauseTitle = this.add.text(0, 0, UI.pauseTitle, style(48)).setOrigin(0.5);
    this.pauseHint = this.add.text(0, 0, UI.pauseHint, style(20, '#dddddd')).setOrigin(0.5);
    this.pause.add([this.pauseBg, this.pauseTitle, this.pauseHint]);
    // Esc is handled here only (both scenes hear the key; one owner avoids pause→resume in one press)
    const kb = this.input.keyboard;
    kb.on('keydown-ESC', () => {
      if (this.pause.visible) this.resumeGame();
      else if (!this.g.over) this.pauseGame();
    });
    kb.on('keydown-R', () => this.pause.visible && this.g.scene.restart({ missionId: m.id }));
    kb.on('keydown-Q', () => {
      if (!this.pause.visible) return;
      this.scene.stop('Game');
      this.scene.start('Menu', { selected: 0 });
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.g.events.off('toast', this.addToast, this);
      this.g.events.off('rain', this.startRain, this);
    });
  }

  layout() {
    const { width, height } = this.scale;
    this.speedText.setX(width - 16);
    this.mini.x = width - MINI_W - 16;
    this.mini.y = height - this.mini.h - 16;
    this.rainTint.setSize(width, height);
    this.pauseBg.setSize(width, height);
    this.pauseTitle.setPosition(width / 2, height / 2 - 30);
    this.pauseHint.setPosition(width / 2, height / 2 + 30);
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

  pauseGame() {
    this.g.scene.pause();
    this.pause.setVisible(true);
  }

  resumeGame() {
    this.pause.setVisible(false);
    this.g.scene.resume();
  }

  startRain() {
    this.rainTint.setVisible(true);
    this.rain = this.add.particles(0, 0, 'drop', {
      x: { min: 0, max: 4000 }, y: -20, lifespan: 900, speedY: { min: 700, max: 900 }, speedX: -120,
      rotate: 8, alpha: { start: 0.7, end: 0.3 }, frequency: 8, quantity: 4,
    });
    this.rain.setDepth(-1);
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

    this.updateBar();
    this.updateArrow();
    this.updateMiniDots();
  }

  updateBar() {
    const bar = this.g.specials?.bar();
    this.barGfx.clear();
    this.barText.setVisible(!!bar);
    if (!bar) return;
    const frac = Math.max(0, Math.min(1, bar.frac));
    this.barText.setText(bar.text);
    this.barGfx.fillStyle(0x000000, 0.6).fillRect(16, 136, 204, 14);
    this.barGfx.fillStyle(bar.color, 1).fillRect(18, 138, 200 * frac, 10);
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

  // Gaaglu Maps: while active, the arrow confidently points at the nearest jam instead
  arrowAngle(trueAngle) {
    const g = this.g;
    if (!(g.eventSys?.gaagluUntil > g.elapsed)) return trueAngle;
    let jam = null;
    let best = Infinity;
    for (const j of g.net.junctions.values()) {
      if (!j.hot || j === g.target) continue;
      const d = Math.hypot(j.x - g.bike.x, j.y - g.bike.y);
      if (d > 300 && d < best) {
        best = d;
        jam = j;
      }
    }
    return jam ? Math.atan2(jam.y - g.bike.y, jam.x - g.bike.x) : trueAngle + Math.PI / 2;
  }

  updateMiniDots() {
    const g = this.g;
    const d = this.miniDots.clear();
    const t = this.miniPoint(g.target.x, g.target.y);
    const pulse = 4 + Math.sin(this.time.now / 150) * 1.5;
    d.fillStyle(0x2ecc71, 1).fillCircle(t.x, t.y, pulse + 2);
    for (const mk of g.eventSys?.marks ?? []) {
      const p = this.miniPoint(mk.x, mk.y);
      if (mk.cross) d.lineStyle(3, mk.color, 1).lineBetween(p.x - 5, p.y - 5, p.x + 5, p.y + 5).lineBetween(p.x - 5, p.y + 5, p.x + 5, p.y - 5);
      else d.fillStyle(mk.color, 1).fillCircle(p.x, p.y, 4);
    }
    const b = this.miniPoint(g.bike.x, g.bike.y);
    d.fillStyle(0xff3b3b, 1).fillCircle(b.x, b.y, 4);
  }
}

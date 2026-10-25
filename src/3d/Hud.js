import { BIKE, WORLD, TIME } from '../config.js';
import { UI } from '../data/jokes.js';
import { formatClock, formatDuration } from '../systems/Clock.js';
import { CAMERA_MODES } from './ChaseCamera.js';

const MINI_W = 230;
const TOAST_TIME = 2.8;

// HTML overlay during a mission: clock, timer, special bar, speed, GPS arrow, toasts, minimap.
export default class Hud {
  constructor(net) {
    this.net = net;
    this.el = document.getElementById('hud');
    this.el.innerHTML = `
      <div class="panel tl">
        <div id="h-title"></div>
        <div id="h-clock" class="dim"></div>
        <div id="h-left" class="big"></div>
        <div id="h-bar" class="bar"><div id="h-bar-text"></div><div class="track"><div id="h-bar-fill"></div></div></div>
      </div>
      <div class="panel tr"><div id="h-speed" class="big"></div><div id="h-cam" class="dim"></div></div>
      <div id="gps"><svg viewBox="0 0 40 40" width="64" height="64"><path d="M20 3 L34 34 L20 26 L6 34 Z" fill="#2ecc71" stroke="#fff" stroke-width="2.5"/></svg><div id="h-next"></div></div>
      <div id="toasts"></div>
      <canvas id="mini" width="${MINI_W}" height="${Math.round((MINI_W * WORLD.height) / WORLD.width)}"></canvas>
      <div class="panel bl">${UI.controls} · C = camera</div>`;
    this.mini = document.getElementById('mini');
    this.s = MINI_W / WORLD.width;
    this.toasts = [];
    this.gpsTimer = 0;
    this.drawMiniBase();
    this.hide();
  }

  show() {
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
    for (const t of this.toasts) t.el.remove();
    this.toasts = [];
  }

  start(game) {
    this.game = game;
    this.gpsTimer = 0;
    this.show();
    game.on('toast', (text) => this.toast(text));
  }

  drawMiniBase() {
    const c = document.createElement('canvas');
    c.width = this.mini.width;
    c.height = this.mini.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, c.width, c.height);
    for (const r of this.net.roads) {
      ctx.strokeStyle = r.type === 'gali' ? '#9c7a4a' : '#cccccc';
      ctx.lineWidth = r.type === 'highway' ? 4 : r.type === 'main' ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(r.a.x * this.s, r.a.y * this.s);
      ctx.lineTo(r.b.x * this.s, r.b.y * this.s);
      ctx.stroke();
    }
    this.miniBase = c;
  }

  set(id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
  }

  toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.getElementById('toasts').appendChild(el);
    this.toasts.push({ el, age: 0 });
    if (this.toasts.length > 4) this.toasts.shift().el.remove();
  }

  update(dt, chase) {
    const g = this.game;
    if (!g) return;
    const b = g.bike;
    const gameElapsed = g.elapsed * TIME.scale;
    const gameLeft = g.timeLeft * TIME.scale;
    this.set('h-title', g.mission.title);
    this.set('h-clock', formatClock(g.mission.startsAt, gameElapsed));
    this.set('h-left', UI.left(formatDuration(gameLeft)));
    document.getElementById('h-left').style.color = gameLeft < 120 ? '#ff4d4d' : '#fff';
    this.set('h-speed', `${Math.round(Math.abs(b.speed) * BIKE.kmhPerPx)} km/h`);
    this.set('h-cam', `Camera: ${CAMERA_MODES[chase.mode].name}`);

    const bar = g.specials.bar();
    document.getElementById('h-bar').style.display = bar ? 'block' : 'none';
    if (bar) {
      this.set('h-bar-text', bar.text);
      const fill = document.getElementById('h-bar-fill');
      fill.style.width = `${Math.max(0, Math.min(1, bar.frac)) * 100}%`;
      fill.style.background = bar.color;
    }

    // GPS: up = straight ahead
    this.gpsTimer -= dt;
    if (this.gpsTimer <= 0) {
      this.gpsTimer = 0.3;
      this.next = g.gpsTarget();
      this.set('h-next', this.next === g.target ? g.target.name : `→ ${this.next.name}`);
    }
    const ang = Math.atan2(this.next.y - b.y, this.next.x - b.x) - b.heading;
    document.querySelector('#gps svg').style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;

    for (const t of this.toasts) {
      t.age += dt;
      if (t.age > TOAST_TIME) t.el.style.opacity = String(Math.max(0, 1 - (t.age - TOAST_TIME) / 0.4));
    }
    this.toasts = this.toasts.filter((t) => {
      if (t.age < TOAST_TIME + 0.4) return true;
      t.el.remove();
      return false;
    });

    this.drawMini(g);
  }

  drawMini(g) {
    const ctx = this.mini.getContext('2d');
    const s = this.s;
    ctx.clearRect(0, 0, this.mini.width, this.mini.height);
    ctx.drawImage(this.miniBase, 0, 0);
    for (const mk of g.eventSys.marks) {
      if (mk.cross) {
        ctx.strokeStyle = mk.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mk.x * s - 5, mk.y * s - 5);
        ctx.lineTo(mk.x * s + 5, mk.y * s + 5);
        ctx.moveTo(mk.x * s - 5, mk.y * s + 5);
        ctx.lineTo(mk.x * s + 5, mk.y * s - 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = mk.color;
        ctx.beginPath();
        ctx.arc(mk.x * s, mk.y * s, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const t = g.target;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(t.x * s, t.y * s, 5 + Math.sin(performance.now() / 150) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(g.bike.x * s, g.bike.y * s);
    ctx.rotate(g.bike.heading);
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, 4.5);
    ctx.lineTo(-5, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

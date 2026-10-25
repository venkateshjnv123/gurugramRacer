import { BIKE, WORLD } from '../config.js';

const MINI_W = 220;

// HTML overlay: route info, speedometer, GPS arrow, minimap, messages.
export default class Hud3D {
  constructor(net, target) {
    this.net = net;
    this.target = target;
    this.el = document.getElementById('hud');
    this.el.innerHTML = `
      <div class="panel tl"><div id="route"></div><div id="dist" class="big"></div><div id="next"></div></div>
      <div class="panel tr"><div id="speed" class="big"></div><div id="cam"></div></div>
      <div id="gps"><svg viewBox="0 0 40 40" width="64" height="64"><path d="M20 3 L34 34 L20 26 L6 34 Z" fill="#2ecc71" stroke="#fff" stroke-width="2.5"/></svg></div>
      <canvas id="mini" width="${MINI_W}" height="${Math.round((MINI_W * WORLD.height) / WORLD.width)}"></canvas>
      <div class="panel bl">↑↓←→ / WASD ride · Shift brake · C camera · R restart</div>
      <div id="msg"></div>`;
    this.mini = document.getElementById('mini');
    this.miniScale = MINI_W / WORLD.width;
    this.drawMiniBase();
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
      ctx.moveTo(r.a.x * this.miniScale, r.a.y * this.miniScale);
      ctx.lineTo(r.b.x * this.miniScale, r.b.y * this.miniScale);
      ctx.stroke();
    }
    this.miniBase = c;
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
  }

  message(html) {
    const el = document.getElementById('msg');
    el.innerHTML = html;
    el.style.display = html ? 'block' : 'none';
  }

  // nextPoint: where the GPS arrow should point (next junction on the route)
  update(bike, { from, nextJunction, nextPoint, camName, elapsed }) {
    const t = this.target;
    const dist = Math.hypot(t.x - bike.x, t.y - bike.y);
    this.setText('route', `Free ride: ${from.name} → ${t.name}`);
    this.setText('dist', `${(dist / 1000).toFixed(1)} km · ${Math.floor(elapsed)}s`);
    this.setText('next', nextJunction ? `Next: ${nextJunction.name}` : '');
    this.setText('speed', `${Math.round(Math.abs(bike.speed) * BIKE.kmhPerPx)} km/h`);
    this.setText('cam', `Camera: ${camName}`);

    // arrow relative to where the bike faces: up = straight ahead
    const ang = Math.atan2(nextPoint.y - bike.y, nextPoint.x - bike.x) - bike.heading;
    document.querySelector('#gps svg').style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;

    const ctx = this.mini.getContext('2d');
    ctx.clearRect(0, 0, this.mini.width, this.mini.height);
    ctx.drawImage(this.miniBase, 0, 0);
    const s = this.miniScale;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(t.x * s, t.y * s, 5 + Math.sin(performance.now() / 150) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // bike as a heading triangle
    ctx.save();
    ctx.translate(bike.x * s, bike.y * s);
    ctx.rotate(bike.heading);
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

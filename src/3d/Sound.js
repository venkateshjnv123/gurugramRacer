import { BIKE } from '../config.js';
import { load, save } from '../systems/Save.js';

// Every sound is synthesised with Web Audio — no audio files. Listens to core Game events
// and reads bike/traffic state each frame for the engine and the ambient honking.
// The AudioContext can only start after a key press or click (browser autoplay rules).

const HORNS = {
  // [frequencies], wave, length (s), repeats
  bike: [[415, 520], 'square', 0.28, 1],
  car: [[440, 554], 'square', 0.32, 1],
  auto: [[820, 980], 'square', 0.12, 2],
  thar: [[349, 440, 523], 'sawtooth', 0.55, 1],
  bus: [[196, 247], 'sawtooth', 0.8, 1],
  truck: [[175, 220], 'sawtooth', 0.9, 1],
};

export default class Sound {
  constructor() {
    this.enabled = load('sound', true);
    this.ctx = null;
    this.game = null;
    this.offs = [];
    this.hornTimer = 1;
  }

  // Call from a user gesture.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.8 : 0;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.noise = this.makeNoise();
      if (this.game) this.startEngine();
    }
    if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    save('sound', this.enabled);
    if (this.master) this.master.gain.setTargetAtTime(this.enabled ? 0.8 : 0, this.ctx.currentTime, 0.05);
    return this.enabled;
  }

  pause(on) {
    this.paused = on;
    if (!this.ctx) return;
    if (on) this.ctx.suspend();
    else this.ctx.resume();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- mission wiring

  startMission(game) {
    this.endMission();
    this.game = game;
    this.lastSignal = null;
    this.offs = [
      game.on('crash', (npc) => this.crash(!!npc)),
      game.on('pothole', () => this.thump(0.5)),
      game.on('honk', () => this.horn('bike')),
      game.on('redLight', () => this.camera()),
      game.on('rain', () => this.startRain()),
      game.on('finish', (r) => (r.win ? this.jingle() : this.wahWah())),
      game.on('sfx', (name) => this.sfx(name)),
    ];
    if (this.ctx) this.startEngine();
  }

  endMission() {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.game = null;
    this.stopEngine();
    this.stopRain();
  }

  sfx(name) {
    if (name === 'splash') this.splash();
    else if (name === 'stall') this.sputter();
    else if (name === 'moo') this.moo();
    else if (name === 'whistle') this.whistle();
    else if (name === 'tharHorn') this.horn('thar', { gain: 1.2 });
    else if (name === 'autoHorn') this.horn('auto');
  }

  // ---- per frame

  update(dt, input = {}) {
    const g = this.game;
    if (!this.ctx || !g || this.paused) return;
    const b = g.bike;
    const t = this.ctx.currentTime;
    const frac = Math.min(1, Math.abs(b.speed) / BIKE.maxSpeed);
    const dead = b.stall > 0 || g.over;
    const throttle = input.up && !dead ? 1 : 0;

    if (this.engine) {
      // soft low hum under everything else: pitch follows speed, a gentle putt-putt on top
      const f = 38 + frac * 70;
      this.engine.osc.frequency.setTargetAtTime(f, t, 0.15);
      this.engine.sub.frequency.setTargetAtTime(f / 2, t, 0.15);
      this.engine.lfo.frequency.setTargetAtTime(6 + frac * 14, t, 0.15);
      this.engine.filter.frequency.setTargetAtTime(160 + frac * 260 + throttle * 80, t, 0.2);
      this.engine.gain.gain.setTargetAtTime(dead ? 0 : 0.018 + frac * 0.022 + throttle * 0.008, t, dead ? 0.05 : 0.25);
    }

    // signal turned green while you're waiting at it
    const sig = g.signalAhead();
    if (sig && sig.dist < 300 && this.lastSignal && this.lastSignal !== 'green' && sig.state === 'green') this.blip(880, 0.12, 0.15);
    this.lastSignal = sig?.state ?? null;

    // ambient honking: more of it in jams and when someone's stuck behind you
    this.hornTimer -= dt;
    if (this.hornTimer <= 0 && !g.over) {
      const near = g.traffic.npcs.filter((n) => Math.hypot(n.x - b.x, n.y - b.y) < 600);
      const jammed = near.filter((n) => n.speed < 20).length;
      const behind = near.some((n) => {
        const dx = b.x - n.x;
        const dy = b.y - n.y;
        const fwd = dx * Math.cos(n.heading) + dy * Math.sin(n.heading);
        return fwd > 0 && fwd < 120 && Math.abs(dx * Math.sin(n.heading) - dy * Math.cos(n.heading)) < 25 && n.speed < n.baseSpeed * 0.6;
      });
      const rate = 0.25 + jammed * 0.18 + (behind ? 1.5 : 0); // honks per second
      this.hornTimer = Math.min(4, -Math.log(1 - Math.random()) / rate);
      const who = near[Math.floor(Math.random() * near.length)];
      if (who) this.horn(who.kind, { x: who.x, y: who.y });
    }
  }

  // ---- building blocks

  // stereo position + distance fade for a world point (relative to the bike)
  place(x, y) {
    const b = this.game?.bike;
    if (!b || x === undefined) return { pan: 0, vol: 1 };
    const dx = x - b.x;
    const dy = y - b.y;
    const side = dx * Math.sin(b.heading) - dy * Math.cos(b.heading); // + = left
    const d = Math.hypot(dx, dy);
    return { pan: Math.max(-0.9, Math.min(0.9, -side / 250)), vol: 1 / (1 + d / 180) };
  }

  out(pan = 0) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.master);
    return p;
  }

  env(param, t, peak, attack, hold, release) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setValueAtTime(peak, t + attack + hold);
    param.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  tone(freq, { type = 'sine', at = 0, dur = 0.2, gain = 0.2, to = null, pan = 0, attack = 0.01, release = 0.08, filter = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    this.env(g.gain, t, gain, attack, Math.max(0, dur - attack), release);
    let node = o.connect(g);
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.freq;
      f.Q.value = filter.q ?? 1;
      node = node.connect(f);
    }
    node.connect(this.out(pan));
    o.start(t);
    o.stop(t + dur + release + 0.05);
    return o;
  }

  burst({ at = 0, dur = 0.2, gain = 0.3, type = 'lowpass', freq = 1000, to = null, q = 1, pan = 0, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g.gain, t, gain, attack, 0, dur);
    src.connect(f).connect(g).connect(this.out(pan));
    src.start(t, Math.random());
    src.stop(t + dur + 0.1);
  }

  blip(freq, dur = 0.06, gain = 0.12) {
    this.tone(freq, { dur, gain, release: 0.04 });
  }

  // ---- sounds

  horn(kind, { x, y, gain = 1 } = {}) {
    if (!this.ctx) return;
    const [freqs, type, len, reps] = HORNS[kind] ?? HORNS.car;
    const { pan, vol } = this.place(x, y);
    const v = (kind === 'bike' ? 0.09 : 0.07) * vol * gain;
    if (v < 0.004) return;
    for (let r = 0; r < reps; r++) {
      for (const f of freqs) {
        this.tone(f, { type, at: r * len * 1.5, dur: len, gain: v, pan, attack: 0.015, release: 0.06, filter: { type: 'lowpass', freq: 2600 } });
      }
    }
  }

  crash(vehicle) {
    this.burst({ dur: 0.35, gain: 0.5, freq: 1400, to: 200 });
    this.tone(130, { to: 40, dur: 0.3, gain: 0.45, type: 'sine' });
    if (vehicle) this.burst({ at: 0.02, dur: 0.18, gain: 0.25, type: 'bandpass', freq: 2600, q: 6 }); // metal
  }

  thump(gain = 0.4) {
    this.tone(95, { to: 40, dur: 0.12, gain: gain * 0.6 });
    this.burst({ dur: 0.08, gain: gain * 0.3, freq: 400 });
  }

  splash() {
    this.burst({ dur: 0.7, gain: 0.35, type: 'bandpass', freq: 600, to: 2200, q: 0.8, attack: 0.02 });
    this.burst({ at: 0.1, dur: 0.5, gain: 0.15, type: 'highpass', freq: 3000 });
  }

  sputter() {
    for (let i = 0; i < 4; i++) this.tone(55 - i * 6, { type: 'sawtooth', at: i * 0.16, dur: 0.08, gain: 0.18 - i * 0.03, filter: { type: 'lowpass', freq: 500 } });
    this.burst({ at: 0.7, dur: 0.15, gain: 0.2, freq: 300 }); // phut
  }

  moo() {
    this.tone(165, { type: 'sawtooth', to: 110, dur: 1.1, gain: 0.16, attack: 0.25, release: 0.3, filter: { type: 'lowpass', freq: 700, q: 4 } });
  }

  whistle() {
    [[0, 0.22], [0.3, 0.6]].forEach(([at, dur]) => {
      const o = this.tone(2900, { at, dur, gain: 0.08, attack: 0.01 });
      if (!o) return;
      const lfo = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      lfo.frequency.value = 32;
      depth.gain.value = 140;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(this.ctx.currentTime + at);
      lfo.stop(this.ctx.currentTime + at + dur + 0.2);
    });
  }

  camera() {
    this.burst({ dur: 0.03, gain: 0.35, type: 'highpass', freq: 2000 });
    this.burst({ at: 0.09, dur: 0.03, gain: 0.3, type: 'highpass', freq: 2500 });
    this.tone(1760, { at: 0.15, dur: 0.15, gain: 0.08, type: 'square' });
  }

  jingle() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { type: 'square', at: i * 0.11, dur: 0.1, gain: 0.07 }));
    [523, 659, 784].forEach((f) => this.tone(f * 2, { type: 'triangle', at: 0.48, dur: 0.5, gain: 0.08, release: 0.3 }));
  }

  wahWah() {
    [392, 370, 349].forEach((f, i) => this.tone(f, { type: 'sawtooth', at: i * 0.38, dur: 0.3, gain: 0.08, filter: { type: 'lowpass', freq: 1200 } }));
    this.tone(330, { type: 'sawtooth', at: 1.14, dur: 0.9, to: 300, gain: 0.08, release: 0.3, filter: { type: 'lowpass', freq: 1000 } });
  }

  ui(kind) {
    if (kind === 'move') this.blip(660, 0.04, 0.06);
    else if (kind === 'select') {
      this.blip(880, 0.06, 0.08);
      this.tone(1320, { at: 0.07, dur: 0.08, gain: 0.08 });
    }
  }

  // ---- loops

  startEngine() {
    if (this.engine || !this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 38;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 19;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.8;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.5;
    // putt-putt: slow tremolo on the hum
    const putt = ctx.createGain();
    putt.gain.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const depth = ctx.createGain();
    depth.gain.value = 0.3;
    lfo.connect(depth).connect(putt.gain);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    sub.connect(subGain).connect(filter);
    filter.connect(putt).connect(gain).connect(this.master);
    osc.start();
    sub.start();
    lfo.start();
    this.engine = { osc, sub, lfo, filter, gain };
  }

  stopEngine() {
    if (!this.engine) return;
    const { osc, sub, lfo, gain } = this.engine;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0, t, 0.05);
    for (const o of [osc, sub, lfo]) o.stop(t + 0.3);
    this.engine = null;
  }

  startRain() {
    if (this.rain || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.16, this.ctx.currentTime, 1.5);
    src.connect(hp).connect(lp).connect(gain).connect(this.master);
    src.start();
    this.rain = { src, gain };
    this.burst({ dur: 3, gain: 0.5, freq: 140, to: 60, attack: 0.3 }); // thunder
  }

  stopRain() {
    if (!this.rain) return;
    this.rain.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    this.rain.src.stop(this.ctx.currentTime + 0.5);
    this.rain = null;
  }
}

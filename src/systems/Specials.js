import { SPECIALS } from '../config.js';
import { SPECIAL, EVENTS as LINES } from '../data/jokes.js';

// Mission-specific rules: cake meter, chai temperature, guaranteed rain.
export default class Specials {
  constructor(scene) {
    this.scene = scene;
    this.kind = scene.mission.special ?? null;
    this.cake = 100;
    this.chai = SPECIALS.chaiStart;
    this.chaiWarned = false;
    this.raining = false;
    if (this.kind === 'cakeMeter') {
      scene.events.on('crash', this.onCrash, this);
      scene.events.once('shutdown', () => scene.events.off('crash', this.onCrash, this));
    }
  }

  onCrash() {
    this.cake = Math.max(0, this.cake - SPECIALS.cakeHit);
    if (this.cake <= 0) this.scene.finish(false, 'cake');
    else this.scene.toast(SPECIAL.cakeHit);
  }

  update(dt) {
    const s = this.scene;
    if (this.kind === 'chaiTemp') {
      let rate = (SPECIALS.chaiStart - SPECIALS.chaiCold) / (s.limit * SPECIALS.chaiBudget);
      if (Math.abs(s.bike.speed) < 30) rate *= SPECIALS.chaiStuckFactor;
      this.chai -= rate * dt;
      if (!this.chaiWarned && this.chai < SPECIALS.chaiCold + 10) {
        this.chaiWarned = true;
        s.toast(SPECIAL.chaiWarm);
      }
      if (this.chai <= SPECIALS.chaiCold) s.finish(false, 'chai');
    }
    if (this.kind === 'rainAlways' && !this.raining && s.elapsed >= s.limit * SPECIALS.rainAt) {
      this.raining = true;
      s.toast(LINES.rain);
      s.events.emit('rain');
      s.eventSys.items.forEach((e) => e.start?.());
    }
  }

  // HUD bar: { text, frac, color } or null
  bar() {
    if (this.kind === 'cakeMeter') {
      return { text: SPECIAL.cake(this.cake), frac: this.cake / 100, color: this.cake > 40 ? 0xf5a3c7 : 0xff4d4d };
    }
    if (this.kind === 'chaiTemp') {
      const frac = (this.chai - SPECIALS.chaiCold) / (SPECIALS.chaiStart - SPECIALS.chaiCold);
      return { text: SPECIAL.chai(Math.round(this.chai)), frac, color: frac > 0.3 ? 0xe67e22 : 0x5dade2 };
    }
    return null;
  }

  resultLines(win) {
    if (win && this.kind === 'chaiTemp') {
      return [SPECIAL.chaiTip(Math.round((this.chai - SPECIALS.chaiCold) * 4) * 5)];
    }
    if (win && this.kind === 'cakeMeter') return [SPECIAL.cake(this.cake)];
    return [];
  }
}


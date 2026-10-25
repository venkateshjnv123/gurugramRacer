import { SPECIALS } from '../config.js';
import { SPECIAL, EVENTS as LINES } from '../data/jokes.js';

// Mission-specific rules: cake meter, chai temperature, guaranteed rain.
export default class Specials {
  constructor(game) {
    this.game = game;
    this.kind = game.mission.special ?? null;
    this.cake = 100;
    this.chai = SPECIALS.chaiStart;
    this.chaiWarned = false;
    this.raining = false;
    if (this.kind === 'cakeMeter') game.on('crash', () => this.onCrash());
  }

  onCrash() {
    this.cake = Math.max(0, this.cake - SPECIALS.cakeHit);
    if (this.cake <= 0) this.game.finish(false, 'cake');
    else this.game.toast(SPECIAL.cakeHit);
  }

  update(dt) {
    const g = this.game;
    if (this.kind === 'chaiTemp') {
      let rate = (SPECIALS.chaiStart - SPECIALS.chaiCold) / (g.limit * SPECIALS.chaiBudget);
      if (Math.abs(g.bike.speed) < 30) rate *= SPECIALS.chaiStuckFactor;
      this.chai -= rate * dt;
      if (!this.chaiWarned && this.chai < SPECIALS.chaiCold + 10) {
        this.chaiWarned = true;
        g.toast(SPECIAL.chaiWarm);
      }
      if (this.chai <= SPECIALS.chaiCold) g.finish(false, 'chai');
    }
    if (this.kind === 'rainAlways' && !this.raining && g.elapsed >= g.limit * SPECIALS.rainAt) {
      this.raining = true;
      g.toast(LINES.rain);
      g.emit('rain');
      g.eventSys.items.forEach((e) => e.start?.());
    }
  }

  // HUD bar: { text, frac, color } or null
  bar() {
    if (this.kind === 'cakeMeter') {
      return { text: SPECIAL.cake(this.cake), frac: this.cake / 100, color: this.cake > 40 ? '#f5a3c7' : '#ff4d4d' };
    }
    if (this.kind === 'chaiTemp') {
      const frac = (this.chai - SPECIALS.chaiCold) / (SPECIALS.chaiStart - SPECIALS.chaiCold);
      return { text: SPECIAL.chai(Math.round(this.chai)), frac, color: frac > 0.3 ? '#e67e22' : '#5dade2' };
    }
    return null;
  }

  resultLines(win) {
    if (win && this.kind === 'chaiTemp') return [SPECIAL.chaiTip(Math.round((this.chai - SPECIALS.chaiCold) * 4) * 5)];
    if (win && this.kind === 'cakeMeter') return [SPECIAL.cake(this.cake)];
    return [];
  }
}

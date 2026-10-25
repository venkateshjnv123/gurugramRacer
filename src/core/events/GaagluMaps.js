import { EVENTS } from '../../config.js';
import { EVENTS as LINES } from '../../data/jokes.js';

// For a while the GPS arrow confidently points at the nearest jam instead.
export default class GaagluMaps {
  constructor(sys) {
    this.sys = sys;
    this.at = sys.randomTime(EVENTS.gaagluWindow);
  }

  update() {
    const { sys } = this;
    if (this.at !== null && sys.elapsed > this.at) {
      this.at = null;
      sys.gaagluUntil = sys.elapsed + EVENTS.gaagluDuration;
      sys.toast(LINES.gaaglu);
    }
  }
}

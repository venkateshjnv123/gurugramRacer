import { MISSIONS } from '../data/missions.js';
import { JUNCTIONS } from '../data/map.js';
import { UI, ROASTS, PRAISE, LATE } from '../data/jokes.js';
import { formatDuration } from '../systems/Clock.js';
import { getBest, submitBest, worstJunction, load } from '../systems/Save.js';
import { pick } from '../core/rand.js';

const nameOf = (id) => JUNCTIONS.find((j) => j.id === id).name;

// Menu, pause and result overlays (HTML). Callbacks are wired by main.js.
export default class Screens {
  constructor({ onStart, onToggleFog, onToggleSound, soundOn }) {
    this.el = document.getElementById('screens');
    this.onStart = onStart;
    this.onToggleFog = onToggleFog;
    this.onToggleSound = onToggleSound;
    this.soundOn = soundOn;
    this.selected = 0;
  }

  hide() {
    this.el.innerHTML = '';
    this.el.style.display = 'none';
    this.current = null;
  }

  show(html, name) {
    this.el.innerHTML = html;
    this.el.style.display = 'flex';
    this.current = name;
  }

  menu(selected = this.selected) {
    this.selected = selected;
    const items = MISSIONS.map((m, i) => `<button class="mission" data-i="${i}">${i + 1}. ${m.title}</button>`).join('');
    this.show(`
      <div class="card menu">
        <h1>GURUGRAM RACER</h1>
        <div class="tagline">${UI.tagline}</div>
        <div class="missions">${items}</div>
        <div id="brief" class="brief"></div>
        <button id="fog" class="link"></button><br>
        <button id="snd" class="link"></button>
        <div class="hint">${UI.menuHint}<br>${UI.controls} · C = camera</div>
      </div>`, 'menu');
    this.el.querySelectorAll('.mission').forEach((b) => {
      b.addEventListener('mouseenter', () => this.select(Number(b.dataset.i)));
      b.addEventListener('click', () => this.onStart(MISSIONS[Number(b.dataset.i)].id));
    });
    this.el.querySelector('#fog').addEventListener('click', () => this.onToggleFog());
    this.el.querySelector('#snd').addEventListener('click', () => this.onToggleSound());
    this.select(selected);
    this.refreshFog();
    this.refreshSound();
  }

  select(i) {
    this.selected = (i + MISSIONS.length) % MISSIONS.length;
    this.el.querySelectorAll('.mission').forEach((b, j) => b.classList.toggle('on', j === this.selected));
    const m = MISSIONS[this.selected];
    const best = getBest(m.id);
    this.el.querySelector('#brief').innerHTML =
      `<b>${nameOf(m.from)} → ${nameOf(m.to)}</b><br>${m.brief}<br><span class="dim">${best === null ? UI.noBest : UI.best(formatDuration(best))}</span>`;
  }

  refreshFog() {
    const el = this.el.querySelector('#fog');
    if (el) el.textContent = UI.fogToggle(load('ncrFog', false));
  }

  refreshSound() {
    const el = this.el.querySelector('#snd');
    if (el) el.textContent = UI.sound(this.soundOn());
  }

  pause() {
    this.show(`<div class="card"><h2>${UI.pauseTitle}</h2><div class="hint">${UI.pauseHint}</div></div>`, 'pause');
  }

  result(r) {
    const mission = MISSIONS.find((m) => m.id === r.missionId);
    this.lastResult = r;
    const newBest = r.win && submitBest(r.missionId, r.taken);
    const worst = !r.win && worstJunction();
    const lines = [
      `<div class="dim">${mission.title}</div>`,
      `<h2 class="${r.win ? 'win' : 'fail'}">${r.win ? UI.win : UI.fail}</h2>`,
      r.win ? `<div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>` : `<div>${r.reason}</div>`,
      r.win ? `<div>${UI.timeTaken(formatDuration(r.taken))}</div>` : '',
      newBest ? `<div class="gold">${UI.newBest}</div>` : '',
      ...(r.extra ?? []).map((e) => `<div class="extra">${e}</div>`),
      r.lost?.length ? `<div class="late"><b>${LATE.title}</b>${r.lost.slice(0, 4).map((l) => `${LATE.labels[l.cause]}: ${formatDuration(l.seconds)}`).join('<br>')}</div>` : '',
      `<div class="quote">"${pick(r.win ? PRAISE : ROASTS)}"</div>`,
      worst ? `<div class="rage">${UI.rageQuit(nameOf(worst))}</div>` : '',
      `<div class="hint">${UI.retry} · ${UI.next} · <a id="share">${UI.share}</a> · ${UI.menu}</div>`,
      `<div id="status" class="status"></div>`,
    ];
    this.show(`<div class="card ${r.win ? 'wincard' : 'failcard'}">${lines.join('')}</div>`, 'result');
    this.el.querySelector('#share').addEventListener('click', () => this.share());
  }

  async share() {
    const r = this.lastResult;
    const mission = MISSIONS.find((m) => m.id === r.missionId);
    const url = window.location.origin + window.location.pathname;
    const text = r.win
      ? UI.shareWin(formatDuration(r.taken), nameOf(mission.from), nameOf(mission.to), url)
      : UI.shareFail(mission.title, url);
    const status = this.el.querySelector('#status');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = UI.copied;
    } catch {
      status.textContent = UI.copyFailed + url;
    }
  }
}

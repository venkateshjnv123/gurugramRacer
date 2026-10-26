import Game from '../core/Game.js';
import { MISSIONS } from '../data/missions.js';
import { load, save } from '../systems/Save.js';
import World from './World.js';
import Hud from './Hud.js';
import Screens from './Screens.js';
import Sound from './Sound.js';

// App states: menu → playing ⇄ paused → result
const world = new World(document.getElementById('game'));
const hud = new Hud(world.net);
const sound = new Sound();
const screens = new Screens({
  onStart: (id) => play(id),
  onToggleFog: () => toggleFog(),
  onToggleSound: () => toggleSound(),
  soundOn: () => sound.enabled,
});

let state = 'menu';
let game = null;

function showMenu(selected) {
  world.endMission();
  sound.endMission();
  sound.pause(false);
  world.setEnvironment({});
  hud.hide();
  game = null;
  state = 'menu';
  screens.menu(selected);
}

function play(missionId) {
  screens.hide();
  game = new Game(missionId, { props: world.props, net: world.net, fog: load('ncrFog', false) });
  world.startMission(game);
  sound.pause(false);
  sound.startMission(game);
  sound.ui('select');
  hud.hide();
  hud.start(game);
  game.on('finish', (r) => {
    state = 'result';
    screens.result(r);
  });
  state = 'playing';
}

function toggleSound() {
  sound.unlock();
  sound.toggle();
  screens.refreshSound();
}

function toggleFog() {
  save('ncrFog', !load('ncrFog', false));
  screens.refreshFog();
}

const missionIndex = () => MISSIONS.findIndex((m) => m.id === game.mission.id);

// ---- input
const keys = new Set();
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  sound.unlock();
  if (e.code === 'KeyM') toggleSound();
  onKey(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('pointerdown', () => sound.unlock());
window.addEventListener('blur', () => {
  keys.clear();
  if (state === 'playing') pause();
});

function pause() {
  state = 'paused';
  sound.pause(true);
  screens.pause();
}

function onKey(code) {
  if (state === 'menu') {
    if (code === 'ArrowUp' || code === 'KeyW') {
      screens.select(screens.selected - 1);
      sound.ui('move');
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      screens.select(screens.selected + 1);
      sound.ui('move');
    }
    if (code === 'Enter' || code === 'Space') play(MISSIONS[screens.selected].id);
    if (code === 'KeyF') toggleFog();
  } else if (state === 'playing') {
    if (code === 'Escape') pause();
    if (code === 'KeyC') world.chase.cycle();
  } else if (state === 'paused') {
    if (code === 'Escape') {
      state = 'playing';
      sound.pause(false);
      screens.hide();
    }
    if (code === 'KeyR') play(game.mission.id);
    if (code === 'KeyQ') showMenu(missionIndex());
  } else if (state === 'result') {
    if (code === 'KeyR') play(game.mission.id);
    if (code === 'KeyN') play(MISSIONS[(missionIndex() + 1) % MISSIONS.length].id);
    if (code === 'KeyS') screens.share();
    if (code === 'Escape') showMenu(missionIndex());
  }
}

const input = () => (import.meta.env.DEV && window.__input?.()) || ({
  up: keys.has('ArrowUp') || keys.has('KeyW'),
  down: keys.has('ArrowDown') || keys.has('KeyS'),
  left: keys.has('ArrowLeft') || keys.has('KeyA'),
  right: keys.has('ArrowRight') || keys.has('KeyD'),
  brake: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  horn: keys.has('Space'),
});

// ---- loop
function tick(dt, render = true) {
  const keysNow = state === 'playing' ? input() : {};
  if (game && (state === 'playing' || state === 'result')) game.update(dt, keysNow);
  sound.update(dt, keysNow);
  world.update(state === 'paused' ? 0 : dt, render);
  if (game && state !== 'menu') hud.update(dt, world.chase);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!window.__manual) tick(dt);
  requestAnimationFrame(frame);
}

showMenu(0);
requestAnimationFrame(frame);

// exposed for local smoke tests only
if (import.meta.env.DEV) {
  window.__app = {
    get game() { return game; }, get state() { return state; }, world, sound, keys, play, showMenu,
    run(seconds) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) tick(1 / 60, i === n - 1); },
    info: () => ({ calls: world.renderer.info.render.calls, tris: world.renderer.info.render.triangles }),
  };
}

import * as THREE from 'three';
import RoadNet from '../systems/RoadNet.js';
import BikePhysics from '../objects/BikePhysics.js';
import City3D, { makeLabel } from './City3D.js';
import BikeModel from './BikeModel.js';
import ChaseCamera, { CAMERA_MODES } from './ChaseCamera.js';
import Hud3D from './Hud3D.js';

// 3D prototype: free ride Ambience Mall → Vatika Chowk with a chase camera. No traffic/events yet.
const FROM = 'ambience';
const TO = 'vatika';
const WIN_RADIUS = 80;
const SKY = 0xbfd9ea;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 1400, 3800);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 2, 6000);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a6a, 1.6));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 10, far: 2000 });
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);

const net = new RoadNet();
new City3D(scene, net);

const from = net.junction(FROM);
const target = net.junction(TO);

// destination beacon
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(WIN_RADIUS, WIN_RADIUS, 600, 32, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
);
beacon.position.set(target.x, 300, target.y);
scene.add(beacon);
const reach = makeLabel('Yahan pahuncho', { bg: '#2ecc71', fg: '#ffffff', size: 44, scale: 0.6 });
reach.position.set(target.x, 120, target.y);
scene.add(reach);

const model = new BikeModel(scene);
const chase = new ChaseCamera(camera);
const hud = new Hud3D(net, target);

let bike;
let elapsed;
let done;
function reset() {
  const first = net.junction(net.shortestPath(FROM, TO).ids[1]);
  bike = new BikePhysics(net, from.x, from.y, Math.atan2(first.y - from.y, first.x - from.x));
  elapsed = 0;
  done = false;
  chase.yaw = null;
  chase.placed = false;
  hud.message('');
}
reset();

// --- input
const keys = new Set();
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyC') chase.cycle();
  if (e.code === 'KeyR') reset();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
const input = () => ({
  up: keys.has('ArrowUp') || keys.has('KeyW'),
  down: keys.has('ArrowDown') || keys.has('KeyS'),
  left: keys.has('ArrowLeft') || keys.has('KeyA'),
  right: keys.has('ArrowRight') || keys.has('KeyD'),
  brake: keys.has('ShiftLeft') || keys.has('ShiftRight'),
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- GPS: next junction on the best route. On a road, pick whichever end is cheaper to go via
// (so riding the wrong way points you back).
let gps = { next: null, point: target, timer: 0 };
function updateGps(dt) {
  gps.timer -= dt;
  if (gps.timer > 0) return;
  gps.timer = 0.4;
  const j = net.nearestJunction(bike.x, bike.y);
  let next;
  if (Math.hypot(j.x - bike.x, j.y - bike.y) < j.radius) {
    const path = net.shortestPath(j.id, TO);
    next = path.ids.length > 1 ? net.junction(path.ids[1]) : j;
  } else {
    const road = net.roadAt(bike.x, bike.y);
    if (!road) return;
    const via = (end) => Math.hypot(end.x - bike.x, end.y - bike.y) + net.shortestPath(end.id, TO).cost;
    next = via(road.a) <= via(road.b) ? road.a : road.b;
  }
  gps = { next, point: next, timer: gps.timer };
}

// --- loop
function tick(dt) {
  if (!done) {
    elapsed += dt;
    const { pothole } = bike.step(dt, input());
    if (pothole) chase.shake = 0.12;
    if (Math.hypot(bike.x - target.x, bike.y - target.y) < WIN_RADIUS) {
      done = true;
      hud.message(`Pahunch gaya! 🎉<br><small>${Math.floor(elapsed)} seconds · R = phir se</small>`);
    }
  } else {
    bike.step(dt, { brake: true });
  }
  updateGps(dt);
  model.sync(bike, dt);
  chase.update(bike, dt);
  // keep the shadow camera around the bike
  sun.position.set(bike.x + 300, 600, bike.y + 200);
  sun.target.position.set(bike.x, 0, bike.y);
  hud.update(bike, { from, nextJunction: gps.next, nextPoint: gps.point, camName: CAMERA_MODES[chase.mode].name, elapsed });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!window.__manual) {
    tick(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// exposed for local smoke tests only
if (import.meta.env.DEV) {
  window.__proto = {
    get bike() { return bike; }, get gps() { return gps; }, keys, chase, renderer,
    run(seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) tick(1 / 60); renderer.render(scene, camera); },
    get done() { return done; },
    info: () => ({ draws: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  };
}

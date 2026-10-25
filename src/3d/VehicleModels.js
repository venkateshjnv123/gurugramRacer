import * as THREE from 'three';

// Low-poly vehicles from boxes. All face +x (length along x, width along z, y up), origin at ground centre.
// Head/tail lights use fog-free basic materials so at night/fog you see the lights before the vehicle.

const geoCache = new Map();
const box = (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(x, y, z));
  return geoCache.get(key);
};
const wheelGeo = new THREE.CylinderGeometry(5, 5, 4, 10).rotateX(Math.PI / 2);

const matCache = new Map();
const lambert = (color) => {
  const key = `l${color}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return matCache.get(key);
};
export const LIGHT_MATS = {
  head: new THREE.MeshBasicMaterial({ color: 0xfff1b0, fog: false }),
  tail: new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false }),
};
const GLASS = 0x1b2631;

function part(group, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  group.add(m);
  return m;
}

function wheels(g, xs, halfW) {
  for (const x of xs) for (const z of [halfW, -halfW]) part(g, wheelGeo, lambert(0x151515), x, 5, z);
}

function lights(g, len, w, y, tail = true) {
  for (const z of [w / 2 - 4, -(w / 2 - 4)]) {
    part(g, box(1.5, 3, 4), LIGHT_MATS.head, len / 2 + 0.5, y, z).castShadow = false;
    if (tail) part(g, box(1.5, 3, 4), LIGHT_MATS.tail, -len / 2 - 0.5, y, z).castShadow = false;
  }
}

function car(color) {
  const g = new THREE.Group();
  wheels(g, [13, -13], 10);
  part(g, box(44, 10, 22), lambert(color), 0, 10, 0);
  part(g, box(24, 9, 19), lambert(color), -3, 19, 0);
  part(g, box(25, 6, 20), lambert(GLASS), -3, 19, 0); // window band
  lights(g, 44, 22, 11);
  return g;
}

function thar() {
  const g = new THREE.Group();
  wheels(g, [15, -15], 12);
  part(g, box(46, 14, 26), lambert(0x151515), 0, 13, 0);
  part(g, box(26, 12, 24), lambert(0x202020), -6, 26, 0);
  part(g, box(6, 8, 18), lambert(GLASS), 7, 26, 0);
  const spare = part(g, new THREE.CylinderGeometry(7, 7, 4, 12).rotateZ(Math.PI / 2), lambert(0x111111), -25, 15, 0);
  spare.castShadow = false;
  lights(g, 46, 26, 14);
  return g;
}

function auto() {
  const g = new THREE.Group();
  part(g, wheelGeo, lambert(0x151515), 11, 5, 0);
  for (const z of [8, -8]) part(g, wheelGeo, lambert(0x151515), -9, 5, z);
  part(g, box(30, 9, 18), lambert(0x2f8f3a), 0, 9, 0);    // green body
  part(g, box(22, 3, 19), lambert(0xf2c014), -2, 26, 0);   // yellow canopy
  for (const x of [8, -12]) for (const z of [8, -8]) part(g, box(2, 12, 2), lambert(0x222222), x, 19, z);
  part(g, box(2, 9, 14), lambert(0x9fd3e8), 10, 19, 0);   // windscreen
  lights(g, 30, 14, 10);
  return g;
}

function bus() {
  const g = new THREE.Group();
  wheels(g, [30, -28], 12);
  part(g, box(90, 26, 26), lambert(0xd35400), 0, 18, 0);
  part(g, box(91, 8, 27), lambert(0xf5f5f5), 0, 24, 0);   // window band
  for (let x = -38; x <= 38; x += 12) part(g, box(8, 6, 27.5), lambert(GLASS), x, 24, 0);
  lights(g, 90, 26, 9);
  return g;
}

let hornTexture = null;
function hornOkPlease() {
  if (hornTexture) return hornTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b7950b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORN OK', 128, 55);
  ctx.fillText('PLEASE', 128, 100);
  hornTexture = new THREE.CanvasTexture(c);
  hornTexture.colorSpace = THREE.SRGBColorSpace;
  return hornTexture;
}

function truck(tailLights = true) {
  const g = new THREE.Group();
  wheels(g, [28, -10, -28], 12);
  part(g, box(18, 22, 26), lambert(0x2e86c1), 31, 15, 0);   // cabin
  part(g, box(3, 8, 22), lambert(GLASS), 40, 19, 0);
  part(g, box(60, 26, 26), lambert(0xb7950b), -10, 19, 0);  // load
  const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshLambertMaterial({ map: hornOkPlease() }));
  back.rotation.y = -Math.PI / 2;
  back.position.set(-40.2, 19, 0);
  g.add(back);
  lights(g, 80, 26, 8, tailLights);
  return g;
}

export function makeVehicle(npc) {
  switch (npc.kind) {
    case 'thar': return thar();
    case 'auto': return auto();
    case 'bus': return bus();
    case 'truck': return truck(!npc.noTailLights);
    default: return car(npc.color ?? 0xecf0f1);
  }
}

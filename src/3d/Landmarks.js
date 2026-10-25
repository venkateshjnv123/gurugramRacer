import * as THREE from 'three';
import { LANDMARKS, METRO_LINE, METRO_PILLAR_SPACING } from '../data/landmarks.js';
import { BILLBOARDS } from '../data/jokes.js';
import { placeLandmarks, metroPillars, streetLights, billboardSpots } from '../systems/CityLayout.js';

// Landmarks, elevated metro, street lights and billboards. Each landmark group's local +x faces its junction.

const matCache = new Map();
const mat = (color, extra) => {
  const key = color + JSON.stringify(extra ?? {});
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
  return matCache.get(key);
};

function add(g, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
const box = (g, w, h, d, color, x, y, z, extra) => add(g, new THREE.BoxGeometry(w, h, d), mat(color, extra), x, y + h / 2, z);
const cyl = (g, r, h, color, x, y, z, seg = 12) => add(g, new THREE.CylinderGeometry(r, r, h, seg), mat(color), x, y + h / 2, z);

function textCanvas(text, { bg = '#1f3a5f', fg = '#ffffff', size = 64, pad = 28 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${size}px sans-serif`;
  c.width = Math.ceil(ctx.measureText(text).width + pad * 2);
  c.height = Math.ceil(size * 1.5);
  ctx.font = `bold ${size}px sans-serif`;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, c.height / 2 + 2);
  return c;
}

// Flat name board on a facade: centred at (x, y, z) in landmark space, facing +x
function board(g, text, x, y, z, height, opts) {
  const c = textCanvas(text, opts);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const w = (height * c.width) / c.height;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshBasicMaterial({ map: tex }));
  m.rotation.y = Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function windowsTexture(cols, rows, frame, glass) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, 128, 256);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      ctx.fillStyle = glass;
      ctx.fillRect((k * 128) / cols + 3, (r * 256) / rows + 3, 128 / cols - 6, 256 / rows - 6);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BUILDERS = {
  mall(g, s, name) {
    box(g, s * 1.1, 46, s * 1.8, 0xe9e1d0, 0, 0, 0);
    box(g, s * 0.5, 62, s * 0.7, 0x6fa4d6, s * 0.35, 0, 0, { transparent: true, opacity: 0.85 }); // glass atrium
    box(g, s * 1.1, 6, s * 1.8, 0xc8bfa9, 0, 46, 0);
    board(g, name.toUpperCase(), s * 0.61, 52, 0, 16, { bg: '#7b1e3a' });
  },
  cyberhub(g, s, name) {
    box(g, s * 1.2, 4, s * 1.4, 0x8b6f4e, 0, 0, 0); // deck
    for (const x of [-0.4, 0, 0.4]) for (const z of [-0.5, 0, 0.5]) cyl(g, 2, 30, 0x555555, x * s, 4, z * s, 6);
    box(g, s * 1.2, 3, s * 1.4, 0xf4f4f4, 0, 34, 0); // canopy
    // string lights
    const bulbs = new THREE.MeshBasicMaterial({ color: 0xffd36b, fog: false });
    for (let z = -0.6; z <= 0.6; z += 0.12) for (const x of [-0.5, 0.5]) add(g, new THREE.SphereGeometry(1.8, 6, 4), bulbs, x * s, 31, z * s);
    // arch with name
    for (const z of [-0.45, 0.45]) box(g, 6, 50, 6, 0x333333, s * 0.65, 0, z * s);
    box(g, 6, 8, s * 0.96, 0x333333, s * 0.65, 50, 0);
    board(g, name.toUpperCase(), s * 0.69, 54, 0, 14, { bg: '#111111', fg: '#ffcc33' });
  },
  towers(g, s, name) {
    const tex = windowsTexture(6, 26, '#9fbfdc', '#2b4a6b');
    const m = new THREE.MeshLambertMaterial({ map: tex });
    [[0, 0, 300, 0.55], [-0.5, 0.5, 240, 0.45], [0.2, -0.6, 210, 0.42]].forEach(([x, z, h, w]) => {
      add(g, new THREE.BoxGeometry(w * s, h, w * s), m, x * s, h / 2, z * s);
    });
    board(g, name, s * 0.29, 40, 0, 14, { bg: '#0b3d2e' });
  },
  station(g, s, name) {
    for (const x of [-0.5, 0.5]) for (const z of [-0.7, 0.7]) cyl(g, 5, 46, 0xbdbdbd, x * s, 0, z * s, 8);
    box(g, s * 1.2, 22, s * 1.7, 0xd9d9d9, 0, 46, 0);
    box(g, s * 1.3, 4, s * 1.8, 0x7f8c8d, 0, 68, 0);
    box(g, s * 0.3, 46, s * 0.25, 0xb0b0b0, s * 0.4, 0, -s * 0.85); // stairs block
    board(g, `🚇 ${name}`, s * 0.61, 57, 0, 13, { bg: '#d4a017', fg: '#1a1a1a' });
  },
  mgf(g, s, name) {
    box(g, s * 1.2, 70, s * 1.6, 0xd8d2c4, 0, 0, 0);
    const colors = [0xc0392b, 0xe67e22, 0x2980b9, 0x27ae60, 0x8e44ad];
    for (let i = 0; i < 5; i++) box(g, 2, 50, s * 0.26, colors[i], s * 0.6 + 1, 10, (i - 2) * s * 0.3);
    box(g, s * 0.6, 20, s * 0.6, 0x6fa4d6, s * 0.3, 70, 0, { transparent: true, opacity: 0.85 });
    board(g, name, s * 0.62, 78, 0, 14, { bg: '#2c2c54' });
  },
  mallSmall(g, s, name) {
    box(g, s * 1.1, 52, s * 1.3, 0xc9b79c, 0, 0, 0);
    for (let y = 10; y < 50; y += 14) box(g, 2, 6, s * 1.2, 0x34495e, s * 0.55 + 1, y, 0);
    board(g, name, s * 0.57, 58, 0, 12, { bg: '#145a32' });
  },
  iffco(g, s, name) {
    const tex = windowsTexture(5, 30, '#d6d0c4', '#3a4f63');
    add(g, new THREE.BoxGeometry(s * 0.8, 320, s * 0.8), new THREE.MeshLambertMaterial({ map: tex }), 0, 160, 0);
    add(g, new THREE.CylinderGeometry(s * 0.3, s * 0.5, 40, 4).rotateY(Math.PI / 4), mat(0x2e7d32), 0, 340, 0); // crown
    box(g, s * 1.3, 14, s * 1.3, 0xa89f8c, 0, 0, 0); // podium
    board(g, name.toUpperCase(), s * 0.41, 290, 0, 22, { bg: '#2e7d32' });
  },
  twin(g, s, name) {
    const tex = windowsTexture(5, 24, '#c7c7c7', '#3d566e');
    const m = new THREE.MeshLambertMaterial({ map: tex });
    for (const z of [-0.45, 0.45]) add(g, new THREE.BoxGeometry(s * 0.6, 260, s * 0.6), m, 0, 130, z * s);
    box(g, s * 0.5, 14, s * 0.4, 0x7f8c8d, 0, 120, 0); // sky bridge
    board(g, name, s * 0.31, 30, 0, 14, { bg: '#4a235a' });
  },
  busStand(g, s, name) {
    box(g, s * 0.9, 4, s * 1.6, 0x95a5a6, 0, 0, 0);
    for (const z of [-0.7, -0.25, 0.25, 0.7]) cyl(g, 2.5, 34, 0x7f8c8d, s * 0.35, 4, z * s, 6);
    box(g, s * 1.0, 4, s * 1.7, 0x2471a3, 0, 38, 0);
    box(g, 70, 26, 26, 0xd35400, -s * 0.1, 4, -s * 0.3); // parked bus
    board(g, name, s * 0.47, 48, 0, 13, { bg: '#922b21' });
  },
  factory(g, s, name) {
    for (const z of [-0.55, 0, 0.55]) {
      box(g, s * 1.2, 34, s * 0.5, 0x5d6d7e, 0, 0, z * s);
      add(g, new THREE.CylinderGeometry(0.1, s * 0.27, 18, 3).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), mat(0x34495e), 0, 43, z * s); // sawtooth roof
    }
    for (const x of [-0.4, -0.2]) cyl(g, 7, 110, 0x922b21, x * s, 0, s * 0.9, 10); // chimneys
    board(g, name, s * 0.61, 20, 0, 14, { bg: '#1b4f72' });
  },
  golf(g, s, name) {
    add(g, new THREE.CircleGeometry(s, 40).rotateX(-Math.PI / 2), mat(0x5aa64a), 0, 0.3, 0).castShadow = false;
    add(g, new THREE.CircleGeometry(s * 0.25, 24).rotateX(-Math.PI / 2), mat(0x7cc96b), s * 0.3, 0.5, -s * 0.3).castShadow = false;
    add(g, new THREE.CircleGeometry(s * 0.12, 16).rotateX(-Math.PI / 2), mat(0xe8d9a0), -s * 0.3, 0.5, s * 0.2).castShadow = false; // bunker
    for (const [x, z] of [[0.3, -0.3], [-0.45, -0.4]]) {
      cyl(g, 1, 30, 0xffffff, x * s, 0, z * s, 4);
      box(g, 1, 7, 10, 0xe74c3c, x * s, 23, z * s + 5);
    }
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const x = Math.cos(a) * s * 0.85;
      const z = Math.sin(a) * s * 0.85;
      cyl(g, 2.5, 46, 0x8d6e63, x, 0, z, 5);
      for (let f = 0; f < 5; f++) {
        const leaf = add(g, new THREE.BoxGeometry(22, 1.5, 5), mat(0x2e7d32), x, 46, z);
        leaf.rotation.y = (f / 5) * Math.PI * 2;
        leaf.rotation.z = -0.35;
      }
    }
    board(g, `⛳ ${name}`, s * 0.95, 14, 0, 13, { bg: '#1e8449' });
  },
  luxury(g, s, name) {
    const tex = windowsTexture(4, 30, '#efe6d2', '#22313f');
    add(g, new THREE.BoxGeometry(s * 0.7, 360, s * 0.7), new THREE.MeshLambertMaterial({ map: tex }), 0, 180, 0);
    box(g, s * 0.75, 10, s * 0.75, 0xd4af37, 0, 360, 0);
    board(g, `${name} · ₹40 Cr`, s * 0.36, 30, 0, 13, { bg: '#7d6608' });
  },
  market(g, s, name) {
    const colors = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0xe67e22, 0x9b59b6];
    let k = 0;
    for (let x = -0.5; x <= 0.5; x += 0.5) {
      for (let z = -0.6; z <= 0.6; z += 0.3) {
        box(g, s * 0.3, 18, s * 0.24, 0xbdb2a0, x * s, 0, z * s);
        const awning = box(g, s * 0.3, 2, s * 0.26, colors[k++ % colors.length], x * s + s * 0.08, 18, z * s);
        awning.rotation.z = -0.25;
      }
    }
    board(g, name, s * 0.75, 30, 0, 12, { bg: '#b03a2e' });
  },
  hospital(g, s, name) {
    const tex = windowsTexture(8, 10, '#f5f5f5', '#5dade2');
    add(g, new THREE.BoxGeometry(s * 1.0, 110, s * 1.7), new THREE.MeshLambertMaterial({ map: tex }), 0, 55, 0);
    box(g, s * 0.5, 30, s * 0.6, 0xf5f5f5, s * 0.6, 0, 0); // entrance
    const red = mat(0xe74c3c);
    add(g, new THREE.BoxGeometry(2, 30, 10), red, s * 0.51, 80, 0);
    add(g, new THREE.BoxGeometry(2, 10, 30), red, s * 0.51, 80, 0);
    board(g, name.toUpperCase(), s * 0.86, 36, 0, 12, { bg: '#1a5276' });
  },
  society(g, s, name) {
    const tex = windowsTexture(4, 14, '#e8d5b7', '#5d4e37');
    const m = new THREE.MeshLambertMaterial({ map: tex });
    for (const [x, z] of [[0, -0.5], [0, 0.5], [-0.6, 0]]) {
      add(g, new THREE.BoxGeometry(s * 0.5, 150, s * 0.5), m, x * s, 75, z * s);
      cyl(g, 7, 10, 0x2c3e50, x * s, 150, z * s, 8); // water tank
    }
    box(g, 4, 30, s * 0.5, 0xc0392b, s * 0.6, 0, 0); // gate
    board(g, name, s * 0.62, 34, 0, 11, { bg: '#6e2c00' });
  },
  business(g, s, name) {
    const tex = windowsTexture(6, 12, '#bcd4e6', '#1f618d');
    const m = new THREE.MeshLambertMaterial({ map: tex });
    for (const [x, z, h] of [[0, 0, 120], [-0.5, -0.55, 90], [-0.5, 0.55, 100]]) add(g, new THREE.BoxGeometry(s * 0.6, h, s * 0.6), m, x * s, h / 2, z * s);
    board(g, name, s * 0.31, 26, 0, 12, { bg: '#154360' });
  },
};

export default class Landmarks {
  constructor(scene, net) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.net = net;
    this.placed = placeLandmarks(net, LANDMARKS);
    for (const lm of this.placed) {
      const g = new THREE.Group();
      BUILDERS[lm.kind](g, lm.size, lm.name);
      g.position.set(lm.x, 0, lm.y);
      g.rotation.y = -lm.facing;
      this.group.add(g);
    }
    this.addMetro();
    this.addStreetLights();
    this.addBillboards();
  }

  // circles generic buildings must avoid
  reserved() {
    return [
      ...this.placed.map((l) => ({ x: l.x, y: l.y, r: l.size + 20 })),
      ...this.billboards.map((b) => ({ x: b.x, y: b.y, r: 60 })),
    ];
  }

  addMetro() {
    const pillars = metroPillars(this.net, METRO_LINE, METRO_PILLAR_SPACING);
    const pillarGeo = new THREE.CylinderGeometry(5, 6, 62, 8);
    const pillarMat = mat(0xbdbdbd);
    for (const p of pillars) add(this.group, pillarGeo, pillarMat, p.x, 31, p.y);
    // deck segments between consecutive junctions along the line
    this.track = [];
    for (let i = 0; i < METRO_LINE.length - 1; i++) {
      const a = this.net.junction(METRO_LINE[i]);
      const b = this.net.junction(METRO_LINE[i + 1]);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const deck = add(this.group, new THREE.BoxGeometry(len, 8, 30), mat(0xd0d0d0), (a.x + b.x) / 2, 66, (a.y + b.y) / 2);
      deck.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
      this.track.push({ a, b, len });
    }
    this.trackLen = this.track.reduce((s, t) => s + t.len, 0);
    // a 4-coach train shuttling along the line
    this.train = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const coach = new THREE.Group();
      box(coach, 52, 16, 20, 0xecf0f1, 0, 0, 0);
      box(coach, 52.5, 5, 20.5, 0xf1c40f, 0, 6, 0);
      box(coach, 53, 4, 20.6, 0x34495e, 0, 10, 0);
      coach.userData.offset = k * 55;
      this.train.add(coach);
    }
    this.group.add(this.train);
    this.trainPos = 0;
    this.trainDir = 1;
  }

  pointOnTrack(s) {
    let left = Math.max(0, Math.min(this.trackLen, s));
    for (const seg of this.track) {
      if (left <= seg.len) {
        const k = left / seg.len;
        return { x: seg.a.x + (seg.b.x - seg.a.x) * k, y: seg.a.y + (seg.b.y - seg.a.y) * k, angle: Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x) };
      }
      left -= seg.len;
    }
    const last = this.track[this.track.length - 1];
    return { x: last.b.x, y: last.b.y, angle: Math.atan2(last.b.y - last.a.y, last.b.x - last.a.x) };
  }

  addStreetLights() {
    const lights = streetLights(this.net);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.5, 2, 60, 6), mat(0x555555), lights.length);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(22, 2, 2), mat(0x555555), lights.length);
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0x777777 });
    const lamp = new THREE.InstancedMesh(new THREE.BoxGeometry(10, 3, 6), this.lampMat, lights.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    lights.forEach((l, i) => {
      q.setFromAxisAngle(up, -l.facing);
      m.compose(new THREE.Vector3(l.x, 30, l.y), q, one);
      pole.setMatrixAt(i, m);
      const ax = l.x + Math.cos(l.facing) * 11;
      const az = l.y + Math.sin(l.facing) * 11;
      m.compose(new THREE.Vector3(ax, 60, az), q, one);
      arm.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(l.x + Math.cos(l.facing) * 20, 58, l.y + Math.sin(l.facing) * 20), q, one);
      lamp.setMatrixAt(i, m);
    });
    pole.castShadow = true;
    this.group.add(pole, arm, lamp);
  }

  addBillboards() {
    this.billboards = billboardSpots(this.net, BILLBOARDS.length);
    this.billboards.forEach((spot, i) => {
      const g = new THREE.Group();
      for (const z of [-30, 30]) cyl(g, 2.5, 60, 0x555555, 0, 0, z, 6);
      const c = textCanvas(BILLBOARDS[i], { bg: ['#c0392b', '#1f618d', '#117a65', '#7d3c98'][i % 4], size: 44 });
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const front = new THREE.Mesh(new THREE.PlaneGeometry(110, 36), new THREE.MeshLambertMaterial({ map: tex }));
      front.rotation.y = Math.PI / 2;
      front.position.set(1.6, 76, 0);
      g.add(front);
      box(g, 3, 38, 112, 0x333333, 0, 57, 0);
      g.position.set(spot.x, 0, spot.y);
      g.rotation.y = -spot.facing;
      this.group.add(g);
    });
  }

  setNight(on) {
    this.lampMat.color.setHex(on ? 0xffe7a0 : 0x777777);
  }

  update(dt) {
    // train shuttles end to end
    this.trainPos += this.trainDir * 110 * dt;
    const span = this.trackLen - 220;
    if (this.trainPos > span || this.trainPos < 0) {
      this.trainDir *= -1;
      this.trainPos = Math.max(0, Math.min(span, this.trainPos));
    }
    for (const coach of this.train.children) {
      const p = this.pointOnTrack(this.trainPos + coach.userData.offset + 30);
      coach.position.set(p.x, 78, p.y);
      coach.rotation.y = -p.angle;
    }
  }
}

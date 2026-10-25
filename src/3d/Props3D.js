import * as THREE from 'three';
import { makeLabel } from './City3D.js';

// Implements the core `props` API: add(type, opts) → handle { set({x,y,rot}), remove(), emit(active) }.
// Everything lives in one group that is cleared between missions.

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff7a00';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  for (let i = -64; i < 128; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 11, 0);
    ctx.lineTo(i + 11 - 64, 64);
    ctx.lineTo(i - 64, 64);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default class Props3D {
  constructor(scene, bikeRef) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.bikeRef = bikeRef; // () => bike physics
    this.splashes = [];
    this.pools = [];
    this.mats = {
      cowWhite: lambert(0xf4f1ea),
      cowBlack: lambert(0x2f2f2f),
      horn: lambert(0xd9a066),
      pink: lambert(0xe8a0a0),
      barrier: new THREE.MeshLambertMaterial({ map: stripeTexture() }),
      khaki: lambert(0xb59b5a),
      navy: lambert(0x23315c),
      skin: lambert(0xc68642),
      pole: lambert(0x777777),
      dividerY: lambert(0xf1c40f),
    };
  }

  clear() {
    for (const child of [...this.group.children]) this.group.remove(child);
    this.splashes = [];
    this.pools = [];
  }

  add(type, opts) {
    const obj = this[type](opts);
    obj.position.x = opts.x ?? obj.position.x;
    obj.position.z = opts.y ?? obj.position.z;
    if (opts.rot !== undefined) obj.rotation.y = -opts.rot;
    this.group.add(obj);
    const props = this;
    return {
      object: obj,
      set({ x, y, rot }) {
        if (x !== undefined) obj.position.x = x;
        if (y !== undefined) obj.position.z = y;
        if (rot !== undefined) obj.rotation.y = -rot;
      },
      remove() {
        props.group.remove(obj);
      },
      emit(active) {
        obj.userData.active = active;
      },
    };
  }

  mesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  // cow sitting on the road; long axis = local x
  cow() {
    const g = new THREE.Group();
    const M = this.mats;
    g.add(this.mesh(new THREE.BoxGeometry(44, 18, 22), M.cowWhite, 0, 11, 0));
    g.add(this.mesh(new THREE.BoxGeometry(12, 10, 23), M.cowBlack, -6, 15, 0));
    g.add(this.mesh(new THREE.BoxGeometry(8, 7, 23), M.cowBlack, 12, 12, 0));
    g.add(this.mesh(new THREE.BoxGeometry(14, 14, 13), M.cowWhite, 27, 20, 0)); // head
    g.add(this.mesh(new THREE.BoxGeometry(5, 6, 9), M.pink, 35, 17, 0));        // nose
    for (const z of [5, -5]) {
      const horn = this.mesh(new THREE.ConeGeometry(2, 9, 6), M.horn, 26, 30, z);
      horn.rotation.x = z > 0 ? -0.5 : 0.5;
      g.add(horn);
    }
    g.add(this.mesh(new THREE.BoxGeometry(14, 2, 2), M.cowBlack, -27, 14, 0)); // tail
    return g;
  }

  // striped barricade; long side across the road (local z)
  barrier() {
    const g = new THREE.Group();
    g.add(this.mesh(new THREE.BoxGeometry(6, 14, 38), this.mats.barrier, 0, 16, 0));
    for (const z of [15, -15]) g.add(this.mesh(new THREE.BoxGeometry(3, 10, 3), this.mats.pole, 0, 5, z));
    return g;
  }

  cop() {
    const g = new THREE.Group();
    g.add(this.mesh(new THREE.CylinderGeometry(6, 7, 26, 8), this.mats.khaki, 0, 13, 0));
    g.add(this.mesh(new THREE.SphereGeometry(5, 10, 8), this.mats.skin, 0, 31, 0));
    g.add(this.mesh(new THREE.CylinderGeometry(6, 6, 3, 10), this.mats.navy, 0, 36, 0));
    const stick = this.mesh(new THREE.BoxGeometry(2, 2, 18), this.mats.khaki, 5, 18, 6);
    stick.rotation.x = 0.6;
    g.add(stick);
    return g;
  }

  sign({ text, bg, fg }) {
    const g = new THREE.Group();
    const label = makeLabel(text, { bg, fg, size: 40, scale: 0.45 });
    label.position.y = 50;
    g.add(label);
    g.add(this.mesh(new THREE.CylinderGeometry(2, 2, 40, 6), this.mats.pole, 0, 20, 0));
    return g;
  }

  divider({ x0, y0, x1, y1 }) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.Group();
    const wall = this.mesh(new THREE.BoxGeometry(len, 10, 10), this.mats.dividerY, 0, 5, 0);
    wall.receiveShadow = true;
    g.add(wall);
    g.position.set((x0 + x1) / 2, 0, (y0 + y1) / 2);
    g.rotation.y = -Math.atan2(y1 - y0, x1 - x0);
    return g;
  }

  pool({ r }) {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0x3f7fbf, transparent: true, opacity: 0, shininess: 90, specular: 0x99ccff });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48).scale(1, 0.9, 1).rotateX(-Math.PI / 2), mat);
    disc.position.y = 1.2;
    disc.receiveShadow = true;
    g.add(disc);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0 });
    const rings = [0.35, 0.6].map((k) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r * k, r * k + 3, 40).rotateX(-Math.PI / 2), ringMat);
      ring.position.y = 1.4;
      g.add(ring);
      return ring;
    });
    this.pools.push({ mat, ringMat, rings, age: 0 });
    return g;
  }

  // particle burst behind the bike while `active`
  splash() {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfe0ff, size: 4, transparent: true, opacity: 0.85 }));
    pts.frustumCulled = false;
    pts.userData = { active: false, parts: Array.from({ length: count }, () => ({ life: 0, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0 })) };
    this.splashes.push(pts);
    return pts;
  }

  update(dt) {
    for (const p of this.pools) {
      p.age += dt;
      p.mat.opacity = Math.min(0.8, p.age / 3);
      p.ringMat.opacity = Math.min(0.6, p.age / 3) * (0.6 + 0.4 * Math.sin(p.age * 2));
      p.rings.forEach((ring, i) => ring.scale.setScalar(1 + 0.08 * Math.sin(p.age * 1.5 + i)));
    }
    const bike = this.bikeRef();
    for (const s of this.splashes) {
      const pos = s.geometry.attributes.position;
      s.userData.parts.forEach((q, i) => {
        if (q.life <= 0 && s.userData.active && bike && Math.random() < 0.25) {
          q.life = 0.5;
          q.x = bike.x - Math.cos(bike.heading) * 14;
          q.z = bike.y - Math.sin(bike.heading) * 14;
          q.y = 3;
          const a = Math.random() * Math.PI * 2;
          q.vx = Math.cos(a) * 60;
          q.vz = Math.sin(a) * 60;
          q.vy = 60 + Math.random() * 60;
        }
        if (q.life > 0) {
          q.life -= dt;
          q.vy -= 300 * dt;
          q.x += q.vx * dt;
          q.y = Math.max(0, q.y + q.vy * dt);
          q.z += q.vz * dt;
        }
        pos.setXYZ(i, q.x, q.life > 0 ? q.y : -100, q.z);
      });
      pos.needsUpdate = true;
    }
  }
}

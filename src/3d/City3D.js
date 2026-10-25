import * as THREE from 'three';
import { WORLD, LANES, COLORS } from '../config.js';
import { layoutBuildings, layoutTrees, mulberry32 } from '../systems/CityLayout.js';

// World (x, y) maps to three (x, z); y is up. 1 unit = 1 px of the 2D map.
const KERB_HEIGHT = 7;
const MARK_PERIOD = 100; // world units of road covered by one repeat of the lane texture

// Builds the static city from RoadNet: ground, roads, kerbs, junctions, buildings, trees, signs.
export default class City3D {
  constructor(scene, net) {
    this.scene = scene;
    this.net = net;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.addGround();
    this.addRoads();
    this.addJunctions();
    this.addKerbs();
    const buildings = layoutBuildings(net);
    this.addBuildings(buildings);
    this.addTrees(layoutTrees(net, buildings));
    this.addSigns();
  }

  addGround() {
    const pad = 3000;
    const geo = new THREE.PlaneGeometry(WORLD.width + pad * 2, WORLD.height + pad * 2).rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: COLORS.ground }));
    mesh.position.set(WORLD.width / 2, 0, WORLD.height / 2);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // Canvas texture of one MARK_PERIOD of road: u runs along the road, v across it.
  roadTexture(type, lanes) {
    const pxPerUnit = 2;
    const w = MARK_PERIOD * pxPerUnit;
    const h = lanes * 2 * LANES.width * pxPerUnit;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const rng = mulberry32(type.length * 97);
    ctx.fillStyle = type === 'gali' ? '#6b5a45' : '#3a3a3a';
    ctx.fillRect(0, 0, w, h);
    // grain
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + rng() * 0.05})`;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
    if (type === 'gali') {
      ctx.fillStyle = 'rgba(40,30,20,0.9)';
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.35, 14, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.75, h * 0.7, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      return this.finishTexture(canvas);
    }
    const lanePx = LANES.width * pxPerUnit;
    // edge lines
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 3, w, 4);
    ctx.fillRect(0, h - 7, w, 4);
    // centre divider (double yellow)
    ctx.fillStyle = '#e8c547';
    ctx.fillRect(0, h / 2 - 7, w, 4);
    ctx.fillRect(0, h / 2 + 3, w, 4);
    // dashed lane lines
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let lane = 1; lane < lanes; lane++) {
      for (const y of [h / 2 - lane * lanePx, h / 2 + lane * lanePx]) {
        ctx.fillRect(0, y - 2, 48, 4);
        ctx.fillRect(100, y - 2, 48, 4);
      }
    }
    return this.finishTexture(canvas);
  }

  finishTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  addRoads() {
    const textures = {};
    this.net.roads.forEach((r, i) => {
      const key = `${r.type}${r.lanes}`;
      textures[key] ??= this.roadTexture(r.type, r.lanes);
      const tex = textures[key].clone();
      tex.repeat.set(r.len / MARK_PERIOD, 1);
      tex.needsUpdate = true;

      const geo = new THREE.PlaneGeometry(r.len, r.hw * 2).rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
      const mid = this.net.pointAt(r, r.len / 2);
      mesh.position.set(mid.x, 0.4 + i * 0.01, mid.y); // tiny lift per road avoids z-fighting where they overlap
      mesh.rotation.y = -Math.atan2(r.dy, r.dx);
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // footpath strip under the road
      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(r.len, r.hw * 2 + 36).rotateX(-Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: COLORS.kerb }),
      );
      path.position.set(mid.x, 0.2, mid.y);
      path.rotation.y = mesh.rotation.y;
      path.receiveShadow = true;
      this.group.add(path);
    });
  }

  addJunctions() {
    const asphalt = new THREE.MeshLambertMaterial({ color: COLORS.road });
    const footpath = new THREE.MeshLambertMaterial({ color: COLORS.kerb });
    const hot = new THREE.MeshBasicMaterial({ color: COLORS.hot });
    for (const j of this.net.junctions.values()) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(j.radius, 48).rotateX(-Math.PI / 2), asphalt);
      disc.position.set(j.x, 0.8, j.y);
      disc.receiveShadow = true;
      this.group.add(disc);
      const pathDisc = new THREE.Mesh(new THREE.CircleGeometry(j.radius + 18, 48).rotateX(-Math.PI / 2), footpath);
      pathDisc.position.set(j.x, 0.15, j.y);
      this.group.add(pathDisc);
      if (j.hot) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(j.radius - 14, j.radius - 8, 64).rotateX(-Math.PI / 2), hot);
        ring.position.set(j.x, 0.9, j.y);
        this.group.add(ring);
      }
    }
  }

  // Raised kerbs along both road edges (they're the walls), broken wherever another road or junction is.
  addKerbs() {
    const boxes = [];
    for (const r of this.net.roads) {
      for (const side of [1, -1]) {
        let start = null;
        const step = 20;
        for (let t = 0; t <= r.len + step; t += step) {
          const tt = Math.min(t, r.len);
          const out = this.net.pointAt(r, tt, (r.hw + 8) * side);
          const free = t <= r.len && this.net.nearest(out.x, out.y).pen > 0;
          if (free && start === null) start = tt;
          if ((!free || t > r.len) && start !== null) {
            if (tt - start > 10) boxes.push({ r, side, t0: start, t1: tt });
            start = null;
          }
        }
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xd9d4c7 });
    const mesh = new THREE.InstancedMesh(geo, mat, boxes.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    boxes.forEach((b, i) => {
      const c = this.net.pointAt(b.r, (b.t0 + b.t1) / 2, (b.r.hw + 3) * b.side);
      q.setFromAxisAngle(up, -Math.atan2(b.r.dy, b.r.dx));
      m.compose(new THREE.Vector3(c.x, KERB_HEIGHT / 2, c.y), q, new THREE.Vector3(b.t1 - b.t0, KERB_HEIGHT, 6));
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  windowTexture(cols, rows, glass) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 256);
    const cw = 128 / cols;
    const rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = glass ? 'rgba(20,40,70,0.55)' : 'rgba(40,40,40,0.45)';
        ctx.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.55);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  addBuildings(buildings) {
    const groups = {
      lavish: { list: [], mat: new THREE.MeshLambertMaterial({ map: this.windowTexture(5, 22, true) }), colors: COLORS.glass },
      shops: { list: [], mat: new THREE.MeshLambertMaterial({ map: this.windowTexture(2, 2, false) }), colors: COLORS.shops },
      normal: { list: [], mat: new THREE.MeshLambertMaterial({ map: this.windowTexture(3, 5, false) }), colors: COLORS.houses },
    };
    for (const b of buildings) groups[b.zone].list.push(b);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    for (const g of Object.values(groups)) {
      const mesh = new THREE.InstancedMesh(geo, g.mat, g.list.length);
      g.list.forEach((b, i) => {
        m.makeScale(b.w, b.h, b.d).setPosition(b.x + b.w / 2, b.h / 2, b.y + b.d / 2);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, color.setHex(g.colors[Math.floor(b.tint * g.colors.length)]));
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  addTrees(trees) {
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(2.5, 3.5, 22, 6),
      new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
      trees.length,
    );
    const crown = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(16, 0),
      new THREE.MeshLambertMaterial({ color: 0x4f8a3c, flatShading: true }),
      trees.length,
    );
    const m = new THREE.Matrix4();
    trees.forEach((t, i) => {
      m.makeScale(t.s, t.s, t.s).setPosition(t.x, 11 * t.s, t.y);
      trunk.setMatrixAt(i, m);
      m.makeScale(t.s, t.s * 1.1, t.s).setPosition(t.x, 34 * t.s, t.y);
      crown.setMatrixAt(i, m);
    });
    trunk.castShadow = crown.castShadow = true;
    this.group.add(trunk, crown);
  }

  addSigns() {
    for (const j of this.net.junctions.values()) {
      const sign = makeLabel(j.name, { bg: '#1f7a3a', fg: '#ffffff', size: 44, scale: 0.55 });
      const a = this.freeAngle(j);
      const d = j.radius + 50;
      sign.position.set(j.x + Math.cos(a) * d, 70, j.y + Math.sin(a) * d);
      this.group.add(sign);
      // pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 60, 6), new THREE.MeshLambertMaterial({ color: 0x777777 }));
      pole.position.set(sign.position.x, 30, sign.position.z);
      this.group.add(pole);
    }
    for (const r of this.net.roads) {
      const label = makeLabel(r.name, {
        bg: r.type === 'gali' ? '#6b4a1f' : '#2c5f8a', fg: '#ffffff', size: 32, scale: 0.4,
      });
      const p = this.net.pointAt(r, r.len / 2, r.hw + 30);
      label.position.set(p.x, 40, p.y);
      this.group.add(label);
    }
  }

  // Direction from a junction with the most room between its roads
  freeAngle(j) {
    const angles = j.roads.map((r) => {
      const o = this.net.other(r, j);
      return Math.atan2(o.y - j.y, o.x - j.x);
    }).sort((p, q) => p - q);
    if (angles.length === 1) return angles[0] + Math.PI;
    let best = 0;
    let bestGap = -1;
    angles.forEach((ang, i) => {
      const next = i === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[i + 1];
      if (next - ang > bestGap) {
        bestGap = next - ang;
        best = ang + bestGap / 2;
      }
    });
    return best;
  }
}

// Camera-facing text board (canvas texture on a sprite)
export function makeLabel(text, { bg, fg, size = 40, scale = 0.5 }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `bold ${size}px sans-serif`;
  ctx.font = font;
  const padX = size * 0.5;
  const w = Math.ceil(ctx.measureText(text).width + padX * 2);
  const h = Math.ceil(size * 1.6);
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX, h / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}

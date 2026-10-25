import * as THREE from 'three';
import RoadNet from '../systems/RoadNet.js';
import { WIN_RADIUS } from '../core/Game.js';
import City3D, { makeLabel } from './City3D.js';
import Landmarks from './Landmarks.js';
import BikeModel from './BikeModel.js';
import ChaseCamera from './ChaseCamera.js';
import Props3D from './Props3D.js';
import { makeVehicle, LIGHT_MATS } from './VehicleModels.js';
import { UI } from '../data/jokes.js';

// Look presets: sky colour, fog range, light levels
const ENV = {
  day: { sky: 0xbfd9ea, fog: [1400, 3800], hemi: 1.6, sun: 2.2 },
  smog: { sky: 0xc9c4b8, fog: [60, 700], hemi: 1.3, sun: 1.2 },
  rain: { sky: 0x7d8a96, fog: [300, 1800], hemi: 1.0, sun: 0.6 },
  night: { sky: 0x05060f, fog: [120, 1500], hemi: 0.12, sun: 0 },
  nightSmog: { sky: 0x0b0c12, fog: [40, 520], hemi: 0.1, sun: 0 },
};

// The whole 3D scene. Static city is built once; mission objects are rebuilt per mission.
export default class World {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffffff, 1, 2);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 2, 6000);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xb59a6a, 1.6);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 10, far: 2000 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.net = new RoadNet();
    this.landmarks = new Landmarks(this.scene, this.net);
    this.city = new City3D(this.scene, this.net, this.landmarks.reserved());

    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.props = new Props3D(this.scene, () => this.game?.bike);
    this.chase = new ChaseCamera(this.camera);
    this.npcMeshes = new Map();
    this.rings = [];
    this.time = 0;

    this.setEnvironment({});
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setEnvironment({ night = false, smog = false, rain = false }) {
    this.env = { night, smog, rain };
    const e = ENV[night ? (smog ? 'nightSmog' : 'night') : smog ? 'smog' : rain ? 'rain' : 'day'];
    this.scene.background = new THREE.Color(e.sky);
    this.scene.fog.color.setHex(e.sky);
    [this.scene.fog.near, this.scene.fog.far] = e.fog;
    this.hemi.intensity = e.hemi;
    this.sun.intensity = e.sun;
    this.sun.castShadow = e.sun > 0;
    this.city.setNight(night);
    this.landmarks.setNight(night);
    LIGHT_MATS.tail.color.setHex(night || smog ? 0xff3030 : 0xc0392b);
    if (this.headlight) this.headlight.visible = night || smog;
    this.setRain(rain);
  }

  setRain(on) {
    if (on && !this.rain) {
      const count = 2500;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 6), 3));
      this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaad4ff, transparent: true, opacity: 0.55 }));
      this.rain.frustumCulled = false;
      this.rain.userData.drops = Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 1400, y: Math.random() * 400, z: (Math.random() - 0.5) * 1400 }));
      this.scene.add(this.rain);
    } else if (!on && this.rain) {
      this.scene.remove(this.rain);
      this.rain = null;
    }
  }

  // ---- missions

  startMission(game) {
    this.endMission();
    this.game = game;
    const fog = game.fogMode;
    this.setEnvironment({ night: game.mission.night, smog: fog, rain: false });

    this.bikeModel = new BikeModel(this.dynamic);
    this.headlight = new THREE.SpotLight(0xfff2cc, 9, 900, 0.45, 0.5, 0); // decay 0: game-scale distances
    this.headlight.position.set(16, 22, 0);
    this.headlight.target.position.set(260, 0, 0);
    this.bikeModel.root.add(this.headlight, this.headlight.target);
    this.headlight.visible = game.mission.night || fog;

    // destination beacon
    const t = game.target;
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(WIN_RADIUS, WIN_RADIUS, 600, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, fog: false }),
    );
    beacon.position.set(t.x, 300, t.y);
    this.dynamic.add(beacon);
    const reach = makeLabel(UI.reachHere, { bg: '#2ecc71', fg: '#ffffff', size: 44, scale: 0.6 });
    reach.material.fog = false;
    reach.position.set(t.x, 120, t.y);
    this.dynamic.add(reach);

    // traffic signals at hot junctions
    this.signalViews = game.traffic.signals.map((s) => ({
      j: s.j,
      lights: s.lights.map((l) => this.makeSignal(l)),
    }));

    this.chase.yaw = null;
    this.chase.placed = false;
    this.offs = [
      game.on('crash', () => this.chase.kick(0.3, 6)),
      game.on('pothole', () => this.chase.kick(0.12, 3)),
      game.on('honk', () => this.horn()),
      game.on('rain', () => this.setEnvironment({ ...this.env, rain: true })),
    ];
  }

  makeSignal(l) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 44, 6), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    pole.position.y = 22;
    const head = new THREE.Mesh(new THREE.BoxGeometry(6, 18, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    head.position.y = 50;
    const red = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222, fog: false }));
    const green = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff55, fog: false }));
    red.position.set(3.5, 55, 0);
    green.position.set(3.5, 45, 0);
    g.add(pole, head, red, green);
    g.position.set(l.x, 0, l.y);
    g.rotation.y = -l.facing;
    this.dynamic.add(g);
    return { red, green };
  }

  horn() {
    const b = this.game.bike;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(18, 22, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }),
    );
    ring.position.set(b.x, 20, b.y);
    this.dynamic.add(ring);
    this.rings.push({ ring, age: 0 });
  }

  endMission() {
    this.offs?.forEach((off) => off());
    this.offs = null;
    this.game = null;
    for (const child of [...this.dynamic.children]) this.dynamic.remove(child);
    this.props.clear();
    this.npcMeshes.clear();
    this.rings = [];
    this.bikeModel = null;
    this.headlight = null;
    this.setRain(false);
  }

  // ---- per frame

  update(dt, render = true) {
    this.time += dt;
    this.landmarks.update(dt);
    const game = this.game;
    if (game) {
      this.syncNpcs(game);
      for (const sv of this.signalViews) {
        const red = game.traffic.isRed(sv.j);
        for (const l of sv.lights) {
          l.red.material.color.setHex(red ? 0xff2222 : 0x3a0a0a);
          l.green.material.color.setHex(red ? 0x0a3a14 : 0x22ff55);
        }
      }
      this.props.update(dt);
      this.bikeModel.sync(game.bike, dt);
      this.chase.update(game.bike, dt);
      const b = game.bike;
      this.sun.position.set(b.x + 300, 600, b.y + 200);
      this.sun.target.position.set(b.x, 0, b.y);
      for (const r of this.rings) {
        r.age += dt;
        r.ring.scale.setScalar(1 + r.age * 8);
        r.ring.material.opacity = Math.max(0, 0.9 - r.age * 2);
      }
      this.rings = this.rings.filter((r) => {
        if (r.age < 0.5) return true;
        this.dynamic.remove(r.ring);
        return false;
      });
    } else {
      // menu: slow orbit over Cyber Hub
      const c = this.net.junction('cyberhub');
      const a = this.time * 0.06;
      this.camera.position.set(c.x + Math.cos(a) * 900, 420, c.y + Math.sin(a) * 900);
      this.camera.lookAt(c.x, 60, c.y);
      this.sun.position.set(c.x + 300, 600, c.y + 200);
      this.sun.target.position.set(c.x, 0, c.y);
    }
    if (this.rain) this.updateRain(dt);
    if (render) this.renderer.render(this.scene, this.camera);
  }

  syncNpcs(game) {
    const alive = new Set();
    for (const npc of game.traffic.npcs) {
      alive.add(npc.id);
      let mesh = this.npcMeshes.get(npc.id);
      if (!mesh) {
        mesh = makeVehicle(npc);
        this.npcMeshes.set(npc.id, mesh);
        this.dynamic.add(mesh);
      }
      mesh.position.set(npc.x, 0, npc.y);
      mesh.rotation.y = -npc.heading;
    }
    for (const [id, mesh] of this.npcMeshes) {
      if (!alive.has(id)) {
        this.dynamic.remove(mesh);
        this.npcMeshes.delete(id);
      }
    }
  }

  updateRain(dt) {
    const pos = this.rain.geometry.attributes.position;
    const cam = this.camera.position;
    this.rain.userData.drops.forEach((d, i) => {
      d.y -= 700 * dt;
      if (d.y < 0) {
        d.y = 400;
        d.x = (Math.random() - 0.5) * 1400;
        d.z = (Math.random() - 0.5) * 1400;
      }
      const x = cam.x + d.x;
      const z = cam.z + d.z;
      pos.setXYZ(i * 2, x, d.y, z);
      pos.setXYZ(i * 2 + 1, x - 3, d.y - 18, z);
    });
    pos.needsUpdate = true;
  }
}

import * as THREE from 'three';

// Low-poly bike + rider built from primitives. Faces +x; root yaw = -heading, inner group leans.
export default class BikeModel {
  constructor(scene) {
    this.root = new THREE.Group();
    this.lean = new THREE.Group();
    this.root.add(this.lean);
    const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
    const add = (geo, material, x, y, z) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.lean.add(m);
      return m;
    };

    const tyre = mat(0x1a1a1a);
    this.wheels = [14, -14].map((x) => add(new THREE.CylinderGeometry(7.5, 7.5, 4, 14).rotateX(Math.PI / 2), tyre, x, 7.5, 0));
    add(new THREE.BoxGeometry(30, 7, 7), mat(0xd62828), 0, 15, 0);           // frame
    add(new THREE.BoxGeometry(12, 7, 9), mat(0xb51f1f), 6, 19, 0);           // tank
    add(new THREE.BoxGeometry(14, 3, 9), mat(0x222222), -6, 19, 0);          // seat
    add(new THREE.BoxGeometry(3, 3, 20), mat(0x999999), 13, 25, 0);          // handlebar
    add(new THREE.BoxGeometry(3, 5, 6), mat(0xfff3b0), 17, 19, 0);           // headlamp
    // rider
    const shirt = mat(0x1d3557);
    const torso = add(new THREE.BoxGeometry(8, 15, 12), shirt, -3, 30, 0);
    torso.rotation.z = -0.35; // leaning forward
    add(new THREE.BoxGeometry(12, 3, 3), shirt, 5, 30, 5).rotation.y = -0.2;  // arms
    add(new THREE.BoxGeometry(12, 3, 3), shirt, 5, 30, -5).rotation.y = 0.2;
    add(new THREE.BoxGeometry(10, 4, 4), mat(0x2b2d42), -4, 20, 5);           // legs
    add(new THREE.BoxGeometry(10, 4, 4), mat(0x2b2d42), -4, 20, -5);
    add(new THREE.SphereGeometry(6, 12, 10), mat(0xf1c40f), 1, 41, 0);       // helmet
    add(new THREE.BoxGeometry(3, 4, 9), mat(0x222222), 6, 41, 0);            // visor

    scene.add(this.root);
  }

  // bike: BikePhysics
  sync(bike, dt) {
    this.root.position.set(bike.x, 0, bike.y);
    this.root.rotation.y = -bike.heading;
    const speedFrac = Math.min(1, Math.abs(bike.speed) / 160);
    const fallen = bike.stun > 0.15;
    const targetLean = fallen ? 1.2 : bike.steer * 0.4 * speedFrac; // lean into the turn, or lie down after a crash
    this.lean.rotation.x += (targetLean - this.lean.rotation.x) * Math.min(1, dt * (fallen ? 14 : 8));
    for (const w of this.wheels) w.rotation.z -= (bike.speed / 7.5) * dt;
  }
}

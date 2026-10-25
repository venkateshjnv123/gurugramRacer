import * as THREE from 'three';

// C cycles these. dist/height behind the bike, look = how far ahead to aim.
export const CAMERA_MODES = [
  { name: 'High', dist: 190, height: 120, look: 90 },
  { name: 'Mid', dist: 120, height: 60, look: 90 },
  { name: 'Close', dist: 80, height: 44, look: 80 },
];

export default class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 0;
    this.yaw = null; // smoothed heading the camera follows
    this.shake = 0;
    this.shakeAmp = 3;
  }

  // camera shake for `time` seconds with `amp` world units
  kick(time, amp) {
    this.shake = Math.max(this.shake, time);
    this.shakeAmp = amp;
  }

  cycle() {
    this.mode = (this.mode + 1) % CAMERA_MODES.length;
    return CAMERA_MODES[this.mode].name;
  }

  update(bike, dt) {
    const m = CAMERA_MODES[this.mode];
    if (this.yaw === null) this.yaw = bike.heading;
    // follow the heading with a little lag so turns feel smooth
    let d = bike.heading - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 5);
    const fx = Math.cos(this.yaw);
    const fz = Math.sin(this.yaw);

    const target = new THREE.Vector3(bike.x - fx * m.dist, m.height, bike.y - fz * m.dist);
    if (!this.placed) {
      this.camera.position.copy(target);
      this.placed = true;
    } else {
      this.camera.position.lerp(target, Math.min(1, dt * 6));
    }
    if (this.shake > 0) {
      this.shake -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp;
    }
    this.camera.lookAt(bike.x + fx * m.look, 12, bike.y + fz * m.look);
  }
}

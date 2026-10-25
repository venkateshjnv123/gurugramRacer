import Phaser from 'phaser';
import { BIKE } from '../config.js';

// Car-style steering on a scalar speed + heading. Walls come from RoadNet (road-only movement).
export default class Bike {
  constructor(scene, net, x, y, heading) {
    this.scene = scene;
    this.net = net;
    this.x = x;
    this.y = y;
    this.heading = heading; // radians, 0 = right
    this.speed = 0;
    this.speedMultiplier = 1; // set by events (waterlogging etc.)
    this.surface = 'junction';
    this.sprite = scene.add.image(x, y, 'bike').setDepth(10);
    this.potholeCooldown = 0;
  }

  get vx() {
    return Math.cos(this.heading) * this.speed;
  }

  get vy() {
    return Math.sin(this.heading) * this.speed;
  }

  update(dt, input) {
    this.surface = this.net.surfaceAt(this.x, this.y);
    let max = BIKE.maxSpeed * this.speedMultiplier;
    if (this.surface === 'gali') max *= BIKE.galiMultiplier;

    if (input.brake) {
      this.speed = approach(this.speed, 0, BIKE.brake * dt);
    } else if (input.up) {
      this.speed += BIKE.accel * dt;
    } else if (input.down) {
      this.speed -= (this.speed > 0 ? BIKE.brake : BIKE.accel) * dt;
    } else {
      this.speed = approach(this.speed, 0, BIKE.drag * dt);
    }
    if (this.speed > max) this.speed = approach(this.speed, max, BIKE.brake * dt);
    this.speed = Math.max(-BIKE.reverseSpeed, this.speed);

    // steering scales with speed so you can't spin on the spot
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const grip = Math.min(1, Math.abs(this.speed) / 50) * Math.sign(this.speed);
    this.heading += steer * Phaser.Math.DegToRad(BIKE.turnRate) * grip * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.hitWall = false;
    const c = this.net.clamp(this.x, this.y, BIKE.radius);
    if (c) {
      this.x = c.x;
      this.y = c.y;
      // how hard are we driving into the wall?
      const into = -(Math.cos(this.heading) * c.nx + Math.sin(this.heading) * c.ny);
      this.speed *= into > 0.7 && this.speed > 60 ? 0.4 : BIKE.wallScrape;
      this.hitWall = true;
    }

    if (this.surface === 'gali' && Math.abs(this.speed) > 50) {
      this.potholeCooldown -= dt;
      if (this.potholeCooldown <= 0) {
        this.scene.cameras.main.shake(120, 0.004);
        this.potholeCooldown = Phaser.Math.FloatBetween(0.6, 1.4);
      }
    }

    this.sprite.setPosition(this.x, this.y);
    this.sprite.setRotation(this.heading + Math.PI / 2);
  }

  // Knock back after hitting something solid
  bounce(fromX, fromY, strength = 1) {
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.x += Math.cos(a) * 12 * strength;
    this.y += Math.sin(a) * 12 * strength;
    this.speed = -Math.abs(this.speed) * 0.3 * strength;
  }
}

function approach(v, target, step) {
  return v > target ? Math.max(target, v - step) : Math.min(target, v + step);
}

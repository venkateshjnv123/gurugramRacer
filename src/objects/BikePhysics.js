import { BIKE } from '../config.js';

// Engine-free bike: car-style steering on a scalar speed + heading. Walls come from RoadNet
// (road-only movement). Used by core/Game; the 3D view only draws it.
export default class BikePhysics {
  constructor(net, x, y, heading) {
    this.net = net;
    this.x = x;
    this.y = y;
    this.heading = heading; // radians, 0 = +x; increasing = turning right
    this.speed = 0;
    this.speedMultiplier = 1; // set by events (waterlogging etc.)
    this.surface = 'junction';
    this.hitWall = false;
    this.onWall = false;
    this.steer = 0; // -1..1, eased steering (also leans the 3D model)
    this.potholeCooldown = 0;
    this.stun = 0;  // crashed: down for a moment, no control
    this.stall = 0; // engine flooded: no throttle
    this.grip = 1;  // < 1 on wet roads
  }

  get vx() {
    return Math.cos(this.heading) * this.speed;
  }

  get vy() {
    return Math.sin(this.heading) * this.speed;
  }

  // Advances by dt, in fixed sub-steps so handling is the same at any frame rate.
  // Returns { pothole } so the renderer can shake the camera.
  step(dt, input) {
    let pothole = false;
    this.hitWall = false;
    let left = dt;
    while (left > 1e-6) {
      const h = Math.min(left, BIKE.subStep);
      if (this.subStep(h, input)) pothole = true;
      left -= h;
    }
    return { pothole };
  }

  subStep(dt, input) {
    this.surface = this.net.surfaceAt(this.x, this.y);
    let max = BIKE.maxSpeed * this.speedMultiplier;
    if (this.surface === 'gali') max *= BIKE.galiMultiplier;

    if (this.stun > 0 || this.stall > 0) {
      this.speed = approach(this.speed, 0, (this.stun > 0 ? 400 : 200) * dt);
      this.stun = Math.max(0, this.stun - dt);
      this.stall = Math.max(0, this.stall - dt);
      input = {};
    } else if (input.brake || (input.down && this.speed > 0)) {
      this.speed = approach(this.speed, 0, BIKE.brake * this.grip * dt);
    } else if (input.up) {
      const fade = this.speed > 0 ? 1 - BIKE.accelFade * Math.min(1, this.speed / BIKE.maxSpeed) : 1;
      this.speed += BIKE.accel * fade * dt;
    } else if (input.down) {
      this.speed -= BIKE.accel * dt;
    } else {
      this.speed = approach(this.speed, 0, BIKE.drag * dt);
    }
    if (this.speed > max) this.speed = approach(this.speed, max, BIKE.brake * dt);
    this.speed = Math.max(-BIKE.reverseSpeed, this.speed);

    // steering eases in/out instead of snapping; turn rate drops as speed rises
    const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const rate = want === 0 || Math.sign(want) !== Math.sign(this.steer) ? BIKE.steerOut : BIKE.steerIn;
    this.steer = approach(this.steer, want, rate * dt);
    const speedFrac = Math.min(1, Math.abs(this.speed) / BIKE.maxSpeed);
    const turnRate = (BIKE.turnRate + (BIKE.turnRateFast - BIKE.turnRate) * speedFrac) * (0.5 + 0.5 * this.grip);
    const grip = Math.min(1, Math.abs(this.speed) / 50) * Math.sign(this.speed);
    this.heading += this.steer * (turnRate * Math.PI / 180) * grip * dt;
    if (Math.abs(this.steer) > 0.5 && speedFrac > 0.6) this.speed -= BIKE.cornerDrag * Math.abs(this.steer) * dt;

    // hands off on a road: settle back along it, so small corrections don't leave you drifting
    if (want === 0 && this.speed > 20 && this.surface !== 'junction') {
      const road = this.net.roadAt(this.x, this.y);
      if (road) {
        const along = Math.atan2(road.dy, road.dx);
        let d = along - this.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > Math.PI / 2) d = Math.atan2(Math.sin(d + Math.PI), Math.cos(d + Math.PI));
        if (Math.abs(d) < BIKE.assistAngle * Math.PI / 180) this.heading += d * Math.min(1, BIKE.assist * dt);
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const c = this.net.clamp(this.x, this.y, BIKE.radius);
    if (c) {
      this.x = c.x;
      this.y = c.y;
      this.hitWall = true;
      // how hard are we driving into the kerb? (1 = head-on)
      const into = -(Math.cos(this.heading) * c.nx + Math.sin(this.heading) * c.ny) * Math.sign(this.speed || 1);
      if (into > 0) {
        if (!this.onWall && into > 0.7 && Math.abs(this.speed) > 60) this.speed *= BIKE.wallImpact;
        this.speed *= Math.exp(-BIKE.wallFriction * into * dt);
        // slide: ease the heading parallel to the kerb so you glide off it instead of grinding
        const tx = -c.ny;
        const ty = c.nx;
        const along = Math.cos(this.heading) * tx + Math.sin(this.heading) * ty >= 0 ? 1 : -1;
        const tangent = Math.atan2(ty * along, tx * along);
        let d = tangent - this.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (this.speed < 0) d = 0; // reversing: don't spin the bike
        this.heading += d * Math.min(1, BIKE.wallSlide * dt);
      }
    }
    this.onWall = !!c;

    if (this.surface === 'gali' && Math.abs(this.speed) > 50) {
      this.potholeCooldown -= dt;
      if (this.potholeCooldown <= 0) {
        this.potholeCooldown = 0.6 + Math.random() * 0.8;
        return true;
      }
    }
    return false;
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

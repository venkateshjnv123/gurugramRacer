import { NIGHT } from '../config.js';

// Darkness layer with a headlight cut out of it, NPC tail lights on top, and drifting fog.
export default class NightFog {
  constructor(scene, { dark, fog }) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.time = 0;
    const { width, height } = scene.scale;

    if (dark) {
      this.rt = scene.add.renderTexture(0, 0, width, height).setOrigin(0).setScrollFactor(0).setDepth(50);
      this.cone = scene.make.image({ key: 'headlight', add: false }).setOrigin(0, 0.5);
      this.glow = scene.make.image({ key: 'glow', add: false });
      this.beacon = scene.make.image({ key: 'glow', add: false }).setScale(1.6);
      this.lights = scene.add.graphics().setDepth(51);
    }
    if (fog && !dark) {
      // daytime smog: flat haze under the drifting fog
      this.haze = scene.add.rectangle(0, 0, width, height, 0xd8d4cc, NIGHT.dayHaze).setOrigin(0).setScrollFactor(0).setDepth(51);
    }
    if (fog) {
      // at night the fog sits under the darkness, so you only see it where your headlight hits it
      this.fog = scene.add.tileSprite(0, 0, width, height, 'fog').setOrigin(0).setScrollFactor(0)
        .setDepth(dark ? 49 : 52).setAlpha(dark ? NIGHT.fogAlpha * 1.4 : NIGHT.dayFogAlpha);
    }

    scene.scale.on('resize', this.resize, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.resize, this));
  }

  resize(size) {
    this.rt?.resize(size.width, size.height);
    this.fog?.setSize(size.width, size.height);
    this.haze?.setSize(size.width, size.height);
  }

  update(dt) {
    this.time += dt;
    const { scene, cam } = this;
    const view = cam.worldView;
    const bike = scene.bike;

    if (this.rt) {
      const sx = (bike.x - view.x) * cam.zoom;
      const sy = (bike.y - view.y) * cam.zoom;
      this.rt.clear().fill(0x05060f, NIGHT.darkness);
      this.cone.setRotation(bike.heading);
      this.rt.erase(this.cone, sx, sy);
      this.rt.erase(this.glow, sx, sy);
      // the destination glows so you can find it
      const t = scene.target;
      this.rt.erase(this.beacon, (t.x - view.x) * cam.zoom, (t.y - view.y) * cam.zoom);
      this.drawLights();
    }

    if (this.fog) {
      this.fog.tilePositionX = view.x * 0.6 + this.time * NIGHT.fogDrift[0];
      this.fog.tilePositionY = view.y * 0.6 + this.time * NIGHT.fogDrift[1];
    }
  }

  // Red tail lights (and dim headlights) of nearby NPCs, drawn above the darkness
  drawLights() {
    const g = this.lights.clear();
    const b = this.scene.bike;
    for (const npc of this.scene.traffic.npcs) {
      if (Math.hypot(npc.x - b.x, npc.y - b.y) > NIGHT.tailLightRange) continue;
      const c = Math.cos(npc.heading);
      const s = Math.sin(npc.heading);
      const side = npc.w / 2 - 4;
      if (!npc.noTailLights) {
        const rx = npc.x - c * npc.h / 2;
        const ry = npc.y - s * npc.h / 2;
        g.fillStyle(0xff2020, 0.95);
        g.fillCircle(rx - s * side, ry + c * side, 3).fillCircle(rx + s * side, ry - c * side, 3);
      }
      const fx = npc.x + c * npc.h / 2;
      const fy = npc.y + s * npc.h / 2;
      g.fillStyle(0xfff4c0, 0.6);
      g.fillCircle(fx - s * side, fy + c * side, 3).fillCircle(fx + s * side, fy - c * side, 3);
    }
  }
}

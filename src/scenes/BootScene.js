import Phaser from 'phaser';
import { COLORS } from '../config.js';

// Generates all textures in code, then starts the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.makeBike();
    this.makeUi();
    this.makeVehicles();
    this.scene.start('Menu');
  }

  // Draw with a throwaway Graphics, bake to a texture.
  bake(key, w, h, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeUi() {
    // destination ring
    this.bake('target', 120, 120, (g) => {
      g.lineStyle(8, 0x2ecc71, 1).strokeCircle(60, 60, 52);
      g.lineStyle(3, 0xffffff, 0.9).strokeCircle(60, 60, 40);
      g.fillStyle(0x2ecc71, 0.25).fillCircle(60, 60, 40);
    });
    // off-screen pointer, points RIGHT
    this.bake('arrow', 40, 32, (g) => {
      g.fillStyle(0x2ecc71).fillTriangle(0, 0, 40, 16, 0, 32);
      g.lineStyle(3, 0xffffff).strokeTriangle(1, 1, 38, 16, 1, 31);
    });
  }

  makeVehicles() {
    COLORS.cars.forEach((c, i) => this.bake(`car${i}`, 22, 44, (g) => this.drawCar(g, 22, 44, c)));
    this.bake('thar', 26, 46, (g) => {
      this.drawCar(g, 26, 46, 0x151515);
      g.fillStyle(0x333333).fillRect(4, 30, 18, 12);     // open back
      g.fillStyle(0xffffff).fillCircle(13, 36, 4);        // spare wheel cover
    });
    this.bake('auto', 20, 32, (g) => {
      g.fillStyle(0x111111).fillRect(1, 24, 4, 7).fillRect(15, 24, 4, 7).fillRect(8, 0, 4, 6); // wheels
      g.fillStyle(0x2f8f3a).fillRoundedRect(2, 3, 16, 27, 6);  // green body
      g.fillStyle(0xf2c014).fillRoundedRect(3, 10, 14, 18, 4); // yellow canopy
      g.fillStyle(0x9fd3e8).fillRect(5, 5, 10, 4);             // windscreen
    });
    this.bake('bus', 26, 90, (g) => {
      g.fillStyle(0xd35400).fillRoundedRect(0, 0, 26, 90, 4);
      g.fillStyle(0xf5f5f5).fillRect(3, 8, 20, 74);
      g.fillStyle(0x9fd3e8).fillRect(3, 2, 20, 6);
      g.fillStyle(0xd35400).fillRect(3, 30, 20, 3).fillRect(3, 55, 20, 3);
    });
    this.bake('truck', 26, 80, (g) => {
      g.fillStyle(0x2e86c1).fillRoundedRect(1, 0, 24, 18, 3);  // cabin
      g.fillStyle(0x9fd3e8).fillRect(4, 2, 18, 5);
      g.fillStyle(0xb7950b).fillRect(0, 20, 26, 60);           // load
      g.lineStyle(2, 0x7d6608).strokeRect(1, 21, 24, 58);
      g.lineBetween(1, 21, 25, 79).lineBetween(25, 21, 1, 79);
    });
    // white dot, tinted at runtime (signal lights, tail lights)
    this.bake('dot', 16, 16, (g) => g.fillStyle(0xffffff).fillCircle(8, 8, 8));
    // horn ripple
    this.bake('ring', 64, 64, (g) => g.lineStyle(4, 0xffffff, 1).strokeCircle(32, 32, 29));
  }

  drawCar(g, w, h, color) {
    g.fillStyle(0x000000, 0.3).fillRoundedRect(1, 2, w - 1, h - 2, 5); // shadow
    g.fillStyle(color).fillRoundedRect(0, 0, w - 1, h - 1, 5);
    g.fillStyle(0x1b2631, 0.85).fillRect(3, h * 0.22, w - 7, h * 0.16);  // windscreen
    g.fillStyle(0x1b2631, 0.6).fillRect(3, h * 0.72, w - 7, h * 0.1);   // rear glass
    g.fillStyle(0xfff3b0).fillRect(2, 0, 4, 2).fillRect(w - 7, 0, 4, 2); // headlights
  }

  // All vehicle textures point UP (front at y = 0).
  makeBike() {
    this.bake('bike', 20, 40, (g) => {
      g.fillStyle(0x111111).fillRoundedRect(7, 0, 6, 10, 2);   // front tyre
      g.fillStyle(0x111111).fillRoundedRect(7, 30, 6, 10, 2);  // rear tyre
      g.fillStyle(0xd62828).fillRoundedRect(5, 7, 10, 26, 4);  // body
      g.fillStyle(0x888888).fillRect(0, 9, 20, 3);             // handlebar
      g.fillStyle(0x1d3557).fillEllipse(10, 22, 16, 12);       // rider shoulders
      g.fillStyle(0xf1c40f).fillCircle(10, 21, 6);             // helmet
      g.fillStyle(0x222222).fillRect(6, 16, 8, 3);             // visor
    });
  }
}

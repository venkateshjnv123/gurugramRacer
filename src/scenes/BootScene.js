import Phaser from 'phaser';

// Generates all textures in code, then starts the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.makeBike();
    this.makeUi();
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

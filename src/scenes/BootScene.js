import Phaser from 'phaser';

// Generates all textures in code, then starts the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.makeBike();
    this.scene.start('Menu');
  }

  // Draw with a throwaway Graphics, bake to a texture.
  bake(key, w, h, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
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

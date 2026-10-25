import Phaser from 'phaser';

// Generates all textures in code (Phase 1+), then starts the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Menu');
  }
}

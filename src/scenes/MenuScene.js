import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Gurugram Racer\n\nEnter dabao', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Game'));
  }
}

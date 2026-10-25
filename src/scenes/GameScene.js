import Phaser from 'phaser';
import { WORLD, COLORS } from '../config.js';
import RoadNet from '../systems/RoadNet.js';
import MapRenderer from '../systems/MapRenderer.js';
import Bike from '../objects/Bike.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.net = new RoadNet();
    new MapRenderer(this, this.net);

    const start = this.net.junction('ambience');
    const next = this.net.junction('cyberhub');
    this.bike = new Bike(this, this.net, start.x, start.y, Math.atan2(next.y - start.y, next.x - start.x));

    const cam = this.cameras.main;
    cam.setBackgroundColor(COLORS.ground);
    cam.setBounds(0, 0, WORLD.width, WORLD.height);
    cam.startFollow(this.bike.sprite, true, 0.12, 0.12);

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SHIFT,SPACE,ESC,M');
    if (import.meta.env.DEV) window.__game = this;
  }

  readInput() {
    const k = this.keys;
    return {
      up: k.UP.isDown || k.W.isDown,
      down: k.DOWN.isDown || k.S.isDown,
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      brake: k.SHIFT.isDown,
    };
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.bike.update(dt, this.readInput());
  }
}

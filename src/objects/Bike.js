import BikePhysics from './BikePhysics.js';

// Phaser view of the shared bike physics.
export default class Bike extends BikePhysics {
  constructor(scene, net, x, y, heading) {
    super(net, x, y, heading);
    this.scene = scene;
    this.sprite = scene.add.image(x, y, 'bike').setDepth(10);
  }

  update(dt, input) {
    const { pothole } = this.step(dt, input);
    if (pothole) this.scene.cameras.main.shake(120, 0.004);
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setRotation(this.heading + Math.PI / 2);
  }
}

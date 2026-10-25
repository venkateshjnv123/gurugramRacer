import Phaser from 'phaser';
import { MISSIONS } from '../data/missions.js';
import { UI } from '../data/jokes.js';
import { getBest } from '../systems/Save.js';
import { formatDuration } from '../systems/Clock.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.selected = data?.selected ?? 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1b1b24');
    this.items = [];
    this.title = this.add.text(0, 0, 'GURUGRAM RACER', {
      fontFamily: 'sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#f1c40f',
    }).setOrigin(0.5);

    MISSIONS.forEach((m, i) => {
      const t = this.add.text(0, 0, `${i + 1}. ${m.title}`, {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff', padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => this.startMission(i));
      this.items.push(t);
    });

    this.brief = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#cfcfcf', align: 'center',
      wordWrap: { width: 640 },
    }).setOrigin(0.5);
    this.hint = this.add.text(0, 0, `${UI.menuHint}\n${UI.controls}`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#888888', align: 'center',
    }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.select((this.selected + MISSIONS.length - 1) % MISSIONS.length));
    kb.on('keydown-DOWN', () => this.select((this.selected + 1) % MISSIONS.length));
    kb.on('keydown-W', () => this.select((this.selected + MISSIONS.length - 1) % MISSIONS.length));
    kb.on('keydown-S', () => this.select((this.selected + 1) % MISSIONS.length));
    kb.on('keydown-ENTER', () => this.startMission(this.selected));
    kb.on('keydown-SPACE', () => this.startMission(this.selected));

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.select(this.selected);
  }

  layout() {
    const { width, height } = this.scale;
    const top = Math.max(60, height / 2 - 260);
    this.title.setPosition(width / 2, top);
    this.items.forEach((t, i) => t.setPosition(width / 2, top + 110 + i * 52));
    this.brief.setPosition(width / 2, top + 110 + MISSIONS.length * 52 + 50);
    this.hint.setPosition(width / 2, height - 50);
  }

  select(i) {
    this.selected = i;
    this.items.forEach((t, j) => {
      t.setColor(j === i ? '#1b1b24' : '#ffffff');
      t.setBackgroundColor(j === i ? '#f1c40f' : 'transparent');
    });
    const m = MISSIONS[i];
    const best = getBest(m.id);
    this.brief.setText(`${m.brief}\n\n${best === null ? UI.noBest : UI.best(formatDuration(best))}`);
  }

  startMission(i) {
    this.scene.start('Game', { missionId: MISSIONS[i].id });
  }
}

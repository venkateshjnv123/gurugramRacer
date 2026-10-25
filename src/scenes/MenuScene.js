import Phaser from 'phaser';
import { MISSIONS } from '../data/missions.js';
import { UI } from '../data/jokes.js';
import { getBest, load, save } from '../systems/Save.js';
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

    this.tagline = this.add.text(0, 0, UI.tagline, {
      fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'italic', color: '#cfcfcf',
    }).setOrigin(0.5);
    this.bikeIcon = this.add.image(0, 0, 'bike').setRotation(Math.PI / 2).setScale(1.6);

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
    this.fogText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#9fb3c8', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.fogText.on('pointerdown', () => this.toggleFog());
    this.updateFogText();

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
    kb.on('keydown-F', () => this.toggleFog());

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.select(this.selected);
  }

  layout() {
    const { width, height } = this.scale;
    const top = Math.max(60, height / 2 - 260);
    this.title.setPosition(width / 2, top);
    this.tagline.setPosition(width / 2, top + 48);
    this.tweens.killTweensOf(this.bikeIcon);
    this.bikeIcon.setPosition(width / 2 - 260, top + 78);
    this.tweens.add({ targets: this.bikeIcon, x: width / 2 + 260, duration: 2600, yoyo: true, repeat: -1,
      onYoyo: () => this.bikeIcon.setRotation(-Math.PI / 2), onRepeat: () => this.bikeIcon.setRotation(Math.PI / 2) });
    this.items.forEach((t, i) => t.setPosition(width / 2, top + 130 + i * 50));
    this.brief.setPosition(width / 2, top + 130 + MISSIONS.length * 50 + 40);
    this.fogText.setPosition(width / 2, height - 100);
    this.hint.setPosition(width / 2, height - 50);
  }

  toggleFog() {
    save('ncrFog', !load('ncrFog', false));
    this.updateFogText();
  }

  updateFogText() {
    this.fogText.setText(UI.fogToggle(load('ncrFog', false)));
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

import Phaser from 'phaser';
import { MISSIONS } from '../data/missions.js';
import { UI, ROASTS, PRAISE } from '../data/jokes.js';
import { formatDuration } from '../systems/Clock.js';
import { submitBest, worstJunction } from '../systems/Save.js';
import { JUNCTIONS } from '../data/map.js';

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const r = this.result;
    const index = MISSIONS.findIndex((m) => m.id === r.missionId);
    const mission = MISSIONS[index];
    const newBest = r.win && submitBest(r.missionId, r.taken);

    this.cameras.main.setBackgroundColor(r.win ? '#14301f' : '#301414');

    const lines = [
      { text: mission.title, size: 24, color: '#cccccc' },
      { text: r.win ? UI.win : UI.fail, size: 52, color: r.win ? '#2ecc71' : '#ff4d4d' },
    ];
    if (r.win) {
      lines.push({ text: '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), size: 56, color: '#f1c40f' });
      lines.push({ text: UI.timeTaken(formatDuration(r.taken)), size: 26, color: '#ffffff' });
      if (newBest) lines.push({ text: UI.newBest, size: 24, color: '#f1c40f' });
    } else {
      lines.push({ text: r.reason, size: 26, color: '#ffffff' });
    }
    for (const e of r.extra ?? []) lines.push({ text: e, size: 22, color: '#f5cba7' });
    lines.push({ text: `"${Phaser.Utils.Array.GetRandom(r.win ? PRAISE : ROASTS)}"`, size: 22, color: '#dddddd' });
    const worst = !r.win && worstJunction();
    if (worst) lines.push({ text: UI.rageQuit(JUNCTIONS.find((j) => j.id === worst).name), size: 18, color: '#ff9f80' });
    lines.push({ text: `${UI.retry}    ${UI.next}    ${UI.share}    ${UI.menu}`, size: 18, color: '#999999' });

    this.texts = lines.map((l) => this.add.text(0, 0, l.text, {
      fontFamily: 'sans-serif', fontSize: `${l.size}px`, fontStyle: 'bold', color: l.color,
      align: 'center', wordWrap: { width: 700 },
    }).setOrigin(0.5));

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    const kb = this.input.keyboard;
    kb.once('keydown-R', () => this.scene.start('Game', { missionId: mission.id }));
    kb.once('keydown-N', () => this.scene.start('Game', { missionId: MISSIONS[(index + 1) % MISSIONS.length].id }));
    kb.once('keydown-ESC', () => this.scene.start('Menu', { selected: index }));
    kb.on('keydown-S', () => this.share(mission));
    this.status = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#2ecc71', align: 'center', wordWrap: { width: 700 },
    }).setOrigin(0.5);
    this.texts[this.texts.length - 1].setInteractive({ useHandCursor: true }).on('pointerdown', () => this.share(mission));
    this.layout();
  }

  layout() {
    const { width, height } = this.scale;
    let y = height / 2 - 200;
    for (const t of this.texts) {
      t.setPosition(width / 2, y + t.height / 2);
      y += t.height + 18;
    }
    this.status?.setPosition(width / 2, y + 20);
  }

  async share(mission) {
    const r = this.result;
    const url = window.location.origin + window.location.pathname;
    const from = JUNCTIONS.find((j) => j.id === mission.from).name;
    const to = JUNCTIONS.find((j) => j.id === mission.to).name;
    const text = r.win ? UI.shareWin(formatDuration(r.taken), from, to, url) : UI.shareFail(mission.title, url);
    try {
      await navigator.clipboard.writeText(text);
      this.status.setColor('#2ecc71').setText(UI.copied);
    } catch {
      this.status.setColor('#f1c40f').setText(UI.copyFailed + url);
    }
  }
}

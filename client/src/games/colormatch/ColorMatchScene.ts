import Phaser from 'phaser';
import { ColorMatchEffectManager } from './ColorMatchEffectManager';

export type GameConfig = {
  cols: number;
  rows: number;
  dropMs: number;
  onScore: (score: number) => void;
  onGameOver: () => void;
};

const COLORS = [0xFF5252, 0x448AFF, 0xFFD740, 0x69F0AE, 0xEA80FC];
const BLOCK_SIZE = 34;

export default class ColorMatchScene extends Phaser.Scene {
  private grid: number[][] = [];
  private blocks: (Phaser.GameObjects.Rectangle | null)[][] = [];
  private currentCol = 0;
  private currentRow = 0;
  private dropping = false;
  private alive = false;
  private paused = false;
  private score = 0;
  private timer!: Phaser.Time.TimerEvent;
  private config!: GameConfig;
  private cols = 6;
  private rows = 11;
  private effects!: ColorMatchEffectManager;
  private pointerStartY = 0;

  constructor() {
    super({ key: 'ColorMatchScene' });
  }

  startGame(config: GameConfig) {
    this.config = config;
    this.cols = config.cols;
    this.rows = config.rows;
    this.alive = true;
    this.paused = false;
    this.score = 0;
    this.dropping = false;

    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.blocks = Array.from({ length: this.rows }, () => Array<Phaser.GameObjects.Rectangle | null>(null));

    this.children.list
      .filter(obj => obj.getData && obj.getData('block') === true)
      .forEach(obj => obj.destroy());

    this.drawBackground();
    this.effects = new ColorMatchEffectManager(this);
    this.startTimer();
    this.spawn();
  }

  restart(config: GameConfig) {
    this.startGame(config);
  }

  pause() {
    if (!this.alive || this.paused) return;
    this.paused = true;
    this.timer?.remove();
  }

  resume() {
    if (!this.alive || !this.paused) return;
    this.paused = false;
    this.startTimer();
  }

  togglePause() {
    if (this.paused) this.resume();
    else this.pause();
  }

  stopGame() {
    this.alive = false;
    this.paused = false;
    this.timer?.remove();
  }

  private startTimer() {
    this.timer?.remove();
    this.timer = this.time.addEvent({
      delay: this.config.dropMs,
      loop: true,
      callback: () => this.tick(),
    });
  }

  private drawBackground() {
    this.children.list
      .filter(obj => obj.getData && obj.getData('bg') === true)
      .forEach(obj => obj.destroy());

    const w = this.cols * BLOCK_SIZE;
    const h = this.rows * BLOCK_SIZE;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0f0f1a).setData('bg', true);

    const g = this.add.graphics().setData('bg', true);
    g.lineStyle(1, 0x1a1a3e, 1);
    for (let r = 0; r <= this.rows; r++) {
      g.moveTo(0, r * BLOCK_SIZE);
      g.lineTo(w, r * BLOCK_SIZE);
    }
    for (let c = 0; c <= this.cols; c++) {
      g.moveTo(c * BLOCK_SIZE, 0);
      g.lineTo(c * BLOCK_SIZE, h);
    }
    g.strokePath();
  }

  create() {
    // 键盘控制（桌面）
    this.input.keyboard!.on('keydown-LEFT', () => this.move(-1));
    this.input.keyboard!.on('keydown-RIGHT', () => this.move(1));
    this.input.keyboard!.on('keydown-SPACE', () => this.hardDrop());
    this.input.keyboard!.on('keydown-P', () => this.togglePause());

    // 触摸控制（手机）
    // 左半屏 = 左移，右半屏 = 右移
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.dropping || !this.alive || this.paused) return;
      this.pointerStartY = pointer.y;
      const half = this.scale.width / 2;
      if (pointer.x < half) {
        this.move(-1);
      } else {
        this.move(1);
      }
    });

    // 下滑手势 = 硬降
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dropping || !this.alive || this.paused) return;
      if (pointer.y - this.pointerStartY > 60) {
        this.hardDrop();
      }
    });
  }

  private tick() {
    if (!this.dropping || !this.alive || this.paused) return;

    const nextRow = this.currentRow + 1;
    if (nextRow < this.rows && this.grid[nextRow][this.currentCol] === 0) {
      this.grid[nextRow][this.currentCol] = this.grid[this.currentRow][this.currentCol];
      this.grid[this.currentRow][this.currentCol] = 0;

      const rect = this.blocks[this.currentRow][this.currentCol]!;
      this.blocks[nextRow][this.currentCol] = rect;
      this.blocks[this.currentRow][this.currentCol] = null;

      rect.y = nextRow * BLOCK_SIZE + BLOCK_SIZE / 2;
      this.currentRow = nextRow;
    } else {
      this.dropping = false;
      this.time.delayedCall(100, () => this.checkAndClear());
    }
  }

  private spawn() {
    if (!this.alive) return;

    this.currentCol = Math.floor(this.cols / 2);
    this.currentRow = 0;
    const color = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];

    if (this.grid[0][this.currentCol] !== 0) {
      this.alive = false;
      this.timer?.remove();
      this.config.onGameOver();
      return;
    }

    this.grid[0][this.currentCol] = color;
    const rect = this.add.rectangle(
      this.currentCol * BLOCK_SIZE + BLOCK_SIZE / 2,
      -BLOCK_SIZE,
      BLOCK_SIZE - 3,
      BLOCK_SIZE - 3,
      color
    ).setData('block', true);

    this.blocks[0][this.currentCol] = rect;
    this.dropping = true;

    this.tweens.add({
      targets: rect,
      y: BLOCK_SIZE / 2,
      duration: 130,
      ease: 'Quad.easeOut',
    });
  }

  private move(dir: number) {
    if (!this.dropping || !this.alive || this.paused) return;
    const nc = this.currentCol + dir;
    if (nc < 0 || nc >= this.cols) return;
    if (this.grid[this.currentRow][nc] !== 0) return;

    this.grid[this.currentRow][nc] = this.grid[this.currentRow][this.currentCol];
    this.grid[this.currentRow][this.currentCol] = 0;

    const rect = this.blocks[this.currentRow][this.currentCol]!;
    this.blocks[this.currentRow][nc] = rect;
    this.blocks[this.currentRow][this.currentCol] = null;

    this.currentCol = nc;
    rect.x = nc * BLOCK_SIZE + BLOCK_SIZE / 2;
  }

  private hardDrop() {
    if (!this.dropping || !this.alive || this.paused) return;
    while (this.dropping) this.tick();
  }

  private checkAndClear() {
    const visited: boolean[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const groups: { r: number; c: number }[][] = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 0 || visited[r][c]) continue;
        const color = this.grid[r][c];
        const stack: { r: number; c: number }[] = [{ r, c }];
        const group: { r: number; c: number }[] = [];

        while (stack.length) {
          const { r: cr, c: cc } = stack.pop()!;
          if (cr < 0 || cr >= this.rows || cc < 0 || cc >= this.cols) continue;
          if (visited[cr][cc]) continue;
          if (this.grid[cr][cc] !== color) continue;

          visited[cr][cc] = true;
          group.push({ r: cr, c: cc });
          stack.push(
            { r: cr - 1, c: cc },
            { r: cr + 1, c: cc },
            { r: cr, c: cc - 1 },
            { r: cr, c: cc + 1 }
          );
        }

        if (group.length >= 3) groups.push(group);
      }
    }

    if (groups.length > 0) {
      let total = 0;
      groups.forEach(g => total += g.length);
      this.score += (total - 2) * 10;
      this.config.onScore(this.score);

      groups.forEach(group => {
        let sumX = 0, sumY = 0;
        group.forEach(({ r, c }) => {
          sumX += c * BLOCK_SIZE + BLOCK_SIZE / 2;
          sumY += r * BLOCK_SIZE + BLOCK_SIZE / 2;
        });
        const centerX = sumX / group.length;
        const centerY = sumY / group.length;

        this.effects.playExplosion(centerX, centerY);

        group.forEach(({ r, c }) => {
          const rect = this.blocks[r][c]!;
          this.tweens.add({
            targets: rect,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 250,
            onComplete: () => rect.destroy(),
          });
          this.grid[r][c] = 0;
          this.blocks[r][c] = null;
        });
      });

      this.time.delayedCall(350, () => this.collapse());
    } else {
      this.spawn();
    }
  }

  private collapse() {
    for (let c = 0; c < this.cols; c++) {
      let wr = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== 0) {
          if (r !== wr) {
            this.grid[wr][c] = this.grid[r][c];
            this.grid[r][c] = 0;
            const rect = this.blocks[r][c]!;
            this.blocks[wr][c] = rect;
            this.blocks[r][c] = null;
            this.tweens.add({
              targets: rect,
              y: wr * BLOCK_SIZE + BLOCK_SIZE / 2,
              duration: 110 + (wr - r) * 12,
              ease: 'Quad.easeIn',
            });
          }
          wr--;
        }
      }
    }

    this.time.delayedCall(280, () => this.checkAndClear());
  }
}
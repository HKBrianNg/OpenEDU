import Phaser from 'phaser';
import { generateTextures, levelConfig } from './config';

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private score = 0;
  private level = 1;
  private lives = 3;
  private enemySpeed = 105;
  private enemyFireRate = 935;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data: { level?: number }) {
    this.level = data.level || 1;
    const cfg = levelConfig[this.level - 1] || levelConfig[9];
    this.enemySpeed = cfg.speed;
    this.enemyFireRate = cfg.fireRate;
    this.lives = cfg.lives;
    this.score = 0;
  }

  preload() {
    generateTextures(this);
  }

  create() {
    this.player = this.physics.add.sprite(400, 558, 'player');
    this.player.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 30 });
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group({ defaultKey: 'enemyBullet', maxSize: 50 });

    this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, { fontSize: '20px', color: '#fff' });
    this.livesText = this.add.text(10, 35, `Lives: ${this.lives}`, { fontSize: '20px', color: '#f44' });

    // 碰撞检测（已修复类型）
    this.physics.add.collider(
      this.bullets, this.enemies,
      this.hitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
    this.physics.add.collider(
      this.player, this.enemies,
      this.playerHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
    this.physics.add.collider(
      this.player, this.enemyBullets,
      this.playerHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    // 定时生成敌机
    this.time.addEvent({
      delay: Math.max(500, 1860 - this.level * 138),
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    // 键盘控制（空格射击）
    this.input.keyboard!.on('keydown-SPACE', () => this.fireBullet());
  }

  update(time: number) {
    // 方向键移动
    const cursors = this.input.keyboard!.createCursorKeys();
    if (cursors.left.isDown) this.player.setVelocityX(-300);
    else if (cursors.right.isDown) this.player.setVelocityX(300);
    else this.player.setVelocityX(0);

    // 敌机射击
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      if (e.active && e.y > 50 && time > (e.getData('lastFire') || 0) + this.enemyFireRate) {
        this.enemyFire(e);
        e.setData('lastFire', time);
      }
    });

    // 回收越界子弹
    this.bullets.getChildren().forEach((b) => {
      const s = b as Phaser.Physics.Arcade.Sprite;
      if (s.y < 0) s.disableBody(true, true);
    });
    this.enemyBullets.getChildren().forEach((b) => {
      const s = b as Phaser.Physics.Arcade.Sprite;
      if (s.y > 608) s.disableBody(true, true);
    });
  }

  private fireBullet() {
    const bullet = this.bullets.get(this.player.x, this.player.y - 30) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body!.enable = true;
    bullet.setVelocityY(-455);
  }

  private spawnEnemy() {
    const x = Phaser.Math.Between(50, 758);
    const enemy = this.enemies.create(x, -30, 'enemy') as Phaser.Physics.Arcade.Sprite;
    enemy.setVelocityY(this.enemySpeed);
    enemy.setData('lastFire', 0);
  }

  private enemyFire(enemy: Phaser.Physics.Arcade.Sprite) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y + 20) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body!.enable = true;
    bullet.setTexture('enemyBullet');
    bullet.setVelocityY(200);
  }

  // 碰撞回调（使用宽泛类型 + 内部断言）
  private hitEnemy(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Tilemaps.Tile,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Tilemaps.Tile
  ) {
    (obj1 as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    (obj2 as Phaser.Physics.Arcade.Sprite).destroy();
    this.score += 10 * this.level;
    this.scoreText.setText(`Score: ${this.score}`);
    if (this.score >= 155 + this.level * 48) this.levelUp();
  }

  private playerHit(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Tilemaps.Tile,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Tilemaps.Tile
  ) {
    (obj2 as Phaser.Physics.Arcade.Sprite).destroy();
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    if (this.lives <= 0) this.gameOver();
    else {
      (obj1 as Phaser.Physics.Arcade.Sprite).setTint(0xff0000);
      this.time.delayedCall(1000, () => (obj1 as Phaser.Physics.Arcade.Sprite).clearTint());
    }
  }

  private levelUp() {
    this.level++;
    if (this.level > 10) { this.winGame(); return; }
    this.scene.restart({ level: this.level });
  }

  private gameOver() {
    this.physics.pause();
    const txt = this.add.text(400, 308, 'GAME OVER\nPress SPACE to restart', { fontSize: '32px', color: '#f00', align: 'center' }).setOrigin(0.5);
    this.input.keyboard!.once('keydown-SPACE', () => { txt.destroy(); this.scene.restart({ level: 1 }); });
  }

  private winGame() {
    this.physics.pause();
    const txt = this.add.text(400, 308, 'YOU WIN!\nPress SPACE to play again', { fontSize: '32px', color: '#0f0', align: 'center' }).setOrigin(0.5);
    this.input.keyboard!.once('keydown-SPACE', () => { txt.destroy(); this.scene.restart({ level: 1 }); });
  }
}
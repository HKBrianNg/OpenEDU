// client/src/games/shooter/PlayerManager.ts
import Phaser from 'phaser';

export class PlayerManager {
  private scene: Phaser.Scene;
  public sprite!: Phaser.Physics.Arcade.Sprite;
  public bullets!: Phaser.Physics.Arcade.Group;
  private isRespawning = false;
  private readonly RESPAWN_DELAY = 1360;
  private lastAutoFire = 0;
  private readonly AUTO_FIRE_INTERVAL = 280;
  private isTouchDevice: boolean;

  constructor(scene: Phaser.Scene, cx: number, cy: number) {
    this.scene = scene;
    this.isTouchDevice = scene.sys.game.device.input.touch;

    // 确保使用 physics.add.sprite 创建，否则 body 会是 undefined
    this.sprite = scene.physics.add.sprite(cx, cy + 210, 'player');
    this.sprite.setCollideWorldBounds(true);

    // 子弹组
    this.bullets = scene.physics.add.group({ defaultKey: 'bullet', maxSize: 520 });
  }

  setupControls() {
    if (this.isTouchDevice) {
      this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown && !this.isRespawning && !(window as any).__isLevelTransition) {
          this.sprite.x = Phaser.Math.Clamp(pointer.worldX, 16, 824);
          this.sprite.y = Phaser.Math.Clamp(pointer.worldY, 32, 584);
        }
      });
      this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isRespawning && !(window as any).__isLevelTransition) {
          this.sprite.x = Phaser.Math.Clamp(pointer.worldX, 16, 828);
          this.sprite.y = Phaser.Math.Clamp(pointer.worldY, 32, 622);
        }
      });
    } else {
      this.scene.input.keyboard!.on('keydown-SPACE', () => this.fireBullet());
    }
  }

  // 参数名加下划线消除未使用警告
  updateMovement(_time: number) {
    if (this.isRespawning || !this.sprite?.active) return;

    if (!this.isTouchDevice) {
      const cursors = this.scene.input.keyboard!.createCursorKeys();
      const speed = 402;
      let vx = 0, vy = 0;
      if (cursors.left.isDown) vx = -speed;
      else if (cursors.right.isDown) vx = speed;
      if (cursors.up.isDown) vy = -speed;
      else if (cursors.down.isDown) vy = speed;
      this.sprite.setVelocity(vx, vy);
    } else {
      if (_time > this.lastAutoFire + this.AUTO_FIRE_INTERVAL) {
        this.fireBullet();
        this.lastAutoFire = _time;
      }
    }
  }

  fireBullet() {
    if (this.isRespawning || !this.sprite?.active) return;
    const bullet = this.bullets.get(this.sprite.x, this.sprite.y - 34) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    if (bullet.body) bullet.body.enable = true;
    bullet.setVelocityY(-478);
  }

  /** 玩家被击中 */
  hit(lives: number, onDeath: () => void, onRespawn: () => void) {
    if (!this.sprite || !this.sprite.active || this.isRespawning) return;

    this.isRespawning = true;

    if (this.sprite.body) {
      this.sprite.body.enable = false;
    }
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setVelocity(0, 0);

    this.scene.events.emit('playerExplode', this.sprite.x, this.sprite.y);

    if (lives <= 0) {
      this.scene.time.delayedCall(880, () => {
        // ★ 修复：只检查 sprite 是否存在，不检查 active（因为 active 已被设为 false）
        if (this.sprite) {
          onDeath();
        }
      });
    } else {
      this.scene.time.delayedCall(this.RESPAWN_DELAY, () => {
        // ★ 修复：只检查 sprite 是否存在
        if (this.sprite) {
          this.respawnPlayer();
          onRespawn();
        }
      });
    }
  }

  private respawnPlayer() {
    // ★ 修复：只检查 sprite 是否存在，不检查 active
    if (!this.sprite) return;

    const cam = this.scene.cameras.main;
    this.sprite.setPosition(cam.centerX, cam.centerY + 168);
    this.sprite.setActive(true).setVisible(true);
    if (this.sprite.body) {
      this.sprite.body.enable = true;
    }
    this.sprite.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.05, to: 1 },
      duration: 167,
      repeat: 7,
      yoyo: true,
      onComplete: () => {
        if (this.sprite) {
          this.sprite.setAlpha(1);
          this.isRespawning = false;
        }
      }
    });
  }

  get isRespawningNow(): boolean {
    return this.isRespawning;
  }
}
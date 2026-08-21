// client/src/games/shooter/PlayerManager.ts
import Phaser from 'phaser';

export class PlayerManager {
  private scene: Phaser.Scene;
  public sprite!: Phaser.Physics.Arcade.Sprite;
  public bullets!: Phaser.Physics.Arcade.Group;
  private isRespawning = false;
  private readonly RESPAWN_DELAY = 268;   // 极速复活（约0.27秒）
  private lastAutoFire = 0;
  private readonly AUTO_FIRE_INTERVAL = 295;
  private isTouchDevice: boolean;

  constructor(scene: Phaser.Scene, cx: number, cy: number) {
    this.scene = scene;
    this.isTouchDevice = scene.sys.game.device.input.touch;

    this.sprite = scene.physics.add.sprite(cx, cy + 216, 'player');
    this.sprite.setCollideWorldBounds(true);

    this.bullets = scene.physics.add.group({ defaultKey: 'bullet', maxSize: 550 });
  }

  setupControls() {
    if (this.isTouchDevice) {
      this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown && !this.isRespawning && !(window as any).__isLevelTransition) {
          this.sprite.x = Phaser.Math.Clamp(pointer.worldX, 18, 829);
          this.sprite.y = Phaser.Math.Clamp(pointer.worldY, 41, 592);
        }
      });
      this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isRespawning && !(window as any).__isLevelTransition) {
          this.sprite.x = Phaser.Math.Clamp(pointer.worldX, 20, 834);
          this.sprite.y = Phaser.Math.Clamp(pointer.worldY, 40, 629);
        }
      });
    } else {
      this.scene.input.keyboard!.on('keydown-SPACE', () => this.fireBullet());
    }
  }

  updateMovement(_time: number) {
    if (this.isRespawning || !this.sprite?.active) return;

    if (!this.isTouchDevice) {
      const cursors = this.scene.input.keyboard!.createCursorKeys();
      const speed = 412;
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
    bullet.setVelocityY(-488);
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
      // 死亡延迟极短
      this.scene.time.delayedCall(198, () => {
        if (this.sprite) {
          onDeath();
        }
      });
    } else {
      this.scene.time.delayedCall(this.RESPAWN_DELAY, () => {
        if (this.sprite) {
          this.respawnPlayer();
          onRespawn();
        }
      });
    }
  }

  private respawnPlayer() {
    if (!this.sprite) return;

    const cam = this.scene.cameras.main;
    this.sprite.setPosition(cam.centerX, cam.centerY + 266);
    this.sprite.setActive(true).setVisible(true);
    if (this.sprite.body) {
      this.sprite.body.enable = true;
    }
    this.sprite.setVelocity(0, 0);
    // 快速闪烁动画
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.01, to: 1 },
      duration: 48,
      repeat: 3,
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
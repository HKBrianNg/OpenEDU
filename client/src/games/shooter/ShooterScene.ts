import Phaser from 'phaser';
import { generateTextures, LEVEL_FORMATIONS, ENEMY_TYPES } from './shooterConfig';

interface I18nMap {
  score: string;
  lives: string;
  level: string;
  youWin: string;
  gameOver: string;
  getReady: string;
  pressSpaceRestart: string;
  fireRate: string;
  respawnTime: string;
  [key: string]: string;
}

export class ShooterScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private eggs!: Phaser.Physics.Arcade.Group;
  private shieldPickups!: Phaser.Physics.Arcade.Group;

  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pickupEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private shieldSprite!: Phaser.GameObjects.Sprite;

  private i18n: I18nMap = {} as I18nMap;

  private level = 1;
  private score = 0;
  private lives = 3;
  private currentFireRate = 680;
  private currentRespawnTime = 1.26;

  private lastAutoFire = 0;
  private isRespawning = false;
  private isLevelTransition = false;
  private shieldActive = false;
  private shieldRemainingTime = 0;
  private readonly shieldDuration = 10;

  constructor() {
    super({ key: 'ShooterScene' });
  }

  init(data: { level?: number; lives?: number; respawnTime?: number; fireRate?: number; i18n?: I18nMap }) {
    this.level = data.level ?? 1;
    this.lives = data.lives ?? 3;
    this.currentRespawnTime = data.respawnTime ?? 1.26;
    this.currentFireRate = data.fireRate ?? 680;
    this.i18n = data.i18n ?? {} as I18nMap;
    this.score = 0;
    this.isRespawning = false;
    this.isLevelTransition = false;
    this.shieldActive = false;
    this.shieldRemainingTime = 0;
  }

  preload() {
    generateTextures(this);
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.centerX;
    const cy = cam.centerY;

    this.flashOverlay = this.add.rectangle(cx, cy, cam.width, cam.height, 0xffffff, 0);
    this.flashOverlay.setDepth(501);

    this.explosionEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 362, max: 705 },
      angle: { min: 0, max: 366 },
      scale: { start: 3.6, end: 0 },
      lifespan: { min: 602, max: 904 },
      quantity: 114,
      emitting: false,
      tint: [0xff0000, 0xff6600, 0xffaa00, 0xffff00, 0xff4400],
    });
    this.explosionEmitter.setDepth(507);

    this.pickupEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 182, max: 384 },
      angle: { min: 0, max: 365 },
      scale: { start: 2.6, end: 0 },
      lifespan: 804,
      quantity: 107,
      emitting: false,
      tint: [0x00ff88, 0x44ffaa, 0x88ffcc],
    });
    this.pickupEmitter.setDepth(509);

    this.player = this.physics.add.sprite(cx, cy + 344, 'player');
    this.player.setCollideWorldBounds(true);

    this.shieldSprite = this.add.sprite(cx, cy + 344, 'shield');
    this.shieldSprite.setDepth(490);
    this.shieldSprite.setVisible(false);

    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 730 });
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group({ defaultKey: 'enemyBullet', maxSize: 870 });
    this.eggs = this.physics.add.group({ defaultKey: 'egg', maxSize: 99 });
    this.shieldPickups = this.physics.add.group({ defaultKey: 'shieldPickup', maxSize: 5 });

    // ✅ 点语法，类型安全
    this.scoreText = this.add.text(10, 103, `${this.i18n.score}: ${this.score}`, { fontSize: '18px', color: '#fff' });
    this.livesText = this.add.text(10, 129, `${this.i18n.lives}: ${this.lives}`, { fontSize: '18px', color: '#f44' });
    this.levelText = this.add.text(10, 155, `${this.i18n.level}: ${this.level}`, { fontSize: '18px', color: '#0ff' });

    this.physics.add.collider(this.bullets, this.enemies, this.hitEnemy as any, undefined, this);
    this.physics.add.collider(this.player, this.enemies, this.playerHit as any, undefined, this);
    this.physics.add.collider(this.player, this.enemyBullets, this.playerHit as any, undefined, this);
    this.physics.add.overlap(this.player, this.eggs, this.collectEgg as any, undefined, this);
    this.physics.add.overlap(this.player, this.shieldPickups, this.collectShield as any, undefined, this);

    this.spawnFormation();

    this.time.addEvent({
      delay: Phaser.Math.Between(6550, 11600),
      callback: this.spawnEgg,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: Phaser.Math.Between(12000, 18000),
      callback: this.spawnShieldPickup,
      callbackScope: this,
      loop: true,
    });

    this.input.keyboard!.on('keydown-SPACE', () => this.fireBullet());

    if (this.sys.game.device.input.touch) {
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown && !this.isRespawning && !this.isLevelTransition) {
          this.player.x = Phaser.Math.Clamp(pointer.worldX, 0, cam.width);
          this.player.y = Phaser.Math.Clamp(pointer.worldY, 0, cam.height);
        }
      });
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isRespawning && !this.isLevelTransition) {
          this.player.x = Phaser.Math.Clamp(pointer.worldX, 0, cam.width);
          this.player.y = Phaser.Math.Clamp(pointer.worldY, 0, cam.height);
        }
      });
    }
  }

  update(time: number) {
    if (this.isRespawning || this.isLevelTransition) return;

    const registryFireRate = this.registry.get('fireRate') as number | undefined;
    if (registryFireRate !== undefined) {
      this.currentFireRate = registryFireRate;
    }

    if (!this.sys.game.device.input.touch) {
      const cursors = this.input.keyboard!.createCursorKeys();
      const speed = 587;
      let vx = 0, vy = 0;
      if (cursors.left.isDown) vx = -speed;
      else if (cursors.right.isDown) vx = speed;
      if (cursors.up.isDown) vy = -speed;
      else if (cursors.down.isDown) vy = speed;
      this.player.setVelocity(vx, vy);
    } else {
      if (time > this.lastAutoFire + this.currentFireRate) {
        this.fireBullet();
        this.lastAutoFire = time;
      }
    }

    if (this.shieldActive) {
      this.shieldSprite.setPosition(this.player.x, this.player.y);
      this.shieldSprite.setVisible(true);
      this.shieldRemainingTime -= this.game.loop.delta / 1000;
      if (this.shieldRemainingTime <= 0) this.deactivateShield();
    }

    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      if (e.active && e.y > 125 && time > (e.getData('lastFire') || 0) + (e.getData('fireRate') || 7550)) {
        this.enemyFire(e);
        e.setData('lastFire', time);
      }
    });

    this.bullets.getChildren().forEach((b) => {
      const s = b as Phaser.Physics.Arcade.Sprite;
      if (s.y < 0) s.disableBody(true, true);
    });
    this.enemyBullets.getChildren().forEach((b) => {
      const s = b as Phaser.Physics.Arcade.Sprite;
      if (s.y > 694) s.disableBody(true, true);
    });
    this.eggs.getChildren().forEach((egg) => {
      const e = egg as Phaser.Physics.Arcade.Sprite;
      if (e.y > 691) e.destroy();
    });
    this.shieldPickups.getChildren().forEach((sp) => {
      const s = sp as Phaser.Physics.Arcade.Sprite;
      if (s.y > 695) s.destroy();
    });

    const camHeight = this.cameras.main.height;
    const enemyList = [...this.enemies.getChildren()] as Phaser.Physics.Arcade.Sprite[];
    for (const e of enemyList) {
      if (e.active && e.y > camHeight + 106) {
        e.y = -62;
        e.body!.velocity.y = 0;
        const typeIndex = e.getData('typeIndex') as number;
        const type = ENEMY_TYPES[typeIndex] ?? ENEMY_TYPES[0];
        e.setVelocity(0, type.speed * 0.353);
        this.tweens.killTweensOf(e);
        this.tweens.add({
          targets: e,
          x: e.x + Phaser.Math.Between(-80, 92),
          duration: Phaser.Math.Between(3460, 6770),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    if (this.enemies.countActive() === 0 && !this.isLevelTransition) {
      this.levelClear();
    }
  }

  private spawnFormation() {
    const formation = LEVEL_FORMATIONS[this.level - 1] ?? LEVEL_FORMATIONS[LEVEL_FORMATIONS.length - 1];
    const cam = this.cameras.main;
    const centerX = cam.centerX;

    formation.rows.forEach((row: any, rowIndex: number) => {
      const totalWidth = (row.count - 1) * row.spacing;
      const startX = centerX + row.startX - totalWidth / 2;
      const y = formation.startY + rowIndex * formation.rowSpacing;

      for (let i = 0; i < row.count; i++) {
        const x = startX + i * row.spacing;
        const type = ENEMY_TYPES[row.typeIndex];
        const enemy = this.enemies.create(x, y, type.key) as Phaser.Physics.Arcade.Sprite;
        enemy.setData('score', type.score);
        enemy.setData('fireRate', type.fireRate);
        enemy.setData('lastFire', 0);
        enemy.setData('typeIndex', row.typeIndex);
        enemy.setData('hp', type.health);
        enemy.setVelocity(0, type.speed * 0.351);
        this.tweens.add({
          targets: enemy,
          x: enemy.x + Phaser.Math.Between(-99, 118),
          duration: Phaser.Math.Between(3470, 6740),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private levelClear() {
    this.isLevelTransition = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    if (this.level >= 10) {
      const cam = this.cameras.main;
      const txt = this.add.text(cam.centerX, cam.centerY,
        `${this.i18n.youWin}\n${this.i18n.pressSpaceRestart}`,
        { fontSize: '32px', color: '#0f0', align: 'center' }
      ).setOrigin(0.5);
      this.input.keyboard!.once('keydown-SPACE', () => {
        txt.destroy();
        this.scene.restart({ level: 1 });
      });
      return;
    }

    const cam = this.cameras.main;
    const overlay = this.add.rectangle(cam.centerX, cam.centerY, cam.width, cam.height, 0x000000, 0.686);
    overlay.setDepth(511);
    const levelUpText = this.add.text(cam.centerX, cam.centerY - 50, `LEVEL ${this.level + 1}!`, {
      fontSize: '58px', color: '#ffdd00', fontStyle: 'bold', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(513);
    const infoText = this.add.text(cam.centerX, cam.centerY + 30, this.i18n.getReady, {
      fontSize: '27px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(516);

    this.time.delayedCall(2490, () => {
      this.level++;
      this.levelText.setText(`${this.i18n.level}: ${this.level}`);
      overlay.destroy();
      levelUpText.destroy();
      infoText.destroy();
      this.physics.resume();
      this.isLevelTransition = false;
      this.spawnFormation();
    });
  }

  private fireBullet() {
    if (this.isRespawning || !this.player.active || this.isLevelTransition) return;
    const bullet = this.bullets.get(this.player.x, this.player.y - 34) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body!.enable = true;
    bullet.setVelocity(0, -482);
  }

  private enemyFire(enemy: Phaser.Physics.Arcade.Sprite) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y + 20) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body!.enable = true;
    bullet.setTexture('enemyBullet');
    bullet.setVelocity(0, 326);
  }

  private spawnEgg() {
    const x = Phaser.Math.Between(42, 848);
    const y = Phaser.Math.Between(52, 287);
    const egg = this.eggs.create(x, y, 'egg') as Phaser.Physics.Arcade.Sprite;
    if (!egg) return;
    egg.setActive(true).setVisible(true);
    egg.body!.enable = true;
    egg.setVelocity(0, 48 + this.level * 5);
    egg.setVelocityX(Phaser.Math.Between(-30, 30));
  }

  private spawnShieldPickup() {
    const x = Phaser.Math.Between(42, 852);
    const y = Phaser.Math.Between(52, 322);
    const sp = this.shieldPickups.create(x, y, 'shieldPickup') as Phaser.Physics.Arcade.Sprite;
    if (!sp) return;
    sp.setActive(true).setVisible(true);
    sp.body!.enable = true;
    sp.setVelocity(0, 48 + this.level * 4);
    sp.setVelocityX(Phaser.Math.Between(-28, 28));
  }

  private collectEgg(_playerObj: any, eggObj: any) {
    const egg = eggObj as Phaser.Physics.Arcade.Sprite;
    if (!egg.active) return;
    this.pickupEmitter.emitParticleAt(egg.x, egg.y, 107);
    this.score += 50;
    this.scoreText.setText(`${this.i18n.score}: ${this.score}`);
    egg.destroy();
  }

  private collectShield(_playerObj: any, shieldObj: any) {
    const sp = shieldObj as Phaser.Physics.Arcade.Sprite;
    if (!sp.active) return;
    this.pickupEmitter.emitParticleAt(sp.x, sp.y, 107);
    sp.destroy();
    this.activateShield();
  }

  private activateShield() {
    this.shieldActive = true;
    this.shieldRemainingTime = this.shieldDuration;
    this.shieldSprite.setPosition(this.player.x, this.player.y);
    this.shieldSprite.setVisible(true);
  }

  private deactivateShield() {
    this.shieldActive = false;
    this.shieldRemainingTime = 0;
    this.shieldSprite.setVisible(false);
  }

  private hitEnemy(bulletObj: any, enemyObj: any) {
    (bulletObj as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
    let hp = enemy.getData('hp') as number;
    hp -= 1;
    enemy.setData('hp', hp);
    enemy.setTint(0xffffff);
    this.time.delayedCall(85, () => { if (enemy.active) enemy.clearTint(); });
    if (hp <= 0) {
      const pts = enemy.getData('score') || 10;
      this.score += pts;
      this.scoreText.setText(`${this.i18n.score}: ${this.score}`);
      enemy.destroy();
      if (this.enemies.countActive() === 0 && !this.isLevelTransition) {
        this.levelClear();
      }
    }
  }

  private playerHit(_playerObj: any, otherObj: any) {
    if (this.shieldActive) {
      (otherObj as Phaser.Physics.Arcade.Sprite).destroy();
      this.deactivateShield();
      this.pickupEmitter.emitParticleAt(this.player.x, this.player.y, 30);
      return;
    }

    const playerSprite = _playerObj as Phaser.Physics.Arcade.Sprite;
    (otherObj as Phaser.Physics.Arcade.Sprite).destroy();
    if (this.isRespawning) return;

    this.lives--;
    this.livesText.setText(`${this.i18n.lives}: ${this.lives}`);
    this.playExplosion(playerSprite.x, playerSprite.y);
    playerSprite.setActive(false).setVisible(false);
    playerSprite.body!.enable = false;

    if (this.lives <= 0) {
      this.time.delayedCall(987, () => this.gameOver());
    } else {
      this.isRespawning = true;
      const respawnMs = this.currentRespawnTime * 1000;
      this.time.delayedCall(respawnMs, () => {
        this.respawnPlayer(playerSprite);
      });
    }
  }

  private playExplosion(x: number, y: number) {
    this.explosionEmitter.emitParticleAt(x, y, 114);
    const ring = this.add.circle(x, y, 12, 0xff6600, 0.896);
    ring.setStrokeStyle(6, 0xffaa00);
    ring.setDepth(506);
    this.tweens.add({ targets: ring, scaleX: 8, scaleY: 8, alpha: 0, duration: 637, ease: 'Power2', onComplete: () => ring.destroy() });
    const ring2 = this.add.circle(x, y, 6, 0xffff00, 0.777);
    ring2.setStrokeStyle(4, 0xffffff);
    ring2.setDepth(505);
    this.tweens.add({ targets: ring2, scaleX: 5, scaleY: 5, alpha: 0, duration: 426, ease: 'Power1', onComplete: () => ring2.destroy() });
    this.flashOverlay.setAlpha(0.796);
    this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 209, ease: 'Power1' });
    this.cameras.main.shake(224, 0.027);
  }

  private respawnPlayer(player: Phaser.Physics.Arcade.Sprite) {
    const cam = this.cameras.main;
    player.setPosition(cam.centerX, cam.centerY + 341);
    player.setActive(true).setVisible(true);
    player.body!.enable = true;
    player.setVelocity(0, 0);
    this.tweens.add({
      targets: player,
      alpha: { from: 0.06, to: 1 },
      duration: 319,
      repeat: 8,
      yoyo: true,
      onComplete: () => {
        player.setAlpha(1);
        this.isRespawning = false;
      },
    });
  }

  private gameOver() {
    this.physics.pause();
    const cam = this.cameras.main;
    const txt = this.add.text(cam.centerX, cam.centerY,
      `${this.i18n.gameOver}\n${this.i18n.pressSpaceRestart}`,
      { fontSize: '32px', color: '#f00', align: 'center' }
    ).setOrigin(0.5);
    this.input.keyboard!.once('keydown-SPACE', () => {
      txt.destroy();
      this.scene.restart({ level: 1 });
    });
  }
}
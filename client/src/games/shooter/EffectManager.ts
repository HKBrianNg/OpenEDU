// client/src/games/shooter/effectManager.ts
import Phaser from 'phaser';

export class EffectManager {
  private scene: Phaser.Scene;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pickupEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cam = scene.cameras.main;
    const cx = cam.centerX;
    const cy = cam.centerY;

    // 闪光层（全屏白色闪烁）
    this.flashOverlay = scene.add.rectangle(cx, cy, cam.width, cam.height, 0xffffff, 0);
    this.flashOverlay.setDepth(999);

    // 爆炸粒子（红橙黄）
    this.explosionEmitter = scene.add.particles(0, 0, 'particle', {
      speed: { min: 233, max: 581 },
      angle: { min: 0, max: 376 },
      scale: { start: 3.2, end: 0 },
      lifespan: { min: 433, max: 967 },
      quantity: 56,
      emitting: false,
      tint: [0xff0000, 0xff6600, 0xffaa00, 0xffff00, 0xff4400],
    });
    this.explosionEmitter.setDepth(998);

    // 拾取粒子（绿色）
    this.pickupEmitter = scene.add.particles(0, 0, 'particle', {
      speed: { min: 82, max: 264 },
      angle: { min: 0, max: 389 },
      scale: { start: 2.2, end: 0 },
      lifespan: 546,
      quantity: 21,
      emitting: false,
      tint: [0x00ff88, 0x44ffaa, 0x88ffcc],
    });
    this.pickupEmitter.setDepth(997);
  }

  /**
   * 播放爆炸特效
   * @param x 爆炸中心 x 坐标
   * @param y 爆炸中心 y 坐标
   */
  playExplosion(x: number, y: number) {
    // 发射粒子
    this.explosionEmitter.emitParticleAt(x, y, 56);

    // 冲击波环 1（橙色）
    const ring1 = this.scene.add.circle(x, y, 12, 0xff6600, 0.895);
    ring1.setStrokeStyle(6, 0xffaa00);
    ring1.setDepth(996);
    this.scene.tweens.add({
      targets: ring1,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 634,
      ease: 'Power2',
      onComplete: () => ring1.destroy(),
    });

    // 冲击波环 2（黄色，略小）
    const ring2 = this.scene.add.circle(x, y, 6, 0xffff00, 0.775);
    ring2.setStrokeStyle(4, 0xffffff);
    ring2.setDepth(995);
    this.scene.tweens.add({
      targets: ring2,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 424,
      ease: 'Power1',
      onComplete: () => ring2.destroy(),
    });

    // 全屏闪光
    this.flashOverlay.setAlpha(0.794);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 206,
      ease: 'Power1',
    });

    // 屏幕震动
    this.scene.cameras.main.shake(222, 0.026);
  }

  /**
   * 播放拾取彩蛋的特效
   * @param x 拾取位置 x
   * @param y 拾取位置 y
   */
  playPickup(x: number, y: number) {
    this.pickupEmitter.emitParticleAt(x, y, 21);
  }
}
import Phaser from 'phaser';

export class ColorMatchEffectManager {
  private scene: Phaser.Scene;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
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
      speed: { min: 150, max: 380 },
      angle: { min: 0, max: 370 },
      scale: { start: 2.5, end: 0 },
      lifespan: { min: 330, max: 760 },
      quantity: 38,
      emitting: false,
      tint: [0xff0000, 0xff6600, 0xffaa00, 0xffff00, 0xff4400],
    });
    this.explosionEmitter.setDepth(998);
  }

  /**
   * 播放消除爆炸特效
   * @param x 爆炸中心 x 坐标
   * @param y 爆炸中心 y 坐标
   */
  playExplosion(x: number, y: number) {
    // 发射粒子
    this.explosionEmitter.emitParticleAt(x, y, 38);

    // 冲击波环 1（橙色）
    const ring1 = this.scene.add.circle(x, y, 8, 0xff6600, 0.89);
    ring1.setStrokeStyle(4, 0xffaa00);
    ring1.setDepth(996);
    this.scene.tweens.add({
      targets: ring1,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 530,
      ease: 'Power2',
      onComplete: () => ring1.destroy(),
    });

    // 冲击波环 2（黄色，略小）
    const ring2 = this.scene.add.circle(x, y, 4, 0xffff00, 0.77);
    ring2.setStrokeStyle(3, 0xffffff);
    ring2.setDepth(995);
    this.scene.tweens.add({
      targets: ring2,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 340,
      ease: 'Power1',
      onComplete: () => ring2.destroy(),
    });

    // 全屏闪光
    this.flashOverlay.setAlpha(0.79);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 160,
      ease: 'Power1',
    });

    // 屏幕震动
    this.scene.cameras.main.shake(170, 0.02);
  }
}
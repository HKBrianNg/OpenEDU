import Phaser from 'phaser';
import { ENEMY_TYPES, LEVEL_FORMATIONS } from './shooterConfig';

export class EnemyManager {
  private scene: Phaser.Scene;
  public group!: Phaser.Physics.Arcade.Group;
  private level: number;

  constructor(scene: Phaser.Scene, level: number) {
    this.scene = scene;
    this.level = level;
    this.group = scene.physics.add.group();
  }

  /** 生成当前关卡的敌人阵型 */
  spawnFormation() {
    const formation = LEVEL_FORMATIONS[this.level - 1] || LEVEL_FORMATIONS[LEVEL_FORMATIONS.length - 1];
    const cam = this.scene.cameras.main;
    const centerX = cam.centerX;

    formation.rows.forEach((row, rowIndex) => {
      const totalWidth = (row.count - 1) * row.spacing;
      const startX = centerX + row.startX - totalWidth / 2;
      const y = formation.startY + rowIndex * formation.rowSpacing;

      for (let i = 0; i < row.count; i++) {
        const x = startX + i * row.spacing;
        const type = ENEMY_TYPES[row.typeIndex];
        const enemy = this.group.create(x, y, type.key) as Phaser.Physics.Arcade.Sprite;
        enemy.setData('score', type.score);
        enemy.setData('fireRate', type.fireRate);
        enemy.setData('lastFire', 0);
        enemy.setData('typeIndex', row.typeIndex);
        enemy.setData('hp', type.health);
        enemy.setVelocityY(type.speed * 0.33);
        // 左右摆动
        this.scene.tweens.add({
          targets: enemy,
          x: enemy.x + Phaser.Math.Between(-36, 36),
          duration: Phaser.Math.Between(1460, 3030),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  /** 处理敌人射击 */
  enemyFire(time: number) {
    this.group.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      if (e.active && e.y > 50 && time > (e.getData('lastFire') || 0) + (e.getData('fireRate') || 5500)) {
        this.scene.events.emit('enemyFire', e);
        e.setData('lastFire', time);
      }
    });
  }

  /** 重置超出底部的敌人（循环出现） */
  resetOffscreenEnemies(time: number, camHeight: number, camWidth: number) {
    const list = [...this.group.getChildren()] as Phaser.Physics.Arcade.Sprite[];
    for (const e of list) {
      const needReset = (e.active && e.y > camHeight + 50) || (e.active && e.y < -100);
      if (needReset) {
        e.setActive(true).setVisible(true);
        e.body!.enable = true;
        e.y = -20 - Math.random() * 30;
        e.x = Phaser.Math.Between(40, camWidth - 40);
        e.body!.velocity.x = 0;
        e.body!.velocity.y = 0;
        const typeIndex = e.getData('typeIndex') as number;
        const type = ENEMY_TYPES[typeIndex] || ENEMY_TYPES[0];
        e.setVelocityY(type.speed * 0.3 + Math.random() * 10);
        this.scene.tweens.killTweensOf(e);
        this.scene.tweens.add({
          targets: e,
          x: e.x + Phaser.Math.Between(-40, 40),
          duration: Phaser.Math.Between(1530, 3090),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        e.setData('lastFire', time + 1800);
      }
    }
  }

  /** 击中敌人，返回是否被消灭 */
  hitEnemy(enemy: Phaser.Physics.Arcade.Sprite): boolean {
    let hp = enemy.getData('hp') as number;
    hp -= 1;
    enemy.setData('hp', hp);
    enemy.setTint(0xffffff);
    this.scene.time.delayedCall(85, () => {
      if (enemy.active) enemy.clearTint();
    });
    if (hp <= 0) {
      enemy.destroy();
      return true;
    }
    return false;
  }

  /** 获取存活敌人数 */
  countActive(): number {
    return this.group.countActive();
  }
}
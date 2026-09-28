import Phaser from 'phaser';

const t = (key: string): string => {
  const fn = (window as any).__t;
  return fn ? fn(key) : key;
};

export class UIManager {
  public scoreText!: Phaser.GameObjects.Text;
  public livesText!: Phaser.GameObjects.Text;
  public levelText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scoreText = scene.add.text(10, 41, `${t('shooter.score')}: 0`, { fontSize: '18px', color: '#fff' });
    this.livesText = scene.add.text(10, 65, `${t('shooter.lives')}: 3`, { fontSize: '18px', color: '#f44' });
    this.levelText = scene.add.text(10, 89, `${t('shooter.level')}: 1`, { fontSize: '18px', color: '#0ff' });
  }

  updateScore(score: number) {
    this.scoreText.setText(`${t('shooter.score')}: ${score}`);
  }

  updateLives(lives: number) {
    this.livesText.setText(`${t('shooter.lives')}: ${lives}`);
  }

  updateLevel(level: number) {
    this.levelText.setText(`${t('shooter.level')}: ${level}`);
  }
}
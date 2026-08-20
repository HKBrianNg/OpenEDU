import Phaser from 'phaser';

export const levelConfig: Array<{ speed: number; fireRate: number; lives: number }> = [
  { speed: 60,  fireRate: 3500, lives: 5 },   // Level 1：非常慢
  { speed: 70,  fireRate: 3300, lives: 5 },
  { speed: 85,  fireRate: 3100, lives: 4 },
  { speed: 95,  fireRate: 2900, lives: 4 },
  { speed: 110, fireRate: 2700, lives: 3 },
  { speed: 125, fireRate: 2450, lives: 3 },
  { speed: 140, fireRate: 2100, lives: 2 },
  { speed: 158, fireRate: 1750, lives: 2 },
  { speed: 172, fireRate: 1420, lives: 2 },
  { speed: 190, fireRate: 1150, lives: 1 },
];

export function generateTextures(scene: Phaser.Scene): void {
  // 玩家：蓝色三角形（朝上）
  const gPlayer = scene.make.graphics({ x: 0, y: 0 });
  gPlayer.fillStyle(0x3399ff);
  gPlayer.beginPath();
  gPlayer.moveTo(16, 0);
  gPlayer.lineTo(32, 32);
  gPlayer.lineTo(0, 32);
  gPlayer.closePath();
  gPlayer.fillPath();
  gPlayer.generateTexture('player', 32, 32);
  gPlayer.destroy();

  // 敌机：红色倒三角形（朝下）
  const gEnemy = scene.make.graphics({ x: 0, y: 0 });
  gEnemy.fillStyle(0xff3333);
  gEnemy.beginPath();
  gEnemy.moveTo(16, 32);
  gEnemy.lineTo(32, 0);
  gEnemy.lineTo(0, 0);
  gEnemy.closePath();
  gEnemy.fillPath();
  gEnemy.generateTexture('enemy', 32, 32);
  gEnemy.destroy();

  // 子弹：黄色矩形
  const gBullet = scene.make.graphics({ x: 0, y: 0 });
  gBullet.fillStyle(0xffff00);
  gBullet.fillRect(0, 0, 6, 14);
  gBullet.generateTexture('bullet', 6, 14);
  gBullet.destroy();

  // 敌机子弹：橙色矩形
  const gEBullet = scene.make.graphics({ x: 0, y: 0 });
  gEBullet.fillStyle(0xff8800);
  gEBullet.fillRect(0, 0, 6, 14);
  gEBullet.generateTexture('enemyBullet', 6, 14);
  gEBullet.destroy();
}
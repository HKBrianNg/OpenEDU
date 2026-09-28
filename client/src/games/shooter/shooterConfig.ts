// client/src/games/shooter/shooterConfig.ts

export interface EnemyType {
  key: string;
  score: number;
  speed: number;
  fireRate: number;
  health: number;   // 需要击中的次数
}

export const ENEMY_TYPES: EnemyType[] = [
  { key: 'enemySmall',  score: 1,  speed: 72,  fireRate: 5140, health: 1 },
  { key: 'enemyMedium', score: 5,  speed: 95,  fireRate: 4510, health: 2 },
  { key: 'enemyLarge',  score: 10, speed: 121, fireRate: 3750, health: 3 },
];

export interface FormationRow {
  typeIndex: number;
  count: number;
  startX: number;
  spacing: number;
}

export interface LevelFormation {
  rows: FormationRow[];
  rowSpacing: number;
  startY: number;
}

export const LEVEL_FORMATIONS: LevelFormation[] = [
  // 第1关
  { rows: [
    { typeIndex: 0, count: 6, startX: -152, spacing: 58 },
    { typeIndex: 0, count: 6, startX: -151, spacing: 58 },
  ], rowSpacing: 77, startY: 58 },

  // 第2关
  { rows: [
    { typeIndex: 0, count: 6, startX: -168, spacing: 57 },
    { typeIndex: 0, count: 6, startX: -167, spacing: 57 },
    { typeIndex: 0, count: 6, startX: -166, spacing: 57 },
  ], rowSpacing: 75, startY: 52 },

  // 第3关
  { rows: [
    { typeIndex: 0, count: 5, startX: -146, spacing: 60 },
    { typeIndex: 0, count: 5, startX: -145, spacing: 60 },
    { typeIndex: 1, count: 4, startX: -124, spacing: 72 },
  ], rowSpacing: 78, startY: 50 },

  // 第4关
  { rows: [
    { typeIndex: 0, count: 6, startX: -174, spacing: 56 },
    { typeIndex: 0, count: 6, startX: -175, spacing: 56 },
    { typeIndex: 1, count: 4, startX: -134, spacing: 70 },
    { typeIndex: 0, count: 6, startX: -173, spacing: 56 },
  ], rowSpacing: 73, startY: 46 },

  // 第5关
  { rows: [
    { typeIndex: 0, count: 5, startX: -154, spacing: 59 },
    { typeIndex: 1, count: 4, startX: -131, spacing: 71 },
    { typeIndex: 2, count: 2, startX: -64, spacing: 91 },
    { typeIndex: 0, count: 5, startX: -153, spacing: 59 },
  ], rowSpacing: 76, startY: 44 },

  // 第6关
  { rows: [
    { typeIndex: 0, count: 6, startX: -189, spacing: 55 },
    { typeIndex: 0, count: 6, startX: -190, spacing: 55 },
    { typeIndex: 1, count: 5, startX: -159, spacing: 68 },
    { typeIndex: 0, count: 6, startX: -188, spacing: 55 },
    { typeIndex: 0, count: 5, startX: -187, spacing: 55 },
  ], rowSpacing: 71, startY: 40 },

  // 第7关
  { rows: [
    { typeIndex: 0, count: 5, startX: -166, spacing: 58 },
    { typeIndex: 1, count: 5, startX: -159, spacing: 67 },
    { typeIndex: 0, count: 5, startX: -165, spacing: 58 },
    { typeIndex: 2, count: 3, startX: -113, spacing: 84 },
    { typeIndex: 1, count: 5, startX: -163, spacing: 67 },
    { typeIndex: 0, count: 5, startX: -167, spacing: 58 },
  ], rowSpacing: 69, startY: 36 },

  // 第8关
  { rows: [
    { typeIndex: 0, count: 6, startX: -199, spacing: 53 },
    { typeIndex: 0, count: 6, startX: -201, spacing: 53 },
    { typeIndex: 1, count: 5, startX: -174, spacing: 65 },
    { typeIndex: 0, count: 6, startX: -202, spacing: 53 },
    { typeIndex: 2, count: 3, startX: -123, spacing: 81 },
    { typeIndex: 1, count: 5, startX: -177, spacing: 65 },
    { typeIndex: 0, count: 6, startX: -203, spacing: 53 },
  ], rowSpacing: 67, startY: 32 },

  // 第9关
  { rows: [
    { typeIndex: 0, count: 6, startX: -207, spacing: 52 },
    { typeIndex: 0, count: 6, startX: -209, spacing: 52 },
    { typeIndex: 1, count: 5, startX: -183, spacing: 64 },
    { typeIndex: 0, count: 6, startX: -205, spacing: 52 },
    { typeIndex: 2, count: 4, startX: -144, spacing: 78 },
    { typeIndex: 1, count: 5, startX: -184, spacing: 64 },
    { typeIndex: 0, count: 6, startX: -213, spacing: 52 },
    { typeIndex: 2, count: 4, startX: -147, spacing: 78 },
  ], rowSpacing: 65, startY: 28 },

  // 第10关
  { rows: [
    { typeIndex: 0, count: 6, startX: -222, spacing: 50 },
    { typeIndex: 0, count: 6, startX: -221, spacing: 50 },
    { typeIndex: 1, count: 6, startX: -196, spacing: 62 },
    { typeIndex: 0, count: 6, startX: -223, spacing: 50 },
    { typeIndex: 2, count: 4, startX: -159, spacing: 76 },
    { typeIndex: 1, count: 6, startX: -197, spacing: 62 },
    { typeIndex: 0, count: 6, startX: -220, spacing: 50 },
    { typeIndex: 2, count: 4, startX: -161, spacing: 76 },
    { typeIndex: 0, count: 6, startX: -219, spacing: 50 },
  ], rowSpacing: 63, startY: 24 },
];

export const levelConfig = [
  { lives: 5, speed: 1, fireRate: 7950 },
  { lives: 5, speed: 1, fireRate: 7480 },
  { lives: 4, speed: 1, fireRate: 7180 },
  { lives: 4, speed: 1, fireRate: 6690 },
  { lives: 3, speed: 1, fireRate: 6440 },
  { lives: 3, speed: 1, fireRate: 6110 },
  { lives: 2, speed: 1, fireRate: 5720 },
  { lives: 2, speed: 1, fireRate: 5220 },
  { lives: 1, speed: 1, fireRate: 4720 },
  { lives: 1, speed: 1, fireRate: 3870 },
];

/**
 * 生成所有游戏纹理（使用 scene.add.graphics）
 */
export function generateTextures(scene: Phaser.Scene) {
  // 小型敌人（1分）—— 红色三角形
  if (!scene.textures.exists('enemySmall')) {
    const g = scene.add.graphics();
    g.fillStyle(0xe74c3c);
    g.fillTriangle(16, 0, 0, 31, 32, 31);
    g.fillStyle(0xc0392b);
    g.fillRect(11, 8, 10, 8);
    g.generateTexture('enemySmall', 32, 32);
    g.destroy();
  }

  // 中型敌人（5分）—— 橙色三角形
  if (!scene.textures.exists('enemyMedium')) {
    const g = scene.add.graphics();
    g.fillStyle(0xf39c12);
    g.fillTriangle(20, 0, 0, 38, 40, 38);
    g.fillStyle(0xe67e22);
    g.fillRect(14, 10, 12, 10);
    g.generateTexture('enemyMedium', 40, 38);
    g.destroy();
  }

  // 大型敌人（10分）—— 紫色三角形
  if (!scene.textures.exists('enemyLarge')) {
    const g = scene.add.graphics();
    g.fillStyle(0x9b59b6);
    g.fillTriangle(24, 0, 0, 46, 48, 46);
    g.fillStyle(0x8e44ad);
    g.fillRect(16, 12, 16, 12);
    g.generateTexture('enemyLarge', 48, 46);
    g.destroy();
  }

  // 玩家飞船（火箭形状）
  if (!scene.textures.exists('player')) {
    const g = scene.add.graphics();

    // 机身主体（银灰蓝色）
    g.fillStyle(0x4488cc);
    g.beginPath();
    g.moveTo(16, 0);       // 机头尖
    g.lineTo(6, 20);       // 左侧机身
    g.lineTo(10, 20);
    g.lineTo(10, 28);
    g.lineTo(22, 28);
    g.lineTo(22, 20);
    g.lineTo(26, 20);
    g.closePath();
    g.fillPath();

    // 驾驶舱（浅蓝色）
    g.fillStyle(0x88ccff);
    g.fillTriangle(16, 4, 10, 14, 22, 14);

    // 左机翼（深蓝）
    g.fillStyle(0x336699);
    g.fillTriangle(6, 18, 0, 26, 10, 22);
    // 右机翼
    g.fillTriangle(26, 18, 32, 26, 22, 22);

    // 尾焰外焰（黄色）
    g.fillStyle(0xffaa00);
    g.fillTriangle(12, 28, 20, 28, 16, 36);

    // 尾焰内焰（橙色）
    g.fillStyle(0xff6600);
    g.fillTriangle(14, 28, 18, 28, 16, 33);

    g.generateTexture('player', 32, 38);
    g.destroy();
  }

  // 子弹（白色）
  if (!scene.textures.exists('bullet')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 4, 14);
    g.generateTexture('bullet', 4, 14);
    g.destroy();
  }

  // 敌方子弹（黄色）
  if (!scene.textures.exists('enemyBullet')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffaa00);
    g.fillCircle(4, 4, 4);
    g.generateTexture('enemyBullet', 8, 8);
    g.destroy();
  }

  // 彩蛋（绿色）
  if (!scene.textures.exists('egg')) {
    const g = scene.add.graphics();
    g.fillStyle(0x00ff88);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0x00cc66);
    g.fillCircle(8, 8, 4);
    g.generateTexture('egg', 16, 16);
    g.destroy();
  }

  // 粒子（白色圆点）
  if (!scene.textures.exists('particle')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  // 防护罩道具（绿色盾牌图标）
  if (!scene.textures.exists('shieldPickup')) {
    const g = scene.add.graphics();
    g.fillStyle(0x00ff88);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0x00cc66);
    g.fillTriangle(8, 3, 4, 12, 12, 12);
    g.generateTexture('shieldPickup', 16, 16);
    g.destroy();
  }

  // 防护罩效果（半透明蓝色圆形）
  if (!scene.textures.exists('shield')) {
    const g = scene.add.graphics();
    g.lineStyle(3, 0x44aaff, 0.8);
    g.strokeCircle(20, 20, 18);
    g.fillStyle(0x44aaff, 0.15);
    g.fillCircle(20, 20, 18);
    g.generateTexture('shield', 40, 40);
    g.destroy();
  }
  
}
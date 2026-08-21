// client/src/games/shooter/index.ts
import type { GameDefinition } from '../../components/GameFrame';
import ShooterGame from './ShooterGame';

// 从环境变量读取配置（与 CoursesData.ts 保持一致）
const CDN_BASE = import.meta.env.VITE_CDN_BASE || 'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main';
const USE_LOCAL_DATA = import.meta.env.VITE_USE_LOCAL_DATA === 'true';
const ROOT_SUB_DIR = 'openEDU';

/**
 * 根据当前模式获取游戏预览图 URL
 * @param gameKey 游戏标识，用于定位图片文件名
 */
function getGamePreviewUrl(gameKey: string): string {
  if (USE_LOCAL_DATA) {
    // 本地模式：图片位于 public/data/public/ 下（软链接指向 openEDU/public/）
    return `/data/public/${gameKey}.jpg`;
  } else {
    // CDN 模式：图片位于 GitHub 仓库的 openEDU/public/ 目录下
    return `${CDN_BASE}/${ROOT_SUB_DIR}/public/${gameKey}.jpg`;
  }
}

export const shooterGame: GameDefinition = {
  key: 'shooter',
  labelKey: 'shooter.planeGame',
  previewImage: getGamePreviewUrl('shooter'),
  component: ShooterGame,
};
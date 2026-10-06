// 游戏注册
// src/games/template/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import TemplateGame from './TemplateGame';

const templateEntry: GameEntry = {
  id: 'template',
  title: (t: (key: string) => string) => t('template.title'),
  description: (t: (key: string) => string) => t('template.description'),
  icon: '📋', // 模板，用剪贴板 emoji
  component: TemplateGame,
};

GameManager.register(templateEntry);

export default TemplateGame;
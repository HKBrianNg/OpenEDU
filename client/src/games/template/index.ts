// src/games/template/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import TemplateGame from './TemplateGame';

const templateEntry: GameEntry = {
  id: 'template',
  title: (t: (key: string) => string) => t('template.title'),
  description: (t: (key: string) => string) => t('template.description'),
  thumbnail: '/assets/template-thumb.png', 
  component: TemplateGame,
  difficulty: 'medium',
  tags: ['益智', '休闲', '图片'],
};

GameManager.register(templateEntry);

export default TemplateGame;
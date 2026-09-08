export interface TemplateGameProps {
  onExit: () => void;
}

// 玩家身份：'red' (下方/人类), 'blue' (上方/AI)
export type Player = 'red' | 'blue';

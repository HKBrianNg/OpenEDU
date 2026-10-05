import { zh as colorMatchZh, en as colorMatchEn } from './colorMatch';
import { zh as tictactoeZh, en as tictactoeEn } from './tictactoe';
import { zh as jungleZh, en as jungleEn } from './jungle';
import { zh as xiangqiZh, en as xiangqiEn } from './xiangqi';
import { zh as checkerZh, en as checkerEn } from './checker';
import { zh as tilematchingZh, en as tilematchingEn } from './tilematching';
import { zh as templateZh, en as templateEn } from './template';

export const zh = {
  ...colorMatchZh,
  ...tictactoeZh,
  ...jungleZh,
  ...xiangqiZh,
  ...checkerZh,
  ...tilematchingZh,
  ...templateZh,
};

export const en = {
  ...colorMatchEn,
  ...tictactoeEn,
  ...jungleEn,
  ...xiangqiEn,
  ...checkerEn,
  ...tilematchingEn,
  ...templateEn,
};
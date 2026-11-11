import { zh as colorMatchZh, en as colorMatchEn, zhTW as colorMatchZhTW } from './colorMatch';
import { zh as tictactoeZh, en as tictactoeEn, zhTW as tictactoeZhTW } from './tictactoe';
import { zh as jungleZh, en as jungleEn, zhTW as jungleZhTW } from './jungle';
import { zh as xiangqiZh, en as xiangqiEn, zhTW as xiangqiZhTW } from './xiangqi';
import { zh as checkerZh, en as checkerEn, zhTW as checkerZhTW } from './checker';
import { zh as tilematchingZh, en as tilematchingEn, zhTW as tilematchingZhTW } from './tilematching';

export const zh = {
  ...colorMatchZh,
  ...tictactoeZh,
  ...jungleZh,
  ...xiangqiZh,
  ...checkerZh,
  ...tilematchingZh,
};

export const zhTW = {
  ...colorMatchZhTW,
  ...tictactoeZhTW,
  ...jungleZhTW,
  ...xiangqiZhTW,
  ...checkerZhTW,
  ...tilematchingZhTW,
};

export const en = {
  ...colorMatchEn,
  ...tictactoeEn,
  ...jungleEn,
  ...xiangqiEn,
  ...checkerEn,
  ...tilematchingEn,
};
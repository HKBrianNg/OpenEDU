import { zh as englishwordZh, en as englishwordEn } from './englishword';
import { zh as juniorEncyclopediaZh, en as juniorEncyclopediaEn } from './juniorEncyclopedia';
import { zh as basicEnglish300Zh, en as basicEnglish300En } from './basicEnglish300';
import { zh as knowledgebaseZh, en as knowledgebaseEn } from './knowledgebase';

export const zh = {
  ...englishwordZh,
  ...juniorEncyclopediaZh,
  ...basicEnglish300Zh,
  ...knowledgebaseZh,
};

export const en = {
  ...englishwordEn,
  ...juniorEncyclopediaEn,
  ...basicEnglish300En,
  ...knowledgebaseEn,
};
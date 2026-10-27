// 英文流行歌：英文歌这门课里「流行歌曲」分类下的歌，按歌手排

import React from 'react';
import SongsPage from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

const EnglishPop: React.FC<{ onExit?: () => void }> = ({ onExit }) => (
  <SongsPage
    courseId="EnglishSongs"
    category={SONG_CATEGORY.pop}
    titleKey="music.englishPop.title"
    onExit={onExit}
  />
);

export default EnglishPop;

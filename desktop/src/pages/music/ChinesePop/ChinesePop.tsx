// 中文流行歌：中文歌这门课里「流行歌曲」分类下的歌，按歌手排

import React from 'react';
import SongsPage from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

const ChinesePop: React.FC<{ onExit?: () => void }> = ({ onExit }) => (
  <SongsPage
    courseId="ChineseSongs"
    category={SONG_CATEGORY.pop}
    titleKey="music.chinesePop.title"
    subtitleKey="music.chinesePop.subtitle"
    onExit={onExit}
  />
);

export default ChinesePop;

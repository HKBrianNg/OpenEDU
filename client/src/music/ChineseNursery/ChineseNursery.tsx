// 中文儿歌：中文歌这门课里「儿歌」分类下的歌，按歌手排

import React from 'react';
import SongsPage from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

const ChineseNursery: React.FC<{ onExit?: () => void }> = ({ onExit }) => (
  <SongsPage
    courseId="ChineseSongs"
    category={SONG_CATEGORY.nursery}
    titleKey="music.chineseNursery.title"
    onExit={onExit}
  />
);

export default ChineseNursery;

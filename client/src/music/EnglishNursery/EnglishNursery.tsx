// 英文儿歌：英文歌这门课里「儿歌」分类下的歌，按歌手排

import React from 'react';
import SongsPage from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

const EnglishNursery: React.FC<{ onExit?: () => void }> = ({ onExit }) => (
  <SongsPage
    courseId="EnglishSongs"
    category={SONG_CATEGORY.nursery}
    titleKey="music.englishNursery.title"
    subtitleKey="music.englishNursery.subtitle"
    onExit={onExit}
  />
);

export default EnglishNursery;

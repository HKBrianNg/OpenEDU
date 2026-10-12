// client/src/music/EnglishSongs/EnglishSongs.tsx

import React from 'react';
import SongsPage from '../shared/SongsPage';

const EnglishSongs: React.FC<{ onExit?: () => void }> = ({ onExit }) => (
  <SongsPage courseId="EnglishSongs" onExit={onExit} />
);

export default EnglishSongs;

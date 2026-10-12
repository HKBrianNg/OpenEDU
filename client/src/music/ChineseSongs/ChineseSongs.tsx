// client/src/music/ChineseSongs/ChineseSongs.tsx

import React from 'react';
import SongsPage from '../shared/SongsPage';

const ChineseSongs: React.FC<{ onExit?: () => void }> = ({ onExit }) => (
  <SongsPage courseId="ChineseSongs" onExit={onExit} />
);

export default ChineseSongs;

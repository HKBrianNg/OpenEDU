import React from 'react';
import { PlayCircleOutlined } from '@ant-design/icons';
import { lessonStyles } from './LessonRenderer.style';

export interface VideoLessonProps {
  lessonUrl?: string;
  isMobile: boolean;
  t: (key: string) => string;
}

const VideoLesson: React.FC<VideoLessonProps> = ({ lessonUrl, isMobile, t }) => {
  const videoBoxStyle = isMobile ? lessonStyles.videoBoxMobile : lessonStyles.videoBoxPc;
  const videoTextStyle = isMobile ? lessonStyles.videoTextMobile : lessonStyles.videoTextPc;

  return (
    <div style={videoBoxStyle}>
      <a
        href={lessonUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={lessonStyles.videoLink}
      >
        <PlayCircleOutlined style={{ fontSize: isMobile ? 44 : 72, cursor: 'pointer' }} />
        <div style={videoTextStyle}>{t('detail.video.play')}</div>
      </a>
    </div>
  );
};

export default VideoLesson;

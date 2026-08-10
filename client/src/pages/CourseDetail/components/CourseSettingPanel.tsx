import React from 'react';
import { Card, Space, Switch, Typography } from 'antd';
import { AudioOutlined, SoundOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

// 从 Typography 解构 Text
const { Text } = Typography;

interface CourseSettingPanelProps {
  autoSpeak: boolean;
  blurContent: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onAutoSpeakChange: (checked: boolean) => void;
  onBlurContentChange: (checked: boolean) => void;
}

const CourseSettingPanel: React.FC<CourseSettingPanelProps> = ({
  autoSpeak,
  blurContent,
  isMobile,
  t,
  onAutoSpeakChange,
  onBlurContentChange
}) => {
  return (
    <Card size="small" style={{ marginTop: isMobile ? 0 : 12, marginBottom: isMobile ? 12 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <AudioOutlined style={{ fontSize: isMobile ? 13 : 15, color: autoSpeak ? '#1890ff' : undefined }} />
          <Text style={{ fontSize: isMobile ? 13 : 13 }}>{t('detail.autoSpeak')}</Text>
          <Switch
            checked={autoSpeak}
            onChange={onAutoSpeakChange}
            checkedChildren={<SoundOutlined />}
            unCheckedChildren={<AudioOutlined />}
            size="small"
          />
        </Space>
        <Space>
          <EyeInvisibleOutlined style={{ fontSize: isMobile ? 12 : 13, color: blurContent ? '#1890ff' : '#bbb' }} />
          <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>{t('detail.blur')}</Text>
          <Switch
            checked={blurContent}
            onChange={onBlurContentChange}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
            size="small"
          />
        </Space>
      </div>
    </Card>
  );
};

export default CourseSettingPanel;

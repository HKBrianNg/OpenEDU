import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, MenuOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface CourseHeaderProps {
  isMobile: boolean;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onOpenMobileDrawer: () => void;
  courseTitle: string;
  courseDesc: string;
  t: (key: string) => string;
}

const CourseHeader: React.FC<CourseHeaderProps> = ({
  isMobile,
  showSidebar,
  onToggleSidebar,
  onOpenMobileDrawer,
  courseTitle,
  courseDesc,
  t,
}) => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 3 : 7 }}>
      {/* 返回按钮 */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
        style={{ padding: 0, marginRight: 8, fontSize: isMobile ? 13 : 14 }}
      >
        {t('detail.back')}
      </Button>

      {/* 侧边栏触发按钮 */}
      {isMobile ? (
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onOpenMobileDrawer}
          style={{ marginRight: 8 }}
        />
      ) : (
        <Tooltip title={showSidebar ? t('detail.hideCatalog') : t('detail.showCatalog')}>
          <Button
            type="text"
            icon={showSidebar ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={onToggleSidebar}
            style={{ marginRight: 16 }}
          />
        </Tooltip>
      )}

      {/* 标题+简介 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Title
          level={isMobile ? 4 : 2}
          style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {courseTitle}
        </Title>
        {!isMobile && (
          <Paragraph
            type="secondary"
            style={{ margin: 0, fontSize: 14, lineHeight: '40px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {courseDesc}
          </Paragraph>
        )}
      </div>
    </div>
  );
};

export default CourseHeader;

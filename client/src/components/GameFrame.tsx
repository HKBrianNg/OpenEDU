import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useLocale } from '../store/LocaleContext';

export interface GameDefinition {
  key: string;
  labelKey: string;
  /** 预览图 URL（可选），若不提供则自动生成纯色卡片 */
  previewImage?: string;
  Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  component: React.ComponentType<any>;
}

interface GameFrameProps {
  games?: GameDefinition[];
}

/** 生成纯色占位预览图（无文字） */
function generatePlaceholderPreview(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;
  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 装饰线
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 45);
  ctx.lineTo(canvas.width - 40, 45);
  ctx.stroke();
  // 不添加任何文字
  return canvas.toDataURL('image/png');
}

const GameFrame: React.FC<GameFrameProps> = ({ games = [] }) => {
  const { t } = useLocale();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [started, setStarted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 786);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 787);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentGame = games?.find(g => g.key === selectedKey);
  const GameComponent = currentGame?.component;

  const menuItems = (games ?? []).map(g => ({
    key: g.key,
    icon: g.Icon ? <g.Icon /> : null,
    label: t(g.labelKey),
  }));

  // 点击菜单项：切换游戏，回到预览图状态
  const handleMenuClick = ({ key }: { key: string }) => {
    setSelectedKey(key);
    setStarted(false);
    if (isMobile) setDrawerOpen(false);
  };

  // 点击预览图：启动游戏
  const handleStart = () => {
    if (selectedKey) {
      setStarted(true);
    }
  };

  // 自动选中第一个游戏（但不启动）
  useEffect(() => {
    if (!selectedKey && games.length > 0) {
      setSelectedKey(games[0].key);
    }
  }, [games, selectedKey]);

  // 预览图来源
  const previewSrc = useMemo(() => {
    if (!currentGame) return '';
    if (currentGame.previewImage) return currentGame.previewImage;
    return generatePlaceholderPreview();
  }, [currentGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* 移动端顶部导航栏 */}
      {isMobile && (
        <div style={{
          padding: '8px 12px',
          background: '#fafafa',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Button icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} type="text" />
          <span style={{ fontWeight: 700 }}>
            {currentGame ? t(currentGame.labelKey) : t('shooter.chooseGame')}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 桌面端左侧菜单 */}
        {!isMobile && (
          <div style={{
            width: 174,
            background: '#fafafa',
            borderRadius: 8,
            padding: '8px 0',
            border: '1px solid #eee',
            margin: 24,
          }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={handleMenuClick}
              items={menuItems}
              style={{ borderRight: 0 }}
            />
          </div>
        )}

        {/* 移动端抽屉菜单 */}
        <Drawer
          title={t('shooter.chooseGame')}
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={isMobile && drawerOpen}
          size={250}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={handleMenuClick}
            items={menuItems}
            style={{ borderRight: 0 }}
          />
        </Drawer>

        {/* 主内容区域 */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isMobile ? 8 : 24,
        }}>
          {started && GameComponent ? (
            // 游戏已启动，渲染游戏组件，并传递 onExit 回调
            <div style={{ width: '100%', maxWidth: 920 }}>
              <GameComponent isMobile={isMobile} onExit={() => setStarted(false)} />
            </div>
          ) : (
            // 未启动：显示预览图，点击即开始
            <div style={{ textAlign: 'center' }}>
              {previewSrc && (
                <img
                  src={previewSrc}
                  alt={currentGame ? t(currentGame.labelKey) : ''}
                  style={{
                    maxWidth: '100%',
                    maxHeight: isMobile ? 248 : 370,
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.128)',
                    cursor: 'pointer',
                    transition: 'transform 0.213s',
                  }}
                  onClick={handleStart}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.025)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              )}
              {/* 无任何额外文字 */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameFrame;
// client/src/components/ModuleFrame.tsx
import React, { useEffect, useState } from 'react';
import { Card, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { ManagerEntry } from '../utils/BaseManager';
import { useLocale } from '../store/LocaleContext';
import { useSectionBack } from '../store/SectionBackContext';

interface ModuleFrameProps {
  manager: {
    getAll: () => ManagerEntry[];
    get: (id: string) => ManagerEntry | undefined;
  };
  emptyText?: string;
  gradient?: string;
  /** 展开模块后头部那个「返回上一层」按钮的文案，比如「返回书籍」 */
  backLabel?: string;
  renderExtra?: (item: ManagerEntry) => React.ReactNode;
  getComponentProps?: (item: ManagerEntry) => Record<string, unknown>;
}

const ModuleFrame: React.FC<ModuleFrameProps> = ({
  manager,
  emptyText = '暂无内容',
  gradient = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  backLabel,
  renderExtra,
  getComponentProps,
}) => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { setBack } = useSectionBack();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = manager.getAll();
  const selectedItem = selectedId ? manager.get(selectedId) : undefined;

  // 展开模块时把「返回上一层」登记给头部，收起/离开页面时撤掉。
  // 头部是固定的，这样滚到哪都能点，不用滑回页顶找页面里那个按钮。
  useEffect(() => {
    if (!selectedItem?.component || !backLabel) {
      setBack(null);
      return;
    }
    setBack({ label: backLabel, onBack: () => setSelectedId(null) });
    return () => setBack(null);
  }, [selectedItem, backLabel, setBack]);

  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  if (selectedItem?.component) {
    const Component = selectedItem.component;
    const extraProps = getComponentProps ? getComponentProps(selectedItem) : {};
    return (
      <div style={{ padding: 12 }}>
        <Component onExit={() => setSelectedId(null)} {...extraProps} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description={emptyText} />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      {/* 网格用 class 而不是内联样式：一行几张要按屏宽变，
          内联样式写不了媒体查询。卡片同时压小，尽量一屏看完不用滚。 */}
      <style>{`
        .module-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        @media (max-width: 1400px) {
          .module-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (max-width: 1100px) {
          .module-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 767px) {
          .module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
        .module-cover {
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }
        @media (max-width: 767px) {
          .module-cover { height: 68px; font-size: 26px; }
        }
        .module-grid .ant-card-meta-title {
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .module-grid .ant-card-meta-description {
          font-size: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="module-grid">
        {items.map((item) => (
          <Card
            key={item.id}
            hoverable
            size="small"
            styles={{ body: { padding: 10 } }}
            cover={
              <div
                className="module-cover"
                style={{ background: item.gradient || gradient }}
              >
                {item.icon}
              </div>
            }
            onClick={() => {
              // 有 to 就跳路由（首页的功能入口），否则就地挂载组件（书本/音乐/游戏）
              if (item.to) navigate(item.to);
              else setSelectedId(item.id);
            }}
          >
            <Card.Meta
              title={resolveText(item.title)}
              description={item.description ? resolveText(item.description) : ''}
            />
            {renderExtra && renderExtra(item)}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModuleFrame;
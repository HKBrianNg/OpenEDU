import { Select, Button } from 'antd';

// ✅ 修复6：移除未使用的 React 导入

interface GameControlPanelProps {
  level: number;
  onLevelChange: (level: number) => void;
  onRestart: () => void;
}

const GameControlPanel = ({ level, onLevelChange, onRestart }: GameControlPanelProps) => {
  return (
    <div style={{ width: 152, paddingTop: 8 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>选择等级</div>
        <Select
          value={level}
          onChange={onLevelChange}
          options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `Level ${i + 1}` }))}
          style={{ width: '100%' }}
        />
      </div>
      <Button onClick={onRestart} block>
        重新开始
      </Button>
    </div>
  );
};

export default GameControlPanel;
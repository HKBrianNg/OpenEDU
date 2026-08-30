import React from 'react';

const JungleLab: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Jungle 自我对弈实验室</h1>
      <p>AI 在 Jungle 环境中自我对弈，生成棋谱数据。</p>
      {onExit && (
        <button onClick={onExit} style={{ marginTop: 20, padding: '8px 24px' }}>
          返回实验室列表
        </button>
      )}
    </div>
  );
};

export default JungleLab;
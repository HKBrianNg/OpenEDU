import {useState} from 'react';
import type { TemplateGameProps, Player } from './types';
import { initBoard } from './board';
import { useLocale } from '../../store/LocaleContext';

export default function TemplateGame({onExit} : TemplateGameProps ) {

    const { t } = useLocale();
    const [turn, _setTurn] = useState<Player>('red'); // 红方先手
    const [winner,_setWinner] = useState<Player | null>(null);
    const [isAiThinking, _setIsAiThinking] = useState(false);
    const [vsAI, setVsAI] = useState(true);

    const newGame = () => {
      initBoard();
    };

    // 重新开始游戏
    const handleRestart = () => {
        newGame();
    };  

    // 悔棋逻辑
    const handleUndo = () => {
    };

    // Turn AI On/Off
    const handleToggleAI = () => {
      setVsAI(!vsAI);
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
          <h2>{t('template.title')}</h2>
          
          {/* 状态栏 */}
          <div style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
            {winner ? (
              <span style={{ color: winner === 'red' ? '#dc3545' : '#007bff' }}>
                🏆 {winner === 'red' ? t('template.win.red') : t('template.win.blue')}
              </span>
            ) : (
              <span style={{ color: turn === 'red' ? '#dc3545' : '#007bff' }}>
                {isAiThinking
                  ? `🤖 ${t('template.status.thinking')}`
                  : `${t('template.turn.' + turn)}`
                }
              </span>
            )}
          </div>
    
          {/* 棋盘区域 */}
          <div style={{ 
            display: 'inline-block', 
            border: '5px solid #8d6e63', 
            padding: '10px', 
            backgroundColor: '#fff3e0',
            borderRadius: '8px'
          }}>
          
          </div>
    
          {/* 底部按钮组 */}
          <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
            {/* 1. 重新开始 */}
            <button onClick={handleRestart} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              🔄 {t('template.button.restart')}
            </button>
            {/* 2. 悔棋 */}
            <button 
              onClick={handleUndo} 
              disabled={history.length <= 1 || isAiThinking}
              style={{ 
                padding: '8px 16px', 
                cursor: history.length <= 1 || isAiThinking ? 'not-allowed' : 'pointer',
                backgroundColor: history.length <= 1 ? '#eee' : '#fff',
                border: '1px solid #ccc'
              }}
            >
              ↩️ {t('template.button.undo')}
            </button>
            {/* 3. AI 开关 (占位，当前为固定人机对战) */}
            <button 
              onClick={handleToggleAI} 
              style={{ 
                padding: '8px 16px', 
                cursor: 'pointer',
                backgroundColor: '#eee',
                border: '1px solid #ccc',
              }}
            >
              {vsAI ? t('template.btn.aiOn') : t('template.btn.aiOff')}
           </button>
            {/* 4. 返回大厅 */}
            {onExit && (
              <button
                onClick={onExit}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4
                }}
              >
                {t('template.button.exit') || '返回大厅'}
              </button>
            )}
          </div>
        </div>
      );
}
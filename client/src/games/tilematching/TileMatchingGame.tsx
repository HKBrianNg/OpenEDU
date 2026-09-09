import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Tile } from './types';
import { isFree, canPair, findHint, hasAnyMove } from './rules';
import {
  createInitialTiles,
  tileDisplay,
  tilePos,
  BOARD_W,       // 新增
  BOARD_H,       // 新增
  totalPositions,
} from './board';

import './TileMatchingGame.css';


/**
 * 深拷贝牌数组
 */
function cloneTiles(tiles: Tile[]): Tile[] {
  return tiles.map(t => ({ ...t }));
}

/**
 * 创建初始游戏状态
 */
function newInitialState(): GameState {
  const tiles = createInitialTiles();
  return {
    tiles,
    selected: [],
    hintIds: [],
    undoStack: [],
    steps: 0,
    remaining: tiles.length,
    elapsedMs: 0,
    status: 'playing',
    startedAt: Date.now(),
  };
}

const TileMatchingGame: React.FC = React.memo(function TileMatchingGame() {
  const [state, setState] = useState<GameState>(() => newInitialState());
  const timerRef = useRef<number | null>(null);

  // 调试：确认牌数
  useEffect(() => {
    console.log('totalPositions:', totalPositions(), 'tiles:', state.tiles.length);
  }, []);

  // 计时器
  useEffect(() => {
    if (state.status !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setState(s => {
        if (!s.startedAt) return s;
        return { ...s, elapsedMs: Date.now() - s.startedAt };
      });
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.status]);

  // 胜利/卡死检测
  useEffect(() => {
    if (state.status !== 'playing') return;

    if (state.remaining === 0) {
      setState(s => ({ ...s, status: 'won' }));
    } else if (!hasAnyMove(state.tiles)) {
      setState(s => ({ ...s, status: 'stuck' }));
    }
  }, [state.remaining, state.status, state.tiles]);

  /**
   * 保存当前状态到撤销栈
   */
  const pushUndo = useCallback((tiles: Tile[]) => {
    setState(s => ({
      ...s,
      undoStack: [...s.undoStack, cloneTiles(tiles)].slice(-50),
    }));
  }, []);

  /**
   * 重新开始游戏
   */
  const reset = useCallback(() => {
    setState(newInitialState());
  }, []);

  /**
   * 撤销上一步操作
   */
  const undo = useCallback(() => {
    setState(s => {
      if (s.undoStack.length === 0) return s;

      const prev = s.undoStack[s.undoStack.length - 1];
      const undoStack = s.undoStack.slice(0, -1);
      const remaining = prev.filter(t => !t.removed).length;

      return {
        ...s,
        tiles: prev,
        undoStack,
        selected: [],
        hintIds: [],
        remaining,
        steps: Math.max(0, s.steps - 1),
        status: 'playing',
        startedAt: s.startedAt ?? Date.now(),
      };
    });
  }, []);

  /**
   * 提示：高亮一对可配对的牌
   */
  const hint = useCallback(() => {
    setState(s => {
      if (s.status !== 'playing') return s;
      const ids = findHint(s.tiles);
      return { ...s, hintIds: ids };
    });
  }, []);

  /**
   * 洗牌：打乱所有未移除牌的牌面
   */
  const shuffle = useCallback(() => {
    setState(s => {
      if (s.status !== 'playing') return s;

      const active = s.tiles.filter(t => !t.removed);
      const faces = active.map(t => ({ kind: t.kind, value: t.value }));
      const shuffled = faces.sort(() => Math.random() - 0.5);

      pushUndo(s.tiles);

      const tiles = s.tiles.map(t => {
        if (t.removed) return t;
        const f = shuffled.pop()!;
        return { ...t, kind: f.kind, value: f.value, removed: false };
      });

      return {
        ...s,
        tiles,
        selected: [],
        hintIds: [],
        status: hasAnyMove(tiles) ? 'playing' : 'stuck',
      };
    });
  }, [pushUndo]);

  /**
   * 处理牌点击
   */
  const handleTileClick = useCallback(
    (tile: Tile) => {
      setState(s => {
        if (s.status !== 'playing') return s;
        if (!isFree(tile, s.tiles)) return s;

        // 更新选中列表
        const selected = s.selected.includes(tile.id)
          ? s.selected.filter(id => id !== tile.id)
          : s.selected.length >= 2
          ? [tile.id]
          : [...s.selected, tile.id];

        let tiles = s.tiles;
        let steps = s.steps;
        let remaining = s.remaining;

        // 如果选中了两张牌，尝试配对
        if (selected.length === 2) {
          const [aId, bId] = selected;
          const a = tiles.find(t => t.id === aId);
          const b = tiles.find(t => t.id === bId);

          if (a && b && canPair(a, b)) {
            pushUndo(s.tiles);
            tiles = tiles.map(t =>
              t.id === aId || t.id === bId ? { ...t, removed: true } : t
            );
            steps += 1;
            remaining = tiles.filter(t => !t.removed).length;
          }

          // 无论是否配对成功，清除选中状态
          return {
            ...s,
            tiles,
            selected: [],
            hintIds: [],
            steps,
            remaining,
          };
        }

        return {
          ...s,
          tiles,
          selected,
          hintIds: [],
          steps,
          remaining,
        };
      });
    },
    [pushUndo]
  );

  /**
   * 获取可见牌（未移除的牌）
   */
  const visibleTiles = useMemo(
    () => state.tiles.filter(t => !t.removed),
    [state.tiles]
  );

  /**
   * 格式化时间
   */
  const formatTime = (ms: number): string => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="tile-matching-game">
      {/* 工具栏 */}
      <div className="tile-matching-toolbar">
        <button className="toolbar-btn" onClick={reset}>
          新游戏
        </button>
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={state.undoStack.length === 0}
        >
          撤销
        </button>
        <button className="toolbar-btn" onClick={hint}>
          提示
        </button>
        <button className="toolbar-btn" onClick={shuffle}>
          洗牌
        </button>
        <div className="toolbar-stats">
          <span>步数: {state.steps}</span>
          <span>剩余: {state.remaining}</span>
          <span>用时: {formatTime(state.elapsedMs)}</span>
        </div>
      </div>

      {/* 游戏面板 */}
      <div
        className="tile-matching-board"
        style={{ width: BOARD_W, height: BOARD_H }}
      >
        {visibleTiles.map(tile => {
          const free = isFree(tile, state.tiles);
          const isSelected = state.selected.includes(tile.id);
          const isHinted = state.hintIds.includes(tile.id);
          const { left, top, zIndex } = tilePos(tile);

          return (
            <div
              key={tile.id}
              className={[
                'tile',
                `tile-kind-${tile.kind}`, //  【第一步修改】：绑定花色类名
                free ? 'tile-free' : 'tile-blocked',
                isSelected ? 'tile-selected' : '',
                isHinted ? 'tile-hint' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: `${left}px`, top: `${top}px`, zIndex }}
              onClick={() => handleTileClick(tile)}
            >
              <span className="tile-text">{tileDisplay(tile)}</span>
            </div>
          );
        })}
      </div>

      {/* 胜利覆盖层 */}
      {state.status === 'won' && (
        <div className="tile-matching-overlay">
          <div className="overlay-content">
            <h2>恭喜通关！</h2>
            <p>步数: {state.steps}</p>
            <p>用时: {formatTime(state.elapsedMs)}</p>
            <button className="toolbar-btn" onClick={reset}>
              再来一局
            </button>
          </div>
        </div>
      )}

      {/* 卡死覆盖层 */}
      {state.status === 'stuck' && (
        <div className="tile-matching-overlay">
          <div className="overlay-content">
            <h2>无可行配对</h2>
            <p>试试洗牌或撤销上一步操作</p>
            <div className="overlay-buttons">
              <button className="toolbar-btn" onClick={shuffle}>
                洗牌
              </button>
              <button
                className="toolbar-btn"
                onClick={undo}
                disabled={state.undoStack.length === 0}
              >
                撤销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TileMatchingGame.displayName = 'TileMatchingGame';

export default TileMatchingGame;
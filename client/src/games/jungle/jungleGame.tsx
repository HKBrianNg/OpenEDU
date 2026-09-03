import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Button, Alert } from 'antd';
import JungleBoard from './jungleBoard';
import type { Board, Pos } from './jungleTypes';
import { Side } from './jungleTypes';
import { jungleInitGame, junglePlayerMove, jungleAiMove } from './jungleGameApi';
import type { JungleInitResp, JungleMoveResp } from './jungleGameApi';

type GameStatus = 'ongoing' | 'red_wins' | 'blue_wins';

interface GameState {
  gameId: string;
  board: Board;
  turn: Side;
  status: GameStatus;
}

const JungleGame: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  /** 初始化/重新开局 */
 const handleNewGame = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setSelectedPos(null);
    try {
      const data: JungleInitResp = await jungleInitGame();
      // =========新增打印========
      console.log("后端原始完整返回data：", data);
      console.log("棋盘第8行（底部红方初始行）：", data.board[8]);
      // =========================
      setGameState({
        gameId: data.game_id,
        board: data.board,
        turn: data.turn,
        status: data.status as GameStatus,
      });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail ?? '初始化对局失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  }, []);


  /** AI自动落子，玩家走完之后调用 */
  const triggerAiMove = useCallback(async (gameId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const resp: JungleMoveResp = await jungleAiMove({
        game_id: gameId,
        model_name: 'base',
      });
      setGameState({
        gameId: resp.game_id,
        board: resp.board,
        turn: resp.turn,
        status: resp.status,
      });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail ?? 'AI落子失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /** 棋盘格子点击：选子 → 落子 */
  const handleCellClick = useCallback(async (pos: Pos) => {
    if (!gameState || gameState.status !== 'ongoing' || loading) return;

    // 第一次点击：选中棋子
    if (!selectedPos) {
      setSelectedPos(pos);
      return;
    }

    // 第二次点击：执行玩家落子
    const from = selectedPos;
    setLoading(true);
    setErrorMsg('');
    try {
      const resp: JungleMoveResp = await junglePlayerMove({
        game_id: gameState.gameId,
        from_row: from.row,
        from_col: from.col,
        to_row: pos.row,
        to_col: pos.col,
      });
      setGameState({
        gameId: resp.game_id,
        board: resp.board,
        turn: resp.turn,
        status: resp.status,
      });
      setSelectedPos(null);

      // 如果对局还没结束，交给AI走棋
      if (resp.status === 'ongoing') {
        await triggerAiMove(resp.game_id);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail ?? '走棋失败');
      setSelectedPos(null);
    } finally {
      setLoading(false);
    }
  }, [gameState, selectedPos, loading, triggerAiMove]);

  useEffect(() => {
    handleNewGame();
  }, [handleNewGame]);

  if (!gameState) {
    return <Spin size="large" style={{ margin: 40 }} />;
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {errorMsg && <Alert type="error" message={errorMsg} showIcon />}

      {gameState.status !== 'ongoing' && (
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>
          {gameState.status === 'red_wins' ? '🎉 你获胜！' : '😔 AI获胜！'}
        </div>
      )}

      <Button onClick={handleNewGame} disabled={loading}>重新开局</Button>

      <Spin spinning={loading}>
        <JungleBoard
          board={gameState.board}
          selectedPos={selectedPos}
          validMoves={[]}
          side={Side.RED}
          locale="zh"
          onCellClick={handleCellClick}
        />
      </Spin>
    </div>
  );
};

export default JungleGame;

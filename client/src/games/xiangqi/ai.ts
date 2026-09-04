// components/games/xiangqi/ai.ts
import type { Move, Piece } from './types';
import { legalMoves, pseudo } from './rules';  // ✅ pseudo从rules导入，不是board
import { VAL } from './board';

/** AI 黑方走子，返回最佳move */
export function selectAiMove(bd: (Piece | null)[][]): Move | null {
  const moves = legalMoves(bd, 'b');
  if (!moves.length) return null;

  let best: Move | null = null;
  let bs = -1e9;

  for (const mv of moves) {
    let sc = Math.random() * 5;
    if (mv.cap) sc += VAL[mv.cap.type];

    const p = bd[mv.fr][mv.fc]!;
    bd[mv.tr][mv.tc] = p;
    bd[mv.fr][mv.fc] = null;

    // 将军加分
    const checkMoves = legalMoves(bd, 'r');
    if (checkMoves.length === 0) sc += 80;

    // 评估我方棋子是否被对方攻击
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const q = bd[r][c];
        if (q && q.side === 'r') {
          // ✅ 给[a,b]元组加上类型 [number,number]
          if (pseudo(bd, r, c).some(([a,b]: [number, number]) => a === mv.tr && b === mv.tc)) {
            sc -= VAL[p.type] * 0.9;
          }
        }
      }
    }

    // 回滚棋盘
    bd[mv.fr][mv.fc] = p;
    bd[mv.tr][mv.tc] = mv.cap;

    if (sc > bs) {
      bs = sc;
      best = mv;
    }
  }
  return best;
}

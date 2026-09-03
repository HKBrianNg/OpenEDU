import axios from 'axios';
import type { Board } from './jungleTypes';
import { Side } from './jungleTypes';

const base = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';
const api = axios.create({ baseURL: base });

/** init 返回结构，对应后端 InitResponse */
export interface JungleInitResp {
  game_id: string;
  board: Board;
  turn: Side;
  status: string;
  created_at: string;
}

/** 玩家落子请求体 MoveRequest */
export interface JungleMoveReq {
  game_id: string;
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
}

/** AI落子请求体 AIMoveRequest */
export interface JungleAiMoveReq {
  game_id: string;
  model_name: string;
}

/** move / ai‑move 返回结构 MoveResponse */
export interface JungleMoveResp {
  game_id: string;
  board: Board;
  turn: Side;
  status: 'ongoing' | 'red_wins' | 'blue_wins';
  last_move?: any;
}

/** 新建对局 */
export async function jungleInitGame(): Promise<JungleInitResp> {
  const res = await api.post<JungleInitResp>('/api/games/jungle/init');
  return res.data;
}

/** 玩家执行一步落子 */
export async function junglePlayerMove(payload: JungleMoveReq): Promise<JungleMoveResp> {
  const res = await api.post<JungleMoveResp>('/api/games/jungle/move', payload);
  return res.data;
}

/** AI执行一步落子 */
export async function jungleAiMove(payload: JungleAiMoveReq): Promise<JungleMoveResp> {
  const res = await api.post<JungleMoveResp>('/api/games/jungle/ai-move', payload);
  return res.data;
}

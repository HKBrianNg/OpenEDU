import axios from 'axios';

const base = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';

export const api = axios.create({ baseURL: base });

export interface JungleConfig {
  num_games: number;
  mcts_iterations: number;
}

export interface Session {
  id: number;
  started_at: string;
  finished_at: string | null;
  games_count: number;
  status: 'running' | 'finished' | string;
  config_json: JungleConfig;
  result?: string;
}

export interface MoveRecord {
  step: number;
  side: number;
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
}

export interface RecordDetail {
  id: number;
  session_id: number;
  game_index: number;
  result: string;
  winner_side: number | null;
  ply_count: number;
  moves: MoveRecord[];
}

export async function startTrain(params: JungleConfig) {
  const r = await api.post('/api/labs/jungle/train', params);
  return r.data;
}

export async function getSessions() {
  const r = await api.get<{ sessions: Session[]; total: number }>('/api/labs/jungle/sessions');
  return r.data;
}

export async function getRecords() {
  const r = await api.get<RecordDetail[]>('/api/labs/jungle/records');
  return Array.isArray(r.data) ? r.data : (r.data as any).records ?? [];
}

export async function getRecord(id: number) {
  const r = await api.get<RecordDetail>(`/api/labs/jungle/records/${id}`);
  return r.data;
}

export async function deleteRecord(id: number): Promise<void> {
  const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete failed');
}
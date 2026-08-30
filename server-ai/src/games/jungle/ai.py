# server-ai/src/games/jungle/ai.py

import random
import time
from .types import *
from .rules import *
from .nn_model import load_nn_model

RESIGN_MOVE = ((-1, -1), (-1, -1))

TIME_LIMIT_MS = 3500
_search_start_time = 0.0


def _check_timeout() -> bool:
    return (time.time() * 1000 - _search_start_time) > TIME_LIMIT_MS


def has_opponent_instant_win(board: Board, side: Side) -> bool:
    opp = opponent_of(side)
    my_den = my_den_of(side)
    for r in range(ROWS):
        for c in range(COLS):
            piece = board[r][c]
            if piece and piece.side == opp:
                targets = get_valid_moves(board, (r, c), opp)
                for t in targets:
                    if t == my_den:
                        return True
    return False


def get_ai_move(board: Board, side: Side):
    global _search_start_time
    _search_start_time = time.time() * 1000

    moves = collect_moves(board, side)
    if not moves:
        return None

    if has_opponent_instant_win(board, side):
        return RESIGN_MOVE

    every_move_leads_to_enemy_win = True
    for mv in moves:
        sim_board = apply_move(board, mv)
        if not has_opponent_instant_win(sim_board, side):
            every_move_leads_to_enemy_win = False
            break
    if every_move_leads_to_enemy_win:
        return RESIGN_MOVE

    return _get_hard_move(board, side, moves)


def _get_hard_move(board: Board, side: Side, moves: list[tuple[Pos, Pos]]):
    opp = opponent_of(side)
    my_den = my_den_of(side)

    for mv in moves:
        if _check_timeout():
            break
        if is_side_defeated(apply_move(board, mv), opp):
            return mv

    for r in range(ROWS):
        for c in range(COLS):
            if _check_timeout():
                break
            p = board[r][c]
            if p and p.side == opp:
                targets = get_valid_moves(board, (r, c), opp)
                for t in targets:
                    if t == my_den:
                        for mv in moves:
                            if mv[1] == (r, c):
                                return mv
                            dist = abs(mv[1][0] - my_den[0]) + abs(mv[1][1] - my_den[1])
                            if dist == 1 and board[mv[1][0]][mv[1][1]] is None:
                                return mv
                        return RESIGN_MOVE

    min_opp_dist = 99
    threat_pos = None
    for r in range(ROWS):
        for c in range(COLS):
            if _check_timeout():
                break
            p = board[r][c]
            if p and p.side == opp:
                dist = abs(r - my_den[0]) + abs(c - my_den[1])
                if dist < min_opp_dist:
                    min_opp_dist = dist
                    threat_pos = (r, c)

    if min_opp_dist <= 2 and threat_pos:
        best_defense = moves[0]
        best_score = -float('inf')
        for mv in moves:
            if _check_timeout():
                break
            score = 0
            target = board[mv[1][0]][mv[1][1]]
            if target and target.side == opp:
                score += 1200
            to_dist = abs(mv[1][0] - my_den[0]) + abs(mv[1][1] - my_den[1])
            score += (14 - to_dist) * 80
            if score > best_score:
                best_score = score
                best_defense = mv
        return best_defense

    sorted_moves = sorted(moves, key=lambda m: -_evaluate_board(apply_move(board, m), side))
    best = sorted_moves[0]
    best_score = -float('inf')
    score_list = []

    for mv in sorted_moves:
        if _check_timeout():
            break
        nb = apply_move(board, mv)
        if is_side_defeated(nb, opp):
            return mv
        score = _alpha_beta(nb, side, 1, 3, -float('inf'), float('inf'), False)
        score_list.append((mv, score))
        if score > best_score:
            best_score = score
            best = mv

    all_branches_lost = all(item[1] < -300000 for item in score_list)
    if all_branches_lost:
        return RESIGN_MOVE

    return best


def _alpha_beta(board: Board, side: Side, current_depth: int, max_depth: int,
                alpha: float, beta: float, is_maximizing: bool) -> float:
    if _check_timeout():
        return _evaluate_board(board, side)

    opp = opponent_of(side)
    if is_side_defeated(board, opp):
        return 425000 + current_depth
    if is_side_defeated(board, side):
        return -425000 - current_depth
    if current_depth >= max_depth:
        return _evaluate_board(board, side)

    current_side = side if is_maximizing else opp
    moves = collect_moves(board, current_side)
    if not moves:
        return _evaluate_board(board, side)

    sorted_moves = sorted(moves, key=lambda m: -_evaluate_board(apply_move(board, m), side))

    if is_maximizing:
        value = -float('inf')
        for mv in sorted_moves:
            if _check_timeout():
                break
            nb = apply_move(board, mv)
            value = max(value, _alpha_beta(nb, side, current_depth + 1, max_depth, alpha, beta, False))
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return value
    else:
        value = float('inf')
        for mv in sorted_moves:
            if _check_timeout():
                break
            nb = apply_move(board, mv)
            value = min(value, _alpha_beta(nb, side, current_depth + 1, max_depth, alpha, beta, True))
            beta = min(beta, value)
            if alpha >= beta:
                break
        return value


def _evaluate_board(board: Board, side: Side) -> float:
    my_den = my_den_of(side)
    opp_den = den_of(side)
    opp = opponent_of(side)
    score = 0.0

    for r in range(ROWS):
        for c in range(COLS):
            p = board[r][c]
            if not p:
                continue
            val = ANIMAL_STRENGTH[p.animal]
            river = 3 <= r <= 5 and c in (1, 2, 4, 5)
            in_opp_den = (side == Side.RED and r == 8 and c == 3) or (side == Side.BLUE and r == 0 and c == 3)

            if p.side == side:
                if in_opp_den:
                    score += 525000
                else:
                    score += val * 210
                    score += (14 - (abs(r - opp_den[0]) + abs(c - opp_den[1]))) * 180
                    if (side == Side.RED and r >= 4) or (side == Side.BLUE and r <= 4):
                        score += 280
                    if p.animal == Animal.RAT and river:
                        score += 220
                    if p.animal in (Animal.LION, Animal.TIGER) and river:
                        score += 260
                    if _has_ally_nearby(board, r, c, side):
                        score += 230
            else:
                in_my_den = (side == Side.RED and r == 0 and c == 3) or (side == Side.BLUE and r == 8 and c == 3)
                if in_my_den:
                    score -= 540000
                else:
                    score -= val * 225
                    d = abs(r - my_den[0]) + abs(c - my_den[1])
                    if d <= 3:
                        score -= val * 190
                    if p.animal == Animal.RAT and river:
                        score -= 205
                    if not _has_ally_nearby(board, r, c, opp):
                        score -= val * 198

    return score


def _has_ally_nearby(board: Board, r: int, c: int, side: Side) -> bool:
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < ROWS and 0 <= nc < COLS:
                p = board[nr][nc]
                if p and p.side == side:
                    return True
    return False


# ===== 带模型选择的 AI 走棋入口 =====

def get_ai_move_with_model(board: Board, side: Side, model_name: str = "base"):
    """
    带模型选择的 AI 走棋入口。

    model_name:
        "base" → 走原有纯算法（get_ai_move）
        其他   → 尝试加载对应神经网络模型，若加载失败则降级到纯算法
    """
    if model_name and model_name != "base":
        model = load_nn_model(model_name)
        if model is not None:
            # TODO: 将来替换为神经网络版走棋
            # return get_nn_ai_move(board, side, model)
            pass

    return get_ai_move(board, side)
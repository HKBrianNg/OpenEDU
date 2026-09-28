import sys
import copy
import asyncio
from typing import Optional, List, Dict

from src.games.jungle.types import Board, Side
from src.games.jungle.rules import collect_moves, apply_move, is_side_defeated, opponent_of
from src.games.jungle.storage import create_game
from .mcts import mcts_search
from .database import save_game_record, create_training_session, finish_training_session

sys.stdout.reconfigure(line_buffering=True)


def play_one_game(
    mcts_iterations: int = 1200,
    verbose: bool = False,
) -> Dict:
    """
    执行一局自我对弈（MCTS vs MCTS）。
    返回棋谱数据。
    """
    state = create_game()
    board: Board = copy.deepcopy(state.board)
    side: Side = Side.RED
    moves_log: List[Dict] = []
    ply_count = 0
    max_plies = 100

    while ply_count < max_plies:
        ply_count += 1
        all_moves = collect_moves(board, side)
        if not all_moves:
            winner = opponent_of(side)
            result = "red_wins" if winner == Side.RED else "blue_wins"
            break

        try:
            move = mcts_search(board, side, iterations=mcts_iterations)
        except Exception as e:
            print(f"[play_one_game] mcts_search error: {e!r}", flush=True)
            raise

        if move is None:
            move = all_moves[0]

        (fr, fc), (tr, tc) = move
        moves_log.append({
            "step": ply_count,
            "side": side.value,
            "from_row": fr,
            "from_col": fc,
            "to_row": tr,
            "to_col": tc,
        })

        board = apply_move(board, move)
        opp = opponent_of(side)
        if is_side_defeated(board, opp):
            result = "red_wins" if side == Side.RED else "blue_wins"
            break
        side = opp
    else:
        result = "draw"

    winner_side: Optional[int] = None
    if result == "red_wins":
        winner_side = 0
    elif result == "blue_wins":
        winner_side = 1

    return {
        "result": result,
        "winner_side": winner_side,
        "ply_count": ply_count,
        "moves": moves_log,
    }


def run_self_play(
    num_games: int = 20,
    mcts_iterations: int = 1200,
    session_id: Optional[int] = None,
    stop_event: Optional[asyncio.Event] = None,
    verbose: bool = False,
) -> int:
    if session_id is None:
        session_id = create_training_session({
            "num_games": num_games,
            "mcts_iterations": mcts_iterations,
        })

    if verbose:
        print(f"开始自我对弈，共 {num_games} 局，session_id={session_id}", flush=True)

    last_result: Optional[Dict] = None
    completed_games = 0

    for i in range(num_games):
        if stop_event and stop_event.is_set():
            if verbose:
                print(f"收到停止信号，提前结束，已完成 {i}/{num_games} 局", flush=True)
            break

        try:
            result = play_one_game(mcts_iterations=mcts_iterations, verbose=False)
        except Exception as e:
            print(f"[run_self_play] game {i + 1} failed: {e!r}", flush=True)
            raise

        last_result = result
        completed_games = i + 1

        if verbose and (i + 1) % 10 == 0:
            print(f"  已完成 {i + 1}/{num_games} 局", flush=True)

    if last_result is not None:
        save_game_record(
            session_id=session_id,
            game_index=completed_games,
            result=last_result["result"],
            winner_side=last_result["winner_side"],
            ply_count=last_result["ply_count"],
            moves=last_result["moves"],
        )

    finish_training_session(session_id, completed_games)
    if verbose:
        print(f"自我对弈完成，共 {completed_games} 局，session_id={session_id}", flush=True)

    return session_id


if __name__ == "__main__":
    run_self_play(num_games=5, mcts_iterations=800, verbose=True)
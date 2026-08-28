import uuid
import copy
import time
from typing import Optional

from .types import Piece, Side, INITIAL_BOARD, Board
from .models import GameState, MoveRecord


# ---------------------------------------------------------------------------
# In-memory storage
# ---------------------------------------------------------------------------

_games: dict[str, GameState] = {}


def create_game() -> GameState:
    """Create a new game with initial board, return its state."""
    game_id = str(uuid.uuid4())
    board = copy.deepcopy(INITIAL_BOARD)

    state = GameState(
        game_id=game_id,
        board=board,
        turn=Side.RED,
        status="ongoing",
    )
    _games[game_id] = state
    return state


def get_game(game_id: str) -> Optional[GameState]:
    return _games.get(game_id)


def update_game(state: GameState):
    state.updated_at = time.time()
    _games[state.game_id] = state


def delete_game(game_id: str):
    _games.pop(game_id, None)


# ---------------------------------------------------------------------------
# Board serialization helpers
# ---------------------------------------------------------------------------

def board_to_json(board: Board) -> list:
    """Convert internal Board to JSON-safe list."""
    result = []
    for row in board:
        json_row = []
        for cell in row:
            if cell is None:
                json_row.append(None)
            else:
                json_row.append({"animal": cell.animal.value, "side": cell.side.value})
        result.append(json_row)
    return result


def board_from_json(json_board: list) -> Board:
    """Convert JSON board back to internal Board."""
    board = []
    for row in json_board:
        board_row = []
        for cell in row:
            if cell is None:
                board_row.append(None)
            else:
                board_row.append(Piece(animal=cell["animal"], side=cell["side"]))
        board.append(board_row)
    return board
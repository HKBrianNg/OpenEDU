from dataclasses import dataclass, field
from typing import Optional
from pydantic import BaseModel
from .types import Board, Side
import time


# ---------------------------------------------------------------------------
# Internal data structures
# ---------------------------------------------------------------------------

@dataclass
class MoveRecord:
    step: int
    side: int
    from_row: int
    from_col: int
    to_row: int
    to_col: int
    captured: Optional[dict] = None
    board_snapshot: Optional[list] = None


@dataclass
class GameState:
    game_id: str
    board: Board
    turn: Side
    status: str                     # "ongoing" | "red_wins" | "blue_wins"
    moves: list[MoveRecord] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class InitResponse(BaseModel):
    game_id: str
    board: list
    turn: int
    status: str
    created_at: float


class MoveRequest(BaseModel):
    game_id: str
    from_row: int
    from_col: int
    to_row: int
    to_col: int


class AIMoveRequest(BaseModel):
    game_id: str
    difficulty: int = 1


class MoveResponse(BaseModel):
    game_id: str
    board: list
    turn: int
    status: str
    last_move: Optional[dict] = None


class GameStateResponse(BaseModel):
    game_id: str
    board: list
    turn: int
    status: str
    moves: list[dict]
    created_at: float
    updated_at: float


class ReplayResponse(BaseModel):
    game_id: str
    board: list
    status: str
    moves: list[dict]
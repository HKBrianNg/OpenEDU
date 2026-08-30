# server-ai/src/games/jungle/router.py

from fastapi import APIRouter, HTTPException

from .types import Side
from .rules import opponent_of, get_valid_moves, apply_move, is_side_defeated
from .ai import get_ai_move_with_model, RESIGN_MOVE
from .storage import create_game, get_game, update_game, board_to_json
from .nn_model import list_available_models
from .models import (
    InitResponse,
    MoveRequest,
    AIMoveRequest,
    MoveResponse,
    GameStateResponse,
    ReplayResponse,
    MoveRecord,
)

router = APIRouter()


@router.get("/models")
def get_models():
    """返回可用 AI 模型列表，base 为固定纯算法选项"""
    models = list_available_models()
    return {
        "models": [
            {"name": "base", "label": "基础版（纯算法）", "type": "algorithm"}
        ] + [
            {"name": m["name"], "label": m["name"], "type": "neural"}
            for m in models
        ],
        "default": "base",
    }


@router.post("/init", response_model=InitResponse)
def init_game():
    state = create_game()
    return InitResponse(
        game_id=state.game_id,
        board=board_to_json(state.board),
        turn=state.turn.value,
        status=state.status,
        created_at=state.created_at,
    )


@router.post("/move", response_model=MoveResponse)
def player_move(req: MoveRequest):
    state = get_game(req.game_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")
    if state.status != "ongoing":
        raise HTTPException(status_code=400, detail=f"Game already ended: {state.status}")

    board = state.board
    piece = board[req.from_row][req.from_col]

    if piece is None:
        raise HTTPException(status_code=400, detail="No piece at source position")
    if piece.side != state.turn:
        raise HTTPException(status_code=400, detail="Not your turn")

    valid_targets = get_valid_moves(board, (req.from_row, req.from_col), state.turn)
    target = (req.to_row, req.to_col)

    if target not in valid_targets:
        raise HTTPException(status_code=400, detail="Invalid move")

    captured_piece = board[req.to_row][req.to_col]
    captured_info = None
    if captured_piece is not None:
        captured_info = {"animal": captured_piece.animal.value, "side": captured_piece.side.value}

    new_board = apply_move(board, ((req.from_row, req.from_col), (req.to_row, req.to_col)))
    state.board = new_board

    record = MoveRecord(
        step=len(state.moves) + 1,
        side=state.turn.value,
        from_row=req.from_row,
        from_col=req.from_col,
        to_row=req.to_row,
        to_col=req.to_col,
        captured=captured_info,
        board_snapshot=board_to_json(new_board),
    )
    state.moves.append(record)

    opp = opponent_of(state.turn)
    if is_side_defeated(new_board, opp):
        state.status = "red_wins" if state.turn == Side.RED else "blue_wins"
    else:
        state.turn = opp

    update_game(state)

    return MoveResponse(
        game_id=state.game_id,
        board=board_to_json(state.board),
        turn=state.turn.value,
        status=state.status,
        last_move={
            "from": {"row": req.from_row, "col": req.from_col},
            "to": {"row": req.to_row, "col": req.to_col},
            "captured": captured_info,
        },
    )


@router.post("/ai-move", response_model=MoveResponse)
def ai_move(req: AIMoveRequest):
    state = get_game(req.game_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")
    if state.status != "ongoing":
        raise HTTPException(status_code=400, detail=f"Game already ended: {state.status}")

    board = state.board
    result = get_ai_move_with_model(board, state.turn, req.model_name, req.difficulty)

    if result is None:
        raise HTTPException(status_code=400, detail="No valid moves available")

    if result == RESIGN_MOVE:
        state.status = "red_wins" if state.turn == Side.BLUE else "blue_wins"
        update_game(state)
        return MoveResponse(
            game_id=state.game_id,
            board=board_to_json(state.board),
            turn=state.turn.value,
            status=state.status,
            last_move={"resign": True},
        )

    (from_row, from_col), (to_row, to_col) = result

    captured_piece = board[to_row][to_col]
    captured_info = None
    if captured_piece is not None:
        captured_info = {"animal": captured_piece.animal.value, "side": captured_piece.side.value}

    new_board = apply_move(board, result)
    state.board = new_board

    record = MoveRecord(
        step=len(state.moves) + 1,
        side=state.turn.value,
        from_row=from_row,
        from_col=from_col,
        to_row=to_row,
        to_col=to_col,
        captured=captured_info,
        board_snapshot=board_to_json(new_board),
    )
    state.moves.append(record)

    opp = opponent_of(state.turn)
    if is_side_defeated(new_board, opp):
        state.status = "red_wins" if state.turn == Side.RED else "blue_wins"
    else:
        state.turn = opp

    update_game(state)

    return MoveResponse(
        game_id=state.game_id,
        board=board_to_json(state.board),
        turn=state.turn.value,
        status=state.status,
        last_move={
            "from": {"row": from_row, "col": from_col},
            "to": {"row": to_row, "col": to_col},
            "captured": captured_info,
        },
    )


@router.get("/{game_id}", response_model=GameStateResponse)
def get_game_state(game_id: str):
    state = get_game(game_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")

    from dataclasses import asdict
    return GameStateResponse(
        game_id=state.game_id,
        board=board_to_json(state.board),
        turn=state.turn.value,
        status=state.status,
        moves=[asdict(m) for m in state.moves],
        created_at=state.created_at,
        updated_at=state.updated_at,
    )


@router.get("/{game_id}/replay", response_model=ReplayResponse)
def get_replay(game_id: str):
    state = get_game(game_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")

    from dataclasses import asdict
    return ReplayResponse(
        game_id=state.game_id,
        board=board_to_json(state.board),
        status=state.status,
        moves=[asdict(m) for m in state.moves],
    )
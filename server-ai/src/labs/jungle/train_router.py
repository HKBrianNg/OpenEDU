# server-ai/src/labs/jungle/train_router.py

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from .database import (
    create_training_session,
    finish_training_session,
    save_game_record,
    get_training_sessions,
    get_game_records,
    get_game_record,
)

from .self_play import run_self_play

router = APIRouter()


class TrainRequest(BaseModel):
    num_games: int = 40
    mcts_iterations: int = 1400


class TrainResponse(BaseModel):
    session_id: int
    num_games: int
    status: str = "finished"


class SessionListResponse(BaseModel):
    sessions: list[dict]
    total: int


class RecordListResponse(BaseModel):
    records: list[dict]
    total: int


class RecordDetailResponse(BaseModel):
    id: int
    session_id: Optional[int]
    game_index: Optional[int]
    result: str
    winner_side: Optional[int]
    ply_count: Optional[int]
    moves: list[dict]
    created_at: float


@router.post("/train", response_model=TrainResponse)
def start_training(req: TrainRequest):
    session_id = run_self_play(
        num_games=req.num_games,
        mcts_iterations=req.mcts_iterations,
        verbose=False,
    )
    return TrainResponse(
        session_id=session_id,
        num_games=req.num_games,
        status="finished",
    )


@router.get("/sessions", response_model=SessionListResponse)
def list_sessions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    sessions = get_training_sessions(limit=limit, offset=offset)
    return SessionListResponse(sessions=sessions, total=len(sessions))


@router.get("/records", response_model=RecordListResponse)
def list_records(
    session_id: Optional[int] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    records = get_game_records(session_id=session_id, limit=limit, offset=offset)
    return RecordListResponse(records=records, total=len(records))


@router.get("/records/{record_id}", response_model=RecordDetailResponse)
def get_record_detail(record_id: int):
    record = get_game_record(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return RecordDetailResponse(
        id=record["id"],
        session_id=record["session_id"],
        game_index=record["game_index"],
        result=record["result"],
        winner_side=record["winner_side"],
        ply_count=record["ply_count"],
        moves=record["moves"],
        created_at=record["created_at"],
    )
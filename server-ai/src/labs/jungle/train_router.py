import asyncio
import json
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
    clear_all_data,
)

from .self_play import run_self_play

router = APIRouter()

# 全局停止事件
_stop_event: Optional[asyncio.Event] = None


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
    moves_json: list[dict]
    created_at: float


def _normalize_moves_json(value):
    if isinstance(value, str):
        return json.loads(value)
    return value


@router.post("/train", response_model=TrainResponse)
async def start_training(req: TrainRequest):
    global _stop_event
    _stop_event = asyncio.Event()

    loop = asyncio.get_event_loop()
    session_id = await loop.run_in_executor(
        None,
        lambda: run_self_play(
            num_games=req.num_games,
            mcts_iterations=req.mcts_iterations,
            stop_event=_stop_event,
            verbose=False,
        )
    )
    _stop_event = None
    return TrainResponse(
        session_id=session_id,
        num_games=req.num_games,
        status="finished",
    )


@router.post("/stop-train")
async def stop_train():
    global _stop_event
    if _stop_event:
        _stop_event.set()
        return {"status": "stopping"}
    return {"status": "no_active_training"}


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
    print("DEBUG get_record_detail", record_id, record)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return RecordDetailResponse(
        id=record["id"],
        session_id=record["session_id"],
        game_index=record["game_index"],
        result=record["result"],
        winner_side=record["winner_side"],
        ply_count=record["ply_count"],
        moves_json=_normalize_moves_json(record["moves_json"]),
        created_at=record["created_at"],
    )


@router.get("/records/by-session/{session_id}", response_model=RecordDetailResponse)
def get_record_by_session(session_id: int):
    records = get_game_records(session_id=session_id, limit=1, offset=0)
    if not records:
        raise HTTPException(status_code=404, detail="No record for this session")
    record = records[0]
    return RecordDetailResponse(
        id=record["id"],
        session_id=record["session_id"],
        game_index=record["game_index"],
        result=record["result"],
        winner_side=record["winner_side"],
        ply_count=record["ply_count"],
        moves_json=_normalize_moves_json(record["moves_json"]),
        created_at=record["created_at"],
    )


@router.post("/clear-all")
def clear_all():
    """清空所有训练会话和对局记录"""
    clear_all_data()
    return {"ok": True}
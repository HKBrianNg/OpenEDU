# server-ai/src/labs/jungle/database.py

import sqlite3
import json
import os
import time
from typing import Optional

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")
DB_PATH = os.path.join(DB_DIR, "jungle.db")


def get_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS training_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at REAL NOT NULL,
            finished_at REAL,
            games_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'running',
            config_json TEXT,
            created_at REAL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS game_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            game_index INTEGER,
            result TEXT NOT NULL,
            winner_side INTEGER,
            ply_count INTEGER,
            moves_json TEXT NOT NULL,
            created_at REAL DEFAULT (strftime('%s','now')),
            FOREIGN KEY (session_id) REFERENCES training_sessions(id)
        );

        CREATE INDEX IF NOT EXISTS idx_game_records_session ON game_records(session_id);
        CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
    """)
    conn.commit()
    conn.close()


def create_training_session(config: Optional[dict] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO training_sessions (started_at, config_json) VALUES (?, ?)",
        (time.time(), json.dumps(config or {})),
    )
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id


def finish_training_session(session_id: int, games_count: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE training_sessions SET finished_at = ?, games_count = ?, status = 'finished' WHERE id = ?",
        (time.time(), games_count, session_id),
    )
    conn.commit()
    conn.close()


def get_training_sessions(limit: int = 50, offset: int = 0) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM training_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def save_game_record(
    session_id: int,
    game_index: int,
    result: str,
    winner_side: Optional[int],
    ply_count: int,
    moves: list[dict],
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO game_records
           (session_id, game_index, result, winner_side, ply_count, moves_json)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (session_id, game_index, result, winner_side, ply_count, json.dumps(moves)),
    )
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id


def get_game_records(
    session_id: Optional[int] = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    if session_id is not None:
        cursor.execute(
            "SELECT * FROM game_records WHERE session_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (session_id, limit, offset),
        )
    else:
        cursor.execute(
            "SELECT * FROM game_records ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_game_record(record_id: int) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM game_records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        return None
    record = dict(row)
    record["moves"] = json.loads(record["moves_json"])
    return record


init_db()
"""
SignalIQ — Session Store

Async SQLite storage for sessions, signal events, whisper events,
and transcript segments. Uses aiosqlite for non-blocking database access.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Optional

import aiosqlite

from agent.config import config
from agent.storage.models import (
    Session,
    Speaker,
    StoredSignalEvent,
    TranscriptSegment,
)

logger = logging.getLogger(__name__)


class SessionStore:
    """Async SQLite storage for SignalIQ sessions."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or config.storage.db_path
        self._db: Optional[aiosqlite.Connection] = None

    async def initialize(self):
        """Create database and tables if they don't exist."""
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row

        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                rep_name TEXT NOT NULL DEFAULT '',
                prospect_name TEXT NOT NULL DEFAULT '',
                prospect_title TEXT DEFAULT '',
                prospect_company TEXT DEFAULT '',
                start_time TEXT,
                end_time TEXT,
                avg_engagement REAL DEFAULT 0.0,
                total_whispers INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS signal_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                emotion TEXT NOT NULL,
                confidence REAL NOT NULL,
                engagement_score REAL NOT NULL,
                signal_type TEXT,
                metadata_json TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );

            CREATE TABLE IF NOT EXISTS whisper_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                text TEXT NOT NULL,
                trigger_signal TEXT,
                confidence REAL NOT NULL,
                topic_context TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );

            CREATE TABLE IF NOT EXISTS transcript_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                speaker TEXT NOT NULL,
                text TEXT NOT NULL,
                duration_seconds REAL DEFAULT 0.0,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_signal_session
                ON signal_events(session_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_whisper_session
                ON whisper_events(session_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_transcript_session
                ON transcript_segments(session_id, timestamp);
        """)

        await self._db.commit()
        logger.info(f"SessionStore initialized: {self.db_path}")

    async def close(self):
        """Close the database connection."""
        if self._db:
            await self._db.close()
            self._db = None

    # ── Session CRUD ─────────────────────────────────

    async def create_session(
        self,
        rep_name: str = "",
        prospect_name: str = "",
        prospect_title: str = "",
        prospect_company: str = "",
    ) -> str:
        """Create a new session. Returns session ID."""
        session_id = str(uuid.uuid4())
        await self._db.execute(
            """INSERT INTO sessions (id, rep_name, prospect_name, prospect_title,
               prospect_company, start_time)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session_id, rep_name, prospect_name, prospect_title,
             prospect_company, datetime.utcnow().isoformat()),
        )
        await self._db.commit()
        logger.info(f"Session created: {session_id}")
        return session_id

    async def end_session(self, session_id: str, avg_engagement: float = 0.0, total_whispers: int = 0):
        """Mark a session as ended."""
        await self._db.execute(
            """UPDATE sessions SET end_time = ?, avg_engagement = ?, total_whispers = ?
               WHERE id = ?""",
            (datetime.utcnow().isoformat(), avg_engagement, total_whispers, session_id),
        )
        await self._db.commit()

    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        cursor = await self._db.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return Session(
            id=row["id"],
            rep_name=row["rep_name"],
            prospect_name=row["prospect_name"],
            prospect_title=row["prospect_title"],
            prospect_company=row["prospect_company"],
            start_time=datetime.fromisoformat(row["start_time"]) if row["start_time"] else None,
            end_time=datetime.fromisoformat(row["end_time"]) if row["end_time"] else None,
            avg_engagement=row["avg_engagement"],
            total_whispers=row["total_whispers"],
        )

    async def list_sessions(self, limit: int = 50) -> list[Session]:
        """List recent sessions."""
        cursor = await self._db.execute(
            "SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [
            Session(
                id=row["id"],
                rep_name=row["rep_name"],
                prospect_name=row["prospect_name"],
                start_time=datetime.fromisoformat(row["start_time"]) if row["start_time"] else None,
                end_time=datetime.fromisoformat(row["end_time"]) if row["end_time"] else None,
                avg_engagement=row["avg_engagement"],
                total_whispers=row["total_whispers"],
            )
            for row in rows
        ]

    # ── Signal Events ────────────────────────────────

    async def add_signal_event(
        self,
        session_id: str,
        timestamp: float,
        emotion: str,
        confidence: float,
        engagement_score: float,
        signal_type: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        """Store a signal event."""
        await self._db.execute(
            """INSERT INTO signal_events
               (session_id, timestamp, emotion, confidence, engagement_score,
                signal_type, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (session_id, timestamp, emotion, confidence, engagement_score,
             signal_type, json.dumps(metadata) if metadata else None),
        )
        await self._db.commit()

    async def get_signal_timeline(self, session_id: str) -> list[StoredSignalEvent]:
        """Get all signal events for a session, ordered by time."""
        cursor = await self._db.execute(
            "SELECT * FROM signal_events WHERE session_id = ? ORDER BY timestamp",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [
            StoredSignalEvent(
                id=row["id"],
                session_id=row["session_id"],
                timestamp=row["timestamp"],
                emotion=row["emotion"],
                confidence=row["confidence"],
                engagement_score=row["engagement_score"],
                signal_type=row["signal_type"],
                metadata_json=row["metadata_json"],
            )
            for row in rows
        ]

    # ── Whisper Events ───────────────────────────────

    async def add_whisper_event(
        self,
        session_id: str,
        timestamp: float,
        text: str,
        trigger_signal: str,
        confidence: float,
        topic_context: Optional[str] = None,
    ):
        """Store a whisper event."""
        await self._db.execute(
            """INSERT INTO whisper_events
               (session_id, timestamp, text, trigger_signal, confidence, topic_context)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session_id, timestamp, text, trigger_signal, confidence, topic_context),
        )
        await self._db.commit()

    async def get_whispers(self, session_id: str) -> list[dict]:
        """Get all whispers for a session."""
        cursor = await self._db.execute(
            "SELECT * FROM whisper_events WHERE session_id = ? ORDER BY timestamp",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    # ── Transcript Segments ──────────────────────────

    async def add_transcript_segment(
        self,
        session_id: str,
        timestamp: float,
        speaker: str,
        text: str,
        duration_seconds: float = 0.0,
    ):
        """Store a transcript segment."""
        await self._db.execute(
            """INSERT INTO transcript_segments
               (session_id, timestamp, speaker, text, duration_seconds)
               VALUES (?, ?, ?, ?, ?)""",
            (session_id, timestamp, speaker, text, duration_seconds),
        )
        await self._db.commit()

    async def get_transcript(self, session_id: str) -> list[dict]:
        """Get full transcript for a session."""
        cursor = await self._db.execute(
            "SELECT * FROM transcript_segments WHERE session_id = ? ORDER BY timestamp",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

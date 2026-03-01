"""
SignalIQ — FastAPI Server

Serves the REST API for sessions, debriefs, and real-time signal
streaming via WebSocket. Runs alongside the Vision Agents agent.
"""

import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.config import config
from agent.storage.debrief_generator import DebriefGenerator
from agent.storage.session_store import SessionStore

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ── Shared state ─────────────────────────────
session_store = SessionStore()
debrief_generator = DebriefGenerator(session_store)
connected_websockets: set[WebSocket] = set()


# ── Lifecycle ────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup database on startup/shutdown."""
    await session_store.initialize()
    logger.info("SignalIQ API server started")
    yield
    await session_store.close()
    logger.info("SignalIQ API server stopped")


# ── FastAPI App ──────────────────────────────
app = FastAPI(
    title="SignalIQ API",
    description="Real-time sales intelligence — see what words don't say",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More restrictive in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ────────────────

class CreateSessionRequest(BaseModel):
    rep_name: str = ""
    prospect_name: str = ""
    prospect_title: str = ""
    prospect_company: str = ""

class SessionResponse(BaseModel):
    id: str
    rep_name: str
    prospect_name: str
    prospect_company: str = ""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    avg_engagement: float = 0.0
    total_whispers: int = 0

class SignalEventRequest(BaseModel):
    session_id: str
    timestamp: float
    emotion: str
    confidence: float
    engagement_score: float
    signal_type: Optional[str] = None


# ── Session Endpoints ────────────────────────

@app.post("/api/sessions", response_model=dict)
async def create_session(req: CreateSessionRequest):
    """Create a new call session."""
    session_id = await session_store.create_session(
        rep_name=req.rep_name,
        prospect_name=req.prospect_name,
        prospect_title=req.prospect_title,
        prospect_company=req.prospect_company,
    )
    return {"session_id": session_id}


@app.get("/api/sessions", response_model=list[SessionResponse])
async def list_sessions(limit: int = 50):
    """List recent sessions."""
    sessions = await session_store.list_sessions(limit)
    return [
        SessionResponse(
            id=s.id,
            rep_name=s.rep_name,
            prospect_name=s.prospect_name,
            prospect_company=getattr(s, 'prospect_company', ''),
            start_time=s.start_time.isoformat() if s.start_time else None,
            end_time=s.end_time.isoformat() if s.end_time else None,
            avg_engagement=s.avg_engagement,
            total_whispers=s.total_whispers,
        )
        for s in sessions
    ]


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details."""
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "rep_name": session.rep_name,
        "prospect_name": session.prospect_name,
        "prospect_title": session.prospect_title,
        "prospect_company": session.prospect_company,
        "start_time": session.start_time.isoformat() if session.start_time else None,
        "end_time": session.end_time.isoformat() if session.end_time else None,
        "avg_engagement": session.avg_engagement,
        "total_whispers": session.total_whispers,
    }


@app.post("/api/sessions/{session_id}/end")
async def end_session(session_id: str, avg_engagement: float = 0.0, total_whispers: int = 0):
    """End a call session."""
    await session_store.end_session(session_id, avg_engagement, total_whispers)
    return {"status": "ended"}


# ── Signal Events ────────────────────────────

@app.post("/api/signals")
async def add_signal(req: SignalEventRequest):
    """Store a signal event and broadcast to connected WebSockets."""
    await session_store.add_signal_event(
        session_id=req.session_id,
        timestamp=req.timestamp,
        emotion=req.emotion,
        confidence=req.confidence,
        engagement_score=req.engagement_score,
        signal_type=req.signal_type,
    )
    # Broadcast to connected WebSockets
    msg = json.dumps({
        "type": "signal",
        "data": req.model_dump(),
    })
    for ws in connected_websockets.copy():
        try:
            await ws.send_text(msg)
        except Exception:
            connected_websockets.discard(ws)

    return {"status": "stored"}


@app.post("/api/signals/live")
async def live_signal(data: dict):
    """
    Receive live signal data from the agent and broadcast to WebSockets.
    This is the bridge: Agent (Colab) → API → Frontend (WebSocket).
    """
    msg = json.dumps({
        "type": "signal",
        "data": {
            "engagement_score": data.get("engagement_score", 50),
            "emotion": data.get("emotion", "neutral"),
            "confidence": data.get("confidence", 0),
            "trajectory": data.get("trajectory", "stable"),
            "timestamp": data.get("timestamp", 0),
            "should_whisper": data.get("should_whisper", False),
            "whisper_context": data.get("whisper_context", ""),
            "active_signals": data.get("active_signals", []),
        },
    })

    # Broadcast whisper if needed
    if data.get("should_whisper") and data.get("whisper_context"):
        whisper_msg = json.dumps({
            "type": "whisper",
            "data": {
                "text": data["whisper_context"],
                "timestamp": data.get("timestamp", 0),
                "signal": "ai_coaching",
            },
        })
        for ws in connected_websockets.copy():
            try:
                await ws.send_text(whisper_msg)
            except Exception:
                connected_websockets.discard(ws)

    # Broadcast signal to all connected frontends
    for ws in connected_websockets.copy():
        try:
            await ws.send_text(msg)
        except Exception:
            connected_websockets.discard(ws)

    return {"status": "broadcast", "clients": len(connected_websockets)}


@app.get("/api/sessions/{session_id}/signals")
async def get_signals(session_id: str):
    """Get signal timeline for a session."""
    signals = await session_store.get_signal_timeline(session_id)
    return [
        {
            "timestamp": s.timestamp,
            "emotion": s.emotion,
            "confidence": s.confidence,
            "engagement_score": s.engagement_score,
            "signal_type": s.signal_type,
        }
        for s in signals
    ]


# ── Debrief ──────────────────────────────────

@app.get("/api/sessions/{session_id}/debrief")
async def get_debrief(session_id: str):
    """Generate and return a debrief for a session."""
    debrief = await debrief_generator.generate(session_id)
    if "error" in debrief:
        raise HTTPException(status_code=404, detail=debrief["error"])
    return debrief


# ── WebSocket for Real-Time Feed ─────────────

@app.websocket("/ws/signals")
async def websocket_signals(ws: WebSocket):
    """
    WebSocket endpoint for real-time signal streaming to the frontend.
    The React overlay connects here to receive live engagement scores,
    whisper events, and signal updates.
    """
    await ws.accept()
    connected_websockets.add(ws)
    logger.info(f"WebSocket connected (total: {len(connected_websockets)})")

    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await ws.receive_text()
            # Client can send session_id to subscribe to specific session
            logger.debug(f"WebSocket received: {data}")
    except WebSocketDisconnect:
        connected_websockets.discard(ws)
        logger.info(f"WebSocket disconnected (total: {len(connected_websockets)})")


# ── Token Generation (for testing) ───────────

@app.post("/api/token")
async def generate_token(user_id: str = "prospect-user"):
    """Generate a Stream user token for testing."""
    import hashlib
    import hmac
    import base64
    import time

    api_key = os.environ.get("STREAM_API_KEY", "")
    api_secret = os.environ.get("STREAM_API_SECRET", "")

    if not api_key or not api_secret or "your_" in api_key:
        raise HTTPException(
            status_code=500,
            detail="STREAM_API_KEY and STREAM_API_SECRET not configured in .env",
        )

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {"user_id": user_id, "iat": now, "exp": now + 86400}

    header_b64 = b64url(json.dumps(header).encode())
    payload_b64 = b64url(json.dumps(payload).encode())
    signature = hmac.new(
        api_secret.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256,
    ).digest()

    token = f"{header_b64}.{payload_b64}.{b64url(signature)}"

    return {
        "token": token,
        "user_id": user_id,
        "api_key": api_key,
        "expires_in": 86400,
    }


# ── Health Check ─────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "signaliq-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
SignalIQ — Debrief Generator

Compiles session data into a structured payload and generates
a narrative debrief report using Gemini/Claude.
"""

import json
import logging
from typing import Optional

from agent.llm.prompt_templates import DEBRIEF_PROMPT_TEMPLATE
from agent.storage.session_store import SessionStore

logger = logging.getLogger(__name__)


class DebriefGenerator:
    """
    Generates post-call debrief reports from session data.

    Flow:
    1. Fetch session data (signals, whispers, transcript) from SQLite
    2. Compile into structured payload
    3. Send to Gemini/Claude for narrative generation
    4. Return formatted debrief
    """

    def __init__(self, session_store: SessionStore):
        self.session_store = session_store

    async def generate(self, session_id: str) -> dict:
        """
        Generate a full debrief for a session.

        Returns:
            Dict with debrief sections: summary, critical_moments,
            winning_moments, coaching, rep_monitoring, raw_timeline
        """
        # Fetch all session data
        session = await self.session_store.get_session(session_id)
        if not session:
            return {"error": f"Session {session_id} not found"}

        signals = await self.session_store.get_signal_timeline(session_id)
        whispers = await self.session_store.get_whispers(session_id)
        transcript = await self.session_store.get_transcript(session_id)

        # Calculate duration
        duration_minutes = 0
        if session.start_time and session.end_time:
            delta = session.end_time - session.start_time
            duration_minutes = int(delta.total_seconds() / 60)

        # Build signal timeline for LLM
        signal_timeline = [
            {
                "timestamp": s.timestamp,
                "emotion": s.emotion,
                "confidence": round(s.confidence, 2),
                "engagement_score": round(s.engagement_score, 1),
                "signal_type": s.signal_type,
            }
            for s in signals
        ]

        # Build transcript highlights (key moments)
        transcript_highlights = self._extract_highlights(transcript, signals)

        # Format whispers delivered
        whispers_str = "\n".join(
            f"  [{w.get('timestamp', 0):.0f}s] {w.get('text', '')}"
            f" (trigger: {w.get('trigger_signal', 'unknown')})"
            for w in whispers
        ) or "  No whispers delivered during this call."

        # Build the LLM prompt
        prompt = DEBRIEF_PROMPT_TEMPLATE.format(
            duration_minutes=duration_minutes,
            rep_name=session.rep_name or "Unknown Rep",
            prospect_name=session.prospect_name or "Unknown Prospect",
            prospect_title=session.prospect_title or "Unknown Title",
            prospect_company=session.prospect_company or "Unknown Company",
            avg_engagement=round(session.avg_engagement, 1),
            signal_timeline_json=json.dumps(signal_timeline[:100], indent=2),
            transcript_highlights=transcript_highlights,
            whispers_delivered=whispers_str,
        )

        # Generate debrief using Gemini
        debrief_text = await self._generate_with_llm(prompt)

        return {
            "session_id": session_id,
            "session": {
                "rep_name": session.rep_name,
                "prospect_name": session.prospect_name,
                "prospect_company": session.prospect_company,
                "duration_minutes": duration_minutes,
                "avg_engagement": round(session.avg_engagement, 1),
                "total_whispers": session.total_whispers,
            },
            "debrief_text": debrief_text,
            "signal_timeline": signal_timeline,
            "whispers": whispers,
            "transcript": transcript,
        }

    def _extract_highlights(
        self, transcript: list[dict], signals: list
    ) -> str:
        """
        Extract transcript segments that correlate with strong signals.
        """
        if not transcript:
            return "  No transcript data available."

        highlights = []
        for signal in signals:
            if signal.signal_type:
                # Find nearest transcript segment
                nearest = min(
                    transcript,
                    key=lambda t: abs(t.get("timestamp", 0) - signal.timestamp),
                    default=None,
                )
                if nearest:
                    highlights.append(
                        f"  [{signal.timestamp:.0f}s] {signal.signal_type}: "
                        f'"{nearest.get("text", "")}" '
                        f"(speaker: {nearest.get('speaker', 'unknown')})"
                    )

        return "\n".join(highlights[:20]) or "  No correlated highlights found."

    async def _generate_with_llm(self, prompt: str) -> str:
        """
        Generate debrief text using an LLM.
        Uses google-generativeai for the debrief (non-realtime task).
        """
        try:
            import google.generativeai as genai
            import os

            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            return response.text
        except ImportError:
            logger.warning("google-generativeai not installed. Returning prompt as placeholder.")
            return f"[Debrief generation requires google-generativeai]\n\n{prompt}"
        except Exception as e:
            logger.error(f"Debrief generation failed: {e}")
            return f"[Debrief generation error: {e}]"

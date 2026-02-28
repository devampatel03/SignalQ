# SignalIQ — See What Words Don't Say

> Real-time vision intelligence for B2B sales calls. Reads prospect facial signals, engagement patterns, and behavioral cues — giving reps live coaching whispers during calls and frame-annotated debriefs afterward.

**The insight:** Gong.io analyzes *words*. SignalIQ analyzes *faces*. It's the first tool that brings the non-verbal 50% of human communication into the sales intelligence stack.

---

## 🎯 What It Does

### Live Whisper Mode
During a call, SignalIQ watches the prospect's face and whispers brief, actionable coaching to the rep:
- *"Strong interest on API integration — go deeper"*
- *"Doubt detected on pricing — anchor with ROI"*
- *"Engagement dropping — ask a question"*

### Debrief Mode
After the call, generates an annotated timeline with:
- Engagement score over time (0-100)
- Critical moments (contempt flashes, disengagement)
- Winning moments (interest spikes, agreement cascades)
- Personalized coaching recommendations

---

## 🏗️ How We Used Vision Agents

SignalIQ is built entirely on the **Vision Agents SDK** by Stream. Every capability maps to a native SDK feature:

| SignalIQ Feature | Vision Agents SDK | What It Does |
|---|---|---|
| Real-time video processing | `Agent` + `getstream.Edge()` | Stream's <30ms latency edge network for live video |
| Face expression analysis | `VideoProcessorPublisher` (custom) | `SignalIQProcessor` — runs FER at 10fps on every frame |
| Pose/body detection | `ultralytics.YOLOPoseProcessor` | YOLO11n for face detection and body pose |
| Whisper reasoning | `gemini.Realtime(fps=1)` | Native Gemini Live generates contextual coaching |
| Voice delivery | `elevenlabs.TTS()` | Native ElevenLabs delivers whispers to earpiece |
| Speech transcription | `deepgram.STT()` | Native Deepgram correlates words with facial reactions |
| Custom events | `agent.events.register()` / `emit()` | Signal data flows from processor to Gemini context |
| Production serving | `Runner(AgentLauncher(...))` | Vision Agents CLI for HTTP server mode |

### The SignalIQ Processor — Technical Centerpiece

```python
class SignalIQProcessor(VideoProcessorPublisher):
    """Custom Vision Agents processor: FER + engagement scoring at 10fps."""
    name = "signaliq_fer"

    async def _analyze_frame(self, frame: av.VideoFrame):
        img = frame.to_ndarray(format="rgb24")
        faces = self.face_detector.detect(img)
        expressions = [self.expression_classifier.classify(crop) for crop in faces]
        signal_state = self.signal_aggregator.update(expressions)

        # Emit to Gemini context
        await self._events.emit(SignalIQEvent(
            engagement_score=signal_state.engagement_score,
            dominant_emotion=signal_state.dominant_emotion,
        ))

        # Publish annotated frame back to stream
        annotated = self._draw_annotations(img, faces, signal_state)
        await self._video_track.add_frame(av.VideoFrame.from_ndarray(annotated))
```

---

## 📁 Project Structure

```
signaliq/
├── agent/                      # Vision Agents core
│   ├── main.py                 # Agent entry point (AgentLauncher + Runner)
│   ├── config.py               # All tunable thresholds
│   ├── vision/
│   │   ├── face_detector.py    # Face detection + tracking
│   │   ├── expression.py       # FER expression classification
│   │   └── frame_processor.py  # SignalIQProcessor (⭐ centerpiece)
│   ├── intelligence/
│   │   ├── signal_aggregator.py # Signal state machine
│   │   ├── engagement_scorer.py # Rolling engagement score
│   │   └── trigger_logic.py    # When-to-whisper engine
│   ├── llm/
│   │   └── prompt_templates.py # All Gemini/Claude prompts
│   └── storage/
│       ├── models.py           # Data models
│       ├── session_store.py    # SQLite session storage
│       └── debrief_generator.py # Post-call debrief
├── api/
│   └── main.py                 # FastAPI server + WebSocket
├── frontend/                   # React dashboard
│   └── src/
│       ├── components/         # EngagementMeter, WhisperFeed, DebriefTimeline
│       └── pages/              # Dashboard, LiveCall, Debrief
└── pyproject.toml
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys: Stream, Google/Gemini, ElevenLabs, Deepgram

### Backend

```bash
# Install dependencies
uv add "vision-agents[getstream,gemini,elevenlabs,deepgram,ultralytics]"

# Configure API keys
cp .env.example .env
# Edit .env with your keys

# Start the Vision Agents server
uv run agent/main.py serve

# Start the API server (separate terminal)
uvicorn api.main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🧠 Architecture

```
Video Call → Screen Capture → SignalIQProcessor (10fps)
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                    Face Detect  FER Model  Signal Aggregator
                    (YOLO/OpenCV) (FER lib)  (State Machine)
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                  Gemini Realtime (1fps)   Session Store
                  → Whisper Generation    (SQLite Timeline)
                         │                     │
                         ▼                     ▼
                  ElevenLabs TTS          Debrief Engine
                  → Earpiece Delivery     → Post-Call Report
```

**Latency budget:** Frame → YOLO/FER (~15ms) → Signal (~2ms) → Gemini (~5ms) → TTS (~200ms) → Ear (~10ms) = **~230ms total**

---

## 📊 Signals Tracked

| Signal | Detection Method | Whisper Trigger |
|---|---|---|
| Interest Spike | Surprise + engagement rise, 3+ seconds | "Go deeper on [topic]" |
| Contempt Flash | Unilateral lip raise, 200-500ms | "Doubt on [topic] — anchor with ROI" |
| Confusion | Brow furrow + head tilt, 5+ seconds | "Clarify [topic]" |
| Disengagement | Gaze drift + flat expression, 60+ seconds | "Ask a question" |
| Agreement | Head nods + forward lean | "Good momentum — push now" |

---

## ⚖️ Ethics & Privacy

- **Consent:** Standard "this call may be recorded" disclosure applies
- **No raw face storage:** Face crops processed and immediately discarded
- **Confidence transparency:** Debrief shows confidence scores; nothing presented as certain
- **Bias mitigation:** Signals below 0.80 confidence for edge cases are suppressed
- **Rep empowerment:** Tool benefits the rep; managers see only aggregate patterns

---

*SignalIQ — See what words don't say.* 🔍

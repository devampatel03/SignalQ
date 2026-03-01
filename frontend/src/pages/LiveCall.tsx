import { useState, useEffect, useRef, useCallback } from 'react'
import EngagementMeter from '../components/EngagementMeter'

const EMOTION_MAP: Record<string, { icon: string; color: string }> = {
    neutral: { icon: '—', color: 'var(--text-tertiary)' },
    happy: { icon: '↑', color: 'var(--apple-green)' },
    surprise: { icon: '!', color: 'var(--apple-blue)' },
    confusion: { icon: '?', color: 'var(--apple-yellow)' },
    contempt: { icon: '⚠', color: 'var(--apple-red)' },
    sad: { icon: '↓', color: 'var(--apple-purple)' },
    angry: { icon: '✕', color: 'var(--apple-red)' },
    fear: { icon: '◇', color: 'var(--apple-orange)' },
    disgust: { icon: '✕', color: 'var(--apple-red)' },
}

interface SignalEntry {
    time: string
    emotion: string
    engagement: number
    confidence: number
}

interface Whisper {
    text: string
    timestamp: number
    signal: string
}

export default function LiveCall() {
    const [engagement, setEngagement] = useState(50)
    const [emotion, setEmotion] = useState('neutral')
    const [confidence, setConfidence] = useState(0)
    const [trajectory, setTrajectory] = useState('stable')
    const [whispers, setWhispers] = useState<Whisper[]>([])
    const [signals, setSignals] = useState<SignalEntry[]>([])
    const [isLive, setIsLive] = useState(false)
    const [wsConnected, setWsConnected] = useState(false)
    const [elapsed, setElapsed] = useState(0)

    const [agentUrl, setAgentUrl] = useState('')
    const [callId, setCallId] = useState('signaliq-test-1')
    const [agentStatus, setAgentStatus] = useState<'idle' | 'joining' | 'live' | 'error'>('idle')

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const signalRef = useRef<HTMLDivElement>(null)

    // Webcam
    useEffect(() => {
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: 'user' },
                    audio: false,
                })
                streamRef.current = stream
                if (videoRef.current) videoRef.current.srcObject = stream
            } catch { /* camera denied */ }
        })()
        return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
    }, [])

    // WebSocket
    useEffect(() => {
        let ws: WebSocket | null = null
        let timer: ReturnType<typeof setInterval> | null = null
        let reconnect: ReturnType<typeof setTimeout> | null = null

        const connect = () => {
            try {
                const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
                ws = new WebSocket(`${proto}://${window.location.host}/ws/signals`)

                ws.onopen = () => {
                    setWsConnected(true)
                    setIsLive(true)
                    timer = setInterval(() => setElapsed(e => e + 1), 1000)
                }

                ws.onmessage = (event) => {
                    const msg = JSON.parse(event.data)

                    if (msg.type === 'signal') {
                        const d = msg.data
                        setEngagement(d.engagement_score ?? 50)
                        setEmotion(d.emotion ?? 'neutral')
                        setConfidence(d.confidence ?? 0)
                        setTrajectory(d.trajectory ?? 'stable')

                        const now = new Date()
                        setSignals(prev => [
                            {
                                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                emotion: d.emotion,
                                engagement: Math.round(d.engagement_score ?? 50),
                                confidence: d.confidence ?? 0,
                            },
                            ...prev.slice(0, 99),
                        ])
                    }

                    if (msg.type === 'whisper') {
                        setWhispers(prev => [msg.data, ...prev.slice(0, 19)])
                    }
                }

                ws.onclose = () => {
                    setWsConnected(false)
                    reconnect = setTimeout(connect, 3000)
                }
            } catch {
                // Demo mode fallback
                setIsLive(true)
                timer = setInterval(() => {
                    setElapsed(e => e + 1)
                    setEngagement(prev => Math.max(15, Math.min(95, prev + ((Math.random() - 0.48) * 3))))
                }, 1000)
            }
        }

        connect()
        return () => {
            ws?.close()
            if (timer) clearInterval(timer)
            if (reconnect) clearTimeout(reconnect)
        }
    }, [])

    useEffect(() => {
        signalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, [signals.length])

    const triggerAgent = useCallback(async () => {
        if (!agentUrl) return
        setAgentStatus('joining')
        try {
            const resp = await fetch(`${agentUrl}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ call_id: callId, call_type: 'default' }),
            })
            if (resp.ok || resp.status === 201) setAgentStatus('live')
            else setAgentStatus('error')
        } catch {
            setAgentStatus('error')
        }
    }, [agentUrl, callId])

    const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    const emo = EMOTION_MAP[emotion] ?? EMOTION_MAP.neutral

    return (
        <div style={{ padding: '0 24px 24px' }}>
            {/* ── Cinematic Video Hero + HUD ── */}
            <div className="live-cinematic">
                {/* Video Canvas Layer */}
                <div className="live-video-layer">
                    <video ref={videoRef} autoPlay muted playsInline />
                </div>

                {/* ── HUD Center Top: Connect Agent Pill ── */}
                <div style={{
                    position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--vibrancy-thick)', backdropFilter: 'blur(32px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                    padding: '6px 6px 6px 12px', borderRadius: '100px',
                    display: 'flex', gap: 8, alignItems: 'center',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}>
                    {!isLive && <div className="live-indicator" style={{ background: 'var(--text-tertiary)', boxShadow: 'none' }} />}
                    {isLive && <div className="live-indicator" />}

                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', marginRight: 8, letterSpacing: -0.5 }}>
                        {fmt(elapsed)}
                    </span>

                    <input
                        className="ios-input"
                        style={{ width: 140, padding: '6px 0', border: 'none', background: 'transparent' }}
                        placeholder="Agent ngrok URL..."
                        value={agentUrl}
                        onChange={e => setAgentUrl(e.target.value)}
                    />
                    <div style={{ width: 1, height: 16, background: 'var(--separator-light)' }} />
                    <input
                        className="ios-input"
                        style={{ width: 90, padding: '6px 0', border: 'none', background: 'transparent' }}
                        placeholder="Call ID"
                        value={callId}
                        onChange={e => setCallId(e.target.value)}
                    />
                    <button
                        className={agentStatus === 'live' ? 'btn btn-system' : 'btn btn-blue'}
                        style={{ padding: '6px 14px', fontSize: 13 }}
                        onClick={triggerAgent}
                        disabled={!agentUrl || agentStatus === 'joining'}
                    >
                        {agentStatus === 'joining' ? 'Joining...' : agentStatus === 'live' ? 'Connected' : 'Connect'}
                    </button>
                </div>

                {/* ── HUD Bottom Left: Emotion & Score ── */}
                <div className="hud-panel hud-left" style={{ padding: '16px 24px', borderRadius: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 24, color: emo.color, fontWeight: 700 }}>{emo.icon}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
                                Current State
                            </span>
                            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: '#fff', textTransform: 'capitalize' }}>
                                {emotion} <span style={{ color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500 }}>{(confidence * 100).toFixed(0)}%</span>
                            </span>
                        </div>
                        <div style={{ width: 1, height: 32, background: 'var(--separator-light)', margin: '0 8px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
                                Trajectory
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 600, color: trajectory === 'rising' ? 'var(--apple-green)' : trajectory === 'falling' ? 'var(--apple-red)' : 'var(--text-primary)' }}>
                                {trajectory}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── HUD Right: Analytics Side Pane ── */}
                <div className="hud-panel hud-right">

                    {/* Apple Watch Ring */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                        <EngagementMeter score={engagement} size={160} />
                    </div>

                    <div style={{ height: 1, background: 'var(--separator-light)' }} />

                    {/* iOS Notifications (Whispers) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="section-label" style={{ paddingLeft: 4 }}>Coaching Whispers</div>
                        {whispers.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '0 4px' }}>
                                Waiting for actionable moments...
                            </div>
                        ) : (
                            whispers.slice(0, 3).map((w, i) => (
                                <div key={i} className="ios-notification">
                                    <div className="notif-header">
                                        <span className="notif-app">
                                            <span className="live-indicator" style={{ width: 6, height: 6 }} />
                                            SignalIQ Coach
                                        </span>
                                        <span className="notif-time">{w.timestamp.toFixed(0)}s</span>
                                    </div>
                                    <div className="notif-body">
                                        {w.text}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ height: 1, background: 'var(--separator-light)' }} />

                    {/* Signal Stream (Stark Data) */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div className="section-label" style={{ paddingLeft: 4 }}>Live Signal Stream</div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, gap: 4 }} ref={signalRef}>
                            {signals.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '0 4px' }}>Detecting faces...</div>
                            ) : (
                                signals.map((s, i) => {
                                    const e = EMOTION_MAP[s.emotion] ?? EMOTION_MAP.neutral;
                                    // Fading opacity for older items
                                    const opacity = i === 0 ? 1 : i === 1 ? 0.8 : i === 2 ? 0.5 : 0.3;
                                    return (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            fontSize: 13, fontFamily: 'var(--font-mono)',
                                            padding: '6px 8px', borderRadius: 6,
                                            background: i === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            opacity, transition: 'all 0.2s'
                                        }}>
                                            <span style={{ color: e.color, width: 80 }}>{s.emotion}</span>
                                            <span style={{ width: 40, textAlign: 'right', color: 'var(--text-primary)' }}>{s.engagement}</span>
                                            <span style={{ width: 70, textAlign: 'right', color: 'var(--text-tertiary)' }}>{s.time}</span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

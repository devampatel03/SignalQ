import { useState, useEffect } from 'react'
import EngagementMeter from '../components/EngagementMeter'
import WhisperFeed from '../components/WhisperFeed'

/**
 * LiveCall page — Rep's real-time overlay during an active call.
 * Shows engagement meter, live whisper feed, and signal indicators.
 */
export default function LiveCall() {
    // Simulated real-time data for demo
    const [engagement, setEngagement] = useState(65)
    const [emotion, setEmotion] = useState('neutral')
    const [trajectory, setTrajectory] = useState('stable')
    const [whispers, setWhispers] = useState([
        { text: 'Strong interest on API integration — go deeper', timestamp: 120, signal: 'interest_spike' },
    ])
    const [isLive, setIsLive] = useState(false)
    const [elapsed, setElapsed] = useState(0)

    // WebSocket connection for real-time signal data
    useEffect(() => {
        let ws: WebSocket | null = null
        let timer: NodeJS.Timer | null = null

        const connect = () => {
            try {
                ws = new WebSocket(`ws://${window.location.host}/ws/signals`)
                ws.onopen = () => {
                    setIsLive(true)
                    // Start elapsed timer
                    timer = setInterval(() => setElapsed(e => e + 1), 1000)
                }
                ws.onmessage = (event) => {
                    const msg = JSON.parse(event.data)
                    if (msg.type === 'signal') {
                        setEngagement(msg.data.engagement_score)
                        setEmotion(msg.data.emotion)
                    }
                    if (msg.type === 'whisper') {
                        setWhispers(prev => [...prev, msg.data])
                    }
                }
                ws.onclose = () => setIsLive(false)
            } catch (e) {
                console.log('WebSocket not available, using demo mode')
                // Demo mode: simulate data
                setIsLive(true)
                timer = setInterval(() => {
                    setElapsed(e => e + 1)
                    setEngagement(prev => {
                        const delta = (Math.random() - 0.48) * 4
                        return Math.max(15, Math.min(95, prev + delta))
                    })
                }, 1000)
            }
        }

        connect()

        return () => {
            ws?.close()
            if (timer) clearInterval(timer)
        }
    }, [])

    const formatElapsed = (s: number) => {
        const mins = Math.floor(s / 60)
        const secs = s % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getTrajectoryArrow = () => {
        if (engagement > 65) return '↑'
        if (engagement < 40) return '↓'
        return '→'
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Live Call Analysis</h1>
                    <p className="page-subtitle">
                        {isLive ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="live-dot" />
                                Active — {formatElapsed(elapsed)}
                            </span>
                        ) : 'Waiting for call...'}
                    </p>
                </div>
                <button
                    className={`btn ${isLive ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => setIsLive(!isLive)}
                >
                    {isLive ? 'End Session' : 'Start Session'}
                </button>
            </div>

            {/* Main Layout */}
            <div className="grid-sidebar">
                {/* Left: Main content area */}
                <div>
                    {/* Stats Row */}
                    <div className="grid-3" style={{ marginBottom: 24 }}>
                        <div className="glass-card stat-card">
                            <div className="stat-label">Engagement</div>
                            <div className="stat-value" style={{
                                color: engagement >= 70 ? '#22c55e' : engagement >= 40 ? '#eab308' : '#ef4444'
                            }}>
                                {Math.round(engagement)}
                            </div>
                            <div className={`stat-change ${engagement >= 50 ? 'positive' : 'negative'}`}>
                                {getTrajectoryArrow()} {engagement >= 50 ? 'Above' : 'Below'} average
                            </div>
                        </div>

                        <div className="glass-card stat-card">
                            <div className="stat-label">Current Emotion</div>
                            <div className="stat-value" style={{ fontSize: 24 }}>
                                {emotion === 'neutral' ? '😐' : emotion === 'happy' ? '😊' :
                                    emotion === 'surprise' ? '😮' : emotion === 'confusion' ? '😕' :
                                        emotion === 'contempt' ? '😒' : '🔍'}
                                <span style={{ fontSize: 18, marginLeft: 8, color: 'var(--text-secondary)' }}>
                                    {emotion}
                                </span>
                            </div>
                        </div>

                        <div className="glass-card stat-card">
                            <div className="stat-label">Whispers Sent</div>
                            <div className="stat-value">{whispers.length}</div>
                            <div className="stat-change positive">
                                Quality ≫ Quantity
                            </div>
                        </div>
                    </div>

                    {/* Signal Activity */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                            Signal Activity
                        </h3>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                            <span className="signal-badge interest">● Interest Spikes: 3</span>
                            <span className="signal-badge doubt">● Doubt Signals: 1</span>
                            <span className="signal-badge agreement">● Agreement: 2</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            Monitoring prospect facial signals in real-time. Whispers triggered only
                            for strong, actionable signals with ≥75% confidence.
                        </p>
                    </div>
                </div>

                {/* Right: Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Engagement Meter */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <EngagementMeter score={engagement} />
                        <div style={{
                            marginTop: 12,
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Prospect Engagement
                        </div>
                    </div>

                    {/* Whisper Feed */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                            💡 Coaching Whispers
                        </h3>
                        <WhisperFeed whispers={whispers} />
                    </div>
                </div>
            </div>
        </div>
    )
}

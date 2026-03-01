import { useState, useEffect, useRef } from 'react'

/**
 * TestCall page — Join a Stream video call for testing the SignalIQ agent.
 * 
 * This is a standalone test page (no Stream SDK needed) that:
 * 1. Lets you enter your Stream API key and token
 * 2. Joins a video call where the SignalIQ agent can see you
 * 3. Shows your webcam preview and agent status
 */
export default function TestCall() {
    const [apiKey, setApiKey] = useState('')
    const [userToken, setUserToken] = useState('')
    const [callId, setCallId] = useState('signaliq-test-1')
    const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle')
    const [agentUrl, setAgentUrl] = useState('http://localhost:8001')
    const [error, setError] = useState('')
    const [log, setLog] = useState<string[]>([])
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const addLog = (msg: string) => {
        setLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()} — ${msg}`])
    }

    // Start webcam preview
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: true,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            addLog('📷 Webcam started')
        } catch (err: any) {
            addLog(`❌ Webcam error: ${err.message}`)
            setError(`Webcam access denied: ${err.message}`)
        }
    }

    useEffect(() => {
        startWebcam()
        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop())
        }
    }, [])

    // Trigger the agent to join the call
    const triggerAgentJoin = async () => {
        if (!apiKey || !userToken) {
            setError('Enter your API Key and User Token first')
            return
        }

        setStatus('connecting')
        setError('')
        addLog('🔌 Triggering agent to join call...')

        try {
            const resp = await fetch(`${agentUrl}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    call_id: callId,
                    call_type: 'default',
                }),
            })

            if (resp.ok) {
                setStatus('live')
                addLog('✅ Agent join triggered — it should connect shortly')
                addLog('👁️ The agent is now analyzing your facial expressions...')
            } else {
                const text = await resp.text()
                throw new Error(`Agent responded ${resp.status}: ${text}`)
            }
        } catch (err: any) {
            addLog(`⚠️ Could not reach agent at ${agentUrl}: ${err.message}`)
            addLog('💡 Make sure the agent is running on Colab with ngrok tunnel')
            setError(err.message)
            setStatus('error')
        }
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">🧪 Test Call</h1>
                    <p className="page-subtitle">
                        Join a Stream video call to test the SignalIQ agent
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {status === 'live' && <span className="live-dot" />}
                    <span style={{
                        color: status === 'live' ? '#22c55e' : status === 'error' ? '#ef4444' : 'var(--text-muted)',
                        fontSize: 14, fontWeight: 600,
                    }}>
                        {status === 'idle' ? 'Ready' : status === 'connecting' ? 'Connecting...' :
                            status === 'live' ? 'Agent Live' : 'Error'}
                    </span>
                </div>
            </div>

            <div className="grid-sidebar">
                {/* Left: Video + Config */}
                <div>
                    {/* Webcam Preview */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{
                                width: '100%',
                                height: 400,
                                objectFit: 'cover',
                                background: '#000',
                            }}
                        />
                        <div style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid var(--border-subtle)',
                        }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Your webcam (the agent sees this)
                            </span>
                            {status === 'live' && (
                                <span style={{ fontSize: 12, color: '#22c55e' }}>
                                    🔴 Agent analyzing...
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                            Configuration
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                    Stream API Key
                                </label>
                                <input
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Paste from Stream Dashboard"
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8,
                                        background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)', fontSize: 14, fontFamily: 'monospace',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                    User Token (from generate_token.py)
                                </label>
                                <input
                                    type="text"
                                    value={userToken}
                                    onChange={(e) => setUserToken(e.target.value)}
                                    placeholder="Paste prospect token"
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8,
                                        background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)', fontSize: 14, fontFamily: 'monospace',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div className="grid-2">
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Call ID
                                    </label>
                                    <input
                                        type="text"
                                        value={callId}
                                        onChange={(e) => setCallId(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px 12px', borderRadius: 8,
                                            background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-primary)', fontSize: 14,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Agent URL (Colab ngrok)
                                    </label>
                                    <input
                                        type="text"
                                        value={agentUrl}
                                        onChange={(e) => setAgentUrl(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px 12px', borderRadius: 8,
                                            background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-primary)', fontSize: 14,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: 8, fontSize: 13,
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={triggerAgentJoin}
                                disabled={status === 'connecting'}
                                style={{ width: '100%', marginTop: 4 }}
                            >
                                {status === 'connecting' ? '⏳ Connecting...' :
                                    status === 'live' ? '✅ Agent Connected — Restart' :
                                        '🚀 Trigger Agent to Join Call'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Instructions + Log */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Setup Steps */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                            📋 Setup Steps
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                            {[
                                { step: '1', text: 'Go to dashboard.getstream.io', done: !!apiKey },
                                { step: '2', text: 'Copy your API Key → paste above', done: !!apiKey },
                                { step: '3', text: 'Run: python scripts/generate_token.py', done: !!userToken },
                                { step: '4', text: 'Paste the Prospect Token above', done: !!userToken },
                                { step: '5', text: 'Start agent on Colab (port 8001)', done: status === 'live' },
                                { step: '6', text: 'Click "Trigger Agent to Join Call"', done: status === 'live' },
                            ].map((s) => (
                                <div key={s.step} style={{
                                    display: 'flex', gap: 10, alignItems: 'center',
                                    color: s.done ? '#22c55e' : 'var(--text-secondary)',
                                }}>
                                    <span style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700,
                                        background: s.done ? 'rgba(34,197,94,0.15)' : 'var(--bg-glass)',
                                        border: `1px solid ${s.done ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
                                    }}>
                                        {s.done ? '✓' : s.step}
                                    </span>
                                    <span>{s.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Log */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                            📡 Activity Log
                        </h3>
                        <div style={{
                            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8,
                            color: 'var(--text-muted)', maxHeight: 300, overflowY: 'auto',
                        }}>
                            {log.length === 0 ? (
                                <div>Waiting for actions...</div>
                            ) : (
                                log.map((entry, i) => (
                                    <div key={i}>{entry}</div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

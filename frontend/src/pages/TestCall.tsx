import { useState, useEffect, useRef } from 'react'

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

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: true,
            })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            addLog('📷 Webcam started')
        } catch (err: any) {
            addLog(`❌ Webcam error: ${err.message}`)
            setError(`Webcam access denied: ${err.message}`)
        }
    }

    useEffect(() => {
        startWebcam()
        return () => streamRef.current?.getTracks().forEach(t => t.stop())
    }, [])

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
                body: JSON.stringify({ call_id: callId, call_type: 'default' }),
            })

            if (resp.ok || resp.status === 201) {
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
        <div style={{ padding: '0 24px 64px' }}>

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, marginTop: 16 }}>
                <div>
                    <h1 className="page-title">Test Call</h1>
                    <p className="page-subtitle">Join a Stream video call to test the SignalIQ agent</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {status === 'live' && <div className="live-indicator" />}
                    <span style={{
                        color: status === 'live' ? 'var(--apple-green)' : status === 'error' ? 'var(--apple-red)' : 'var(--text-secondary)',
                        fontSize: 14, fontWeight: 600, letterSpacing: -0.2
                    }}>
                        {status === 'idle' ? 'Ready' : status === 'connecting' ? 'Connecting...' : status === 'live' ? 'Agent Live' : 'Error'}
                    </span>
                </div>
            </div>

            <div className="grid-2">

                {/* Left: Video + Config */}
                <div>
                    {/* Webcam Preview */}
                    <div className="ios-list" style={{ padding: 0, marginBottom: 24, background: '#000' }}>
                        <video
                            ref={videoRef} autoPlay muted playsInline
                            style={{ width: '100%', height: 360, objectFit: 'cover' }}
                        />
                        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderTop: '0.5px solid var(--separator)' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your webcam (agent view)</span>
                            {status === 'live' && <span style={{ fontSize: 13, color: 'var(--apple-green)', fontWeight: 500 }}>🔴 Analyzing...</span>}
                        </div>
                    </div>

                    {/* Configuration (iOS grouped form) */}
                    <h2 style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 16 }}>
                        Configuration
                    </h2>
                    <div className="ios-list" style={{ marginBottom: 24 }}>
                        <div className="ios-list-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Stream API Key</span>
                            <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} className="ios-input" style={{ padding: 0, fontSize: 15, border: 'none' }} placeholder="Paste from Dashboard" />
                        </div>
                        <div className="ios-list-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>User Token</span>
                            <input type="text" value={userToken} onChange={e => setUserToken(e.target.value)} className="ios-input" style={{ padding: 0, fontSize: 15 }} placeholder="Paste prospect token" />
                        </div>
                        <div className="ios-list-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 0 }}>
                            <div style={{ padding: '12px 16px', borderRight: '0.5px solid var(--separator)' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Call ID</span>
                                <input type="text" value={callId} onChange={e => setCallId(e.target.value)} className="ios-input" style={{ padding: 0, fontSize: 15 }} />
                            </div>
                            <div style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Agent URL</span>
                                <input type="text" value={agentUrl} onChange={e => setAgentUrl(e.target.value)} className="ios-input" style={{ padding: 0, fontSize: 15 }} />
                            </div>
                        </div>
                    </div>

                    {error && <div style={{ color: 'var(--apple-red)', fontSize: 13, marginBottom: 16, paddingLeft: 16 }}>{error}</div>}

                    <button className="btn btn-primary" onClick={triggerAgentJoin} disabled={status === 'connecting'} style={{ width: '100%', padding: '14px 0', fontSize: 16 }}>
                        {status === 'connecting' ? 'Connecting...' : status === 'live' ? 'Agent Connected — Restart' : 'Trigger Agent to Join Call'}
                    </button>
                </div>

                {/* Right: Setup & Logs */}
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 16 }}>
                        Setup Steps
                    </h2>
                    <div className="ios-list" style={{ marginBottom: 24 }}>
                        {[
                            { step: '1', text: 'Go to dashboard.getstream.io', done: !!apiKey },
                            { step: '2', text: 'Copy your API Key & paste above', done: !!apiKey },
                            { step: '3', text: 'Generate token', done: !!userToken },
                            { step: '4', text: 'Paste Prospect Token above', done: !!userToken },
                            { step: '5', text: 'Start agent on Colab', done: status === 'live' },
                            { step: '6', text: 'Click Trigger', done: status === 'live' },
                        ].map(s => (
                            <div key={s.step} className="ios-list-row" style={{ padding: '12px 16px' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: s.done ? 'var(--apple-green)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: s.done ? '#fff' : 'var(--text-secondary)', marginRight: 12 }}>
                                    {s.done ? '✓' : s.step}
                                </div>
                                <span style={{ fontSize: 14, color: s.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.text}</span>
                            </div>
                        ))}
                    </div>

                    <h2 style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 16 }}>
                        Activity Log
                    </h2>
                    <div className="ios-list" style={{ padding: '16px 20px', minHeight: 200, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {log.length === 0 ? 'Waiting for actions...' : log.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </div>

            </div>
        </div>
    )
}

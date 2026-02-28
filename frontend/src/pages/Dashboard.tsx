import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

/**
 * Dashboard — Overview of recent sessions and rep performance.
 */
export default function Dashboard() {
    const [sessions, setSessions] = useState<any[]>([])

    // Demo sessions
    useEffect(() => {
        setSessions([
            {
                id: 'demo-1',
                prospect_name: 'Sarah Kim',
                prospect_company: 'Acme Corp',
                rep_name: 'Alex Chen',
                duration: '47 min',
                avg_engagement: 71,
                total_whispers: 3,
                date: '2024-03-15',
                status: 'completed',
            },
            {
                id: 'demo-2',
                prospect_name: 'James Torres',
                prospect_company: 'DataFlow Inc',
                rep_name: 'Alex Chen',
                duration: '32 min',
                avg_engagement: 58,
                total_whispers: 2,
                date: '2024-03-14',
                status: 'completed',
            },
            {
                id: 'demo-3',
                prospect_name: 'Lisa Chen',
                prospect_company: 'CloudScale',
                rep_name: 'Alex Chen',
                duration: '28 min',
                avg_engagement: 82,
                total_whispers: 1,
                date: '2024-03-13',
                status: 'completed',
            },
        ])
    }, [])

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Your sales intelligence overview</p>
                </div>
                <Link to="/live">
                    <button className="btn btn-primary">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="live-dot" />
                            Start Live Session
                        </span>
                    </button>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid-3" style={{ marginBottom: 32 }}>
                <div className="glass-card stat-card">
                    <div className="stat-label">Avg Engagement</div>
                    <div className="stat-value" style={{ color: '#22c55e' }}>70.3</div>
                    <div className="stat-change positive">▲ 4.2 vs last week</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-label">Calls Analyzed</div>
                    <div className="stat-value">23</div>
                    <div className="stat-change positive">This month</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-label">Key Pattern</div>
                    <div className="stat-value" style={{ fontSize: 18, lineHeight: 1.3 }}>
                        Pricing Contempt
                    </div>
                    <div className="stat-change negative">Found in 60% of calls</div>
                </div>
            </div>

            {/* Recent Sessions */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
                    Recent Sessions
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 100px',
                        padding: '8px 16px',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}>
                        <div>Prospect</div>
                        <div>Company</div>
                        <div>Duration</div>
                        <div>Engagement</div>
                        <div>Whispers</div>
                        <div></div>
                    </div>

                    {/* Session Rows */}
                    {sessions.map((session) => (
                        <div key={session.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 100px',
                            padding: '14px 16px',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s',
                            cursor: 'pointer',
                        }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-glass)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div>
                                <div style={{ fontWeight: 500 }}>{session.prospect_name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session.date}</div>
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>{session.prospect_company}</div>
                            <div>{session.duration}</div>
                            <div>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    background: session.avg_engagement >= 70
                                        ? 'rgba(34, 197, 94, 0.12)' : session.avg_engagement >= 50
                                            ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: session.avg_engagement >= 70
                                        ? '#22c55e' : session.avg_engagement >= 50
                                            ? '#eab308' : '#ef4444',
                                }}>
                                    {session.avg_engagement}
                                </span>
                            </div>
                            <div>{session.total_whispers}</div>
                            <div>
                                <Link to={`/debrief/${session.id}`}>
                                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                                        View
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

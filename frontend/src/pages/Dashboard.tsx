import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
    const [sessions, setSessions] = useState<any[]>([])

    useEffect(() => {
        setSessions([
            {
                id: 'demo-1', prospect_name: 'Sarah Kim', prospect_company: 'Acme Corp',
                rep_name: 'Alex Chen', duration: '47m', avg_engagement: 71,
                total_whispers: 3, date: 'Mar 15, 2024',
            },
            {
                id: 'demo-2', prospect_name: 'James Torres', prospect_company: 'DataFlow Inc',
                rep_name: 'Alex Chen', duration: '32m', avg_engagement: 58,
                total_whispers: 2, date: 'Mar 14, 2024',
            },
            {
                id: 'demo-3', prospect_name: 'Lisa Chen', prospect_company: 'CloudScale',
                rep_name: 'Alex Chen', duration: '28m', avg_engagement: 82,
                total_whispers: 1, date: 'Mar 13, 2024',
            },
        ])
    }, [])

    return (
        <div style={{ padding: '0 24px 64px' }}>

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, marginTop: 16 }}>
                <div>
                    <h1 className="page-title">Overview</h1>
                    <p className="page-subtitle">Your sales intelligence metrics</p>
                </div>
                <Link to="/live">
                    <button className="btn btn-primary">
                        Start Live Session
                    </button>
                </Link>
            </div>

            {/* ── Apple-Style Stat Display (No cards, pure floating typography) ── */}
            <div className="grid-3" style={{ marginBottom: 64, padding: '0 16px' }}>
                <div className="stat-hero">
                    <div className="value" style={{ color: 'var(--apple-green)' }}>70.3</div>
                    <div className="label">Avg Engagement</div>
                    <div style={{ fontSize: 13, color: 'var(--apple-green)', marginTop: 4 }}>+4.2 vs last week</div>
                </div>
                <div className="stat-hero">
                    <div className="value">23</div>
                    <div className="label">Calls Analyzed</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>This month</div>
                </div>
                <div className="stat-hero">
                    <div className="value" style={{ fontSize: 32, letterSpacing: -0.5, marginTop: 14 }}>Pricing Contempt</div>
                    <div className="label">Top Flagged Pattern</div>
                    <div style={{ fontSize: 13, color: 'var(--apple-red)', marginTop: 4 }}>Found in 60% of calls</div>
                </div>
            </div>

            {/* ── Unified iOS List Table ── */}
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginBottom: 16, paddingLeft: 16 }}>
                Recent Sessions
            </h2>

            <div className="ios-list">
                {/* Table Header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 100px 100px 80px',
                    padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 0.5, color: 'var(--text-secondary)',
                    borderBottom: '0.5px solid var(--separator)'
                }}>
                    <div>Prospect</div>
                    <div>Company</div>
                    <div>Duration</div>
                    <div>Engage</div>
                    <div>Whispers</div>
                    <div></div>
                </div>

                {/* Rows */}
                {sessions.map((s, i) => (
                    <div key={s.id} className="ios-list-row" style={{ gridTemplateColumns: '2fr 1.5fr 100px 100px 100px 80px', display: 'grid' }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2 }}>{s.prospect_name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.date}</div>
                        </div>

                        <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{s.prospect_company}</div>

                        <div style={{ fontSize: 15, fontFeatureSettings: '"tnum"' }}>{s.duration}</div>

                        <div>
                            <span style={{
                                color: s.avg_engagement >= 70 ? 'var(--apple-green)' : s.avg_engagement >= 50 ? 'var(--apple-yellow)' : 'var(--apple-red)',
                                fontSize: 15, fontWeight: 600, fontFeatureSettings: '"tnum"'
                            }}>
                                {s.avg_engagement}
                            </span>
                        </div>

                        <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                            {s.total_whispers}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <Link to={`/debrief/${s.id}`}>
                                <button className="btn btn-system" style={{ fontSize: 13, padding: '4px 12px' }}>
                                    View
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    )
}

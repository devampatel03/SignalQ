import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import DebriefTimeline from '../components/DebriefTimeline'

/**
 * Debrief page — Post-call annotated analysis.
 * Shows engagement timeline, critical/winning moments, and coaching recommendations.
 */
export default function Debrief() {
    const { sessionId } = useParams()
    const [loading, setLoading] = useState(false)

    // Demo data — in production, fetched from /api/sessions/{id}/debrief
    const demoSession = {
        rep_name: 'Alex Chen',
        prospect_name: 'Sarah Kim',
        prospect_company: 'Acme Corp',
        duration_minutes: 47,
        avg_engagement: 71,
        total_whispers: 3,
    }

    // Generate demo timeline data
    const generateDemoTimeline = () => {
        const points = []
        for (let i = 0; i < 280; i++) {
            const t = i * 10  // 10-second intervals over 47 min
            let score = 65 + Math.sin(i * 0.05) * 15 + (Math.random() - 0.5) * 8

            // Create story moments
            if (t > 560 && t < 580) score = 40  // Pricing dip
            if (t > 900 && t < 960) score = 82  // Interest spike
            if (t > 1400 && t < 1500) score = 35  // Disengagement
            if (t > 2100 && t < 2200) score = 88  // Winning moment

            score = Math.max(10, Math.min(95, score))
            points.push({
                timestamp: t,
                engagement_score: score,
                emotion: score > 75 ? 'happy' : score < 40 ? 'neutral' : 'neutral',
                signal_type: t === 570 ? 'contempt_flash' : t === 930 ? 'interest_spike' : undefined,
            })
        }
        return points
    }

    const timeline = generateDemoTimeline()

    const criticalMoments = [
        { timestamp: 570, label: 'Pricing contempt flash' },
        { timestamp: 1450, label: 'Demo disengagement' },
    ]

    const winningMoments = [
        { timestamp: 930, label: 'API integration interest' },
        { timestamp: 2150, label: 'Security compliance spike' },
    ]

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Call Debrief</h1>
                    <p className="page-subtitle">
                        {demoSession.prospect_name} ({demoSession.prospect_company})
                        — {demoSession.duration_minutes}min
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost">Export PDF</button>
                    <button className="btn btn-primary">Share with Team</button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="glass-card stat-card">
                    <div className="stat-label">Overall Engagement</div>
                    <div className="stat-value" style={{ color: '#22c55e' }}>
                        {demoSession.avg_engagement}
                        <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span>
                    </div>
                    <div className="stat-change positive">▲ Above team avg (63)</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-label">Whispers Delivered</div>
                    <div className="stat-value">{demoSession.total_whispers}</div>
                    <div className="stat-change positive">All high-confidence</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-label">Call Duration</div>
                    <div className="stat-value">{demoSession.duration_minutes}
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>min</span>
                    </div>
                </div>
            </div>

            {/* Engagement Timeline */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                    Engagement Timeline
                </h3>
                <DebriefTimeline
                    data={timeline}
                    criticalMoments={criticalMoments}
                    winningMoments={winningMoments}
                />
                <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>🔴 Critical moment</span>
                    <span>🟢 Winning moment</span>
                    <span style={{ opacity: 0.6 }}>━━ Engagement score</span>
                </div>
            </div>

            {/* Two-column: Critical & Winning Moments */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Critical Moments */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#ef4444' }}>
                        🔴 Critical Moments
                    </h3>
                    <div className="timeline-moment critical">
                        <div className="moment-time">9:30</div>
                        <div className="moment-content">
                            <div className="moment-title">Pricing triggered contempt flash (300ms)</div>
                            <div className="moment-insight">
                                "Consider anchoring ROI before introducing price. This is the 3rd call
                                this month where pricing triggered this reaction."
                            </div>
                        </div>
                    </div>
                    <div className="timeline-moment critical">
                        <div className="moment-time">24:10</div>
                        <div className="moment-content">
                            <div className="moment-title">Demo disengagement for 4 minutes</div>
                            <div className="moment-insight">
                                "Screen-share may have been too detailed. Prospect is VP Eng —
                                show outcomes, not feature depth."
                            </div>
                        </div>
                    </div>
                </div>

                {/* Winning Moments */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#22c55e' }}>
                        🟢 Winning Moments
                    </h3>
                    <div className="timeline-moment winning">
                        <div className="moment-time">15:30</div>
                        <div className="moment-content">
                            <div className="moment-title">Strong interest spike on API integration</div>
                            <div className="moment-insight">
                                "Mentioned briefly but this was your highest engagement moment.
                                Was underexplored — make this a standard talking point."
                            </div>
                        </div>
                    </div>
                    <div className="timeline-moment winning">
                        <div className="moment-time">35:50</div>
                        <div className="moment-content">
                            <div className="moment-title">Surprise + engagement on security compliance</div>
                            <div className="moment-insight">
                                "This hit harder than you realized. The compliance slide
                                is a great asset for VP-level prospects."
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coaching Recommendations */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                    📋 Coaching Recommendations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                        {
                            title: 'Price Anchoring',
                            text: '3 of your last 5 calls showed contempt at pricing. Lead with ROI calculation before price reveal.',
                            priority: 'high',
                        },
                        {
                            title: 'Demo Depth Calibration',
                            text: 'VP-level prospects want outcomes, not features. Track prospect title before choosing demo style.',
                            priority: 'medium',
                        },
                        {
                            title: 'Integration Questions',
                            text: '"Integration with X" drove 3 interest spikes this call. Make this a standard discovery question.',
                            priority: 'medium',
                        },
                    ].map((rec, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            gap: 12,
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-glass)',
                            borderLeft: `3px solid ${rec.priority === 'high' ? '#ef4444' : '#eab308'}`,
                        }}>
                            <div style={{ fontWeight: 600 }}>{i + 1}.</div>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{rec.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {rec.text}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

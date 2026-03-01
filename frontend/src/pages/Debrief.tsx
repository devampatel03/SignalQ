import { useState } from 'react'
import { useParams } from 'react-router-dom'
import DebriefTimeline from '../components/DebriefTimeline'

export default function Debrief() {
    const { sessionId } = useParams()

    const s = {
        rep_name: 'Alex Chen', prospect_name: 'Sarah Kim', prospect_company: 'Acme Corp',
        duration_minutes: 47, avg_engagement: 71, total_whispers: 3,
    }

    const timeline = []
    for (let i = 0; i < 280; i++) {
        const t = i * 10
        let sc = 65 + Math.sin(i * 0.05) * 15 + (Math.random() - 0.5) * 8
        if (t > 560 && t < 580) sc = 40
        if (t > 900 && t < 960) sc = 82
        if (t > 1400 && t < 1500) sc = 35
        if (t > 2100 && t < 2200) sc = 88
        sc = Math.max(10, Math.min(95, sc))
        timeline.push({
            timestamp: t, engagement_score: sc,
            emotion: sc > 75 ? 'happy' : sc < 40 ? 'neutral' : 'neutral',
            signal_type: t === 570 ? 'contempt flash' : t === 930 ? 'interest spike' : undefined,
        })
    }

    const critical = [
        { timestamp: 570, label: 'Pricing contempt flash' },
        { timestamp: 1450, label: 'Demo disengagement' },
    ]
    const winning = [
        { timestamp: 930, label: 'API integration interest' },
        { timestamp: 2150, label: 'Security compliance spike' },
    ]

    return (
        <div style={{ padding: '0 24px 64px' }}>

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, marginTop: 16 }}>
                <div>
                    <h1 className="page-title">{s.prospect_name}</h1>
                    <p className="page-subtitle">{s.prospect_company} — {s.duration_minutes}m</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-system">Export</button>
                    <button className="btn btn-blue">Share</button>
                </div>
            </div>

            {/* ── Top Stats (Float) ── */}
            <div className="grid-3" style={{ marginBottom: 48, padding: '0 16px' }}>
                <div className="stat-hero">
                    <div className="value" style={{ color: 'var(--apple-green)' }}>{s.avg_engagement}</div>
                    <div className="label">Overall Engagement</div>
                    <div style={{ fontSize: 13, color: 'var(--apple-green)', marginTop: 4 }}>+Above team avg</div>
                </div>
                <div className="stat-hero">
                    <div className="value">{s.total_whispers}</div>
                    <div className="label">Whispers Delivered</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>All high-confidence</div>
                </div>
                <div className="stat-hero">
                    <div className="value">{s.duration_minutes}m</div>
                    <div className="label">Call Duration</div>
                </div>
            </div>

            {/* ── Engagement Timeline Layer ── */}
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginBottom: 16, paddingLeft: 16 }}>
                Timeline
            </h2>
            <div className="ios-list" style={{ padding: '32px 24px 24px', marginBottom: 48 }}>
                <DebriefTimeline data={timeline} criticalMoments={critical} winningMoments={winning} />
                <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingLeft: 8, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    <span style={{ color: 'var(--apple-red)' }}>● Critical</span>
                    <span style={{ color: 'var(--apple-green)' }}>● Winning</span>
                    <span style={{ color: 'var(--apple-blue)' }}>— Score</span>
                </div>
            </div>

            {/* ── Moments (iOS Grouped Lists) ── */}
            <div className="grid-2" style={{ marginBottom: 48 }}>
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--apple-red)', marginBottom: 12, paddingLeft: 16 }}>
                        Critical Moments
                    </h2>
                    <div className="ios-list">
                        <div className="ios-list-row" style={{ display: 'block', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, letterSpacing: -0.2 }}>Pricing triggered contempt</span>
                                <span style={{ color: 'var(--text-tertiary)', fontFeatureSettings: '"tnum"', fontSize: 13 }}>9:30</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
                                "Consider anchoring ROI before introducing price. This is the 3rd call this month where pricing triggered this reaction."
                            </div>
                        </div>
                        <div className="ios-list-row" style={{ display: 'block', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, letterSpacing: -0.2 }}>Demo disengagement (4m)</span>
                                <span style={{ color: 'var(--text-tertiary)', fontFeatureSettings: '"tnum"', fontSize: 13 }}>24:10</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
                                "Screen-share may have been too detailed. Prospect is VP Eng — show outcomes, not feature depth."
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--apple-green)', marginBottom: 12, paddingLeft: 16 }}>
                        Winning Moments
                    </h2>
                    <div className="ios-list">
                        <div className="ios-list-row" style={{ display: 'block', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, letterSpacing: -0.2 }}>API integration interest</span>
                                <span style={{ color: 'var(--text-tertiary)', fontFeatureSettings: '"tnum"', fontSize: 13 }}>15:30</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
                                "Mentioned briefly but this was your highest engagement moment. Was underexplored — make this a standard talking point."
                            </div>
                        </div>
                        <div className="ios-list-row" style={{ display: 'block', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, letterSpacing: -0.2 }}>Security compliance spike</span>
                                <span style={{ color: 'var(--text-tertiary)', fontFeatureSettings: '"tnum"', fontSize: 13 }}>35:50</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
                                "This hit harder than you realized. The compliance slide is a great asset for VP-level prospects."
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Coaching ── */}
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginBottom: 16, paddingLeft: 16 }}>
                Coaching Recommendations
            </h2>
            <div className="ios-list">
                {[
                    { t: 'Price Anchoring', d: '3 of your last 5 calls showed contempt at pricing. Lead with ROI.', p: 'var(--apple-red)' },
                    { t: 'Demo Depth Calibration', d: 'VP-level prospects want outcomes, not features. Track title before choosing style.', p: 'var(--apple-yellow)' },
                    { t: 'Integration Questions', d: '"Integration with X" drove 3 spikes. Make this a standard discovery question.', p: 'var(--apple-yellow)' },
                ].map((c, i) => (
                    <div key={i} className="ios-list-row" style={{ display: 'block', padding: '16px 20px', borderLeft: `3px solid ${c.p}` }}>
                        <div style={{ fontWeight: 600, letterSpacing: -0.2, marginBottom: 4 }}>{c.t}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{c.d}</div>
                    </div>
                ))}
            </div>

        </div>
    )
}

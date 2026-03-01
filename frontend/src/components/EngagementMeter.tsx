import { useState, useEffect } from 'react'

interface EngagementMeterProps {
    score: number
    size?: number
}

/**
 * Apple Watch Activity Ring style Engagement Meter.
 * Rounded caps, pure black background (handled by container), bright neon gradient potential.
 */
export default function EngagementMeter({ score, size = 180 }: EngagementMeterProps) {
    const [animated, setAnimated] = useState(score)

    useEffect(() => {
        const t = setTimeout(() => setAnimated(score), 50)
        return () => clearTimeout(t)
    }, [score])

    // Apple Watch rings are usually thicker (around 12-16px)
    const strokeWidth = 14
    const r = (size - strokeWidth * 2) / 2
    const c = 2 * Math.PI * r
    const offset = c - (animated / 100) * c

    // Apple system colors for rings
    const color =
        animated >= 70 ? 'var(--apple-green)' :
            animated >= 40 ? 'var(--apple-yellow)' : 'var(--apple-red)'

    return (
        <div className="activity-ring-container" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} style={{ filter: `drop-shadow(0 0 16px ${color}40)` }}>
                {/* Background Track (semi-transparent of the active color) */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={`${color}20`}
                    strokeWidth={strokeWidth}
                />
                {/* Active Ring Fill */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round" // Apple Watch signature rounded ends
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.4s ease' }}
                />
            </svg>

            {/* Floating typography in center */}
            <div className="watch-score">
                <span className="num" style={{ color }}>{Math.round(animated)}</span>
                <span className="lbl" style={{ color: `${color}80` }}>ENGAGE</span>
            </div>
        </div>
    )
}

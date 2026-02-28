import { useState, useEffect, useCallback } from 'react'

interface EngagementMeterProps {
    score: number
    size?: number
    showLabel?: boolean
}

/**
 * Real-time engagement gauge with animated SVG ring.
 * Color transitions: red (0-39) → yellow (40-69) → green (70-100)
 */
export default function EngagementMeter({
    score,
    size = 160,
    showLabel = true,
}: EngagementMeterProps) {
    const [animatedScore, setAnimatedScore] = useState(score)

    // Smooth animation on score change
    useEffect(() => {
        const timer = setTimeout(() => setAnimatedScore(score), 50)
        return () => clearTimeout(timer)
    }, [score])

    const radius = (size - 16) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (animatedScore / 100) * circumference

    const getColor = (s: number) => {
        if (s >= 70) return '#22c55e'
        if (s >= 40) return '#eab308'
        return '#ef4444'
    }

    const getGlow = (s: number) => {
        if (s >= 70) return '0 0 20px rgba(34, 197, 94, 0.3)'
        if (s >= 40) return '0 0 20px rgba(234, 179, 8, 0.2)'
        return '0 0 20px rgba(239, 68, 68, 0.3)'
    }

    const color = getColor(animatedScore)

    return (
        <div className="engagement-meter" style={{ width: size, height: size }}>
            <div className="engagement-ring" style={{ filter: `drop-shadow(${getGlow(animatedScore)})` }}>
                <svg viewBox={`0 0 ${size} ${size}`}>
                    {/* Background ring */}
                    <circle
                        className="ring-bg"
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                    />
                    {/* Active ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
                    />
                </svg>
            </div>
            <div className="engagement-value">
                <div className="score" style={{ color }}>
                    {Math.round(animatedScore)}
                </div>
                {showLabel && <div className="label">Engagement</div>}
            </div>
        </div>
    )
}

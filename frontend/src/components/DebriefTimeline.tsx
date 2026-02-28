import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea,
} from 'recharts'

interface TimelinePoint {
    timestamp: number
    engagement_score: number
    emotion?: string
    signal_type?: string
}

interface DebriefTimelineProps {
    data: TimelinePoint[]
    criticalMoments?: Array<{ timestamp: number; label: string }>
    winningMoments?: Array<{ timestamp: number; label: string }>
}

/**
 * Interactive engagement timeline chart with annotated moments.
 * This is the visual centerpiece of the debrief page.
 */
export default function DebriefTimeline({
    data,
    criticalMoments = [],
    winningMoments = [],
}: DebriefTimelineProps) {
    const formatTime = (ts: number) => {
        const mins = Math.floor(ts / 60)
        const secs = Math.floor(ts % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const point = payload[0].payload
            return (
                <div style={{
                    background: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                }}>
                    <div style={{ color: '#8888a0', marginBottom: 4 }}>
                        {formatTime(point.timestamp)}
                    </div>
                    <div style={{ fontWeight: 600 }}>
                        Engagement: <span style={{
                            color: point.engagement_score >= 70 ? '#22c55e'
                                : point.engagement_score >= 40 ? '#eab308' : '#ef4444'
                        }}>{Math.round(point.engagement_score)}</span>
                    </div>
                    {point.emotion && point.emotion !== 'neutral' && (
                        <div style={{ color: '#8888a0', marginTop: 2 }}>
                            Emotion: {point.emotion}
                        </div>
                    )}
                    {point.signal_type && (
                        <div style={{ color: '#6366f1', marginTop: 2 }}>
                            Signal: {point.signal_type}
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTime}
                        stroke="#555570"
                        fontSize={11}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        stroke="#555570"
                        fontSize={11}
                        tickLine={false}
                        ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Danger zone */}
                    <ReferenceArea y1={0} y2={35} fill="rgba(239, 68, 68, 0.03)" />

                    {/* Engagement threshold line */}
                    <ReferenceLine
                        y={50}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 3"
                    />

                    {/* Critical moments */}
                    {criticalMoments.map((m, i) => (
                        <ReferenceLine
                            key={`crit-${i}`}
                            x={m.timestamp}
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                        />
                    ))}

                    {/* Winning moments */}
                    {winningMoments.map((m, i) => (
                        <ReferenceLine
                            key={`win-${i}`}
                            x={m.timestamp}
                            stroke="#22c55e"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                        />
                    ))}

                    {/* Main engagement line */}
                    <Line
                        type="monotone"
                        dataKey="engagement_score"
                        stroke="url(#engagementGradient)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                            r: 5,
                            fill: '#6366f1',
                            stroke: 'rgba(99, 102, 241, 0.3)',
                            strokeWidth: 6,
                        }}
                    />

                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id="engagementGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="50%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                    </defs>
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

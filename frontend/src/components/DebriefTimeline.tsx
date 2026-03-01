import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
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

export default function DebriefTimeline({ data, criticalMoments = [], winningMoments = [] }: DebriefTimelineProps) {
    const fmt = (ts: number) => `${Math.floor(ts / 60)}:${(ts % 60).toString().padStart(2, '0')}`

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const p = payload[0].payload
            return (
                <div style={{
                    background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#fff'
                }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>
                        {fmt(p.timestamp)}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 300, fontFeatureSettings: '"tnum"', letterSpacing: -1, lineHeight: 1 }}>
                        {Math.round(p.engagement_score)}
                    </div>
                    {p.emotion && p.emotion !== 'neutral' && (
                        <div style={{ fontSize: 13, marginTop: 8, color: 'var(--text-secondary)' }}>
                            Emotion: <span style={{ color: '#fff', textTransform: 'capitalize' }}>{p.emotion}</span>
                        </div>
                    )}
                    {p.signal_type && (
                        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--apple-blue)' }}>
                            {p.signal_type.replace('_', ' ')}
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="var(--separator-light)" vertical={false} />
                    <XAxis
                        dataKey="timestamp" tickFormatter={fmt}
                        stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} dy={10}
                    />
                    <YAxis
                        domain={[0, 100]} stroke="var(--text-tertiary)"
                        fontSize={11} tickLine={false} axisLine={false} dx={-10} ticks={[0, 50, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    {criticalMoments.map((m, i) => (
                        <ReferenceLine key={`crit-${i}`} x={m.timestamp} stroke="var(--apple-red)" strokeWidth={1} strokeDasharray="3 3" />
                    ))}
                    {winningMoments.map((m, i) => (
                        <ReferenceLine key={`win-${i}`} x={m.timestamp} stroke="var(--apple-green)" strokeWidth={1} strokeDasharray="3 3" />
                    ))}

                    <Line
                        type="monotone" dataKey="engagement_score" stroke="var(--apple-blue)"
                        strokeWidth={3} dot={false}
                        activeDot={{ r: 6, fill: 'var(--apple-blue)', stroke: '#fff', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

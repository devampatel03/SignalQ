import { useEffect, useRef } from 'react'

interface Whisper {
    text: string
    timestamp: number
    signal?: string
}

interface WhisperFeedProps {
    whispers: Whisper[]
    maxVisible?: number
}

/**
 * Displays the last N whispers with slide-in animation.
 * Each whisper shows timestamp and trigger signal type.
 */
export default function WhisperFeed({ whispers, maxVisible = 3 }: WhisperFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to latest whisper
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
    }, [whispers])

    const visible = whispers.slice(-maxVisible)

    const formatTime = (ts: number) => {
        const mins = Math.floor(ts / 60)
        const secs = Math.floor(ts % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getSignalIcon = (signal?: string) => {
        switch (signal) {
            case 'interest_spike': return '🟢'
            case 'agreement_cascade': return '🔵'
            case 'contempt_flash': return '🔴'
            case 'confusion': return '🟡'
            case 'disengagement': return '🟠'
            default: return '💡'
        }
    }

    if (visible.length === 0) {
        return (
            <div className="whisper-feed">
                <div className="whisper-item" style={{ opacity: 0.5 }}>
                    <div className="whisper-text" style={{ color: 'var(--text-muted)' }}>
                        Listening for signals...
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="whisper-feed" ref={containerRef}>
            {visible.map((whisper, i) => (
                <div
                    key={`${whisper.timestamp}-${i}`}
                    className="whisper-item"
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    <div className="whisper-time">
                        {getSignalIcon(whisper.signal)} {formatTime(whisper.timestamp)}
                    </div>
                    <div className="whisper-text">{whisper.text}</div>
                </div>
            ))}
        </div>
    )
}

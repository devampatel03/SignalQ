import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LiveCall from './pages/LiveCall'
import Debrief from './pages/Debrief'
import TestCall from './pages/TestCall'

export default function App() {
    const loc = useLocation()

    return (
        <div className="app-container">
            {/* ── Apple-Inspired Floating Navigation ── */}
            <div className="nav-container">
                <div className="nav-bar">
                    <div className="nav-logo">
                        Signal<span style={{ color: '#8E8E93' }}>IQ</span>
                    </div>
                    <div className="nav-links">
                        <Link
                            to="/"
                            className={`nav-link ${loc.pathname === '/' ? 'active' : ''}`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/live"
                            className={`nav-link ${loc.pathname === '/live' ? 'active' : ''}`}
                        >
                            Live Call
                        </Link>
                        <Link
                            to="/test-call"
                            className={`nav-link ${loc.pathname === '/test-call' ? 'active' : ''}`}
                        >
                            Test Setup
                        </Link>
                    </div>
                </div>
            </div>

            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/live" element={<LiveCall />} />
                <Route path="/debrief/:sessionId" element={<Debrief />} />
                <Route path="/test-call" element={<TestCall />} />
            </Routes>
        </div>
    )
}

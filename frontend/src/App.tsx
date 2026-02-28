import { Routes, Route, Link, useLocation } from 'react-router-dom'
import LiveCall from './pages/LiveCall'
import Debrief from './pages/Debrief'
import Dashboard from './pages/Dashboard'

function App() {
    const location = useLocation()

    return (
        <div>
            {/* Navigation Bar */}
            <nav className="nav-bar">
                <div className="nav-logo">
                    <span className="logo-signal">Signal</span>
                    <span className="logo-iq">IQ</span>
                </div>
                <div className="nav-links">
                    <Link
                        to="/"
                        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/live"
                        className={`nav-link ${location.pathname === '/live' ? 'active' : ''}`}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="live-dot" />
                            Live Call
                        </span>
                    </Link>
                    <Link
                        to="/debrief"
                        className={`nav-link ${location.pathname.startsWith('/debrief') ? 'active' : ''}`}
                    >
                        Debrief
                    </Link>
                </div>
            </nav>

            {/* Routes */}
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/live" element={<LiveCall />} />
                    <Route path="/debrief" element={<Debrief />} />
                    <Route path="/debrief/:sessionId" element={<Debrief />} />
                </Routes>
            </div>
        </div>
    )
}

export default App

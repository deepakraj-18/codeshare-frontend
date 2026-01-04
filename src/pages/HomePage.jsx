import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const HomePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Backend API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleCreateSession = async () => {
    // Prevent double clicks
    if (isLoading) {
      return;
    }

    // Reset error state
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to create session: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const sessionId = data.sessionId || data.id;

      if (!sessionId) {
        throw new Error('Session ID not received from server');
      }

      // Redirect to the new session
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError(err.message || 'An error occurred while creating the session');
      setIsLoading(false);
    }
  };

  const handleJoinSession = () => {
    if (!joinSessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    // Navigate to the session
    navigate(`/session/${joinSessionId.trim()}`);
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-page-header">
        <div className="home-page-header-content">
          <Link to="/" className="home-page-logo">
            <span className="home-page-logo-icon">&lt;/&gt;</span>
            <span>Codeshare</span>
          </Link>
          
          <nav className="home-page-nav">
            <Link to="/" className="home-page-nav-link">Home</Link>
            <Link to="/about" className="home-page-nav-link">About</Link>
          </nav>
          
          <div className="home-page-header-actions">
            <Link to="/login" className="home-page-login-button">Log in</Link>
            <button className="home-page-new-session-button" onClick={handleCreateSession}>New Session</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="home-page-hero">
        <h1 className="home-page-title">
          Share code. Collaborate instantly.
        </h1>
        <p className="home-page-description">
          Real-time code sharing for developers, interviewers, and students. No signup required to get started.
        </p>

        <div className="home-page-actions">
          <button
            className="home-page-button"
            onClick={handleCreateSession}
            disabled={isLoading}
          >
            {isLoading && <span className="home-page-spinner"></span>}
            {isLoading ? 'Creating session...' : 'Create New Session'}
          </button>

          <div className="home-page-join-section">
            <input
              type="text"
              className="home-page-join-input"
              placeholder="Enter Session ID"
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
            />
            <button
              className="home-page-join-button"
              onClick={handleJoinSession}
            >
              Join
            </button>
          </div>
        </div>

        {error && (
          <div className="home-page-error">
            {error}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="home-page-features">
        <h2 className="home-page-features-title">Features</h2>
        <p className="home-page-features-subtitle">
          Everything you need to share code, without the bloat.
        </p>

        <div className="home-page-features-grid">
          <div className="home-page-feature-card">
            <div className="home-page-feature-icon">⚡</div>
            <h3 className="home-page-feature-title">Realtime</h3>
            <p className="home-page-feature-description">
              See changes as they happen. Zero latency collaboration.
            </p>
          </div>

          <div className="home-page-feature-card">
            <div className="home-page-feature-icon">🌐</div>
            <h3 className="home-page-feature-title">No Signup</h3>
            <p className="home-page-feature-description">
              Jump straight into code. No account required for guests.
            </p>
          </div>

          <div className="home-page-feature-card">
            <div className="home-page-feature-icon">🔗</div>
            <h3 className="home-page-feature-title">Shareable</h3>
            <p className="home-page-feature-description">
              Generate a unique link and share it with anyone.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-page-footer">
        <div className="home-page-footer-content">
          <div className="home-page-footer-left">
            <span className="home-page-footer-icon">&lt;/&gt;</span>
            <span>Built by <a href="#" className="home-page-footer-link">Figma Make</a>. The source code is available on <a href="#" className="home-page-footer-link">GitHub</a>.</span>
          </div>
          <div className="home-page-footer-right">
            <a href="#" className="home-page-footer-link">Privacy</a>
            <a href="#" className="home-page-footer-link">Terms</a>
            <button className="home-page-help-button" title="Help">?</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;


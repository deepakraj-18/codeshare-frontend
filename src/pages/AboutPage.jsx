import { Link, useNavigate } from 'react-router-dom';

const AboutPage = () => {
  const navigate = useNavigate();

  const handleNewSession = () => {
    navigate('/');
  };

  return (
    <div className="about-page">
      {/* Header */}
      <header className="about-page-header">
        <div className="about-page-header-content">
          <Link to="/" className="about-page-logo">
            <span className="about-page-logo-icon">&lt;/&gt;</span>
            <span>Codeshare</span>
          </Link>
          
          <nav className="about-page-nav">
            <Link to="/" className="about-page-nav-link">Home</Link>
            <Link to="/about" className="about-page-nav-link about-page-nav-link-active">About</Link>
          </nav>
          
          <div className="about-page-header-actions">
            <Link to="/login" className="about-page-login-button">Log in</Link>
            <button className="about-page-new-session-button" onClick={handleNewSession}>New Session</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="about-page-content">
        <section className="about-page-section">
          <h1 className="about-page-section-title">About CodeShare</h1>
          <p className="about-page-section-description">
            CodeShare is a real-time code collaboration platform built for developers, by developers.
          </p>
        </section>

        <section className="about-page-section">
          <h2 className="about-page-section-title">Our Mission</h2>
          <p className="about-page-section-description">
            Our mission is to simplify the way developers share and collaborate on code. Whether you are conducting a technical interview, debugging with a peer, or teaching a student, CodeShare provides a distraction-free environment to get the job done.
          </p>
        </section>

        <section className="about-page-section">
          <h2 className="about-page-section-title">Technology</h2>
          <p className="about-page-section-description">
            CodeShare is built with modern web technologies including React, Tailwind CSS, and Shadcn UI. We use PrismJS for syntax highlighting and are actively working on integrating Supabase for robust real-time synchronization.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="about-page-footer">
        <div className="about-page-footer-content">
          <div className="about-page-footer-left">
            <span className="about-page-footer-icon">&lt;/&gt;</span>
            <span>Built by <a href="#" className="about-page-footer-link">Figma Make</a>. The source code is available on <a href="#" className="about-page-footer-link">GitHub</a>.</span>
          </div>
          <div className="about-page-footer-right">
            <a href="#" className="about-page-footer-link">Privacy</a>
            <a href="#" className="about-page-footer-link">Terms</a>
            <button className="about-page-help-button" title="Help">?</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;


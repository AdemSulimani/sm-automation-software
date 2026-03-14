import { Link } from 'react-router-dom';
import { MouseGlow } from '../components/MouseGlow';
import { HowWeWork } from '../components/HowWeWork';
import { ManageOrdersSection } from '../components/ManageOrdersSection';

const PRODUCT_NAME = 'SM Automation';
const HERO_BADGE = 'AI Powered Messaging';
const HERO_SUBTITLE = 'AI-powered tools that help your team scale and automate customer conversations across Facebook, Instagram, WhatsApp and Viber.';
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Resources', href: '#resources' },
];

export function Landing() {
  return (
    <MouseGlow className="landing-v2">
      {/* Background: thin grid lines fading at the sides */}
      <div className="landing-v2-bg">
        <div className="landing-v2-bg-grid" aria-hidden />
      </div>

      <header className="landing-v2-header">
        <div className="landing-v2-header-inner">
          <div className="landing-v2-header-left">
            <Link to="/" className="landing-v2-logo">
              <span className="landing-v2-logo-icon">▲</span>
              {PRODUCT_NAME}
            </Link>
          </div>
          <nav className="landing-v2-nav">
            {NAV_LINKS.map((item) => (
              <a key={item.label} href={item.href} className="landing-v2-nav-link">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="landing-v2-header-right">
            <Link to="/login" className="landing-v2-btn landing-v2-btn--nav">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-v2-main">
        <section className="landing-v2-hero">
          <div className="landing-v2-badge">
            <span className="landing-v2-badge-icon">+</span>
            {HERO_BADGE}
          </div>
          <h1 className="landing-v2-hero-title">
            The Future Of Intelligent
            <br />
            Digital Operations
          </h1>
          <p className="landing-v2-hero-subtitle">{HERO_SUBTITLE}</p>
          <Link to="/login" className="landing-v2-btn landing-v2-btn--cta">
            Get Started
          </Link>
        </section>

        <div className="landing-v2-transition" aria-hidden />
        <HowWeWork />
        <ManageOrdersSection />
      </main>

      <footer className="landing-v2-footer">
        <div className="landing-v2-footer-inner">
          <span className="landing-v2-footer-logo">{PRODUCT_NAME}</span>
          <div className="landing-v2-footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <span className="landing-v2-footer-sep">·</span>
            <Link to="/terms">Terms of Service</Link>
          </div>
          <p className="landing-v2-footer-copy">
            © {new Date().getFullYear()} {PRODUCT_NAME}.
          </p>
        </div>
      </footer>
    </MouseGlow>
  );
}

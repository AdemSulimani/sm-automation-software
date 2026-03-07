import { Link } from 'react-router-dom';

const PRODUCT_NAME = 'SM Automation';
const TAGLINE = 'Automatizim mesazhesh për biznese, përgjigje të mençura me AI dhe integrim me Facebook, Instagram dhe Viber.';

const WHO_IT_IS_FOR = [
  'Kompani që duan të përgjigjen klientëve në Facebook dhe Instagram',
  'Agjenci që menaxhojnë faqe të shumta',
  'Dyqane e-commerce që duan përgjigje të shpejta në Messenger dhe Viber',
];

const FEATURES = [
  'Kanale të lidhura (Facebook, Instagram, Viber)',
  'Inbox i unifikuar për të gjitha bisedat',
  'Rregulla automatizimi sipas fjalëve kyçe',
  'Përgjigje me fjalë kyçe',
  'Përgjigje të mençura me AI (Groq)',
  'Ndalur / aktivizuar boti për çdo kanal',
  'Përgjigje manuale kur dëshironi',
];

const STEPS = [
  { num: 1, title: 'Regjistrohu', desc: 'Krijo llogari në platformë.' },
  { num: 2, title: 'Lidh faqen ose kanalin', desc: 'Lidh faqen Facebook, Instagram ose Viber.' },
  { num: 3, title: 'Aktivizo rregullat', desc: 'Vendos automatizimin dhe përgjigjet me AI.' },
];

export function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="landing-logo">{PRODUCT_NAME}</span>
          <nav className="landing-nav">
            <Link to="/login" className="landing-btn landing-btn-primary">
              Hyr / Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-hero-title">{PRODUCT_NAME}</h1>
          <p className="landing-hero-tagline">{TAGLINE}</p>
          <Link to="/login" className="landing-cta">
            Fillo tani – Hyr
          </Link>
        </section>

        <section className="landing-section">
          <h2 className="landing-section-title">Për kë është</h2>
          <ul className="landing-list">
            {WHO_IT_IS_FOR.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="landing-section">
          <h2 className="landing-section-title">Funksionalitetet kryesore</h2>
          <ul className="landing-list landing-list-features">
            {FEATURES.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="landing-section">
          <h2 className="landing-section-title">Si fillon</h2>
          <ol className="landing-steps">
            {STEPS.map((step) => (
              <li key={step.num} className="landing-step">
                <span className="landing-step-num">{step.num}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p className="landing-step-desc">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link to="/login" className="landing-cta landing-cta-secondary">
            Get started
          </Link>
        </section>

        <section className="landing-section landing-contact">
          <h2 className="landing-section-title">Kontakt</h2>
          <p className="landing-contact-text">
            Për pyetje dhe mbështetje na shkruani:{' '}
            <a href="mailto:support@sm-automation.com">support@sm-automation.com</a>
          </p>
          <form className="landing-contact-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              Emri
              <input type="text" name="name" placeholder="Emri juaj" />
            </label>
            <label>
              Email
              <input type="email" name="email" placeholder="email@shembull.com" required />
            </label>
            <label>
              Mesazhi
              <textarea name="message" rows={4} placeholder="Pyetja ose mesazhi juaj..." />
            </label>
            <button type="submit" className="landing-btn landing-btn-primary">
              Dërgo
            </button>
          </form>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">{PRODUCT_NAME}</span>
          <div className="landing-footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <span className="landing-footer-sep">·</span>
            <Link to="/terms">Terms of Service</Link>
          </div>
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} {PRODUCT_NAME}. Të gjitha të drejtat e rezervuara.
          </p>
        </div>
      </footer>
    </div>
  );
}

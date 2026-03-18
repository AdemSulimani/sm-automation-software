import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CompanyOnboarding() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState<'ecommerce' | 'service' | ''>('');
  const [targetAudience, setTargetAudience] = useState('');
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Frontend-only placeholder – integrate with backend later.
    navigate('/app', { replace: true });
  }

  function handleSkip() {
    navigate('/app', { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-card company-onboarding-card">
        <h1>Na tregoni për biznesin tuaj</h1>
        <p className="auth-hint company-onboarding-hint">
          Këto të dhëna ndihmojnë sistemin dhe inteligjencën artificiale të kuptojnë më mirë biznesin tuaj
          dhe të japin rekomandime më të sakta.
        </p>
        <form className="company-onboarding-form" onSubmit={handleSubmit}>
          <label>
            Emri i kompanisë
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </label>

          <label>
            Çfarë bën kompania juaj?{' '}
            <span className="required" aria-hidden="true">
              *
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="P.sh. Shesim produkte kozmetike online në Shqipëri…"
            />
          </label>

          <label>
            Industria kryesore
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as 'ecommerce' | 'service' | '')}
              required
            >
              <option value="">Zgjidhni industrinë</option>
              <option value="ecommerce">Ecommerce</option>
              <option value="service">Shërbime</option>
            </select>
          </label>

          <label>
            Klientët tuaj idealë (target audience)
            <textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              rows={3}
              placeholder="P.sh. gra 25–45 vjeç që kujdesen për lëkurën, biznese të vogla që…"
            />
          </label>

          <label>
            Lokacioni ku operoni
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Shteti / Qyteti (p.sh. Shqipëri, Tiranë)"
            />
          </label>

          <label>
            Gjuha kryesore me klientët
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="P.sh. Shqip, Anglisht…"
            />
          </label>

          <div className="company-onboarding-actions">
            <button type="button" className="btn-secondary" onClick={handleSkip}>
              Më vonë
            </button>
            <button type="submit" className="btn-primary">
              Vazhdo në panel
            </button>
          </div>
        </form>
        <p className="company-onboarding-footnote">
          Ky hap shfaqet menjëherë pas regjistrimit për të personalizuar më mirë eksperiencën tuaj. Ruajtja e
          të dhënave integrohet me backend më vonë.
        </p>
      </div>
    </div>
  );
}


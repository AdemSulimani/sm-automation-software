import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COMPANY_SETUP_COMPLETED_KEY = 'companySetupCompleted';

export function CompanySetup() {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState<'ecommerce' | 'service' | ''>('');
  const [targetAudience, setTargetAudience] = useState('');
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const completed = window.localStorage.getItem(COMPANY_SETUP_COMPLETED_KEY) === 'true';
    if (completed) {
      navigate('/app', { replace: true });
    }
  }, [navigate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    // Frontend-only placeholder for now – no backend calls.
    window.localStorage.setItem(COMPANY_SETUP_COMPLETED_KEY, 'true');

    navigate('/app', { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-card company-setup-card">
        <h1>Informacion rreth kompanisë</h1>
        <p className="auth-hint">
          Këto të dhëna ndihmojnë sistemin dhe inteligjencën artificiale të përshtatin më mirë komunikimin për biznesin tuaj.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Emri i kompanisë
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="p.sh. Kompania ime"
            />
          </label>

          <label>
            Çfarë bën kompania? (përshkrim i shkurtër)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="p.sh. Ne shesim produkte kozmetike online…"
              className="company-setup-textarea"
            />
          </label>

          <label>
            Industria
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as 'ecommerce' | 'service' | '')}
              required
            >
              <option value="">Zgjidhni industrinë</option>
              <option value="ecommerce">Ecommerce</option>
              <option value="service">Shërbim</option>
            </select>
          </label>

          <label>
            Audienca e synuar (kush janë klientët tuaj?)
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              required
              placeholder="p.sh. gra 18–35 vjeç në Kosovë…"
            />
          </label>

          <label>
            Lokacioni (shteti/qyteti ku operoni)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="p.sh. Prishtinë, Kosovë"
            />
          </label>

          <label>
            Gjuha e komunikimit me klientët
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              placeholder="p.sh. shqip, anglisht"
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Duke ruajtur…' : 'Vazhdo në aplikacion'}
          </button>
        </form>
      </div>
    </div>
  );
}


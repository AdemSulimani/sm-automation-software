/**
 * Faqe Biznesi – emër dhe logo e biznesit. Përdoruesit e të njëjtit biznes shohin të njëjtat kanale dhe kontakte.
 */

import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

interface BusinessData {
  _id: string;
  name: string;
  logo: string | null;
  workHoursStart?: string | null;
  workHoursEnd?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function Business() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [workHoursStart, setWorkHoursStart] = useState('');
  const [workHoursEnd, setWorkHoursEnd] = useState('');

  useEffect(() => {
    setError('');
    apiRequest<BusinessData>('/api/business/me')
      .then((data) => {
        setName(data.name ?? '');
        setLogo(data.logo ?? '');
        setWorkHoursStart(data.workHoursStart ?? '');
        setWorkHoursEnd(data.workHoursEnd ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    apiRequest<BusinessData>('/api/business/me', {
      method: 'PATCH',
      body: JSON.stringify({
        name: name.trim() || 'Biznesi im',
        logo: logo.trim() || null,
        workHoursStart: workHoursStart.trim() || null,
        workHoursEnd: workHoursEnd.trim() || null,
      }),
    })
      .then((data) => {
        setName(data.name ?? '');
        setLogo(data.logo ?? '');
        setWorkHoursStart(data.workHoursStart ?? '');
        setWorkHoursEnd(data.workHoursEnd ?? '');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.'))
      .finally(() => setSubmitting(false));
  }

  if (loading) return <div className="page-loading">Duke ngarkuar…</div>;

  return (
    <div className="page-business">
      <h1>Biznesi im</h1>
      <p className="page-business-hint">
        Emri dhe logoja e biznesit tuaj. Në të ardhmen, disa përdorues mund të kenë të njëjtin biznes dhe të shohin të njëjtat kanale dhe kontakte.
      </p>
      <form onSubmit={handleSubmit} className="business-form">
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="form-success">U ruajt me sukses.</div>}
        <label>
          Emri i biznesit
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p.sh. Kompania ime"
          />
        </label>
        <label>
          URL e logos (opsional)
          <input
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://..."
          />
        </label>
        {logo && (
          <div className="business-logo-preview">
            <img src={logo} alt="Logo" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <fieldset className="business-work-hours">
          <legend>Orar pune (për raportim)</legend>
          <p className="business-work-hours-hint">Opsional. Format 24h, p.sh. 09:00 – 17:00.</p>
          <div className="business-work-hours-row">
            <label>
              Nga
              <input
                type="time"
                value={workHoursStart}
                onChange={(e) => setWorkHoursStart(e.target.value)}
              />
            </label>
            <label>
              Deri
              <input
                type="time"
                value={workHoursEnd}
                onChange={(e) => setWorkHoursEnd(e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        <div className="modal-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Duke ruajtur…' : 'Ruaj'}
          </button>
        </div>
      </form>
    </div>
  );
}

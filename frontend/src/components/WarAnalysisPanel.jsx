import React, { useMemo, useState } from 'react';

const SUGGESTED_COUNTRIES = [
  'United States of America',
  'China',
  'Russia',
  'Ukraine',
  'Israel',
  'Iran',
  'India',
  'Pakistan',
  'North Korea',
  'South Korea',
  'Taiwan',
  'Japan',
  'France',
  'United Kingdom',
  'Germany'
];

function scoreTone(score, max = 100) {
  const ratio = score / max;
  if (ratio >= 0.75) {
    return 'strong';
  }
  if (ratio >= 0.5) {
    return 'mid';
  }
  return 'soft';
}

export default function WarAnalysisPanel({ trackedCountries, onClose, backendUrl }) {
  const suggestions = useMemo(() => {
    const tracked = trackedCountries.map((country) => country.country);
    return [...new Set([...tracked, ...SUGGESTED_COUNTRIES])];
  }, [trackedCountries]);

  const [countryA, setCountryA] = useState(trackedCountries[0]?.country ?? 'United States of America');
  const [countryB, setCountryB] = useState(trackedCountries[1]?.country ?? 'China');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const runAnalysis = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${backendUrl}/api/war-analysis?countryA=${encodeURIComponent(countryA)}&countryB=${encodeURIComponent(countryB)}`
      );
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json() : null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Scenario analysis failed.');
      }

      if (!isJson) {
        throw new Error('War analysis endpoint is unavailable. Restart the backend server and try again.');
      }

      setAnalysis(payload);
    } catch (requestError) {
      setError(requestError.message);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="glass-panel war-panel">
        <div className="war-panel-header">
          <div>
            <div className="header-chip">Scenario lab</div>
            <h2 className="war-title">War outlook</h2>
            <p className="war-copy">
              Compare any two countries and generate a separate strategic outlook based on force balance, alliance depth,
              logistics, escalation pressure, and current geopolitical signals.
            </p>
          </div>
          <button className="close-button" onClick={onClose}>
            x
          </button>
        </div>

        <div className="war-form">
          <label className="field-block">
            <span>Country A</span>
            <input list="country-options" value={countryA} onChange={(event) => setCountryA(event.target.value)} />
          </label>
          <label className="field-block">
            <span>Country B</span>
            <input list="country-options" value={countryB} onChange={(event) => setCountryB(event.target.value)} />
          </label>
          <button className="primary-button" onClick={runAnalysis} disabled={isLoading || !countryA || !countryB || countryA === countryB}>
            {isLoading ? 'Analyzing...' : 'Run war outlook'}
          </button>
        </div>

        <datalist id="country-options">
          {suggestions.map((country) => (
            <option key={country} value={country} />
          ))}
        </datalist>

        {error && (
          <div className="error-banner">
            {error}
            <div className="error-hint">If you just added this feature, stop and restart the backend terminal so the new `/api/war-analysis` route loads.</div>
          </div>
        )}

        {analysis && (
          <div className="war-results">
            <div className="war-summary-card">
              <div className="summary-grid">
                <div>
                  <div className="metric-label">War likelihood</div>
                  <div className="war-hero-value">{analysis.warLikelihood}%</div>
                  <div className="summary-note">{analysis.likelihoodBand} escalation risk</div>
                </div>
                <div>
                  <div className="metric-label">Modeled edge</div>
                  <div className="war-hero-value smaller">{analysis.projectedWinner}</div>
                  <div className="summary-note">{analysis.winnerConfidence}</div>
                </div>
              </div>
              <p className="war-summary-text">{analysis.summary}</p>
            </div>

            <div className="war-score-grid">
              {analysis.scorecard.map((entry) => (
                <div key={entry.country} className="war-score-card">
                  <div className="war-country-name">{entry.country}</div>
                  <div className={`score-pill ${scoreTone(entry.score)}`}>Score {entry.score}</div>
                  <div className="attribute-list">
                    <div>Defense {entry.strengths.defense}</div>
                    <div>Air {entry.strengths.air}</div>
                    <div>Naval {entry.strengths.naval}</div>
                    <div>Cyber {entry.strengths.cyber}</div>
                    <div>Allies {entry.strengths.allies}</div>
                    <div>Logistics {entry.strengths.logistics}</div>
                    <div>Pressure {entry.pressure}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="war-detail-grid">
              <div className="detail-card">
                <h3 className="dock-heading">Key drivers</h3>
                <div className="detail-list">
                  {analysis.rationale.map((item) => (
                    <div key={item} className="detail-item">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="detail-card">
                <h3 className="dock-heading">Analytical caveat</h3>
                <p className="detail-copy">{analysis.disclaimer}</p>
                <div className="detail-footnote">Updated {new Date(analysis.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

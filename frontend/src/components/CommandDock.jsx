import React from 'react';

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'Pending sync';
  }

  const seconds = Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function CommandDock({
  isSocketConnected,
  trackedCountries,
  selectedCountry,
  recentEvents,
  onOpenWarAnalysis,
  onSelectCountry,
  onRemoveCountry,
  onClearAll
}) {
  return (
    <aside className="glass-panel command-dock">
      <div className="dock-section">
        <div className="dock-kicker">Live mission status</div>
        <h2 className="dock-title">Country monitoring made readable</h2>
        <p className="dock-copy">
          Click any country on the map to start tracking it. The app keeps refreshing monitored countries and highlights
          them directly on the globe.
        </p>

        <div className="dock-metrics">
          <div className="metric-card">
            <div className="metric-label">Uplink</div>
            <div className={`metric-value ${isSocketConnected ? 'ok' : 'warn'}`}>
              {isSocketConnected ? 'Online' : 'Reconnecting'}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Tracked</div>
            <div className="metric-value">{trackedCountries.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Hotspots</div>
            <div className="metric-value">
              {trackedCountries.filter((country) => country.defcon !== null && country.defcon <= 3).length}
            </div>
          </div>
        </div>

        <button className="primary-button dock-primary" onClick={onOpenWarAnalysis}>
          Open war outlook
        </button>
      </div>

      <div className="dock-section">
        <div className="section-row">
          <h3 className="dock-heading">Tracked countries</h3>
          {trackedCountries.length > 0 && (
            <button className="dock-action" onClick={onClearAll}>
              Clear all
            </button>
          )}
        </div>

        {trackedCountries.length > 0 ? (
          <div className="country-chip-list">
            {trackedCountries.map((country) => (
              <div
                key={country.country}
                className={`country-chip${selectedCountry === country.country ? ' active' : ''}`}
              >
                <button className="country-chip-main" onClick={() => onSelectCountry(country.country)}>
                  <span className="country-chip-name">{country.country}</span>
                  <span className="country-chip-meta">
                    DEFCON {country.defcon ?? '-'} • {formatRelativeTime(country.updatedAt)}
                  </span>
                </button>
                <button className="country-chip-remove" onClick={() => onRemoveCountry(country.country)} aria-label={`Stop tracking ${country.country}`}>
                  x
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="dock-empty">
            No countries tracked yet. Start by clicking a country on the map to build a live watchlist.
          </div>
        )}
      </div>

      <div className="dock-section">
        <h3 className="dock-heading">Recent global activity</h3>
        <div className="event-feed">
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <div key={event.id} className="event-row">
                <div className="event-route">
                  {event.source} <span className="event-arrow">to</span> {event.target}
                </div>
                <div className="event-time">{formatRelativeTime(event.timestamp)}</div>
              </div>
            ))
          ) : (
            <div className="dock-empty">Live events will appear here as they stream in.</div>
          )}
        </div>
      </div>
    </aside>
  );
}

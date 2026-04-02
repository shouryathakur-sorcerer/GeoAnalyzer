import React, { useMemo } from 'react';

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return 'Awaiting first uplink';
  }

  return new Date(timestamp).toLocaleString();
}

export default function SidebarLive({ country, intelData, liveEvents, onClose }) {
  const relatedEvents = useMemo(
    () => liveEvents.filter((event) => event.source === country || event.target === country).slice(0, 4),
    [country, liveEvents]
  );

  const isLoading = !intelData || intelData.defcon === null;

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 380,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        zIndex: 10
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{country}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>
            Last live sync: {formatTimestamp(intelData?.updatedAt)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-main)' }}
        >
          x
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)' }}>Decrypting satellite comms...</div>
      ) : (
        <>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--warn-red)' }}>DEFCON THREAT LEVEL</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warn-red)' }}>{intelData.defcon}</div>
          </div>

          <div
            style={{
              background: '#f8fafc',
              padding: 15,
              borderRadius: 8,
              border: '1px solid var(--land-stroke)',
              marginBottom: 16
            }}
          >
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0 }}>AI TACTICAL SUMMARY</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{intelData.summary}</p>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: 15, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0 }}>LIVE EVENT WATCH</h3>
            {relatedEvents.length > 0 ? (
              relatedEvents.map((event) => (
                <div key={event.id} style={{ fontSize: '0.85rem', lineHeight: 1.45, marginTop: 8 }}>
                  {event.source} -&gt; {event.target}
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No active kinetic events tied to {country} in the current stream.
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>RAW INTERCEPTS</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {intelData.articles.length > 0 ? (
              intelData.articles.map((art, idx) => (
                <div key={idx} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--land-stroke)' }}>
                  <a
                    href={art.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}
                  >
                    {art.title}
                  </a>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    {formatTimestamp(art.pubDate)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No live articles were returned for this country yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';

export default function Sidebar({ country, intelData, onClose }) {
  return (
    <div className="glass-panel" style={{
      position: 'absolute', top: 20, right: 20, width: 380, bottom: 20,
      display: 'flex', flexDirection: 'column', padding: 20, zIndex: 10
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{country}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
      </div>

      {!intelData ? (
        <div style={{ color: 'var(--text-muted)' }}>Decrypting satellite comms...</div>
      ) : (
        <>
          <div style={{ background: 'var(--warn-light)', padding: 15, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--warn-red)' }}>DEFCON THREAT LEVEL</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warn-red)' }}>{intelData.defcon}</div>
          </div>
          
          <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid var(--land-stroke)', marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0 }}>AI TACTICAL SUMMARY</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{intelData.summary}</p>
          </div>

          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RAW INTERCEPTS</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {intelData.articles.map((art, idx) => (
              <div key={idx} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--land-stroke)' }}>
                <a href={art.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>
                  {art.title}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
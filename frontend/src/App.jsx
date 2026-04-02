/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import CommandDock from './components/CommandDock.jsx';
import MapCore from './components/MapCore';
import SidebarLive from './components/SidebarLive';

const BACKEND_URL = 'http://localhost:4000';

export default function App() {
  const socketRef = useRef(null);
  const trackedCountryNamesRef = useRef(new Set());
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [trackedCountryNames, setTrackedCountryNames] = useState([]);
  const [countryIntel, setCountryIntel] = useState({});
  const [liveEvents, setLiveEvents] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    const handleConnect = () => {
      setIsSocketConnected(true);
      trackedCountryNamesRef.current.forEach((countryName) => {
        socket.emit('subscribe_country', countryName);
      });
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleGlobalEvent = (event) => {
      setLiveEvents((prev) => [event, ...prev].slice(0, 10));
    };

    const handleCountryUpdate = (intel) => {
      setCountryIntel((prev) => ({
        ...prev,
        [intel.country]: intel
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('global_event', handleGlobalEvent);
    socket.on('country_update', handleCountryUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('global_event', handleGlobalEvent);
      socket.off('country_update', handleCountryUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedCountry || countryIntel[selectedCountry]?.updatedAt) {
      return;
    }

    let isActive = true;

    fetch(`${BACKEND_URL}/api/intel/${encodeURIComponent(selectedCountry)}`)
      .then((response) => response.json())
      .then((intel) => {
        if (!isActive || intel?.error) {
          return;
        }

        setCountryIntel((prev) => ({
          ...prev,
          [selectedCountry]: intel
        }));
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, [countryIntel, selectedCountry]);

  const handleCountryClick = (countryName) => {
    setSelectedCountry(countryName);

    setTrackedCountryNames((prev) => {
      if (prev.includes(countryName)) {
        return prev;
      }

      const next = [...prev, countryName];
      trackedCountryNamesRef.current = new Set(next);
      socketRef.current?.emit('subscribe_country', countryName);
      return next;
    });

    if (!countryIntel[countryName]) {
      setCountryIntel((prev) => ({
        ...prev,
        [countryName]: {
          country: countryName,
          defcon: null,
          summary: 'Decrypting satellite comms...',
          articles: [],
          updatedAt: null
        }
      }));
    }
  };

  const selectedIntel = selectedCountry ? countryIntel[selectedCountry] ?? null : null;
  const trackedCountries = useMemo(
    () =>
      trackedCountryNames
        .map((countryName) => countryIntel[countryName])
        .filter(Boolean)
        .sort((left, right) => {
          const leftDefcon = left.defcon ?? 6;
          const rightDefcon = right.defcon ?? 6;
          return leftDefcon - rightDefcon;
        }),
    [countryIntel, trackedCountryNames]
  );
  const recentEvents = useMemo(() => liveEvents.slice(0, 6), [liveEvents]);

  const removeTrackedCountry = (countryName) => {
    trackedCountryNamesRef.current.delete(countryName);
    socketRef.current?.emit('unsubscribe_country', countryName);
    setTrackedCountryNames((prev) => prev.filter((name) => name !== countryName));

    if (selectedCountry === countryName) {
      setSelectedCountry(null);
    }
  };

  const clearTrackedCountries = () => {
    trackedCountryNamesRef.current.forEach((countryName) => {
      socketRef.current?.emit('unsubscribe_country', countryName);
    });
    trackedCountryNamesRef.current = new Set();
    setTrackedCountryNames([]);
    setSelectedCountry(null);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <MapCore
        onCountryClick={handleCountryClick}
        liveEvents={liveEvents}
        trackedCountries={trackedCountries}
        selectedCountry={selectedCountry}
      />
      
      <header className="glass-panel command-header">
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Global Intelligence Command</h1>
        <div className="live-indicator">
          ● LIVE ORBITAL LINK ACTIVE
          <span className={`live-dot${isSocketConnected ? ' online' : ''}`} />
          <span className="live-copy">
            {isSocketConnected ? 'LIVE COUNTRY TRACKING ACTIVE' : 'RECONNECTING UPLINK'}
          </span>
        </div>
        <div className="tracking-meta">
          Monitoring {trackedCountries.length} countr{trackedCountries.length === 1 ? 'y' : 'ies'}
        </div>
      </header>

      {selectedCountry && (
        <SidebarLive
          country={selectedCountry}
          intelData={selectedIntel}
          liveEvents={liveEvents}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}

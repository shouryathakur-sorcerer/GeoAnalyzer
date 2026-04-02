const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { fetchNewsForCountry } = require('./services/newsFetcher');
const { analyzeWarScenario } = require('./services/warAnalyzer');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const COUNTRY_REFRESH_MS = 60 * 1000;
const countryStreams = new Map();

function getRoomName(country) {
  return `country:${country}`;
}

async function fetchCountryIntel(country) {
  const intelData = await fetchNewsForCountry(country);
  return {
    ...intelData,
    updatedAt: new Date().toISOString()
  };
}

async function refreshCountryStream(country) {
  const stream = countryStreams.get(country);
  if (!stream) {
    return null;
  }

  if (stream.pendingPromise) {
    return stream.pendingPromise;
  }

  stream.pendingPromise = fetchCountryIntel(country)
    .then((intelData) => {
      stream.lastIntel = intelData;
      io.to(getRoomName(country)).emit('country_update', intelData);
      return intelData;
    })
    .catch((error) => {
      console.error(`Failed live refresh for ${country}:`, error.message);
      throw error;
    })
    .finally(() => {
      const activeStream = countryStreams.get(country);
      if (activeStream) {
        activeStream.pendingPromise = null;
      }
    });

  return stream.pendingPromise;
}

function ensureCountryStream(country) {
  let stream = countryStreams.get(country);
  if (stream) {
    return stream;
  }

  stream = {
    subscribers: 0,
    lastIntel: null,
    intervalId: null,
    pendingPromise: null
  };

  stream.intervalId = setInterval(() => {
    if (stream.subscribers > 0) {
      refreshCountryStream(country).catch(() => {});
    }
  }, COUNTRY_REFRESH_MS);

  countryStreams.set(country, stream);
  refreshCountryStream(country).catch(() => {});
  return stream;
}

function releaseCountryStream(country) {
  const stream = countryStreams.get(country);
  if (!stream || stream.subscribers > 0) {
    return;
  }

  clearInterval(stream.intervalId);
  countryStreams.delete(country);
}

// REST API Endpoint for on-demand intelligence
app.get('/api/intel/:country', async (req, res) => {
  const country = req.params.country?.trim();
  try {
    const intelData = await fetchCountryIntel(country);
    res.json(intelData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch intelligence" });
  }
});

app.get('/api/war-analysis', async (req, res) => {
  const countryA = req.query.countryA?.trim();
  const countryB = req.query.countryB?.trim();

  try {
    const analysis = await analyzeWarScenario(countryA, countryB);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to analyze scenario' });
  }
});

// WebSocket for real-time global events (Missiles, Quakes, etc.)
io.on('connection', (socket) => {
  console.log('New OP-CENTER connection established:', socket.id);
  const subscribedCountries = new Set();

  // Simulate real-time kinetic events pushing to the frontend
  const activePairs = [
    ['Russia', 'Ukraine'], ['Israel', 'Iran'], ['China', 'Taiwan'], 
    ['North Korea', 'South Korea'], ['United States of America', 'China']
  ];

  const eventInterval = setInterval(() => {
    const pair = activePairs[Math.floor(Math.random() * activePairs.length)];
    const event = {
      id: Date.now(),
      type: 'kinetic',
      source: pair[0],
      target: pair[1],
      timestamp: new Date().toISOString()
    };
    // Push the event instantly to all connected dashboards
    socket.emit('global_event', event);
  }, 3500);

  socket.on('subscribe_country', async (countryName) => {
    const country = typeof countryName === 'string' ? countryName.trim() : '';
    if (!country || subscribedCountries.has(country)) {
      return;
    }

    const stream = ensureCountryStream(country);
    stream.subscribers += 1;
    subscribedCountries.add(country);
    socket.join(getRoomName(country));

    if (stream.lastIntel) {
      socket.emit('country_update', stream.lastIntel);
      return;
    }

    try {
      await refreshCountryStream(country);
    } catch (error) {
      socket.emit('country_update', {
        country,
        defcon: 5,
        summary: 'Live uplink degraded.',
        articles: [],
        updatedAt: new Date().toISOString()
      });
    }
  });

  socket.on('unsubscribe_country', (countryName) => {
    const country = typeof countryName === 'string' ? countryName.trim() : '';
    if (!country || !subscribedCountries.has(country)) {
      return;
    }

    const stream = countryStreams.get(country);
    if (stream) {
      stream.subscribers = Math.max(0, stream.subscribers - 1);
    }

    subscribedCountries.delete(country);
    socket.leave(getRoomName(country));
    releaseCountryStream(country);
  });

  socket.on('disconnect', () => {
    console.log('OP-CENTER disconnected:', socket.id);
    clearInterval(eventInterval);

    subscribedCountries.forEach((country) => {
      const stream = countryStreams.get(country);
      if (stream) {
        stream.subscribers = Math.max(0, stream.subscribers - 1);
      }
      releaseCountryStream(country);
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`GEOINT Backend Server running on port ${PORT}`);
});

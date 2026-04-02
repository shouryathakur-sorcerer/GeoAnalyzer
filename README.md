# GeoAnalyzer

GeoAnalyzer is a live geopolitical monitoring dashboard built with a Node.js backend and a React + Vite frontend. It lets you click countries on an interactive world map, start tracking them in real time, and review live intelligence summaries, DEFCON-style threat levels, event activity, and recent news coverage.

## Features

- Live country tracking over Socket.IO
- Interactive world map with animated overlays
- Per-country intelligence sidebar with summaries and article links
- Tracked-country watchlist for ongoing monitoring
- Real-time global event stream
- Separate war outlook feature for country-vs-country scenario analysis
- REST endpoint for on-demand country intelligence

## Tech Stack

- Frontend: React, Vite, D3, Socket.IO Client
- Backend: Node.js, Express, Socket.IO
- Data sources: Google News RSS, USGS earthquake feed

## Project Structure

```text
GeoAnalyzer/
  backend/
    server.js
    services/
  frontend/
    src/
```

## How To Run

Open two terminals.

### Backend

```powershell
cd C:\GeoAnalyzer\backend
node server.js
```

The backend runs on `http://localhost:4000`.

### Frontend

```powershell
cd C:\GeoAnalyzer\frontend
npm run dev
```

Then open the local Vite URL, usually `http://localhost:5173`.

## Build

```powershell
cd C:\GeoAnalyzer\frontend
npm run build
```

## Notes

- This project currently does not require any API keys.
- If you add secrets later, store them in `.env` files, which are already ignored by Git.

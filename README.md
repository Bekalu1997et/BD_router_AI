# Intelligent Route Finding System — Bahir Dar Model

This project implements an A* search backend in SWI-Prolog and a GPS-enabled web frontend.

## Features
- SWI-Prolog backend exposes endpoints:
  - `GET /route?start=NODE&goal=NODE` — returns `{ path: [...], cost: ... }`
  - `GET /nodes` — returns list of nodes and coordinates
  - `GET /nearest?lat=...&lng=...` — returns nearest graph node to given coordinates
- Frontend: `index.html` uses the Geolocation API, displays path and total cost, and visualizes the route with OpenStreetMap/Leaflet.
- Route modes: shortest, least traffic, scenic, emergency, and avoid crowded areas.
- Traffic simulation: normal, busy, heavy traffic, and a closed-road scenario.
- Interactive map markers can be used to set the start or destination.
- GPS tools: one-time location, live tracking, nearest graph node snapping, accuracy radius, and distance-to-node display.
- Alternative route suggestions, A* exploration trace, animated route playback, search, dark mode, and saved favorite routes.
- Graph model includes ~15 Bahir Dar locations and uses Haversine heuristic.

## Requirements
- SWI-Prolog with HTTP libraries (Ubuntu package: `swi-prolog-nox` or `swi-prolog`)
- Internet access for map tiles and Leaflet CDN assets
- A browser with geolocation support

## Running Locally
1. Start the Prolog backend (from `server/` folder):

If `swipl` reports missing `library(http/...)` modules, install the full SWI-Prolog HTTP package first:

```bash
sudo apt update
sudo apt install swi-prolog-nox
```

```bash
cd server
swipl -q -s server.pl
```

The server listens on port `8080` by default.

2. Serve the frontend (recommended) so the map assets load properly. From the project `web/` folder run:

```bash
# From project root
cd web
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html` in a browser.

3. Use the UI:
- Click `Use My Location` to snap to nearest graph node.
- Search or select start/destination, choose route mode and traffic condition, then click `Find Optimal Route`.
- Click map markers to set start/destination directly.
- Use `Locate Once` or `Start Live GPS` to snap your current GPS position to the nearest graph node.
- Click `Visualize A*` after finding a route to see explored nodes.
- Click `Save Favorite` to store the current route in your browser. Right-click a favorite to remove it.

## Notes
- The backend allows cross-origin requests (CORS) so the frontend can run from any local server.
- The frontend includes local fallback nodes and route search, so the UI can still demo routes if the Prolog backend is offline.

## Project Structure
- `server.pl` — SWI-Prolog backend (A* implementation and HTTP API)
- `index.html` — Frontend UI (HTML + JS)
- `images/` — project images used on the members page

If you want, I can:
- Add a POST JSON route and accept coordinates directly.
- Expand the city graph with more nodes and realistic travel times.
- Package Leaflet locally so the page does not depend on a CDN.

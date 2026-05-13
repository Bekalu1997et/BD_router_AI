const API_BASE = 'https://bd-router-ai.onrender.com';

const FALLBACK_NODES = [
    { name: 'bahir_dar_university', lat: 11.5933, lng: 37.3900, type: 'education' },
    { name: 'stadium', lat: 11.5900, lng: 37.3870, type: 'public' },
    { name: 'main_market', lat: 11.5880, lng: 37.3920, type: 'market' },
    { name: 'lake_tana', lat: 11.6000, lng: 37.3800, type: 'scenic' },
    { name: 'blue_nile_hotel', lat: 11.5920, lng: 37.3950, type: 'hotel' },
    { name: 'tana_hotel', lat: 11.5910, lng: 37.3880, type: 'hotel' },
    { name: 'ghion_hotel', lat: 11.5895, lng: 37.3860, type: 'hotel' },
    { name: 'airport', lat: 11.6080, lng: 37.4210, type: 'transport' },
    { name: 'felege_hiwot_hospital', lat: 11.5870, lng: 37.3840, type: 'hospital' },
    { name: 'abay_bridge', lat: 11.5850, lng: 37.3910, type: 'landmark' },
    { name: 'commercial_bank', lat: 11.5875, lng: 37.3935, type: 'finance' },
    { name: 'telecom_office', lat: 11.5865, lng: 37.3925, type: 'service' },
    { name: 'poly_technic', lat: 11.5945, lng: 37.3855, type: 'education' },
    { name: 'bus_station', lat: 11.5840, lng: 37.3890, type: 'transport' },
    { name: 'main_roundabout', lat: 11.5890, lng: 37.3900, type: 'junction' }
];

const FAVORITES_KEY = 'bahirdar_route_favorites';
const NODE_COORDS = {};
const BAHIR_DAR_CENTER = [11.5942, 37.39];

let map;
let baseLayer;
let routeLine;
let startMarker;
let endMarker;
let activeRoute = null;
let gpsWatchId = null;

const $ = (id) => document.getElementById(id);
const toSnakeCase = (str) => str.toLowerCase().replace(/\s+/g, '_');
const toTitleCase = (str) => str.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const latLng = (coords) => [coords.lat, coords.lng];

function showError(message) {
    const el = $('errorState');
    el.textContent = message;
    el.classList.add('active');
}

function clearError() {
    $('errorState').classList.remove('active');
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pathDistance(path) {
    let sum = 0;
    for (let i = 0; i < path.length - 1; i += 1) {
        const a = NODE_COORDS[path[i]];
        const b = NODE_COORDS[path[i + 1]];
        if (a && b) sum += getDistanceKm(a.lat, a.lng, b.lat, b.lng);
    }
    return sum;
}

function createDotIcon() {
    return L.divIcon({
        className: 'map-dot',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
}

function createPin(label, className = '') {
    return L.divIcon({
        className: `map-pin ${className}`.trim(),
        html: `<span>${label}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function initMap() {
    if (!window.L) return;
    map = L.map('map').setView(BAHIR_DAR_CENTER, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    baseLayer = L.layerGroup().addTo(map);
}

function addBaseMarkers() {
    if (!map || !baseLayer) return;
    baseLayer.clearLayers();
    Object.entries(NODE_COORDS).forEach(([name, coords]) => {
        const html = `
            <strong>${toTitleCase(name)}</strong>
            <div class="popup-actions">
                <button type="button" data-node="${name}" data-role="start">Set Start</button>
                <button type="button" data-node="${name}" data-role="goal">Set Destination</button>
            </div>
        `;
        L.marker(latLng(coords), { icon: createDotIcon() }).bindPopup(html).addTo(baseLayer);
    });
}

function populateNodes(nodes) {
    const startSel = $('start');
    const goalSel = $('goal');
    startSel.innerHTML = '';
    goalSel.innerHTML = '';

    Object.keys(NODE_COORDS).forEach((k) => delete NODE_COORDS[k]);
    nodes.forEach((n) => {
        NODE_COORDS[n.name] = { lat: n.lat, lng: n.lng };
        [startSel, goalSel].forEach((sel) => {
            const option = document.createElement('option');
            option.value = toTitleCase(n.name);
            option.textContent = toTitleCase(n.name);
            sel.appendChild(option);
        });
    });
    if (goalSel.options.length > 1) goalSel.selectedIndex = 1;
    addBaseMarkers();
    renderFavorites();
}

async function fetchNodes() {
    try {
        const response = await fetch(`${API_BASE}/nodes`);
        if (!response.ok) throw new Error('nodes endpoint unavailable');
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        populateNodes(data.nodes);
    } catch (_err) {
        populateNodes(FALLBACK_NODES);
    }
}

function renderPath(route) {
    const container = $('pathContainer');
    container.innerHTML = '';
    route.path.forEach((node, index) => {
        const item = document.createElement('div');
        item.className = 'step-item';
        item.innerHTML = `
            <div class="step-icon">${index + 1}</div>
            <div class="step-info">
                <p class="step-name">${toTitleCase(node)}</p>
                <p class="step-distance">${index === route.path.length - 1 ? 'Destination reached' : 'Continue to next node'}</p>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderSummary(route) {
    const dist = pathDistance(route.path);
    $('summaryStops').textContent = String(route.path.length);
    $('summaryDistance').textContent = `${dist.toFixed(2)} km`;
    $('summaryTime').textContent = `${Math.max(3, Math.round(dist * 4.5))} min`;
    $('summaryMode').textContent = 'A* (Prolog)';
    $('costValue').textContent = String(route.cost);
}

function drawRoute(route) {
    if (!map || !route.path.length) return;
    if (routeLine) routeLine.remove();
    if (startMarker) startMarker.remove();
    if (endMarker) endMarker.remove();

    const points = route.path.map((n) => latLng(NODE_COORDS[n]));
    routeLine = L.polyline(points, { color: '#0284c7', weight: 6, opacity: 0.95 }).addTo(map);
    startMarker = L.marker(points[0], { icon: createPin('S', 'start') }).addTo(map);
    endMarker = L.marker(points[points.length - 1], { icon: createPin('E', 'end') }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
}

function setRouteResult(route) {
    activeRoute = route;
    renderSummary(route);
    renderPath(route);
    drawRoute(route);
    $('resultsSection').classList.add('active');
    $('astarLog').innerHTML = route.path.map((n, i) => (
        `<div class="astar-item"><strong>${i + 1}. ${toTitleCase(n)}</strong><span>Path step</span></div>`
    )).join('');
}

async function runRouteSearch() {
    const start = toSnakeCase($('start').value);
    const goal = toSnakeCase($('goal').value);
    if (!start || !goal) return showError('Please select both start and destination.');
    if (start === goal) return showError('Start and destination must be different.');

    clearError();
    $('loadingState').classList.add('active');
    $('findRouteBtn').disabled = true;

    try {
        const response = await fetch(`${API_BASE}/route?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}`);
        const data = await response.json();
        if (!response.ok || data.error || !Array.isArray(data.path)) {
            throw new Error(data.error || 'Unable to compute route');
        }
        setRouteResult({ path: data.path, cost: data.cost });
    } catch (err) {
        showError(`Route search failed: ${err.message}`);
    } finally {
        $('loadingState').classList.remove('active');
        $('findRouteBtn').disabled = false;
    }
}

function renderSearchResults(query) {
    const box = $('searchResults');
    box.innerHTML = '';
    const q = query.trim().toLowerCase();
    if (!q) {
        box.classList.remove('active');
        return;
    }

    Object.keys(NODE_COORDS)
        .filter((n) => toTitleCase(n).toLowerCase().includes(q))
        .slice(0, 8)
        .forEach((n) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.innerHTML = `<strong>${toTitleCase(n)}</strong><span>location</span>`;
            item.addEventListener('click', () => {
                $('goal').value = toTitleCase(n);
                box.classList.remove('active');
                $('locationSearch').value = '';
            });
            box.appendChild(item);
        });
    box.classList.add('active');
}

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function renderFavorites() {
    const list = $('favoriteRoutes');
    const favorites = getFavorites();
    list.innerHTML = favorites.length ? '' : '<div class="empty-state">No saved routes yet.</div>';
    favorites.forEach((fav, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'favorite-item';
        button.innerHTML = `<strong>${toTitleCase(fav.start)} to ${toTitleCase(fav.goal)}</strong><span>Quick route</span>`;
        button.addEventListener('click', () => {
            $('start').value = toTitleCase(fav.start);
            $('goal').value = toTitleCase(fav.goal);
            runRouteSearch();
        });
        button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const next = getFavorites().filter((_, i) => i !== index);
            saveFavorites(next);
            renderFavorites();
        });
        list.appendChild(button);
    });
}

function updateGpsPanel({ status, coords, nearest, distance, message, isError = false }) {
    const gpsStatus = $('gpsStatus');
    const gpsCoords = $('gpsCoords');
    const gpsNearest = $('gpsNearest');
    const gpsDistance = $('gpsDistance');
    const gpsMessage = $('gpsMessage');

    if (gpsStatus) {
        gpsStatus.textContent = status || 'Idle';
        gpsStatus.classList.toggle('error', isError);
        gpsStatus.classList.toggle('active', !isError && status && status !== 'Idle');
    }
    if (gpsCoords) gpsCoords.textContent = coords || '--';
    if (gpsNearest) gpsNearest.textContent = nearest || '--';
    if (gpsDistance) gpsDistance.textContent = distance || '--';
    if (gpsMessage) gpsMessage.textContent = message || 'Waiting for GPS...';
}

async function useGpsAsStart() {
    const status = document.querySelector('.location-status');
    updateGpsPanel({
        status: 'Locating',
        message: 'Detecting your current location...'
    });
    if (!navigator.geolocation) {
        if (status) {
            status.style.display = 'block';
            status.classList.add('error');
            status.textContent = 'Geolocation is not supported in this browser.';
        }
        updateGpsPanel({
            status: 'Error',
            message: 'Geolocation is not supported in this browser.',
            isError: true
        });
        return;
    }
    if (status) {
        status.style.display = 'block';
        status.classList.remove('error');
        status.textContent = 'Detecting your current location...';
    }

    navigator.geolocation.getCurrentPosition((pos) => {
        applyNearestNodeFromPosition(pos, status, false);
    }, () => {
        if (status) {
            status.classList.add('error');
            status.textContent = 'Location permission denied or unavailable.';
        }
        updateGpsPanel({
            status: 'Error',
            message: 'Location permission denied or unavailable.',
            isError: true
        });
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
}

async function applyNearestNodeFromPosition(pos, statusEl, liveMode = false) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    try {
        const res = await fetch(`${API_BASE}/nearest?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
        const data = await res.json();
        if (!res.ok || data.error || !data.node) throw new Error('Nearest node lookup failed');
        $('start').value = toTitleCase(data.node);
        const nearestText = toTitleCase(data.node);
        const distanceText = `${Number(data.distance_km).toFixed(2)} km`;
        if (statusEl) statusEl.textContent = `Nearest node: ${nearestText} (${distanceText})`;
        updateGpsPanel({
            status: liveMode ? 'Live' : 'Ready',
            coords: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            nearest: nearestText,
            distance: distanceText,
            message: liveMode ? 'Live GPS tracking active.' : 'Start node updated from GPS.'
        });
    } catch {
        if (statusEl) {
            statusEl.classList.add('error');
            statusEl.textContent = 'Failed to map GPS to a city node.';
        }
        updateGpsPanel({
            status: 'Error',
            coords: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            message: 'Failed to map GPS to a city node.',
            isError: true
        });
    }
}

function startLiveGps() {
    const status = document.querySelector('.location-status');
    if (!navigator.geolocation) {
        updateGpsPanel({
            status: 'Error',
            message: 'Geolocation is not supported in this browser.',
            isError: true
        });
        return;
    }
    if (gpsWatchId !== null) return;

    updateGpsPanel({
        status: 'Live',
        message: 'Waiting for live GPS updates...'
    });
    $('startLiveGpsBtn').disabled = true;
    $('stopLiveGpsBtn').disabled = false;

    gpsWatchId = navigator.geolocation.watchPosition(
        (pos) => applyNearestNodeFromPosition(pos, status, true),
        () => {
            updateGpsPanel({
                status: 'Error',
                message: 'Live GPS update failed.',
                isError: true
            });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 1500 }
    );
}

function stopLiveGps() {
    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }
    $('startLiveGpsBtn').disabled = false;
    $('stopLiveGpsBtn').disabled = true;
    updateGpsPanel({
        status: 'Idle',
        message: 'Live GPS stopped.'
    });
}

function clearEverything() {
    $('start').selectedIndex = 0;
    $('goal').selectedIndex = $('goal').options.length > 1 ? 1 : 0;
    $('resultsSection').classList.remove('active');
    $('pathContainer').innerHTML = '';
    $('costValue').textContent = '0';
    $('summaryStops').textContent = '0';
    $('summaryDistance').textContent = '0 km';
    $('summaryTime').textContent = '0 min';
    $('summaryMode').textContent = 'A* (Prolog)';
    $('astarLog').innerHTML = '';
    clearError();
    activeRoute = null;
    if (routeLine) routeLine.remove();
    if (startMarker) startMarker.remove();
    if (endMarker) endMarker.remove();
    routeLine = null;
    startMarker = null;
    endMarker = null;
    stopLiveGps();
}

function setupEvents() {
    window.switchPage = (pageId, linkElement) => {
        document.querySelectorAll('.page-section').forEach((section) => section.classList.remove('active'));
        $(pageId).classList.add('active');
        document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));
        linkElement.classList.add('active');
        if (pageId === 'routeFinderPage' && map) setTimeout(() => map.invalidateSize(), 100);
    };

    $('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const dark = document.body.classList.contains('dark-mode');
        $('themeToggle').textContent = dark ? 'Light' : 'Dark';
        localStorage.setItem('bahirdar_dark_mode', dark ? '1' : '0');
    });
    if (localStorage.getItem('bahirdar_dark_mode') === '1') {
        document.body.classList.add('dark-mode');
        $('themeToggle').textContent = 'Light';
    }

    $('findRouteBtn').addEventListener('click', runRouteSearch);
    $('clearBtn').addEventListener('click', clearEverything);
    $('locationSearch').addEventListener('input', (e) => renderSearchResults(e.target.value));
    $('saveFavoriteBtn').addEventListener('click', () => {
        const fav = { start: toSnakeCase($('start').value), goal: toSnakeCase($('goal').value) };
        const next = getFavorites().filter((x) => !(x.start === fav.start && x.goal === fav.goal));
        next.unshift(fav);
        saveFavorites(next.slice(0, 6));
        renderFavorites();
    });
    $('visualizeBtn').addEventListener('click', () => {
        if (!activeRoute) return;
        $('astarLog').innerHTML = activeRoute.path.map((n, i) => (
            `<div class="astar-item"><strong>${i + 1}. ${toTitleCase(n)}</strong><span>Explored/selected in final route</span></div>`
        )).join('');
    });
    $('map').addEventListener('click', (event) => {
        const button = event.target.closest('button[data-node][data-role]');
        if (!button) return;
        const selectId = button.dataset.role === 'start' ? 'start' : 'goal';
        $(selectId).value = toTitleCase(button.dataset.node);
        if (map) map.closePopup();
    });

    const label = $('startLabel');
    label.style.display = 'flex';
    label.style.justifyContent = 'space-between';
    label.style.alignItems = 'center';
    const useLocationBtn = document.createElement('button');
    useLocationBtn.type = 'button';
    useLocationBtn.className = 'location-btn';
    useLocationBtn.textContent = 'Use Location';
    label.appendChild(useLocationBtn);

    const locationStatus = document.createElement('div');
    locationStatus.className = 'location-status';
    $('start').parentNode.insertBefore(locationStatus, $('start').nextSibling);
    useLocationBtn.addEventListener('click', useGpsAsStart);
    if ($('locateOnceBtn')) $('locateOnceBtn').addEventListener('click', useGpsAsStart);
    if ($('startLiveGpsBtn')) $('startLiveGpsBtn').addEventListener('click', startLiveGps);
    if ($('stopLiveGpsBtn')) $('stopLiveGpsBtn').addEventListener('click', stopLiveGps);

    ['playBtn', 'pauseBtn', 'resumeBtn', 'replayBtn'].forEach((id) => {
        const el = $(id);
        if (el) el.style.display = 'none';
    });
    $('routeMode').parentElement.style.display = 'none';
    $('trafficLevel').parentElement.style.display = 'none';
    $('alternativesSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    setupEvents();
    await fetchNodes();
});

// Global Variables
let isPinModeActive = false;
let pinMarker = null;
let isAutoCenterDisabled = false;
let flyModeActive = false;
let autoCenterManualoff = false;
let satrec;

// Initialize the map
const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    noWrap: true,
});

const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    noWrap: true,
});

const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    noWrap: true,
});

const nasaNightLights = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png', {
    attribution: 'Imagery &copy; NASA GIBS / Space Act Agreement',
    noWrap: true,
    maxZoom: 8,
    bounds: L.latLngBounds([[-90, -180], [90, 180]])
});

const map = L.map('map', {
    center: [0, 0],
    zoom: 2,
    minZoom: 3,
    maxBounds: L.latLngBounds([[-90, -180], [90, 180]]),
    maxBoundsViscosity: 1.0,
    layers: [streetMap],
    attributionControl: false,
    zoomControl: false
});

L.control.zoom({ position: 'bottomleft' }).addTo(map);

const baseMaps = {
    "Standard Map": streetMap,
    "Satellite View": satelliteMap,
    "Dark Space Mode": darkMap,
    "Nasa Night Lights": nasaNightLights
};

// Add the terminator layer
const terminator = L.terminator({longitudeRange: 360 }).addTo(map);

// ISS icon
const issIcon = L.icon({
    iconUrl: 'my-icon.png',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
});

// Crosshair icon
const crosshairIcon = L.divIcon({
    className: 'target-crosshair',
    html: `<svg viewBox="0 0 100 100" width="30" height="30">
            <line x1="50" y1="0" x2="50" y2="40" stroke="#dcdcdc" stroke-width="8"/>
            <line x1="50" y1="60" x2="50" y2="100" stroke="#dcdcdc" stroke-width="8"/>
            <line x1="0" y1="50" x2="40" y2="50" stroke="#dcdcdc" stroke-width="8"/>
            <line x1="60" y1="50" x2="100" y2="50" stroke="#dcdcdc" stroke-width="8"/>
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 17]
});

const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);

let footprintCircle = L.circle([0, 0], {
    radius: 0,
    color: '#4a83ec',
    weight: 2,
    fillColor: '#4a83ec',
    fillOpacity: 0.1,
    interactive: false
}).addTo(map);

const latSpan = document.getElementById('lat');
const lonSpan = document.getElementById('lon');
const velSpan = document.getElementById('vel');
const velPerSecSpan = document.getElementById('velpersec');
const altSpan = document.getElementById('altitude');
const countrySpan = document.getElementById('country');
const nearestPlaceSpan = document.getElementById('nearest-place');
const visibilitySpan = document.getElementById('visibility');
const spotStationSection = document.getElementById('spot-station-section');
const currentorbitspan = document.getElementById('current-orbit');
const orbitPeriodSpan = document.getElementById('orbit-period');
const orbitsTodaySpan = document.getElementById('orbits-today');
const flyModeToggleBtn = document.getElementById('fly-mode-toggle');
const overlaysPopover = document.getElementById('overlays-popover');

flyModeToggleBtn.addEventListener('click', () => {
  flyModeActive = !flyModeActive;
  flyModeToggleBtn.classList.toggle('active', flyModeActive);
});

// Layers for the orbital path
let pastPathLayer = L.layerGroup().addTo(map);
let futurePathLayer = L.layerGroup().addTo(map);

const legend = L.control({position: 'bottomright'})


legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    const labels = [
        "<strong>Legend</strong>",
        "<i style='background: green'></i> Future Path",
        "<i style='background: red'></i> Past Path",
        "<i style='background: rgba(39, 39, 39, 1)'></i> Night Region"
    ];

    div.innerHTML = labels.join('<br>');
    return div;

};

// API URLs
const API_BASE_URL = 'https://mokshi85-iss-tracker-api.hf.space';
const issApiUrl = `${API_BASE_URL}/api/telemetry`;
const tleApiUrl = 'https://api.wheretheiss.at/v1/satellites/25544/tles?format=text';

async function getISS() {
    let highLevelLocation = "—";
    let specificLocation = "—";
    let timezone = "N/A";
    let localTime = "N/A";
    let latitude, longitude, velocity, visibility, footprint, altitude;
    let ra = 0, dec = 0, constellation = "Loading...", orbitPeriod = 92.68;

    try {
        const issResponse = await fetch(issApiUrl);
        if (!issResponse.ok) {
            throw new Error(`Telemetry API error: ${issResponse.status}`);
        }
        const issData = await issResponse.json();
        
        if (!issData || typeof issData.latitude !== 'number' || isNaN(issData.latitude)) {
             console.warn("Primary ISS data fetch failed or returned invalid coordinates.");
             return;
        }
        
        ({ latitude, longitude, velocity, visibility, footprint, altitude, ra, dec, constellation, orbit_period: orbitPeriod  } = issData);

        marker.setLatLng([latitude, longitude]);
        footprintCircle.setLatLng([latitude, longitude]);
        footprintCircle.setRadius(footprint * 500);

       if (flyModeActive) {
            map.panTo([latitude, longitude], { animate: true, duration: 2.0, easeLinearity: 1 });
        }
        
        if (!isAutoCenterDisabled && !flyModeActive) {
            if (!map.getBounds().contains(marker.getLatLng())) {
                map.setView([latitude, longitude]);
            }
        }
        
        latSpan.textContent = latitude.toFixed(2) + '°' + (latitude >= 0 ? 'N' : 'S');
        lonSpan.textContent = longitude.toFixed(2) + '°' + (longitude >= 0 ? 'E' : 'W');
        velSpan.textContent = velocity.toFixed(2);
        velPerSecSpan.textContent = (velocity / 3600).toFixed(4);
        altSpan.textContent = altitude.toFixed(2);
        visibilitySpan.textContent = visibility;

        // BOX 3: CELESTIAL UPDATES
        if (document.getElementById('ra')) {
            document.getElementById('ra').textContent = formatRA(ra);
            document.getElementById('dec').textContent = formatDec(dec);
            document.getElementById('constellation').textContent = constellation;
        }

        // BOX 4: ORBITS UPDATES
        const launchDate = new Date('1998-11-20T06:40:00Z');
        const now = new Date();
        const diffMs = now - launchDate;
        const periodMs = orbitPeriod * 60 * 1000; 
        
        const currentOrbitNumber = Math.floor(diffMs / periodMs);
        
        const msSinceMidnight = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 1000;
        const orbitsSoFarToday = Math.floor(msSinceMidnight / periodMs);
        const totalOrbitsPerDay = Math.floor((24 * 60 * 60 * 1000) / periodMs);
        const remainingOrbits = totalOrbitsPerDay - orbitsSoFarToday;

        currentorbitspan.textContent = currentOrbitNumber.toLocaleString();
        orbitPeriodSpan.textContent = orbitPeriod.toFixed(2);
        orbitsTodaySpan.textContent = `${orbitsSoFarToday} : ${remainingOrbits}`;

        try {
            const geoResponse = await fetch(`${API_BASE_URL}/api/location?lat=${latitude}&lon=${longitude}`);
            
            if (!geoResponse.ok) {
                throw new Error(`Custom Geocoding failed: ${geoResponse.status}`);
            }
            
            const geoData = await geoResponse.json();

            highLevelLocation = geoData.country;
            specificLocation = geoData.nearest;
            timezone = geoData.timezone || "N/A";
            localTime = geoData.local_time || "N/A";
            
        } catch (geoError) {
            console.error('Custom Reverse Geocoding failed:', geoError);
            highLevelLocation = "Geocoding Failed";
            specificLocation = "Service Error";
            timezone = "N/A";
            localTime = "N/A"
        
        }
        
        countrySpan.textContent  = highLevelLocation;
        nearestPlaceSpan.textContent = specificLocation;
        document.getElementById('timezone').textContent = timezone;
        document.getElementById('local-time').textContent = localTime;


    } catch (error) {
        console.error('Error fetching ISS data:', error);
        latSpan.textContent = "Error";
        lonSpan.textContent = "Error";
        countrySpan.textContent  = "Primary Data Error";
        nearestPlaceSpan.textContent = "Primary Data Error";
        document.getElementById('timezone').textContent = "Error";
        document.getElementById('local-time').textContent = "Error";
        
    
    } finally {
        setTimeout(getISS, 1000);
    }
}

// Function to fetch TLE and update orbit path
async function updateOrbitPath() {
    try {
        const response = await fetch(tleApiUrl);
        const tleData = await response.text();
        const tleLines = tleData.trim().split('\n');

        if (!tleLines[1] || !tleLines[2]) {
            console.error('TLE data invalid or incomplete.');
            return; 
        }
        
        const tleLine1 = tleLines[1];
        const tleLine2 = tleLines[2];

        satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    } catch (error) {
        console.error('Error fetching TLE data:', error);
        return;
    }
    
    const now = new Date();
    let pastPoints = [];
    let futurePoints = [];

    // Calculate future path
    for (let i = 0; i <= 90; i++) {
        const time = new Date(now.getTime() + i * 60000);
        const positionAndVelocity = satellite.propagate(satrec, time);
        if (!positionAndVelocity || !positionAndVelocity.position) continue;
        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        futurePoints.push([satellite.radiansToDegrees(positionGd.latitude), satellite.radiansToDegrees(positionGd.longitude)]);
    }

    // Calculate past path
    for (let i = 0; i <= 90; i++) {
        const time = new Date(now.getTime() - i * 60000);
        const positionAndVelocity = satellite.propagate(satrec, time);
        if (!positionAndVelocity || !positionAndVelocity.position) continue;
        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        pastPoints.push([satellite.radiansToDegrees(positionGd.latitude), satellite.radiansToDegrees(positionGd.longitude)]);
    }
    
    pastPathLayer.clearLayers();
    futurePathLayer.clearLayers();
    
    const pastPath = L.polyline(pastPoints, { color: 'red', weight: 2, opacity: 0.7 });
    const futurePath = L.polyline(futurePoints, { color: 'green', weight: 2, opacity: 0.7 });
    
    splitPolylineOnDateLine(pastPath, pastPathLayer);
    splitPolylineOnDateLine(futurePath, futurePathLayer);
}

function splitPolylineOnDateLine(polyline, layerGroup) {
    let latlngs = polyline.getLatLngs();
    let lastLng = null;
    let currentLine = [];

    latlngs.forEach(latlng => {
        if (lastLng && Math.abs(latlng.lng - lastLng) > 180) {
            layerGroup.addLayer(L.polyline(currentLine, polyline.options));
            currentLine = [];
        }
        currentLine.push(latlng);
        lastLng = latlng.lng;
    });

    layerGroup.addLayer(L.polyline(currentLine, polyline.options));
}

function isPointNearOrbit(pointLat, pointLon, distanceKm) {
    if (!pastPathLayer || !futurePathLayer) return false;

    const targetPoint = turf.point([pointLon, pointLat]);
    
    let allPathPoints = [];

    futurePathLayer.eachLayer(layer => {
        if (typeof layer.getLatLngs === 'function') {
            layer.getLatLngs().forEach(latlng => {
                allPathPoints.push([latlng.lng, latlng.lat]);
            });
        }
    });

    if (allPathPoints.length < 2) {
        console.warn("Orbit path not ready for pin drop.");
        return false;
    }

    const orbitPath = turf.lineString(allPathPoints);
    const distanceToPath = turf.pointToLineDistance(targetPoint, orbitPath, { units: 'kilometers' });

    return distanceToPath <= distanceKm;
}

// Calculate time until the ISS reaches a point
function calculateTimeToNearest(targetLat, targetLon) {
    if (!satrec || !satrec.satnum) return "TLE Data Not Ready";

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 120 * 60000);
    const timeStepMs = 5000;

    let closestTime = null;
    let closestDistance = Infinity;
    let previousDistance = Infinity;
    let risingCount = 0;
    let currentTime = new Date(now.getTime());

    // Pass 1: Coarse scan with smart early exit
    while (currentTime <= twoHoursFromNow) {
        try {
            const pv = satellite.propagate(satrec, currentTime);
            if (!pv || !pv.position) {
                currentTime = new Date(currentTime.getTime() + timeStepMs);
                continue;
            }

            const gmst = satellite.gstime(currentTime);
            const gd = satellite.eciToGeodetic(pv.position, gmst);
            const issLat = satellite.radiansToDegrees(gd.latitude);
            const issLon = satellite.radiansToDegrees(gd.longitude);

            const dLat = (issLat - targetLat) * Math.PI / 180;
            const dLon = (issLon - targetLon) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 +
                      Math.cos(targetLat * Math.PI/180) *
                      Math.cos(issLat * Math.PI/180) *
                      Math.sin(dLon/2)**2;
            const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            if (distKm < closestDistance) {
                closestDistance = distKm;
                closestTime = new Date(currentTime.getTime());
                risingCount = 0;
            } else if (closestDistance < 500) {
                risingCount++;
                if (risingCount >= 10) break;
            }

            previousDistance = distKm;
        } catch(e) {  }

        currentTime = new Date(currentTime.getTime() + timeStepMs);
    }

    if (!closestTime) return "Pass > 2hrs away";

    const fineStart = new Date(closestTime.getTime() - 120000);
    const fineEnd   = new Date(closestTime.getTime() + 120000);
    currentTime = new Date(fineStart.getTime());
    closestDistance = Infinity;
    let finalTime = closestTime;

    while (currentTime <= fineEnd) {
        try {
            const pv = satellite.propagate(satrec, currentTime);
            if (!pv || !pv.position) {
                currentTime = new Date(currentTime.getTime() + 1000);
                continue;
            }

            const gmst = satellite.gstime(currentTime);
            const gd = satellite.eciToGeodetic(pv.position, gmst);
            const issLat = satellite.radiansToDegrees(gd.latitude);
            const issLon = satellite.radiansToDegrees(gd.longitude);

            const dLat = (issLat - targetLat) * Math.PI / 180;
            const dLon = (issLon - targetLon) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 +
                      Math.cos(targetLat * Math.PI/180) *
                      Math.cos(issLat * Math.PI/180) *
                      Math.sin(dLon/2)**2;
            const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            if (distKm < closestDistance) {
                closestDistance = distKm;
                finalTime = new Date(currentTime.getTime());
            }
        } catch(e) {  }

        currentTime = new Date(currentTime.getTime() + 1000);
    }

    const timeDiffMs = finalTime.getTime() - now.getTime();
    const minutes = Math.floor(timeDiffMs / 60000);

    if (minutes <= 0 && minutes >= -2) return "Currently Overhead";
    if (minutes < 0) return "Already Passed";

    return { time: finalTime, distanceKm: Math.round(closestDistance) };
}

function updateTerminator() {
    terminator.setTime();
}

// Initial calls and intervals
getISS();
updateOrbitPath();
updateTerminator();

setInterval(updateOrbitPath, 300000);
setInterval(updateTerminator, 60000);

// DOM References
const spotLocationInput = document.getElementById('spot-location');
const findPassesBtn = document.getElementById('find-passes-btn');
const useLocationBtn = document.getElementById('use-location-btn');
const passesResultsDiv = document.getElementById('passes-results');
const spotErrorDiv = document.getElementById('spot-error-message');
const pinModeToggle = document.getElementById('pin-mode-toggle');

function degreesToCardinal16(degrees) {

    if (typeof degrees !== 'number' || isNaN(degrees)) {
      return '?';
    }
    
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
  const normalizedDegrees = (degrees % 360 + 360) % 360;
  const index = Math.floor((normalizedDegrees + 11.25) / 22.5) % 16;
  return directions[index];
}

function formatUTCPassTime(date) {
    const timeString = date.toLocaleTimeString('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    return `${timeString} UTC`;
}

function formatCountdown(date) {
    const now = new Date();
    const timeDiffMs = date.getTime() - now.getTime();
    
    let seconds = Math.floor(timeDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    if (minutes >= 60) {
        return "More than an hour left";
    }
    
    return `${minutes}m ${String(seconds).padStart(2, '0')}s left`;
}

function formatLocalDate(utcIsoString, timeZoneId) {
    if (!utcIsoString) return 'N/A';
    try {
        const date = new Date(utcIsoString);
        const options = { 
            year: 'numeric', month: 'short', day: 'numeric',
            timeZone: timeZoneId || undefined 
        };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return 'Formatting Error';
    }
}

function formatLocalTime(utcIsoString, timeZoneId) {
    if (!utcIsoString) return 'N/A';
    try {
        const date = new Date(utcIsoString);
        const tz = timeZoneId || Intl.DateTimeFormat().resolvedOptions().timeZone;

        const parts = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short',
            timeZone: tz
        }).formatToParts(date);

        const time = parts
            .filter(p => ['hour','literal','minute','dayPeriod'].includes(p.type))
            .map(p => p.value).join('').trim();

        const tzLabel = parts.find(p => p.type === 'timeZoneName')?.value || '';

        return tzLabel ? `${time} ${tzLabel}` : time;

    } catch (error) {
        return 'Formatting Error';
    }
}

function formatRA(decimalHours) {
    const h = Math.floor(decimalHours);
    const mFull = (decimalHours - h) * 60;
    const m = Math.floor(mFull);
    const s = Math.round((mFull - m) * 60);
    return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

function formatDec(decimalDeg) {
    const sign = decimalDeg < 0 ? '-' : '+';
    const abs = Math.abs(decimalDeg);
    const d = Math.floor(abs);
    const mFull = (abs - d) * 60;
    const m = Math.floor(mFull);
    const s = Math.round((mFull - m) * 60);
    return `${sign}${d}° ${String(m).padStart(2,'0')}' ${String(s).padStart(2,'0')}"`;
}

function handleUseMyLocation() {
    spotErrorDiv.textContent = '';
    if (!navigator.geolocation) {
        spotErrorDiv.textContent = 'Geolocation is not supported by your browser.';
        return;
    }

    passesResultsDiv.innerHTML = '<p>Getting your location...</p>';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(4);
            const lon = position.coords.longitude.toFixed(4);
            spotLocationInput.value = `${lat},${lon}`;
            passesResultsDiv.innerHTML = '<p>Location found! Fetching passes...</p>';
            fetchAndDisplayPasses(`${lat},${lon}`);
        },
        (error) => {
            passesResultsDiv.innerHTML = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    spotErrorDiv.textContent = "User denied the request for Geolocation.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    spotErrorDiv.textContent = "Location information is unavailable.";
                    break;
                case error.TIMEOUT:
                    spotErrorDiv.textContent = "The request to get user location timed out.";
                    break;
                case error.UNKNOWN_ERROR:
                    spotErrorDiv.textContent = "An unknown error occurred while getting location.";
                    break;
            }
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function fetchAndDisplayPasses(locationQuery) {
    passesResultsDiv.innerHTML = '';
    spotErrorDiv.textContent = '';


    const coordRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
    const hasLetters = /[a-zA-Z]/.test(locationQuery);
    const hasNumbers = /\d/.test(locationQuery);
    if (hasLetters && hasNumbers && locationQuery.includes(',') && !coordRegex.test(locationQuery)) {
        spotErrorDiv.textContent = 'Please enter either a city name or coordinates — not both.';
        return;
    }

    passesResultsDiv.innerHTML = '<p style="color:rgba(255,255,255,0.5); padding: 10px;">Loading passes...</p>';

    // Build the API URL
    let apiUrl = `${API_BASE_URL}/api/passes?`;

    if (coordRegex.test(locationQuery)) {
        const parts = locationQuery.split(',');
        apiUrl += `lat=${encodeURIComponent(parts[0].trim())}&lon=${encodeURIComponent(parts[1].trim())}`;
    } else {
        apiUrl += `location=${encodeURIComponent(locationQuery)}`;
    }

    spotStationSection.classList.add('is-glowing');

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                errorMsg = response.statusText || errorMsg;
            }
            if (response.status === 404) {
                errorMsg = "Location not found by the server. Please check the spelling or try coordinates.";
            }
            if (response.status === 503) {
                errorMsg = "The location service is temporarily busy. Please try again in a few moments.";
            }
            throw new Error(errorMsg);
        }


        const data = await response.json();
        const passes = data.passes;
        const locationLabel = data.location_label;

        displayPassResults(passes, locationQuery, locationLabel);

    } catch (error) {
        console.error('Error fetching or displaying passes:', error);
        passesResultsDiv.innerHTML = '';
        spotErrorDiv.textContent = `Error: ${error.message}`;
    } finally {
        spotStationSection.classList.remove('is-glowing');
    }
}

function displayPassResults(passes, locationQuery = '', locationLabel = null) {
    passesResultsDiv.innerHTML = '';

    if (!Array.isArray(passes)) {
        console.error("Invalid data received from API:", passes);
        spotErrorDiv.textContent = 'Error: Invalid data format received from the server.';
        return;
    }

    const label = locationLabel || locationQuery;
    if (label) {
        const heading = document.createElement('h3');
        heading.className = 'passes-location-heading';
        heading.textContent = `Location: ${label.charAt(0).toUpperCase() + label.slice(1)}`;
        passesResultsDiv.appendChild(heading);
    }

    if (passes.length === 0) {
        const noPass = document.createElement('P');
        noPass.className = 'passes-empty-msg';
        noPass.textContent = 'No visible passes found for this location in the next 7 days.';
        passesResultsDiv.appendChild(noPass);
        return;
    }

    passes.forEach(pass => {
        const tz = pass.timezone_id; 

        const table = document.createElement('table');
        table.className = 'pass-table-new';

        const caption = table.createCaption();
        caption.textContent = `Sighting on: ${formatLocalDate(pass.rise_time_utc, tz)}`;

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headerRow.insertCell().textContent = "";
        headerRow.insertCell().textContent = "Time";
        headerRow.insertCell().textContent = "Direction";

        const tbody = table.createTBody();

        // Rise Row
        const riseRow = tbody.insertRow();
        riseRow.insertCell().textContent = 'Rise';
        riseRow.insertCell().textContent = formatLocalTime(pass.rise_time_utc, tz);
        riseRow.insertCell().textContent = degreesToCardinal16(pass.rise_azimuth);

        // Max Height Row
        const maxRow = tbody.insertRow();
        maxRow.insertCell().textContent = `Max Height (${pass.max_elevation?.toFixed(1)}°)`;
        maxRow.insertCell().textContent = formatLocalTime(pass.max_time_utc, tz);
        maxRow.insertCell().textContent = degreesToCardinal16(pass.max_azimuth);

        // Set Row
        const setRow = tbody.insertRow();
        setRow.insertCell().textContent = 'Set';
        setRow.insertCell().textContent = formatLocalTime(pass.set_time_utc, tz);
        setRow.insertCell().textContent = degreesToCardinal16(pass.set_azimuth);

        // duration row
        const durationRow = tbody.insertRow();
        durationRow.insertCell().textContent = 'Duration';
        const durationCell = durationRow.insertCell();
        durationCell.colSpan = 2;
        durationCell.textContent = `${pass.duration_minutes?.toFixed(1)} minutes`;
        durationCell.style.textAlign = 'center';

        passesResultsDiv.appendChild(table);
    });
}


// Event Listeners
findPassesBtn.addEventListener('click', () => {
    const locationValue = spotLocationInput.value.trim();
    if (!locationValue) {
        spotErrorDiv.textContent = 'Please enter a location.';
        return;
    }
    fetchAndDisplayPasses(locationValue);
});

useLocationBtn.addEventListener('click', handleUseMyLocation);

spotLocationInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        findPassesBtn.click();
    }
});


// Theme Toggle Logic
const themeToggle = document.getElementById('dark-mode-toggle');
const bodyElement = document.body;
const storage = (() => {
    try {
        localStorage.setItem('_test', '1');
        localStorage.removeItem('_test');
        return localStorage;
    } catch (e) {
        const mem = {};
        return {
            getItem: k => mem[k] ?? null,
            setItem: (k, v) => { mem[k] = v; }
        };
    }
})();

function setTheme(theme) {
    bodyElement.classList.remove('light-mode', 'dark-mode');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    const themeTooltip = document.getElementById('theme-tooltip');

    map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });

    if (theme === 'dark') {
        bodyElement.classList.add('dark-mode');
        iconSun.style.display = 'block';
        iconMoon.style.display = 'none';
        themeTooltip.textContent = 'Switch to light Theme';
        storage.setItem('theme', 'dark');
        darkMap.addTo(map);

        document.querySelectorAll('#layers-popover .popover-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-layer="Dark Space Mode"]').classList.add('active');
    } else {
        bodyElement.classList.add('light-mode');
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block';
        themeTooltip.textContent = 'Switch to dark Theme';
        storage.setItem('theme', 'light');
        streetMap.addTo(map);

        document.querySelectorAll('#layers-popover .popover-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-layer="Standard Map"]').classList.add('active');
    }
}

themeToggle.addEventListener('click', () => {
    if (bodyElement.classList.contains('dark-mode')) {
        setTheme('light');
    } else {
        setTheme('dark');
    }
});

const savedTheme = storage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
} else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
        setTheme('dark');
    } else {
         setTheme('light');
    }
}

// Update UTC time clock
function updateUTCClock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  document.getElementById('utc-time').textContent = `${hours}:${minutes}:${seconds}`;
}


// Update the clock every second
setInterval(updateUTCClock, 1000);

// Call it immediately to show time right away
updateUTCClock();

function togglePinMode(e) {
    
    if (e && e.stopPropagation) {
        e.stopPropagation();
    }

    isPinModeActive = !isPinModeActive;
    const pinTooltip = document.getElementById('pin-tooltip');

    if (isPinModeActive) {
        isAutoCenterDisabled = true;
        pinModeToggle.classList.add('active');
        pinTooltip.textContent = 'Click on path to know arrival time'; 
        map.getContainer().style.cursor = 'crosshair';
        
        pinTooltip.classList.add('force-show');

        if (pinMarker) {
            map.removeLayer(pinMarker);
            pinMarker = null;
        }

    } else {
        pinModeToggle.classList.remove('active');
        pinTooltip.textContent = 'Click on path to know arrival time'; 
        map.getContainer().style.cursor = '';

        pinTooltip.classList.remove('force-show');

        isAutoCenterDisabled = autoCenterManualoff;
    }
}

// Pin Mode Click Logic
function onMapClick(e) {
    if (!isPinModeActive) {
        return;
    }

    const clickedLat = e.latlng.lat;
    const clickedLon = e.latlng.lng;
    const distanceLimitKm = 20;

    if (isPointNearOrbit(clickedLat, clickedLon, distanceLimitKm)) {
        
        const passResult = calculateTimeToNearest(clickedLat, clickedLon);

        let popupContent = "";

        if (passResult && passResult.time instanceof Date) {
        
        const countdownStr = formatCountdown(passResult.time);
        const utcTimeStr = formatUTCPassTime(passResult.time);

        popupContent = `
            <b>Arrives in:</b> ${countdownStr}<br>
            <b>UTC Time:</b> ${utcTimeStr}<br>
            <b>Closest pass:</b> ~${passResult.distanceKm} km overhead
        `;
        } else if (typeof passResult === 'string') {
        popupContent = `<b>${passResult}</b>`;
        } else {
        popupContent = `<b>Could not calculate arrival time.</b>`;
        }

        if (pinMarker) {
             map.removeLayer(pinMarker);
        }
        
        togglePinMode();

        pinMarker = L.marker([clickedLat, clickedLon]).addTo(map)
            .bindPopup(popupContent)
            .openPopup();

    } else {
        console.log("Invalid pin drop: too far from orbit path.");
    }
}

pinModeToggle.addEventListener('click', togglePinMode);
map.on('click', onMapClick);

map.on('popupopen', () => {

    if (!autoCenterManualoff) isAutoCenterDisabled = true;
});

map.on('popupclose', () => {

    isAutoCenterDisabled = autoCenterManualoff;
});

let interactionTimeout;

map.on('dragstart', () => {
    isAutoCenterDisabled = true;
    clearTimeout(interactionTimeout);
});

map.on('dragend', () => {
    interactionTimeout = setTimeout(() => {
        if (!autoCenterManualoff && !isPinModeActive) {
            isAutoCenterDisabled = false;
        }
    }, 4000); 
});

const layersToggle = document.getElementById('layers-toggle');
const layersPopover = document.getElementById('layers-popover');
const layerButtons = layersPopover.querySelectorAll('.popover-btn');

layersToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    layersPopover.classList.toggle('hidden');
    overlaysPopover.classList.add('hidden');
});

document.addEventListener('click', (e) => {
    if (!layersToggle.contains(e.target) && !layersPopover.contains(e.target)) {
        layersPopover.classList.add('hidden');
    }
});

layerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        layerButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedLayerName = btn.getAttribute('data-layer');
        const selectedLayer = baseMaps[selectedLayerName];

        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });

        selectedLayer.addTo(map);
        
        layersPopover.classList.add('hidden');
    });
});

const overlaysToggle = document.getElementById('overlays-toggle');
const overlayButtons = overlaysPopover.querySelectorAll('.popover-btn');

document.addEventListener('click', (e) => {
    const pinTooltip = document.getElementById('pin-tooltip');
    const pinModeToggleBtn = document.getElementById('pin-mode-toggle');
    
    if (pinTooltip && pinModeToggleBtn && !pinModeToggleBtn.contains(e.target)) {
        pinTooltip.classList.remove('force-show');
    }
});

overlaysToggle.addEventListener('click', (e) => {
    e.stopPropagation(); 
    overlaysPopover.classList.toggle('hidden');
    layersPopover.classList.add('hidden');
});

document.addEventListener('click', (e) => {
    if (!overlaysToggle.contains(e.target) && !overlaysPopover.contains(e.target)) {
        overlaysPopover.classList.add('hidden');
    }
});

overlayButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        btn.classList.toggle('active'); 
        const overlayType = btn.getAttribute('data-overlay');
        const isActive = btn.classList.contains('active');

        try {
            if (overlayType === 'path') {
                if (isActive) {
                    if (!map.hasLayer(futurePathLayer)) map.addLayer(futurePathLayer);
                    if (!map.hasLayer(pastPathLayer)) map.addLayer(pastPathLayer);
                } else {
                    if (map.hasLayer(futurePathLayer)) map.removeLayer(futurePathLayer);
                    if (map.hasLayer(pastPathLayer)) map.removeLayer(pastPathLayer);
                }
            } 
            
            else if (overlayType === 'footprint') {
                if (isActive) {
                    if (!map.hasLayer(footprintCircle)) map.addLayer(footprintCircle);
                } else {
                    if (map.hasLayer(footprintCircle)) map.removeLayer(footprintCircle);
                }
            } 
            
            else if (overlayType === 'legend') {
                if (isActive) {
                    map.addControl(legend);
                } else {
                    map.removeControl(legend);
                }
            }

            else if (overlayType === 'crosshair') {
                if (isActive) {
                    marker.setIcon(crosshairIcon);
                } else {
                    marker.setIcon(issIcon);
                }
            }

            else if (overlayType === 'autocenter') {
                autoCenterManualoff = !isActive;

                if (!isPinModeActive) {
                    isAutoCenterDisabled = autoCenterManualoff;
                }
            }
        } catch (error) {
            console.error("Leaflet Layer Toggle Error:", error);
        }
    });
});
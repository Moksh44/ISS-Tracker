# ISS Tracker

An interactive International Space Station tracker built with vanilla HTML, CSS, and JavaScript. Follow the ISS in real time, inspect its orbit, explore map layers, and find upcoming visible passes for any location.

**Live application:** [iss-tracker.tiiny.site](https://iss-tracker.tiiny.site)<br>
**Backend API:** [iss-spotter-api](https://github.com/Moksh44/iss-spotter-api)

## Features

- Live ISS position, altitude, velocity, and visibility status
- Interactive Leaflet map with:
  - Street, satellite, dark, and NASA night-light basemaps
  - Day/night terminator
  - Recent and predicted orbital path
  - ISS visibility footprint
  - Optional legend, crosshair, and automatic centering
- Fly Mode for following the ISS across the map
- Light and dark application themes
- Celestial data including right ascension, declination, and constellation
- Orbit information including current orbit estimate, orbital period, and daily orbit count
- Location details including country/state or ocean, local time, and time zone
- “Spot the Station” search by city/place name or latitude/longitude
- Browser geolocation support for finding visible passes near the user
- Pass predictions for the next seven days, including:
  - Rise, maximum-elevation, and set times
  - Azimuth and maximum elevation
  - Pass duration
  - Local time-zone information

## How it works

The browser renders the map and interface, calculates the displayed orbit path from current TLE data, and requests live telemetry and location information from the API.

```text
ISS-Tracker (static frontend)
        |
        | HTTPS requests
        v
iss-spotter-api (Flask backend)
        |
        +-- Skyfield orbital calculations
        +-- GeoPandas shapefile lookups
        +-- Nominatim geocoding
        +-- Cached ISS TLE data
```

The frontend currently uses the deployed API at:

```text
https://mokshi85-iss-tracker-api.hf.space
```

To use another API instance, update `API_BASE_URL` in [`script.js`](./script.js) and add the frontend origin to the backend's allowed CORS origins.

## Run locally

This project is a static site, so it must be served over HTTP rather than opened directly with `file://`.

### Option 1: Python

```bash
git clone https://github.com/Moksh44/ISS-Tracker.git
cd ISS-Tracker
python -m http.server 5500
```

Open [http://127.0.0.1:5500](http://127.0.0.1:5500).

### Option 2: VS Code Live Server

1. Open the repository in VS Code.
2. Install the **Live Server** extension.
3. Open `index.html` with **Open with Live Server**.

The backend must allow the origin you use. The API repository includes `http://127.0.0.1:5500` in its current allowlist.

## Project structure

```text
.
├── index.html                 # Application markup
├── script.js                  # Map, telemetry, orbit, and pass-search logic
├── style.css                  # Responsive layout and themes
├── my-icon.png                # ISS map marker
├── background-light-image.jpg # Light theme background
└── background-dark-image.jpg  # Dark theme background
```

## External services and libraries

- [Leaflet](https://leafletjs.com/) — interactive maps
- [Satellite.js](https://github.com/shashwatak/satellite-js) — browser-side TLE propagation
- [Turf.js](https://turfjs.org/) — distance-to-orbit calculations
- [Leaflet Terminator](https://github.com/joergdietrich/Leaflet.Terminator) — day/night boundary
- [OpenStreetMap](https://www.openstreetmap.org/), [CARTO](https://carto.com/), [Esri](https://www.esri.com/), and [NASA GIBS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) — map imagery
- [Where The ISS At](https://wheretheiss.at/) — current TLE source used by the frontend
- [`iss-spotter-api`](https://github.com/Moksh44/iss-spotter-api) — live telemetry, reverse geolocation, and visible-pass calculations

These services may have their own availability, attribution, and usage policies.

## Notes and limitations

- Live data depends on the deployed API and external TLE/map providers.
- Browser geolocation requires permission and generally works only on secure origins or localhost.
- The frontend's orbit path is based on the latest TLE available from the external TLE service and is an estimate, not a precision navigation solution.
- If the API is unavailable, live telemetry, location details, and pass searches cannot be updated.

## Related repository

For API installation, Docker deployment, endpoint documentation, and geospatial data requirements, see the [ISS Spotter API README](https://github.com/Moksh44/iss-spotter-api).

## License

No license has been specified yet. Until a license is added to the repository, all rights are reserved by the copyright holder.

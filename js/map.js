/* ==========================================================================
   map.js — Campus Map page
   --------------------------------------------------------------------------
   - Interactive map built with Leaflet + OpenStreetMap tiles
   - Color-coded pins for every campus building
   - Search + category filter that update both the list and the map
   - "Use my location" (browser Geolocation API) for walking distances
   - Deep links: map.html?building=main-library selects that building
   ========================================================================== */

let map;                     // Leaflet map instance
const markers = {};          // building id -> Leaflet marker
let userLocation = null;     // { lat, lng } once the user shares location
let userMarker = null;
let selectedId = null;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------------------
   Geometry helpers
   -------------------------------------------------------------------------- */

/** Straight-line distance in meters between two points (haversine formula). */
function distanceMeters(a, b) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "0.4 mi · about 8 min walk" (average walking speed ≈ 80 m per minute). */
function describeDistance(meters) {
  const miles = meters / 1609.34;
  const minutes = Math.max(1, Math.round(meters / 80));
  const distance = miles < 0.1 ? `${Math.round(meters * 3.281)} ft` : `${miles.toFixed(1)} mi`;
  return `${distance} · about ${minutes} min walk`;
}

/* --------------------------------------------------------------------------
   Map setup (Leaflet)
   Docs: https://leafletjs.com/reference.html
   -------------------------------------------------------------------------- */

/** Creates a teardrop pin icon colored by building category. */
function pinIcon(category) {
  const icon = BUILDING_CATEGORIES[category]?.icon || "bi-geo-alt-fill";
  return L.divIcon({
    className: "",
    html: `<span class="map-pin cat-${category}"><i class="bi ${icon}" aria-hidden="true"></i></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
  });
}

/** Popup HTML for a building (also used for the details panel heading). */
function popupHTML(b) {
  const cat = BUILDING_CATEGORIES[b.category];
  return `
    <strong>${b.name}</strong><br>
    <span class="text-body-secondary">${cat.label}</span><br>
    <span>${b.hours}</span>`;
}

function initMap() {
  // Scroll-wheel zoom is off so scrolling the page doesn't get "stuck" on the map.
  map = L.map("campusMap", { scrollWheelZoom: false })
    .setView([CAMPUS.lat, CAMPUS.lng], CAMPUS.zoom);

  // OpenStreetMap raster tiles (free, attribution required).
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add one marker per building.
  BUILDINGS.forEach((b) => {
    const marker = L.marker([b.lat, b.lng], {
      icon: pinIcon(b.category),
      title: b.name,      // tooltip + accessible name
      alt: b.name,
      keyboard: true,     // markers can be focused with Tab and opened with Enter
      riseOnHover: true
    })
      .bindPopup(popupHTML(b))
      .addTo(map);

    marker.on("click", () => selectBuilding(b.id, { fromMap: true }));
    markers[b.id] = marker;
  });

  // Let users enable scroll-zoom by clicking into the map.
  map.on("click", () => map.scrollWheelZoom.enable());
  map.on("mouseout", () => map.scrollWheelZoom.disable());
}

/* --------------------------------------------------------------------------
   Filtering + list rendering
   -------------------------------------------------------------------------- */

/** Buildings that match the search box and category filter. */
function getFilteredBuildings() {
  const query = document.getElementById("buildingSearch").value.trim().toLowerCase();
  const category = document.getElementById("buildingCategory").value;

  let list = BUILDINGS.filter((b) => {
    const inCategory = category === "all" || b.category === category;
    const haystack = [b.name, b.description, BUILDING_CATEGORIES[b.category].label, ...b.amenities]
      .join(" ").toLowerCase();
    return inCategory && haystack.includes(query);
  });

  // If we know where the user is, sort nearest first.
  if (userLocation) {
    list = list
      .map((b) => ({ ...b, distance: distanceMeters(userLocation, b) }))
      .sort((a, b) => a.distance - b.distance);
  }
  return list;
}

/** Re-renders the sidebar list and shows/hides markers to match. */
function renderBuildings() {
  const list = getFilteredBuildings();
  const visibleIds = new Set(list.map((b) => b.id));

  // Show only matching markers on the map.
  Object.entries(markers).forEach(([id, marker]) => {
    if (visibleIds.has(id)) marker.addTo(map);
    else marker.remove();
  });

  document.getElementById("buildingCount").textContent =
    `${list.length} place${list.length === 1 ? "" : "s"} found${userLocation ? ", nearest first" : ""}.`;

  const container = document.getElementById("buildingList");
  if (list.length === 0) {
    container.innerHTML = '<p class="list-group-item mb-0 text-body-secondary">No places match your search.</p>';
    return;
  }

  container.innerHTML = list.map((b) => {
    const cat = BUILDING_CATEGORIES[b.category];
    return `
      <button type="button" class="list-group-item list-group-item-action cat-${b.category}"
              data-id="${b.id}" aria-current="${b.id === selectedId}">
        <span class="cat-swatch"><i class="bi ${cat.icon}" aria-hidden="true"></i></span>
        <span class="flex-grow-1">
          <span class="d-block">${b.name}</span>
          <span class="small text-body-secondary">${cat.label}${b.distance != null ? ` · ${describeDistance(b.distance)}` : ""}</span>
        </span>
      </button>`;
  }).join("");
}

/* --------------------------------------------------------------------------
   Selecting a building
   -------------------------------------------------------------------------- */

function selectBuilding(id, { fromMap = false } = {}) {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return;
  selectedId = id;

  // Move the map and open the pin's popup.
  const marker = markers[id];
  if (!fromMap) {
    if (prefersReducedMotion) map.setView([b.lat, b.lng], 17);
    else map.flyTo([b.lat, b.lng], 17, { duration: 0.6 });
  }
  marker.addTo(map).openPopup();

  // Highlight in the list.
  document.querySelectorAll("#buildingList [data-id]").forEach((btn) => {
    btn.setAttribute("aria-current", String(btn.dataset.id === id));
  });

  // Fill in the details panel (announced via aria-live).
  const cat = BUILDING_CATEGORIES[b.category];
  const distance = userLocation ? describeDistance(distanceMeters(userLocation, b)) : null;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`;
  const hall = DINING_HALLS.find((h) => h.buildingId === b.id);
  const diningStatus = hall ? getDiningStatus(hall) : null;

  document.getElementById("buildingDetails").innerHTML = `
    <div class="card-body cat-${b.category}">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <h3 class="h4 mb-1">${b.name}</h3>
          <span class="badge badge-cat">${cat.label}</span>
          ${diningStatus ? `<span class="badge status-badge ${diningStatus.state}">${hall.name}: ${diningStatus.label}</span>` : ""}
        </div>
        <a class="btn btn-primary btn-sm" href="${directions}" target="_blank" rel="noopener">
          <i class="bi bi-sign-turn-right" aria-hidden="true"></i> Walking directions<span class="visually-hidden"> to ${b.name} (opens Google Maps in a new tab)</span>
        </a>
      </div>
      <p class="mt-3 mb-2">${b.description}</p>
      <p class="small mb-2"><i class="bi bi-clock" aria-hidden="true"></i> ${b.hours}</p>
      ${distance ? `<p class="small mb-2"><i class="bi bi-person-walking" aria-hidden="true"></i> ${distance} from you</p>` : ""}
      <ul class="list-inline mb-0">
        ${b.amenities.map((a) => `<li class="list-inline-item"><span class="diet-tag">${a}</span></li>`).join("")}
      </ul>
    </div>`;
}

/* --------------------------------------------------------------------------
   Geolocation
   -------------------------------------------------------------------------- */

function locateUser() {
  const button = document.getElementById("locateMe");
  if (!("geolocation" in navigator)) {
    announce("Your browser doesn't support location.");
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Locating…';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };

      if (userMarker) userMarker.remove();
      userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({ className: "", html: '<span class="user-dot"></span>', iconSize: [18, 18] }),
        title: "You are here",
        alt: "Your location",
        keyboard: false
      }).bindPopup("You are here").addTo(map);

      // Fit both the user and campus in view (the user may be off campus).
      map.fitBounds(L.latLngBounds([[userLocation.lat, userLocation.lng], [CAMPUS.lat, CAMPUS.lng]]).pad(0.2));
      renderBuildings();
      if (selectedId) selectBuilding(selectedId, { fromMap: true });

      const nearest = getFilteredBuildings()[0];
      announce(nearest ? `Location found. Nearest place: ${nearest.name}, ${describeDistance(nearest.distance)}.` : "Location found.");
      resetLocateButton();
    },
    (error) => {
      const messages = {
        1: "Location permission was denied. You can still browse the map.",
        2: "Your location couldn't be determined.",
        3: "Finding your location took too long. Please try again."
      };
      announce(messages[error.code] || "Couldn't get your location.");
      document.getElementById("buildingCount").textContent = messages[error.code] || "Couldn't get your location.";
      resetLocateButton();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );

  function resetLocateButton() {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-crosshair" aria-hidden="true"></i> Use my location';
  }
}

/* --------------------------------------------------------------------------
   Initialisation + event listeners
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Leaflet loads from a CDN — fail gracefully if it's blocked or offline.
  if (typeof L === "undefined") {
    document.getElementById("campusMap").innerHTML =
      '<div class="alert alert-warning m-3">The map library couldn\'t load. Check your connection and refresh the page.</div>';
    return;
  }

  // Category dropdown from shared data
  const categorySelect = document.getElementById("buildingCategory");
  Object.entries(BUILDING_CATEGORIES).forEach(([key, c]) => categorySelect.add(new Option(c.label, key)));

  initMap();
  renderBuildings();

  document.getElementById("buildingSearch").addEventListener("input", renderBuildings);
  categorySelect.addEventListener("change", renderBuildings);
  document.getElementById("mapFilters").addEventListener("submit", (e) => e.preventDefault());

  // Selecting from the list (event delegation)
  document.getElementById("buildingList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-id]");
    if (item) selectBuilding(item.dataset.id);
  });

  document.getElementById("locateMe").addEventListener("click", locateUser);
  document.getElementById("resetView").addEventListener("click", () => {
    map.closePopup();
    map.setView([CAMPUS.lat, CAMPUS.lng], CAMPUS.zoom);
  });

  // Deep link from other pages, e.g. map.html?building=north-commons
  const requested = new URLSearchParams(window.location.search).get("building");
  if (requested && markers[requested]) selectBuilding(requested);
});

/* ==========================================================================
   dashboard.js — Home page logic
   --------------------------------------------------------------------------
   - Time-based greeting
   - Live weather + 5-day forecast from the Open-Meteo API (no API key)
   - At-a-glance summaries pulled from the other features:
     upcoming events, dining halls open now, newest marketplace listings
   ========================================================================== */

/**
 * WMO weather interpretation codes returned by Open-Meteo, mapped to a
 * readable description and a Bootstrap Icon.
 * Reference: https://open-meteo.com/en/docs (see "Weather variable documentation")
 */
const WEATHER_CODES = {
  0: ["Clear sky", "bi-sun"],
  1: ["Mainly clear", "bi-sun"],
  2: ["Partly cloudy", "bi-cloud-sun"],
  3: ["Overcast", "bi-clouds"],
  45: ["Fog", "bi-cloud-fog2"],
  48: ["Freezing fog", "bi-cloud-fog2"],
  51: ["Light drizzle", "bi-cloud-drizzle"],
  53: ["Drizzle", "bi-cloud-drizzle"],
  55: ["Heavy drizzle", "bi-cloud-drizzle"],
  56: ["Freezing drizzle", "bi-cloud-sleet"],
  57: ["Freezing drizzle", "bi-cloud-sleet"],
  61: ["Light rain", "bi-cloud-rain"],
  63: ["Rain", "bi-cloud-rain"],
  65: ["Heavy rain", "bi-cloud-rain-heavy"],
  66: ["Freezing rain", "bi-cloud-sleet"],
  67: ["Freezing rain", "bi-cloud-sleet"],
  71: ["Light snow", "bi-cloud-snow"],
  73: ["Snow", "bi-cloud-snow"],
  75: ["Heavy snow", "bi-snow"],
  77: ["Snow grains", "bi-snow"],
  80: ["Rain showers", "bi-cloud-drizzle"],
  81: ["Rain showers", "bi-cloud-rain"],
  82: ["Violent rain showers", "bi-cloud-rain-heavy"],
  85: ["Snow showers", "bi-cloud-snow"],
  86: ["Heavy snow showers", "bi-snow"],
  95: ["Thunderstorm", "bi-cloud-lightning-rain"],
  96: ["Thunderstorm with hail", "bi-cloud-hail"],
  99: ["Thunderstorm with hail", "bi-cloud-hail"]
};

/** Looks up a weather code, with a safe default for unknown codes. */
function describeWeather(code) {
  const [text, icon] = WEATHER_CODES[code] || ["Unknown conditions", "bi-question-circle"];
  return { text, icon };
}

/* --------------------------------------------------------------------------
   Greeting
   -------------------------------------------------------------------------- */

function renderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  document.getElementById("greeting").textContent = `${part}! 👋`;
  document.getElementById("todayDate").textContent =
    now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/* --------------------------------------------------------------------------
   Weather (Open-Meteo API)
   -------------------------------------------------------------------------- */

/**
 * Fetches current conditions and a 5-day forecast for the campus location.
 * API docs: https://open-meteo.com/en/docs
 * @param {"fahrenheit"|"celsius"} unit
 */
async function loadWeather(unit) {
  const body = document.getElementById("weatherBody");
  body.setAttribute("aria-busy", "true");

  // Build the request URL with query parameters.
  const params = new URLSearchParams({
    latitude: CAMPUS.lat,
    longitude: CAMPUS.lng,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: unit,
    wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
    timezone: "auto",
    forecast_days: 5
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Weather service responded with ${response.status}`);
    const data = await response.json();
    renderWeather(data, unit);
  } catch (error) {
    console.error("Weather request failed:", error);
    body.innerHTML = `
      <div class="alert alert-warning mb-0" role="alert">
        <p class="mb-2"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          We couldn't load the weather right now.</p>
        <button type="button" class="btn btn-sm btn-outline-dark" id="retryWeather">Try again</button>
      </div>`;
    document.getElementById("retryWeather").addEventListener("click", () => loadWeather(unit));
  } finally {
    body.setAttribute("aria-busy", "false");
  }
}

/** Turns the Open-Meteo JSON response into the weather card UI. */
function renderWeather(data, unit) {
  const body = document.getElementById("weatherBody");
  const current = data.current;
  const daily = data.daily;
  const now = describeWeather(current.weather_code);
  const deg = unit === "fahrenheit" ? "°F" : "°C";
  const windUnit = unit === "fahrenheit" ? "mph" : "km/h";

  // Build the 5-day forecast list.
  const forecastItems = daily.time.map((iso, i) => {
    const day = describeWeather(daily.weather_code[i]);
    const label = i === 0 ? "Today" : parseISODate(iso).toLocaleDateString(undefined, { weekday: "short" });
    const rain = daily.precipitation_probability_max?.[i];
    return `
      <li class="forecast-day">
        <span class="d-block fw-semibold">${label}</span>
        <i class="bi ${day.icon}" aria-hidden="true"></i>
        <span class="visually-hidden">${day.text}, </span>
        <span class="d-block">${Math.round(daily.temperature_2m_max[i])}°<span class="visually-hidden"> high</span>
          <span class="text-body-secondary">/ ${Math.round(daily.temperature_2m_min[i])}°<span class="visually-hidden"> low</span></span></span>
        ${rain != null ? `<span class="d-block small text-body-secondary"><i class="bi bi-droplet" aria-hidden="true"></i> ${rain}%<span class="visually-hidden"> chance of rain</span></span>` : ""}
      </li>`;
  }).join("");

  body.innerHTML = `
    <div class="weather-now mb-2">
      <i class="bi ${now.icon} weather-icon" aria-hidden="true"></i>
      <div>
        <p class="temp mb-1">${Math.round(current.temperature_2m)}${deg}</p>
        <p class="mb-0 fw-semibold">${now.text}</p>
      </div>
    </div>
    <p class="text-body-secondary small mb-2">
      Feels like ${Math.round(current.apparent_temperature)}${deg} ·
      Humidity ${current.relative_humidity_2m}% ·
      Wind ${Math.round(current.wind_speed_10m)} ${windUnit}
    </p>
    <p class="mb-3"><i class="bi bi-lightbulb text-brand" aria-hidden="true"></i> ${weatherTip(current, daily, unit)}</p>
    <h3 class="visually-hidden">5-day forecast</h3>
    <ul class="forecast-grid">${forecastItems}</ul>`;
}

/** A small, practical suggestion for students based on the forecast. */
function weatherTip(current, daily, unit) {
  const rainChance = daily.precipitation_probability_max?.[0] ?? 0;
  const tempF = unit === "fahrenheit" ? current.temperature_2m : current.temperature_2m * 9 / 5 + 32;
  const code = current.weather_code;

  if (code >= 95) return "Storms nearby — take the campus shuttle instead of walking between classes.";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow today. Leave a few extra minutes to get to class.";
  if (rainChance >= 50) return `There's a ${rainChance}% chance of rain today. Bring an umbrella!`;
  if (tempF <= 32) return "It's freezing out there. Grab a coat, gloves, and a hot drink from the Library Café.";
  if (tempF >= 85) return "It's hot today. Stay hydrated — refill stations are in every academic building.";
  return "Great weather for studying outside on the quad.";
}

/* --------------------------------------------------------------------------
   At-a-glance summaries from other features
   -------------------------------------------------------------------------- */

/** Next four upcoming events (seed + user-created). */
function renderUpcomingEvents() {
  const list = document.getElementById("upcomingList");
  const today = toISODate(new Date());
  const upcoming = getAllEvents().filter((e) => e.date >= today).slice(0, 4);

  if (upcoming.length === 0) {
    list.innerHTML = '<li class="list-group-item">No upcoming events. <a href="events.html">Add one</a>!</li>';
    return;
  }

  list.innerHTML = upcoming.map((event) => {
    const date = parseISODate(event.date);
    const when = event.date === today ? "Today" : formatShortDate(date);
    return `
      <li class="list-group-item d-flex gap-3 align-items-center cat-${escapeHTML(event.category)}">
        <div class="event-date-badge" aria-hidden="true">
          <span class="month">${date.toLocaleDateString(undefined, { month: "short" })}</span>
          <span class="day">${date.getDate()}</span>
        </div>
        <div class="flex-grow-1">
          <p class="fw-semibold mb-0">${escapeHTML(event.title)}</p>
          <p class="small text-body-secondary mb-0">
            ${when} · ${formatTime(event.start)} · ${escapeHTML(event.location)}
          </p>
        </div>
        <span class="badge badge-cat d-none d-sm-inline">${EVENT_CATEGORIES[event.category] || "Event"}</span>
      </li>`;
  }).join("");
}

/** Open/closed status of each dining location. */
function renderDiningNow() {
  const list = document.getElementById("diningNow");
  list.innerHTML = DINING_HALLS.map((hall) => {
    const status = getDiningStatus(hall);
    return `
      <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
        <span>
          <span class="fw-semibold d-block">${hall.name}</span>
          <span class="small text-body-secondary">${status.todayHours}</span>
        </span>
        <span class="badge status-badge ${status.state}">${status.label}</span>
      </li>`;
  }).join("");
}

/** Three newest listings that are still available. */
function renderLatestListings() {
  const list = document.getElementById("latestListings");
  const latest = loadListings()
    .filter((l) => !l.sold)
    .sort((a, b) => b.postedAt - a.postedAt)
    .slice(0, 3);

  if (latest.length === 0) {
    list.innerHTML = '<li class="list-group-item">Nothing listed yet. <a href="marketplace.html">Post the first item</a>.</li>';
    return;
  }

  list.innerHTML = latest.map((l) => `
    <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
      <span>
        <span class="fw-semibold d-block">${escapeHTML(l.title)}</span>
        <span class="small text-body-secondary">${LISTING_CATEGORIES[l.category] || "Other"} · ${timeAgo(l.postedAt)}</span>
      </span>
      <span class="fw-bold text-brand">${l.price > 0 ? `$${Number(l.price).toFixed(2)}` : "Free"}</span>
    </li>`).join("");
}

/* --------------------------------------------------------------------------
   Page initialisation + event listeners
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderGreeting();
  renderUpcomingEvents();
  renderDiningNow();
  renderLatestListings();

  // Restore the user's preferred temperature unit, then load weather.
  const savedUnit = loadFromStorage(STORAGE_KEYS.units, "fahrenheit");
  const radio = document.querySelector(`input[name="units"][value="${savedUnit}"]`);
  if (radio) radio.checked = true;
  loadWeather(savedUnit);

  // Switching °F/°C re-requests the forecast in the new unit.
  document.querySelectorAll('input[name="units"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      saveToStorage(STORAGE_KEYS.units, e.target.value);
      loadWeather(e.target.value);
    });
  });

  // Keep the dining open/closed badges current while the page is open.
  setInterval(renderDiningNow, 60 * 1000);
});

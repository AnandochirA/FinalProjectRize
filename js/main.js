/* ==========================================================================
   main.js — Shared helpers and site-wide behavior for CampusHub
   --------------------------------------------------------------------------
   Loaded on every page after data.js. Provides:
   - localStorage helpers (safe read/write)
   - date/time formatting helpers
   - shared data accessors (events, listings, dining status)
   - an accessible "announce" helper for screen readers
   - dark-mode toggle and footer year
   ========================================================================== */

/** Keys used for everything the app saves in the browser. */
const STORAGE_KEYS = {
  theme: "campushub.theme",
  events: "campushub.events",
  savedEvents: "campushub.savedEvents",
  listings: "campushub.listings",
  units: "campushub.units"
};

/* --------------------------------------------------------------------------
   Storage helpers
   localStorage can throw (private mode, blocked cookies, full quota), so
   every read and write is wrapped in try/catch and falls back gracefully.
   -------------------------------------------------------------------------- */

/** Reads and JSON-parses a value from localStorage, or returns `fallback`. */
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn(`CampusHub: could not read "${key}" from storage.`, err);
    return fallback;
  }
}

/** JSON-stringifies and saves a value. Returns true on success. */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`CampusHub: could not save "${key}" to storage.`, err);
    return false;
  }
}

/* --------------------------------------------------------------------------
   Security helper
   -------------------------------------------------------------------------- */

/**
 * Escapes text before inserting it with innerHTML. Used for anything typed
 * by a user or returned from an API, to prevent HTML/script injection.
 */
function escapeHTML(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (ch) => map[ch]);
}

/* --------------------------------------------------------------------------
   Date & time helpers
   Dates are stored as local "YYYY-MM-DD" strings and times as "HH:MM" so
   that they never shift because of time-zone conversion.
   -------------------------------------------------------------------------- */

/** Converts a Date into a local "YYYY-MM-DD" string. */
function toISODate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Converts a "YYYY-MM-DD" string into a local Date (midnight). */
function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** "18:30" -> 1110 (minutes after midnight). */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "18:30" -> "6:30 PM" */
function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Date -> "Saturday, November 21" */
function formatLongDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/** Date -> "Sat, Nov 21" */
function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Timestamp (ms) -> "3 hours ago" style text. */
function timeAgo(timestamp) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  const units = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60]
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

/* --------------------------------------------------------------------------
   Shared data accessors
   -------------------------------------------------------------------------- */

/** Sort comparator: earliest date/time first. */
function compareEvents(a, b) {
  return `${a.date} ${a.start || "00:00"}`.localeCompare(`${b.date} ${b.start || "00:00"}`);
}

/** All campus events: built-in seed events + events the user created. */
function getAllEvents() {
  const userEvents = loadFromStorage(STORAGE_KEYS.events, []);
  return [...SEED_EVENTS, ...userEvents].sort(compareEvents);
}

/**
 * Marketplace listings. The first visit copies the seed listings into
 * storage so that later edits (mark sold, delete) persist.
 */
function loadListings() {
  const stored = loadFromStorage(STORAGE_KEYS.listings, null);
  return Array.isArray(stored) ? stored : SEED_LISTINGS.map((l) => ({ ...l }));
}

/**
 * Works out whether a dining hall is open right now.
 * Returns { state: "open" | "closing" | "closed", label, todayHours }.
 */
function getDiningStatus(hall, now = new Date()) {
  const today = hall.hours[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (!today) {
    return { state: "closed", label: "Closed today", todayHours: "Closed" };
  }

  const openMin = toMinutes(today.open);
  const closeMin = toMinutes(today.close);
  const todayHours = `${formatTime(today.open)} – ${formatTime(today.close)}`;

  if (nowMin < openMin) {
    return { state: "closed", label: `Opens at ${formatTime(today.open)}`, todayHours };
  }
  if (nowMin >= closeMin) {
    return { state: "closed", label: "Closed for the day", todayHours };
  }

  const minutesLeft = closeMin - nowMin;
  if (minutesLeft <= 60) {
    return { state: "closing", label: `Closes in ${minutesLeft} min`, todayHours };
  }
  return { state: "open", label: `Open until ${formatTime(today.close)}`, todayHours };
}

/* --------------------------------------------------------------------------
   Accessibility: screen-reader announcements
   A single visually-hidden aria-live region is shared by all features so
   that dynamic changes ("Listing posted", "3 results") are read aloud.
   -------------------------------------------------------------------------- */

function announce(message) {
  let region = document.getElementById("liveRegion");
  if (!region) {
    region = document.createElement("div");
    region.id = "liveRegion";
    region.className = "visually-hidden";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("role", "status");
    document.body.appendChild(region);
  }
  // Clear first so repeating the same message is still announced.
  region.textContent = "";
  setTimeout(() => { region.textContent = message; }, 50);
}

/* --------------------------------------------------------------------------
   Theme (light / dark) toggle
   The saved theme is applied early by an inline script in each page's
   <head> to avoid a flash of the wrong theme; this wires up the button.
   -------------------------------------------------------------------------- */

function initThemeToggle() {
  const button = document.getElementById("themeToggle");
  if (!button) return;

  const render = () => {
    const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.innerHTML = isDark
      ? '<i class="bi bi-sun" aria-hidden="true"></i><span class="ms-1">Light mode</span>'
      : '<i class="bi bi-moon-stars" aria-hidden="true"></i><span class="ms-1">Dark mode</span>';
  };

  button.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", next);
    saveToStorage(STORAGE_KEYS.theme, next);
    render();
  });

  render();
}

/* --------------------------------------------------------------------------
   Site-wide initialisation
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Fill any element marked with data-campus-name with the configured name.
  document.querySelectorAll("[data-campus-name]").forEach((el) => {
    el.textContent = CAMPUS.name;
  });
});

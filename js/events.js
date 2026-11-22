/* ==========================================================================
   events.js — Campus Events page
   --------------------------------------------------------------------------
   - Month calendar grid with event dots (click a day to see its events)
   - Agenda list with search, category, "saved only" and holiday filters
   - Public holidays loaded live from the Nager.Date API (no API key)
   - Save/bookmark events and add your own events (stored in localStorage)
   ========================================================================== */

/** Current UI state. Everything on the page is rendered from this object. */
const state = {
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0 = January
  selectedDate: null,               // "YYYY-MM-DD" or null for "all upcoming"
  search: "",
  category: "all",
  showHolidays: true,
  savedOnly: false
};

/** Holidays fetched from the API, cached per year: { 2026: [...], 2027: [...] } */
const holidayCache = {};
const holidayRequests = {}; // in-flight requests, so a year is only fetched once

/** IDs of events the user bookmarked. */
let savedIds = new Set(loadFromStorage(STORAGE_KEYS.savedEvents, []));

/* --------------------------------------------------------------------------
   Nager.Date public holiday API
   Docs: https://date.nager.at/Api
   Endpoint: GET /api/v3/PublicHolidays/{year}/{countryCode}
   -------------------------------------------------------------------------- */

/**
 * Loads public holidays for a year (once) and converts them into the same
 * shape as campus events so the calendar can treat them identically.
 */
function fetchHolidays(year) {
  if (holidayCache[year]) return Promise.resolve(holidayCache[year]);
  if (holidayRequests[year]) return holidayRequests[year];

  const status = document.getElementById("holidayStatus");
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${CAMPUS.countryCode}`;

  holidayRequests[year] = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Holiday API responded with ${response.status}`);
      return response.json();
    })
    .then((holidays) => {
      // Keep only nationwide holidays (some entries apply to a single state).
      holidayCache[year] = holidays
        .filter((h) => h.global)
        .map((h) => ({
          id: `holiday-${h.date}-${h.name}`,
          title: h.name,
          date: h.date,
          start: null,
          end: null,
          category: "holiday",
          location: "Nationwide",
          description: h.localName !== h.name
            ? `Also known as ${h.localName}. Check the academic calendar for class schedule changes.`
            : "Check the academic calendar for class schedule changes.",
          isHoliday: true
        }));
      status.textContent = "Public holidays loaded live from the Nager.Date API.";
      return holidayCache[year];
    })
    .catch((error) => {
      console.error("Holiday request failed:", error);
      status.textContent = "Public holidays couldn't be loaded right now. Campus events are still shown.";
      return [];
    })
    .finally(() => {
      delete holidayRequests[year];
    });

  return holidayRequests[year];
}

/* --------------------------------------------------------------------------
   Filtering
   -------------------------------------------------------------------------- */

/** Returns campus (+ holiday) events that match every active filter. */
function getFilteredEvents() {
  let events = getAllEvents();

  if (state.showHolidays) {
    events = events.concat(Object.values(holidayCache).flat());
  }
  if (state.category !== "all") {
    events = events.filter((e) => e.category === state.category);
  }
  if (state.savedOnly) {
    events = events.filter((e) => savedIds.has(e.id));
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    events = events.filter((e) =>
      [e.title, e.location, e.description, EVENT_CATEGORIES[e.category]]
        .some((field) => (field || "").toLowerCase().includes(q))
    );
  }
  return events.sort(compareEvents);
}

/* --------------------------------------------------------------------------
   Calendar rendering
   -------------------------------------------------------------------------- */

function renderCalendar(events) {
  const { viewYear: year, viewMonth: month } = state;
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const todayISO = toISODate(new Date());
  const monthName = firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  document.getElementById("monthLabel").textContent = monthName;

  // Group events by date for quick lookup.
  const byDate = {};
  events.forEach((e) => { (byDate[e.date] ||= []).push(e); });

  // Build one array of cells (blank cells pad the first and last weeks).
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push('<td class="calendar-empty"></td>');

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const iso = toISODate(date);
    const dayEvents = byDate[iso] || [];
    const isToday = iso === todayISO;
    const isSelected = iso === state.selectedDate;

    const dots = dayEvents.slice(0, 3)
      .map((e) => `<span class="event-dot cat-${e.category}"></span>`).join("");
    const more = dayEvents.length > 3 ? `<span class="more-count">+${dayEvents.length - 3}</span>` : "";

    const label = `${formatLongDate(date)}${isToday ? ", today" : ""}, ` +
      (dayEvents.length ? `${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : "no events");

    cells.push(`
      <td>
        <button type="button"
                class="calendar-day${isToday ? " is-today" : ""}${iso < todayISO ? " is-past" : ""}"
                data-date="${iso}" aria-pressed="${isSelected}" aria-label="${label}">
          <span class="day-num">${day}</span>
          <span class="event-dots" aria-hidden="true">${dots}${more}</span>
        </button>
      </td>`);
  }
  while (cells.length % 7 !== 0) cells.push('<td class="calendar-empty"></td>');

  // Split cells into week rows.
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);

  const weekdays = [...Array(7)].map((_, i) => {
    const d = new Date(2023, 0, i + 1); // Jan 1, 2023 was a Sunday
    return `<th scope="col"><abbr title="${d.toLocaleDateString(undefined, { weekday: "long" })}">${d.toLocaleDateString(undefined, { weekday: "short" })}</abbr></th>`;
  }).join("");

  document.getElementById("calendar").innerHTML = `
    <table class="table calendar-table mb-0">
      <caption class="visually-hidden">Events calendar for ${monthName}. Select a day to list its events.</caption>
      <thead><tr>${weekdays}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>`;
}

/* --------------------------------------------------------------------------
   Agenda (event list) rendering
   -------------------------------------------------------------------------- */

/** HTML for a single event card. */
function eventCardHTML(event) {
  const date = parseISODate(event.date);
  const saved = savedIds.has(event.id);
  const timeText = event.start
    ? `${formatTime(event.start)} – ${formatTime(event.end)}`
    : "All day";
  const datetime = event.start ? `${event.date}T${event.start}` : event.date;
  const titleId = `evt-${event.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const saveButton = event.isHoliday ? "" : `
    <button type="button" class="btn btn-sm ${saved ? "btn-primary" : "btn-outline-primary"}"
            data-action="save" data-id="${escapeHTML(event.id)}" aria-pressed="${saved}"
            aria-label="Save ${escapeHTML(event.title)}">
      <i class="bi ${saved ? "bi-bookmark-check-fill" : "bi-bookmark"}" aria-hidden="true"></i>
      <span class="d-none d-sm-inline">${saved ? "Saved" : "Save"}</span>
    </button>`;

  const deleteButton = event.userCreated ? `
    <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${escapeHTML(event.id)}">
      <i class="bi bi-trash" aria-hidden="true"></i><span class="visually-hidden">Delete ${escapeHTML(event.title)}</span>
    </button>` : "";

  const mapLink = event.buildingId ? `
    <a class="small" href="map.html?building=${encodeURIComponent(event.buildingId)}">
      <i class="bi bi-geo-alt" aria-hidden="true"></i> View on map<span class="visually-hidden">: ${escapeHTML(event.location)}</span>
    </a>` : "";

  return `
    <article class="card ch-card event-card cat-${escapeHTML(event.category)}" aria-labelledby="${titleId}">
      <div class="card-body d-flex gap-3">
        <div class="event-date-badge" aria-hidden="true">
          <span class="month">${date.toLocaleDateString(undefined, { month: "short" })}</span>
          <span class="day">${date.getDate()}</span>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h3 class="h6 fw-bold mb-1" id="${titleId}">${escapeHTML(event.title)}</h3>
            <div class="d-flex gap-1 flex-shrink-0">${saveButton}${deleteButton}</div>
          </div>
          <p class="small text-body-secondary mb-1">
            <i class="bi bi-clock" aria-hidden="true"></i>
            <time datetime="${datetime}">${formatShortDate(date)} · ${timeText}</time>
          </p>
          <p class="small mb-2"><i class="bi bi-pin-map" aria-hidden="true"></i> ${escapeHTML(event.location)}</p>
          ${event.description ? `<p class="small mb-2">${escapeHTML(event.description)}</p>` : ""}
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="badge badge-cat">${EVENT_CATEGORIES[event.category] || "Event"}</span>
            ${event.userCreated ? '<span class="badge text-bg-light border">Added by you</span>' : ""}
            ${mapLink}
          </div>
        </div>
      </div>
    </article>`;
}

function renderAgenda(events) {
  const list = document.getElementById("agendaList");
  const heading = document.getElementById("agendaHeading");
  const count = document.getElementById("agendaCount");
  const clearDay = document.getElementById("clearDay");
  const todayISO = toISODate(new Date());

  let shown;
  if (state.selectedDate) {
    shown = events.filter((e) => e.date === state.selectedDate);
    heading.textContent = `Events on ${formatLongDate(parseISODate(state.selectedDate))}`;
    clearDay.classList.remove("d-none");
  } else {
    shown = events.filter((e) => e.date >= todayISO).slice(0, 25);
    heading.textContent = "Upcoming events";
    clearDay.classList.add("d-none");
  }

  count.textContent = `${shown.length} event${shown.length === 1 ? "" : "s"} shown`;

  if (shown.length === 0) {
    list.innerHTML = `
      <div class="card ch-card">
        <div class="card-body text-center py-4">
          <i class="bi bi-calendar-x fs-1 text-body-secondary" aria-hidden="true"></i>
          <p class="mt-2 mb-0">No events match. Try another day or clear your filters — or add one!</p>
        </div>
      </div>`;
    return;
  }
  list.innerHTML = shown.map(eventCardHTML).join("");
}

/** Re-renders calendar + agenda from the current state. */
function renderAll() {
  const events = getFilteredEvents();
  renderCalendar(events);
  renderAgenda(events);
}

/* --------------------------------------------------------------------------
   Month navigation
   -------------------------------------------------------------------------- */

function changeMonth(delta) {
  const d = new Date(state.viewYear, state.viewMonth + delta, 1);
  state.viewYear = d.getFullYear();
  state.viewMonth = d.getMonth();
  renderAll();

  // Lazily load holidays for a year we haven't fetched yet.
  if (!holidayCache[state.viewYear]) fetchHolidays(state.viewYear).then(renderAll);
}

/* --------------------------------------------------------------------------
   Saving and deleting events
   -------------------------------------------------------------------------- */

function toggleSaved(id) {
  if (savedIds.has(id)) {
    savedIds.delete(id);
    announce("Removed from saved events.");
  } else {
    savedIds.add(id);
    announce("Event saved.");
  }
  saveToStorage(STORAGE_KEYS.savedEvents, [...savedIds]);
  renderAll();
  // Keep keyboard focus on the same button after re-rendering.
  document.querySelector(`[data-action="save"][data-id="${CSS.escape(id)}"]`)?.focus();
}

function deleteEvent(id) {
  const userEvents = loadFromStorage(STORAGE_KEYS.events, []);
  const event = userEvents.find((e) => e.id === id);
  if (!event || !window.confirm(`Delete "${event.title}"?`)) return;

  saveToStorage(STORAGE_KEYS.events, userEvents.filter((e) => e.id !== id));
  savedIds.delete(id);
  saveToStorage(STORAGE_KEYS.savedEvents, [...savedIds]);
  renderAll();
  announce(`Deleted ${event.title}.`);
  document.getElementById("agendaHeading").focus();
}

/* --------------------------------------------------------------------------
   Add-event form (inside a Bootstrap modal)
   -------------------------------------------------------------------------- */

function setupAddEventForm() {
  const modalEl = document.getElementById("addEventModal");
  const form = document.getElementById("addEventForm");
  const fields = {
    title: document.getElementById("evTitle"),
    date: document.getElementById("evDate"),
    category: document.getElementById("evCategory"),
    start: document.getElementById("evStart"),
    end: document.getElementById("evEnd"),
    location: document.getElementById("evLocation"),
    description: document.getElementById("evDescription")
  };

  // Populate the category dropdown (holidays come from the API only).
  Object.entries(EVENT_CATEGORIES)
    .filter(([key]) => key !== "holiday")
    .forEach(([key, label]) => fields.category.add(new Option(label, key)));

  // Suggest building names as the user types a location.
  document.getElementById("buildingOptions").innerHTML =
    BUILDINGS.map((b) => `<option value="${escapeHTML(b.name)}"></option>`).join("");

  // Each time the dialog opens: reset it and pre-fill the selected day.
  modalEl.addEventListener("show.bs.modal", () => {
    form.reset();
    form.classList.remove("was-validated");
    fields.date.min = toISODate(new Date());
    fields.date.value = state.selectedDate && state.selectedDate >= fields.date.min
      ? state.selectedDate
      : fields.date.min;
  });
  modalEl.addEventListener("shown.bs.modal", () => fields.title.focus());

  // Clear the custom "end after start" error as soon as either time changes.
  [fields.start, fields.end].forEach((input) =>
    input.addEventListener("input", () => fields.end.setCustomValidity("")));

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Custom rule: the event must end after it starts.
    if (fields.start.value && fields.end.value && fields.end.value <= fields.start.value) {
      fields.end.setCustomValidity("End time must be after the start time.");
    }

    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      form.querySelector(":invalid")?.focus();
      return;
    }

    // Link the event to a building on the map if the location mentions one.
    const location = fields.location.value.trim();
    const building = BUILDINGS.find((b) => location.toLowerCase().includes(b.name.toLowerCase()));

    const newEvent = {
      id: `user-${Date.now()}`,
      title: fields.title.value.trim(),
      date: fields.date.value,
      start: fields.start.value,
      end: fields.end.value,
      category: fields.category.value,
      location,
      buildingId: building ? building.id : null,
      description: fields.description.value.trim(),
      userCreated: true
    };

    const userEvents = loadFromStorage(STORAGE_KEYS.events, []);
    userEvents.push(newEvent);
    saveToStorage(STORAGE_KEYS.events, userEvents);

    // Jump the calendar to the new event's day.
    const d = parseISODate(newEvent.date);
    state.viewYear = d.getFullYear();
    state.viewMonth = d.getMonth();
    state.selectedDate = newEvent.date;

    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    renderAll();
    announce(`${newEvent.title} added to ${formatLongDate(d)}.`);
  });
}

/* --------------------------------------------------------------------------
   Event listeners
   -------------------------------------------------------------------------- */

function setupListeners() {
  // Fill the category filter from the shared category list.
  const categorySelect = document.getElementById("eventCategory");
  Object.entries(EVENT_CATEGORIES).forEach(([key, label]) => categorySelect.add(new Option(label, key)));

  // Filters re-render as the user types / toggles.
  document.getElementById("eventSearch").addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    renderAll();
  });
  categorySelect.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderAll();
  });
  document.getElementById("showHolidays").addEventListener("change", (e) => {
    state.showHolidays = e.target.checked;
    renderAll();
  });
  document.getElementById("savedOnly").addEventListener("change", (e) => {
    state.savedOnly = e.target.checked;
    renderAll();
  });
  document.getElementById("eventFilters").addEventListener("submit", (e) => e.preventDefault());

  // Month navigation
  document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
  document.getElementById("todayBtn").addEventListener("click", () => {
    const now = new Date();
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth();
    state.selectedDate = toISODate(now);
    renderAll();
  });

  // Clicking a day selects it (clicking again shows all upcoming).
  const calendar = document.getElementById("calendar");
  calendar.addEventListener("click", (e) => {
    const button = e.target.closest(".calendar-day");
    if (!button) return;
    state.selectedDate = state.selectedDate === button.dataset.date ? null : button.dataset.date;
    renderAll();
    calendar.querySelector(`[data-date="${button.dataset.date}"]`)?.focus();
  });

  // Arrow keys move between days, like a native date picker.
  calendar.addEventListener("keydown", (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const button = e.target.closest(".calendar-day");
    if (!button || !(e.key in moves)) return;
    e.preventDefault();
    const target = parseISODate(button.dataset.date);
    target.setDate(target.getDate() + moves[e.key]);
    calendar.querySelector(`[data-date="${toISODate(target)}"]`)?.focus();
  });

  document.getElementById("clearDay").addEventListener("click", () => {
    state.selectedDate = null;
    renderAll();
  });

  // Save / delete buttons inside the agenda (event delegation).
  document.getElementById("agendaList").addEventListener("click", (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "save") toggleSaved(button.dataset.id);
    if (button.dataset.action === "delete") deleteEvent(button.dataset.id);
  });
}

/* --------------------------------------------------------------------------
   Page initialisation
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("agendaHeading").setAttribute("tabindex", "-1");
  setupListeners();
  setupAddEventForm();
  renderAll();

  // Load this year's and next year's holidays (the agenda can span New Year).
  const year = new Date().getFullYear();
  Promise.all([fetchHolidays(year), fetchHolidays(year + 1)]).then(renderAll);
});

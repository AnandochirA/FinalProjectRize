/* ==========================================================================
   dining.js — Dining Guide page
   --------------------------------------------------------------------------
   - Dining location cards with live open/closed status (refreshes each minute)
   - Today's rotating menu with vegetarian / vegan / gluten-free filters
   - "Meal Idea Finder" powered by TheMealDB API (free test key "1")
   ========================================================================== */

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

/** Short labels for dietary tags (full words are given to screen readers). */
const DIET_LABELS = {
  vegetarian: { short: "V", full: "Vegetarian" },
  vegan: { short: "VG", full: "Vegan" },
  "gluten-free": { short: "GF", full: "Gluten-free" }
};

/** IDs of hall cards whose "Weekly hours" <details> is open (kept across re-renders). */
const openHourPanels = new Set();

/* --------------------------------------------------------------------------
   Dining locations
   -------------------------------------------------------------------------- */

/**
 * Picks today's menu by rotating through each hall's menu pool using the
 * day of the year, so the menu changes daily but is the same all day.
 */
function getTodaysMenu(hall, now = new Date()) {
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const pool = hall.menuPool;
  const count = Math.min(5, pool.length);
  return Array.from({ length: count }, (_, i) => pool[(dayOfYear + i) % pool.length]);
}

/** HTML for the weekly hours table, highlighting today. */
function hoursTableHTML(hall) {
  const todayIndex = new Date().getDay();
  const rows = hall.hours.map((h, i) => {
    const dayName = new Date(2023, 0, i + 1).toLocaleDateString(undefined, { weekday: "long" }); // Jan 1, 2023 = Sunday
    const text = h ? `${formatTime(h.open)} – ${formatTime(h.close)}` : "Closed";
    return `<tr class="${i === todayIndex ? "is-today" : ""}">
              <th scope="row" class="fw-normal">${dayName}${i === todayIndex ? ' <span class="visually-hidden">(today)</span>' : ""}</th>
              <td>${text}</td>
            </tr>`;
  }).join("");
  return `<table class="table table-sm hours-table mt-2 mb-0">
            <caption class="visually-hidden">Weekly hours for ${hall.name}</caption>
            <tbody>${rows}</tbody>
          </table>`;
}

/** HTML for one dining location card. */
function hallCardHTML(hall, diet) {
  const status = getDiningStatus(hall);
  let menu = getTodaysMenu(hall);
  if (diet !== "all") menu = menu.filter((item) => item.tags.includes(diet));

  const menuHTML = menu.length
    ? menu.map((item) => `
        <li>
          <span>${item.name} <span class="small text-body-secondary">· ${item.station}</span></span>
          <span class="d-flex gap-1">
            ${item.tags.map((t) => `<span class="diet-tag"><span aria-hidden="true">${DIET_LABELS[t].short}</span><span class="visually-hidden">${DIET_LABELS[t].full}</span></span>`).join("")}
          </span>
        </li>`).join("")
    : `<li class="text-body-secondary">No ${DIET_LABELS[diet].full.toLowerCase()} items on today's menu.</li>`;

  return `
    <div class="col-md-6 col-xl-3">
      <article class="card ch-card h-100" aria-labelledby="hall-${hall.id}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
            <h3 class="h5 mb-0" id="hall-${hall.id}">${hall.name}</h3>
            <span class="badge status-badge ${status.state}" data-status-for="${hall.id}">${status.label}</span>
          </div>
          <p class="small text-body-secondary mb-3">${hall.type}<br>Today: ${status.todayHours}</p>

          <h4 class="small text-uppercase fw-bold text-body-secondary mb-1">Today's menu</h4>
          <ul class="menu-list mb-3">${menuHTML}</ul>

          <details class="mt-auto mb-2" data-hall="${hall.id}" ${openHourPanels.has(hall.id) ? "open" : ""}>
            <summary>Weekly hours</summary>
            ${hoursTableHTML(hall)}
          </details>
          <a class="small" href="map.html?building=${hall.buildingId}">
            <i class="bi bi-geo-alt" aria-hidden="true"></i> View on map<span class="visually-hidden">: ${hall.name}</span>
          </a>
        </div>
      </article>
    </div>`;
}

/** Renders all dining cards using the current filter settings. */
function renderHalls() {
  const openOnly = document.getElementById("openNowOnly").checked;
  const diet = document.getElementById("dietFilter").value;
  const container = document.getElementById("diningHalls");

  let halls = DINING_HALLS;
  if (openOnly) halls = halls.filter((h) => getDiningStatus(h).state !== "closed");

  container.innerHTML = halls.length
    ? halls.map((h) => hallCardHTML(h, diet)).join("")
    : `<div class="col-12"><div class="alert alert-info mb-0">
         <i class="bi bi-moon-stars" aria-hidden="true"></i> Nothing is open right now. Turn off "Open now only" to see hours.
       </div></div>`;

  document.getElementById("hallCount").textContent =
    `${halls.length} dining location${halls.length === 1 ? "" : "s"} shown.`;
  renderLastUpdated();
}

function renderLastUpdated() {
  document.getElementById("lastUpdated").innerHTML =
    `<i class="bi bi-arrow-repeat" aria-hidden="true"></i> Status as of ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · updates every minute.` +
    `<br>Menu key: V = vegetarian · VG = vegan · GF = gluten-free`;
}

/**
 * Runs every minute. Updates only the status badges in place so keyboard
 * focus and open panels aren't disturbed. If "Open now only" is on, the
 * list itself may change, so the cards are fully re-rendered instead.
 */
function refreshStatuses() {
  if (document.getElementById("openNowOnly").checked) {
    renderHalls();
    return;
  }
  DINING_HALLS.forEach((hall) => {
    const badge = document.querySelector(`[data-status-for="${hall.id}"]`);
    if (!badge) return;
    const status = getDiningStatus(hall);
    badge.className = `badge status-badge ${status.state}`;
    badge.textContent = status.label;
  });
  renderLastUpdated();
}

/* --------------------------------------------------------------------------
   TheMealDB API
   Docs: https://www.themealdb.com/api.php
   Endpoints used:
     categories.php        list of meal categories
     filter.php?c=NAME     meals in a category (id, name, thumbnail only)
     search.php?s=TEXT     search meals by name (full details)
     random.php            one random meal (full details)
     lookup.php?i=ID       full details for one meal
   -------------------------------------------------------------------------- */

/** Increments on every search so slow, outdated responses can be ignored. */
let recipeRequestId = 0;

/** Fetches a TheMealDB endpoint and returns the parsed JSON. */
async function mealDbFetch(path) {
  const response = await fetch(`${MEALDB_BASE}/${path}`);
  if (!response.ok) throw new Error(`TheMealDB responded with ${response.status}`);
  return response.json();
}

/** Only allow http(s) links from API data (blocks "javascript:" URLs). */
function safeURL(url) {
  return /^https?:\/\//i.test(url || "") ? url : null;
}

/** Fills the category dropdown, then shows vegetarian recipes by default. */
async function loadCategories() {
  const select = document.getElementById("recipeCategory");
  try {
    const data = await mealDbFetch("categories.php");
    select.innerHTML = '<option value="">Choose a category…</option>' +
      data.categories.map((c) => `<option value="${escapeHTML(c.strCategory)}">${escapeHTML(c.strCategory)}</option>`).join("");
    select.value = "Vegetarian";
    showRecipes(`filter.php?c=${encodeURIComponent("Vegetarian")}`, "vegetarian recipes");
  } catch (error) {
    console.error("Category request failed:", error);
    select.innerHTML = '<option value="">Categories unavailable</option>';
    select.disabled = true;
    showRecipes("search.php?s=pasta", 'recipes matching "pasta"');
  }
}

/**
 * Requests meals from TheMealDB and renders them as cards.
 * @param {string} path  API path + query string
 * @param {string} description  human-readable summary used in the status line
 */
async function showRecipes(path, description) {
  const requestId = ++recipeRequestId;
  const results = document.getElementById("recipeResults");
  const status = document.getElementById("recipeStatus");

  results.setAttribute("aria-busy", "true");
  status.textContent = "Loading recipes…";
  results.innerHTML = Array.from({ length: 4 }, () =>
    '<div class="col-6 col-md-4 col-lg-3"><span class="skeleton" style="height:16rem"></span></div>').join("");

  try {
    const data = await mealDbFetch(path);
    if (requestId !== recipeRequestId) return; // a newer search already started

    const meals = (data.meals || []).slice(0, 12);
    status.textContent = meals.length
      ? `Showing ${meals.length} ${description}.`
      : `No ${description} found. Try a different word.`;
    results.innerHTML = meals.map(mealCardHTML).join("");
  } catch (error) {
    if (requestId !== recipeRequestId) return;
    console.error("Recipe request failed:", error);
    status.textContent = "Recipes couldn't be loaded right now. Check your connection and try again.";
    results.innerHTML = "";
  } finally {
    if (requestId === recipeRequestId) results.setAttribute("aria-busy", "false");
  }
}

/** HTML for one recipe result card. */
function mealCardHTML(meal) {
  const name = escapeHTML(meal.strMeal);
  const thumb = safeURL(meal.strMealThumb);
  const meta = [meal.strArea, meal.strCategory].filter(Boolean).map(escapeHTML).join(" · ");
  return `
    <div class="col-6 col-md-4 col-lg-3">
      <article class="card ch-card meal-card h-100">
        ${thumb ? `<img src="${thumb}/preview" class="card-img-top" alt="Photo of ${name}" loading="lazy" width="250" height="250">` : ""}
        <div class="card-body d-flex flex-column">
          <h3 class="h6">${name}</h3>
          ${meta ? `<p class="small text-body-secondary">${meta}</p>` : ""}
          <button type="button" class="btn btn-sm btn-outline-primary mt-auto" data-meal-id="${escapeHTML(meal.idMeal)}">
            View recipe<span class="visually-hidden">: ${name}</span>
          </button>
        </div>
      </article>
    </div>`;
}

/** Opens the recipe dialog and loads the full recipe by ID. */
async function openRecipe(mealId) {
  const modalEl = document.getElementById("recipeModal");
  const title = document.getElementById("recipeModalTitle");
  const body = document.getElementById("recipeModalBody");

  title.textContent = "Loading recipe…";
  body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading…</span></div></div>';
  bootstrap.Modal.getOrCreateInstance(modalEl).show();

  try {
    const data = await mealDbFetch(`lookup.php?i=${encodeURIComponent(mealId)}`);
    const meal = data.meals && data.meals[0];
    if (!meal) throw new Error("Meal not found");

    // TheMealDB stores ingredients as strIngredient1..20 + strMeasure1..20.
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = (meal[`strIngredient${i}`] || "").trim();
      const measure = (meal[`strMeasure${i}`] || "").trim();
      if (ingredient) ingredients.push(`<li>${escapeHTML(measure)} ${escapeHTML(ingredient)}</li>`);
    }

    const steps = (meal.strInstructions || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `<p>${escapeHTML(s)}</p>`)
      .join("");

    const video = safeURL(meal.strYoutube);
    const source = safeURL(meal.strSource);
    const thumb = safeURL(meal.strMealThumb);

    title.textContent = meal.strMeal;
    body.innerHTML = `
      <div class="row g-4">
        <div class="col-md-5">
          ${thumb ? `<img src="${thumb}" class="img-fluid rounded-4 mb-3" alt="Finished dish: ${escapeHTML(meal.strMeal)}">` : ""}
          <p class="mb-2">
            ${meal.strCategory ? `<span class="badge text-bg-secondary">${escapeHTML(meal.strCategory)}</span>` : ""}
            ${meal.strArea ? `<span class="badge text-bg-secondary">${escapeHTML(meal.strArea)}</span>` : ""}
          </p>
          <div class="d-flex flex-wrap gap-2">
            ${video ? `<a class="btn btn-sm btn-outline-danger" href="${video}" target="_blank" rel="noopener">
                         <i class="bi bi-youtube" aria-hidden="true"></i> Watch video<span class="visually-hidden"> (opens in new tab)</span></a>` : ""}
            ${source ? `<a class="btn btn-sm btn-outline-primary" href="${source}" target="_blank" rel="noopener">
                          Original recipe<span class="visually-hidden"> (opens in new tab)</span></a>` : ""}
          </div>
        </div>
        <div class="col-md-7">
          <h3 class="h6 text-uppercase fw-bold">Ingredients</h3>
          <ul class="ingredient-list mb-4">${ingredients.join("")}</ul>
          <h3 class="h6 text-uppercase fw-bold">Instructions</h3>
          ${steps}
        </div>
      </div>`;
  } catch (error) {
    console.error("Recipe lookup failed:", error);
    title.textContent = "Recipe unavailable";
    body.innerHTML = '<div class="alert alert-warning mb-0">Sorry, we couldn\'t load that recipe. Please try again.</div>';
  }
}

/* --------------------------------------------------------------------------
   Event listeners + initialisation
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderHalls();
  loadCategories();

  // Filters for dining cards
  document.getElementById("openNowOnly").addEventListener("change", renderHalls);
  document.getElementById("dietFilter").addEventListener("change", renderHalls);
  document.getElementById("diningFilters").addEventListener("submit", (e) => e.preventDefault());

  // Remember which "Weekly hours" panels are open. The toggle event does
  // not bubble, so we listen in the capture phase on the container.
  document.getElementById("diningHalls").addEventListener("toggle", (e) => {
    const id = e.target.dataset?.hall;
    if (!id) return;
    e.target.open ? openHourPanels.add(id) : openHourPanels.delete(id);
  }, true);

  // Refresh open/closed status every minute.
  setInterval(refreshStatuses, 60 * 1000);

  // Recipe search by name
  document.getElementById("recipeSearchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("recipeQuery").value.trim();
    if (!query) {
      document.getElementById("recipeStatus").textContent = "Type a dish name to search.";
      document.getElementById("recipeQuery").focus();
      return;
    }
    document.getElementById("recipeCategory").value = "";
    showRecipes(`search.php?s=${encodeURIComponent(query)}`, `recipes matching "${query}"`);
  });

  // Browse by category
  document.getElementById("recipeCategory").addEventListener("change", (e) => {
    const category = e.target.value;
    if (!category) return;
    document.getElementById("recipeQuery").value = "";
    showRecipes(`filter.php?c=${encodeURIComponent(category)}`, `${category.toLowerCase()} recipes`);
  });

  // Random recipe
  document.getElementById("randomRecipe").addEventListener("click", () => {
    document.getElementById("recipeCategory").value = "";
    showRecipes("random.php", "random recipe idea — click again for another");
  });

  // "View recipe" buttons (event delegation on the results grid)
  document.getElementById("recipeResults").addEventListener("click", (e) => {
    const button = e.target.closest("[data-meal-id]");
    if (button) openRecipe(button.dataset.mealId);
  });
});

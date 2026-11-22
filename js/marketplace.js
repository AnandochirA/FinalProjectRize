/* ==========================================================================
   marketplace.js — Student Exchange page
   --------------------------------------------------------------------------
   - Post a listing with client-side form validation (Bootstrap styles)
   - Search, filter by category, sort by date/price, show/hide sold items
   - Mark your own listings as sold or delete them
   - All listings persist in localStorage
   ========================================================================== */

/** In-memory copy of all listings (kept in sync with localStorage). */
let listings = loadListings();

/** Saves the current listings array to the browser. */
function persistListings() {
  saveToStorage(STORAGE_KEYS.listings, listings);
}

/** "$45.00", or "Free" when the price is 0. */
function formatPrice(price) {
  return price > 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)
    : "Free";
}

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */

/** Applies search, filters and sorting to the listings array. */
function getVisibleListings() {
  const query = document.getElementById("lsSearch").value.trim().toLowerCase();
  const category = document.getElementById("lsFilterCategory").value;
  const sort = document.getElementById("lsSort").value;
  const showSold = document.getElementById("lsShowSold").checked;
  const mineOnly = document.getElementById("lsMineOnly").checked;

  const visible = listings.filter((l) =>
    (category === "all" || l.category === category) &&
    (showSold || !l.sold) &&
    (!mineOnly || l.owned) &&
    `${l.title} ${l.description}`.toLowerCase().includes(query)
  );

  const sorters = {
    newest: (a, b) => b.postedAt - a.postedAt,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price
  };
  return visible.sort(sorters[sort]);
}

/** HTML for a single listing card. */
function listingCardHTML(l) {
  const title = escapeHTML(l.title);
  const subject = encodeURIComponent(`CampusHub Exchange: ${l.title}`);

  // Owners can mark sold / relist and delete their own listings.
  const ownerActions = l.owned ? `
    <button type="button" class="btn btn-sm btn-outline-success" data-action="toggle-sold" data-id="${l.id}">
      <i class="bi ${l.sold ? "bi-arrow-counterclockwise" : "bi-check2-circle"}" aria-hidden="true"></i>
      ${l.sold ? "Relist" : "Mark sold"}<span class="visually-hidden">: ${title}</span>
    </button>
    <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${l.id}">
      <i class="bi bi-trash" aria-hidden="true"></i><span class="visually-hidden">Delete ${title}</span>
    </button>` : "";

  const contactButton = l.sold ? "" : `
    <a class="btn btn-sm btn-primary" href="mailto:${escapeHTML(l.contact)}?subject=${subject}">
      <i class="bi bi-envelope" aria-hidden="true"></i> Contact<span class="visually-hidden"> seller about ${title}</span>
    </a>`;

  return `
    <div class="col-md-6">
      <article class="card ch-card listing-card ${l.sold ? "is-sold" : ""}" aria-labelledby="listing-${l.id}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h3 class="h6 fw-bold listing-title mb-1" id="listing-${l.id}">${title}</h3>
            <span class="listing-price">${formatPrice(l.price)}</span>
          </div>
          <div class="d-flex flex-wrap gap-1 mb-2">
            <span class="badge text-bg-secondary">${LISTING_CATEGORIES[l.category] || "Other"}</span>
            <span class="badge text-bg-light border">${escapeHTML(l.condition)}</span>
            ${l.trade ? '<span class="badge text-bg-info">Open to trades</span>' : ""}
            ${l.sold ? '<span class="badge text-bg-dark">Sold</span>' : ""}
            ${l.owned ? '<span class="badge text-bg-warning">Your listing</span>' : ""}
          </div>
          <p class="small listing-desc mb-3">${escapeHTML(l.description)}</p>
          <div class="mt-auto d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span class="small text-body-secondary"><i class="bi bi-clock" aria-hidden="true"></i> ${timeAgo(l.postedAt)}</span>
            <div class="d-flex gap-2">${contactButton}${ownerActions}</div>
          </div>
        </div>
      </article>
    </div>`;
}

function renderListings() {
  const visible = getVisibleListings();
  const grid = document.getElementById("listingGrid");

  document.getElementById("listingCount").textContent =
    `${visible.length} listing${visible.length === 1 ? "" : "s"} found.`;

  grid.innerHTML = visible.length
    ? visible.map(listingCardHTML).join("")
    : `<div class="col-12"><div class="card ch-card"><div class="card-body text-center py-4">
         <i class="bi bi-bag-x fs-1 text-body-secondary" aria-hidden="true"></i>
         <p class="mt-2 mb-0">Nothing matches yet. Try clearing your filters, or post the first one!</p>
       </div></div></div>`;
}

/* --------------------------------------------------------------------------
   Posting a listing (form validation + save)
   -------------------------------------------------------------------------- */

function setupForm() {
  const form = document.getElementById("listingForm");
  const description = document.getElementById("lsDescription");
  const counter = document.getElementById("descCount");

  // Live character counter for the description.
  const updateCounter = () => {
    counter.textContent = `${description.value.length} / ${description.maxLength} characters`;
  };
  description.addEventListener("input", updateCounter);

  form.addEventListener("reset", () => {
    form.classList.remove("was-validated");
    setTimeout(updateCounter, 0); // runs after the browser clears the fields
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.classList.add("was-validated");

    // Built-in HTML validation (required, min/max, email format, length).
    if (!form.checkValidity()) {
      form.querySelector(":invalid")?.focus();
      announce("Please fix the highlighted fields.");
      return;
    }

    const listing = {
      id: `user-${Date.now()}`,
      title: document.getElementById("lsTitle").value.trim(),
      category: document.getElementById("lsCategory").value,
      condition: document.getElementById("lsCondition").value,
      price: Math.round(parseFloat(document.getElementById("lsPrice").value) * 100) / 100,
      trade: document.getElementById("lsTrade").checked,
      description: description.value.trim(),
      contact: document.getElementById("lsContact").value.trim(),
      postedAt: Date.now(),
      sold: false,
      owned: true
    };

    listings.unshift(listing);
    persistListings();
    form.reset();

    // Make sure the new listing is visible, then move focus to the results.
    document.getElementById("lsSearch").value = "";
    document.getElementById("lsFilterCategory").value = "all";
    document.getElementById("lsSort").value = "newest";
    renderListings();
    announce(`Your listing "${listing.title}" is posted.`);
    document.getElementById("browseHeading").focus();
  });
}

/* --------------------------------------------------------------------------
   Owner actions: mark sold / relist / delete
   -------------------------------------------------------------------------- */

function handleListingAction(e) {
  const button = e.target.closest("[data-action]");
  if (!button) return;

  const listing = listings.find((l) => l.id === button.dataset.id);
  if (!listing || !listing.owned) return;

  if (button.dataset.action === "toggle-sold") {
    listing.sold = !listing.sold;
    persistListings();
    renderListings();
    announce(listing.sold ? `${listing.title} marked as sold.` : `${listing.title} is listed again.`);
    // Return focus to the same button if it's still visible.
    document.querySelector(`[data-action="toggle-sold"][data-id="${listing.id}"]`)?.focus();
  }

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete "${listing.title}"? This can't be undone.`)) return;
    listings = listings.filter((l) => l.id !== listing.id);
    persistListings();
    renderListings();
    announce(`${listing.title} deleted.`);
    document.getElementById("browseHeading").focus();
  }
}

/* --------------------------------------------------------------------------
   Initialisation
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Fill both category dropdowns from the shared list.
  const formCategory = document.getElementById("lsCategory");
  const filterCategory = document.getElementById("lsFilterCategory");
  Object.entries(LISTING_CATEGORIES).forEach(([key, label]) => {
    formCategory.add(new Option(label, key));
    filterCategory.add(new Option(label, key));
  });

  setupForm();
  renderListings();

  // Re-render whenever a filter changes.
  document.getElementById("lsSearch").addEventListener("input", renderListings);
  ["lsFilterCategory", "lsSort", "lsShowSold", "lsMineOnly"].forEach((id) =>
    document.getElementById(id).addEventListener("change", renderListings));
  document.getElementById("listingFilters").addEventListener("submit", (e) => e.preventDefault());

  document.getElementById("listingGrid").addEventListener("click", handleListingAction);
});

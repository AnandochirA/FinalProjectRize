# CampusHub — Campus Life Super App

**Live site:** https://anandochira.github.io/FinalProjectRize/

CampusHub is a multi-page web app that brings the everyday parts of college life together in one place.
Students usually juggle a separate events site, dining website, campus map PDF and group chats for buying and selling.
CampusHub puts all of that in one fast, accessible app that works on phones, tablets and desktops.

## Purpose

| Student pain point | How CampusHub helps |
| --- | --- |
| "I never know what's happening on campus." | **Events Calendar** with search, filters, saved events and your own club events |
| "Is the dining hall still open? Is there anything vegan today?" | **Dining Guide** with live open/closed status, daily menus and dietary filters |
| "Where is that building and how far is it?" | **Campus Map** with search, category filters and walking distance from you |
| "I need a cheap textbook / I want to sell my mini fridge." | **Student Exchange** to post, search and manage listings |
| "Do I need an umbrella today?" | **Home dashboard** with live weather and a 5-day forecast |

## Technologies Used

- **HTML5** with semantic elements (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `time`, `details`)
- **CSS3** custom stylesheet (`css/styles.css`): CSS variables, Flexbox, CSS Grid, media queries, light/dark themes, `prefers-reduced-motion`
- **Bootstrap 5.3** (CDN): grid, navbar, cards, modals, forms + validation styles, badges, list groups
- **Bootstrap Icons 1.11**
- **JavaScript (ES6+)**: DOM manipulation, event listeners, `fetch` with `async/await`, `localStorage`, Geolocation API
- **Leaflet 1.9** + **OpenStreetMap** tiles for the interactive map
- **GitHub Pages** for hosting

### External APIs (all free, no API keys needed)

| API | Used on | What it provides |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com/) | Home | Current weather and 5-day forecast for the campus location |
| [Nager.Date](https://date.nager.at/) | Events | Public holidays, shown on the calendar |
| [TheMealDB](https://www.themealdb.com/api.php) | Dining | Recipe search, categories, random meals and full recipe details |
| [OpenStreetMap](https://www.openstreetmap.org/) (via Leaflet) | Campus Map | Live map tiles |

## Features & How to Use Them

### 1. Home Dashboard (`index.html`)
- Greeting that changes with the time of day.
- **Live weather** from Open-Meteo with a 5-day forecast and a practical tip ("Bring an umbrella!"). Switch between **°F / °C** — your choice is remembered.
- At-a-glance cards: the next upcoming events, which dining locations are open right now, and the newest marketplace listings.

### 2. Events Calendar (`events.html`)
- A **monthly calendar**: use the arrows or **Today** to move between months. Colored dots show events by category.
- **Click a day** (or use the arrow keys) to list that day's events. Click it again, or press **Show all upcoming**, to go back.
- **Search** by keyword, filter by **category**, toggle **public holidays** (loaded live from Nager.Date) and show **only saved events**.
- Press **Save** on any event to bookmark it.
- Press **Add event** to create your own event. The form checks required fields and makes sure the end time is after the start time. Events you add can be deleted, and if the location matches a building they get a **View on map** link.

### 3. Dining Guide (`dining.html`)
- Every dining location shows a live **Open / Closing soon / Closed** badge that updates every minute.
- **Today's menu** changes daily. Use the **Dietary need** filter (vegetarian, vegan, gluten-free) or **Open now only**.
- Expand **Weekly hours** to see the full schedule, with today highlighted.
- **Meal Idea Finder** (TheMealDB): search for a dish, browse a category, or press **Surprise me**. Press **View recipe** to see ingredients, instructions and a video link.

### 4. Campus Map (`map.html`)
- Interactive Leaflet map with color-coded pins for academic buildings, dining, study spaces, services, recreation, housing and transit.
- **Search** (try "printing" or "pool") and filter by **category**. The list and the map update together.
- Select a place to zoom to it and see its hours, amenities, live dining status and a **Walking directions** link.
- **Use my location** sorts places by distance and shows the estimated walking time.
- Other pages link straight to a building, e.g. `map.html?building=main-library`.

### 5. Student Exchange (`marketplace.html`)
- **Post a listing** with a title, category, condition, price (0 = free), optional "open to trades", description and contact email. Each field is validated, with clear error messages.
- **Search**, filter by category, **sort** by newest or price, and show or hide sold items.
- **Contact** opens an email to the seller. On your own listings you can **Mark sold / Relist** or **Delete**.

### Site-wide
- **Dark mode** toggle in the navbar (remembers your choice and respects your system setting).
- Responsive layout: a collapsible navbar on mobile, stacked cards, and a compact calendar on small screens.

## Accessibility

- Semantic landmarks plus a **"Skip to main content"** link on every page.
- Every form control has a `<label>`. Validation errors are shown in text, not only in color.
- Meaningful **alt text** on images (decorative icons use `aria-hidden="true"`).
- **Color contrast** meets WCAG AA: every category color passes 4.5:1 against white text.
- Visible **focus outlines** on everything you can interact with. The calendar supports **arrow-key navigation**.
- **`aria-live` announcements** for dynamic updates (search result counts, "Listing posted", loading states), `aria-pressed` on toggle buttons and `aria-current` on the active nav link.
- The building list is a **keyboard-friendly alternative** to the map, and map pins can also be reached with Tab.
- Animations are turned off for users who set **prefers-reduced-motion**.

## Project Structure

```
FinalProject/
├── index.html          # Home dashboard
├── events.html         # Events calendar
├── dining.html         # Dining guide + recipe finder
├── map.html            # Interactive campus map
├── marketplace.html    # Student exchange
├── css/
│   └── styles.css      # Custom styles, theme tokens, responsive rules
├── js/
│   ├── data.js         # Campus config + sample data (buildings, dining, events, listings)
│   ├── main.js         # Shared helpers: storage, dates, theme toggle, announcements
│   ├── dashboard.js    # Home page + Open-Meteo weather
│   ├── events.js       # Calendar + Nager.Date holidays
│   ├── dining.js       # Dining status + TheMealDB recipes
│   ├── map.js          # Leaflet map + geolocation
│   └── marketplace.js  # Listings, validation, filters
├── assets/img/         # Logo and hero illustration (SVG)
└── README.md
```

## Setup & Deployment

### Run locally
No build step and no installs. It is plain HTML, CSS and JavaScript.

1. Clone the repository:
   ```bash
   git clone https://github.com/AnandochirA/FinalProjectRize.git
   cd FinalProjectRize
   ```
2. Open `index.html` in a browser, **or** (recommended) serve the folder locally so that every browser feature works:
   - VS Code: right-click `index.html` → **Open with Live Server**, or
   - Python: `python -m http.server 8000`, then visit http://localhost:8000

> "Use my location" on the map needs `https://` or `localhost`. It won't work from a `file://` URL.

### Customize for your campus
All campus-specific data is in **`js/data.js`**. Change `CAMPUS.name`, `lat`, `lng` and `countryCode`, then edit the `BUILDINGS`, `DINING_HALLS`, `SEED_EVENTS` and `SEED_LISTINGS` arrays.

### Deploy to GitHub Pages
1. Push the code to the `main` branch on GitHub.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Source: Deploy from a branch**, then select **Branch: `main`** and the **`/ (root)`** folder, and press **Save**.
4. After about a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

All file paths are relative (`css/styles.css`, `js/main.js`, …), so the site works on GitHub Pages without any changes.

## Future Improvements / Stretch Goals

- **Real accounts and a shared backend** (e.g. Firebase or Supabase) so events and listings are shared between all students instead of being saved in each browser.
- **Official data feeds**: connect to the university's real events calendar (iCal/RSS) and the dining services menu API.
- **Image uploads** for marketplace listings and in-app messaging instead of email.
- **Calendar export**: "Add to Google Calendar / .ics" buttons for events.
- **Live campus shuttle tracking** on the map, plus indoor floor plans.
- **Push notifications** for saved events and when a favorite dining hall opens.
- **Progressive Web App (PWA)**: installable, with offline support.
- **Study room booking** and a **lost & found** board as more "super app" features.

## Credits

- Weather: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Holidays: [Nager.Date](https://date.nager.at/)
- Recipes & photos: [TheMealDB](https://www.themealdb.com/)
- Map data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, rendered with [Leaflet](https://leafletjs.com/)
- UI: [Bootstrap](https://getbootstrap.com/) and [Bootstrap Icons](https://icons.getbootstrap.com/)
- Campus name, buildings, events and listings are sample data for demonstration.

/* ==========================================================================
   data.js — Shared configuration and sample campus data for CampusHub
   --------------------------------------------------------------------------
   Everything campus-specific lives in this one file, so the whole app can be
   pointed at a different school by editing the values below (coordinates,
   building list, dining hours, etc.). Loaded on every page before main.js.
   ========================================================================== */

/**
 * Campus configuration.
 * lat/lng are used by the Open-Meteo weather API and as the map center.
 * countryCode is used by the Nager.Date public-holiday API.
 */
const CAMPUS = {
  name: "Northfield University",
  lat: 42.2768,
  lng: -83.7382,
  zoom: 16,
  countryCode: "US"
};

/* --------------------------------------------------------------------------
   Campus buildings (Campus Map feature)
   -------------------------------------------------------------------------- */

/** Display info for each building category: label + Bootstrap Icon. */
const BUILDING_CATEGORIES = {
  academic:   { label: "Academic",       icon: "bi-mortarboard-fill" },
  study:      { label: "Study Spaces",   icon: "bi-book-fill" },
  dining:     { label: "Dining",         icon: "bi-cup-hot-fill" },
  services:   { label: "Student Services", icon: "bi-heart-pulse-fill" },
  recreation: { label: "Recreation",     icon: "bi-bicycle" },
  housing:    { label: "Housing",        icon: "bi-house-fill" },
  transport:  { label: "Transit & Parking", icon: "bi-bus-front-fill" }
};

const BUILDINGS = [
  {
    id: "main-library",
    name: "Main Library",
    category: "study",
    lat: 42.2763, lng: -83.7375,
    hours: "Mon–Thu 7 AM–2 AM · Fri 7 AM–9 PM · Weekends 10 AM–midnight",
    description: "Quiet floors, group study rooms (bookable online), printing and a 24/7 lobby during finals.",
    amenities: ["Wi-Fi", "Printing", "Group rooms", "Accessible entrance"]
  },
  {
    id: "student-union",
    name: "Student Union",
    category: "services",
    lat: 42.2750, lng: -83.7417,
    hours: "Daily 7 AM–midnight",
    description: "Home to student organizations, the Union Market food court, ID card office and lounges.",
    amenities: ["Food court", "ID office", "ATM", "Accessible entrance"]
  },
  {
    id: "science-center",
    name: "Science Center",
    category: "academic",
    lat: 42.2780, lng: -83.7355,
    hours: "Mon–Fri 7 AM–10 PM",
    description: "Biology, chemistry and physics labs plus the large lecture halls SC 100 and SC 120.",
    amenities: ["Lecture halls", "Labs", "Elevator"]
  },
  {
    id: "engineering-hall",
    name: "Engineering Hall",
    category: "academic",
    lat: 42.2792, lng: -83.7400,
    hours: "Mon–Fri 7 AM–11 PM · Sat 9 AM–6 PM",
    description: "Makerspace, computer labs and the engineering advising office.",
    amenities: ["Makerspace", "Computer lab", "Elevator"]
  },
  {
    id: "arts-center",
    name: "Performing Arts Center",
    category: "academic",
    lat: 42.2741, lng: -83.7360,
    hours: "Box office Mon–Fri 11 AM–5 PM",
    description: "Theater, concert hall and gallery space. Student tickets are discounted with ID.",
    amenities: ["Theater", "Gallery", "Box office"]
  },
  {
    id: "north-commons",
    name: "North Commons",
    category: "dining",
    lat: 42.2800, lng: -83.7370,
    hours: "See Dining page for today's hours",
    description: "All-you-care-to-eat dining hall with rotating global stations.",
    amenities: ["Meal swipes", "Vegan station", "Allergen-friendly pantry"]
  },
  {
    id: "south-dining",
    name: "South Dining Hall",
    category: "dining",
    lat: 42.2735, lng: -83.7395,
    hours: "See Dining page for today's hours",
    description: "Comfort food, a pizza oven and a late-night grab-and-go window.",
    amenities: ["Meal swipes", "Grab-and-go", "Pizza oven"]
  },
  {
    id: "rec-center",
    name: "Recreation Center",
    category: "recreation",
    lat: 42.2725, lng: -83.7425,
    hours: "Mon–Fri 6 AM–11 PM · Weekends 8 AM–9 PM",
    description: "Gym, pool, climbing wall, and intramural courts. Free with student ID.",
    amenities: ["Pool", "Climbing wall", "Lockers"]
  },
  {
    id: "health-center",
    name: "Health & Wellness Center",
    category: "services",
    lat: 42.2755, lng: -83.7340,
    hours: "Mon–Fri 8 AM–5 PM · 24/7 nurse line",
    description: "Primary care, counseling services, and a pharmacy. Walk-in hours every weekday morning.",
    amenities: ["Counseling", "Pharmacy", "Accessible entrance"]
  },
  {
    id: "bookstore",
    name: "Campus Bookstore",
    category: "services",
    lat: 42.2771, lng: -83.7425,
    hours: "Mon–Sat 9 AM–7 PM",
    description: "Textbooks (buy or rent), school gear, tech accessories and a coffee bar.",
    amenities: ["Textbook rental", "Coffee bar"]
  },
  {
    id: "residence-quad",
    name: "Residence Hall Quad",
    category: "housing",
    lat: 42.2810, lng: -83.7410,
    hours: "Residents & guests only · Front desk 24/7",
    description: "Four first-year residence halls around a central courtyard with laundry and a mailroom.",
    amenities: ["Mailroom", "Laundry", "Front desk"]
  },
  {
    id: "parking-a",
    name: "Parking Structure A",
    category: "transport",
    lat: 42.2745, lng: -83.7445,
    hours: "Open 24/7 · Permit required 7 AM–6 PM weekdays",
    description: "Student and visitor parking with EV chargers on level 1.",
    amenities: ["EV charging", "Bike racks"]
  },
  {
    id: "transit-hub",
    name: "Campus Transit Hub",
    category: "transport",
    lat: 42.2785, lng: -83.7445,
    hours: "Shuttles every 10 min, 7 AM–midnight",
    description: "Free campus shuttle loop plus connections to city buses.",
    amenities: ["Shuttle", "City bus", "Bike share"]
  }
];

/* --------------------------------------------------------------------------
   Dining halls (Dining feature + home dashboard)
   hours[] is indexed by JavaScript's getDay(): 0 = Sunday … 6 = Saturday.
   null means closed all day.
   -------------------------------------------------------------------------- */

const DINING_HALLS = [
  {
    id: "north-commons",
    name: "North Commons",
    buildingId: "north-commons",
    type: "All-you-care-to-eat",
    hours: [
      { open: "09:00", close: "20:00" },
      { open: "07:00", close: "21:00" },
      { open: "07:00", close: "21:00" },
      { open: "07:00", close: "21:00" },
      { open: "07:00", close: "21:00" },
      { open: "07:00", close: "20:00" },
      { open: "09:00", close: "20:00" }
    ],
    menuPool: [
      { name: "Chana masala with basmati rice", station: "Global", tags: ["vegan", "gluten-free"] },
      { name: "Herb-roasted chicken", station: "Grill", tags: ["gluten-free"] },
      { name: "Build-your-own grain bowl", station: "Bowls", tags: ["vegetarian", "vegan"] },
      { name: "Beef & broccoli stir-fry", station: "Wok", tags: [] },
      { name: "Margherita flatbread", station: "Oven", tags: ["vegetarian"] },
      { name: "Black bean burger", station: "Grill", tags: ["vegetarian", "vegan"] },
      { name: "Tomato basil soup", station: "Soup", tags: ["vegetarian", "gluten-free"] },
      { name: "Salmon teriyaki", station: "Global", tags: [] },
      { name: "Seasonal fruit bar", station: "Desserts", tags: ["vegan", "gluten-free"] }
    ]
  },
  {
    id: "south-dining",
    name: "South Dining Hall",
    buildingId: "south-dining",
    type: "All-you-care-to-eat",
    hours: [
      { open: "10:00", close: "22:00" },
      { open: "07:30", close: "22:30" },
      { open: "07:30", close: "22:30" },
      { open: "07:30", close: "22:30" },
      { open: "07:30", close: "22:30" },
      { open: "07:30", close: "21:00" },
      { open: "10:00", close: "21:00" }
    ],
    menuPool: [
      { name: "Mac & cheese", station: "Comfort", tags: ["vegetarian"] },
      { name: "Pepperoni pizza", station: "Pizza", tags: [] },
      { name: "Vegan chili", station: "Soup", tags: ["vegan", "gluten-free"] },
      { name: "Turkey club wrap", station: "Deli", tags: [] },
      { name: "Garden salad bar", station: "Salads", tags: ["vegan", "gluten-free"] },
      { name: "Pancakes all day", station: "Breakfast", tags: ["vegetarian"] },
      { name: "BBQ pulled jackfruit sandwich", station: "Comfort", tags: ["vegan"] },
      { name: "Chocolate chip cookies", station: "Desserts", tags: ["vegetarian"] }
    ]
  },
  {
    id: "union-market",
    name: "Union Market",
    buildingId: "student-union",
    type: "Food court · Dining dollars",
    hours: [
      { open: "11:00", close: "19:00" },
      { open: "08:00", close: "23:00" },
      { open: "08:00", close: "23:00" },
      { open: "08:00", close: "23:00" },
      { open: "08:00", close: "23:00" },
      { open: "08:00", close: "20:00" },
      null
    ],
    menuPool: [
      { name: "Burrito bowls", station: "Cantina", tags: ["gluten-free"] },
      { name: "Sushi rolls (made fresh)", station: "Sushi", tags: [] },
      { name: "Falafel pita", station: "Mediterranean", tags: ["vegan"] },
      { name: "Chicken tenders & fries", station: "Grill", tags: [] },
      { name: "Acai bowls", station: "Smoothies", tags: ["vegan", "gluten-free"] },
      { name: "Veggie spring rolls", station: "Asian", tags: ["vegan"] }
    ]
  },
  {
    id: "library-cafe",
    name: "Library Café",
    buildingId: "main-library",
    type: "Coffee & snacks · Dining dollars",
    hours: [
      { open: "12:00", close: "22:00" },
      { open: "07:00", close: "23:59" },
      { open: "07:00", close: "23:59" },
      { open: "07:00", close: "23:59" },
      { open: "07:00", close: "23:59" },
      { open: "07:00", close: "18:00" },
      { open: "12:00", close: "18:00" }
    ],
    menuPool: [
      { name: "Espresso drinks & cold brew", station: "Coffee", tags: ["vegetarian", "gluten-free"] },
      { name: "Everything bagel & cream cheese", station: "Bakery", tags: ["vegetarian"] },
      { name: "Hummus snack box", station: "Grab-and-go", tags: ["vegan"] },
      { name: "Blueberry muffin", station: "Bakery", tags: ["vegetarian"] },
      { name: "Chicken caesar wrap", station: "Grab-and-go", tags: [] }
    ]
  }
];

/* --------------------------------------------------------------------------
   Seed events (Events feature)
   Dates are generated relative to "today" so the sample calendar always
   has upcoming events, no matter when the app is opened.
   -------------------------------------------------------------------------- */

const EVENT_CATEGORIES = {
  academic: "Academic",
  social: "Social",
  sports: "Sports",
  career: "Career",
  arts: "Arts & Culture",
  wellness: "Wellness",
  holiday: "Public Holiday"
};

/** Returns a local YYYY-MM-DD string for today + `offset` days. */
function dateFromToday(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SEED_EVENTS = [
  { id: "seed-1", title: "Late-Night Study Jam", date: dateFromToday(0), start: "20:00", end: "23:30", category: "academic", buildingId: "main-library", location: "Main Library, 2nd floor", description: "Free coffee, peer tutors for intro courses, and quiet zones. Bring your problem sets!" },
  { id: "seed-2", title: "Intramural Basketball Finals", date: dateFromToday(1), start: "19:00", end: "21:00", category: "sports", buildingId: "rec-center", location: "Recreation Center, Court 1", description: "Cheer on your residence hall teams in the championship game." },
  { id: "seed-3", title: "Resume Review Drop-ins", date: dateFromToday(2), start: "13:00", end: "16:00", category: "career", buildingId: "student-union", location: "Student Union, Room 210", description: "Get 15-minute resume feedback from career advisors. No appointment needed." },
  { id: "seed-4", title: "Mindful Mondays: Yoga", date: dateFromToday(3), start: "17:30", end: "18:30", category: "wellness", buildingId: "rec-center", location: "Recreation Center, Studio B", description: "Beginner-friendly yoga session. Mats provided." },
  { id: "seed-5", title: "Open Mic Night", date: dateFromToday(4), start: "19:30", end: "22:00", category: "arts", buildingId: "student-union", location: "Student Union Lounge", description: "Music, poetry, comedy — sign up at the door or just come to listen." },
  { id: "seed-6", title: "Club & Org Fair", date: dateFromToday(6), start: "11:00", end: "15:00", category: "social", buildingId: "student-union", location: "Student Union Ballroom", description: "Meet 100+ student organizations and find your people." },
  { id: "seed-7", title: "Tech Career Panel", date: dateFromToday(8), start: "18:00", end: "19:30", category: "career", buildingId: "engineering-hall", location: "Engineering Hall Auditorium", description: "Alumni from software, hardware and data roles share how they landed their first jobs." },
  { id: "seed-8", title: "Finals Prep Workshop: Time Management", date: dateFromToday(10), start: "15:00", end: "16:00", category: "academic", buildingId: "main-library", location: "Main Library, Room 101", description: "Build a realistic study schedule with the Academic Success Center." },
  { id: "seed-9", title: "Student Theater: One-Act Plays", date: dateFromToday(12), start: "19:00", end: "21:00", category: "arts", buildingId: "arts-center", location: "Performing Arts Center", description: "Six original one-act plays written and performed by students. $5 with ID." },
  { id: "seed-10", title: "Therapy Dogs on the Quad", date: dateFromToday(14), start: "12:00", end: "14:00", category: "wellness", buildingId: "residence-quad", location: "Residence Hall Quad", description: "De-stress with some very good dogs." },
  { id: "seed-11", title: "Hackathon Kickoff", date: dateFromToday(17), start: "18:00", end: "22:00", category: "academic", buildingId: "engineering-hall", location: "Engineering Hall Makerspace", description: "24-hour build sprint. Form teams, eat pizza, ship something." },
  { id: "seed-12", title: "Soccer Watch Party", date: dateFromToday(21), start: "14:00", end: "16:30", category: "sports", buildingId: "student-union", location: "Student Union Lounge", description: "Big screen, snacks, and school spirit." },
  { id: "seed-13", title: "Spring Internship Info Session", date: dateFromToday(27), start: "16:00", end: "17:00", category: "career", buildingId: "student-union", location: "Student Union, Room 210", description: "Learn about paid internship programs and how to apply." }
];

/* --------------------------------------------------------------------------
   Seed marketplace listings (Student Exchange feature)
   -------------------------------------------------------------------------- */

const LISTING_CATEGORIES = {
  textbooks: "Textbooks",
  electronics: "Electronics",
  furniture: "Furniture & Dorm",
  clothing: "Clothing",
  tickets: "Tickets",
  services: "Tutoring & Services",
  other: "Other"
};

const HOUR = 60 * 60 * 1000;

const SEED_LISTINGS = [
  { id: "seed-l1", title: "Calculus: Early Transcendentals (8th ed.)", category: "textbooks", price: 45, condition: "Good", trade: true, description: "Some highlighting in chapters 2–4. Works for MATH 115 and 116.", contact: "jlee@example.edu", postedAt: Date.now() - 3 * HOUR, sold: false, owned: false },
  { id: "seed-l2", title: "Mini fridge (3.1 cu ft)", category: "furniture", price: 60, condition: "Like new", trade: false, description: "Used one semester. Freezer compartment works great. Pick up at North Quad.", contact: "mpatel@example.edu", postedAt: Date.now() - 20 * HOUR, sold: false, owned: false },
  { id: "seed-l3", title: "TI-84 Plus graphing calculator", category: "electronics", price: 55, condition: "Good", trade: true, description: "Comes with cover and new batteries.", contact: "agarcia@example.edu", postedAt: Date.now() - 30 * HOUR, sold: false, owned: false },
  { id: "seed-l4", title: "Intro to Python tutoring", category: "services", price: 15, condition: "New", trade: false, description: "CS junior, TA for CS 101. $15 per hour session at the library.", contact: "schen@example.edu", postedAt: Date.now() - 52 * HOUR, sold: false, owned: false },
  { id: "seed-l5", title: "Desk lamp + storage bins", category: "furniture", price: 0, condition: "Fair", trade: false, description: "Free to a good home — moving out early.", contact: "kwilliams@example.edu", postedAt: Date.now() - 72 * HOUR, sold: false, owned: false },
  { id: "seed-l6", title: "2 tickets: Fall Concert", category: "tickets", price: 30, condition: "New", trade: true, description: "Can't make it anymore. $30 for both, or trade for basketball tickets.", contact: "rnguyen@example.edu", postedAt: Date.now() - 96 * HOUR, sold: true, owned: false }
];

# 🏛️ System Architecture — Vote Chain (SafeVote)

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------+
|                            CLIENT SIDE                                |
|  Single Page Application (SPA) — HTML5 / Vanilla JS (ES6) / CSS3     |
|                                                                       |
|  +-------------------+  +--------------------+  +------------------+  |
|  |   UI Renderer     |  |   API Client       |  |  Chart & Export  |  |
|  |   (app.js)        |  |   (api.js)         |  | Chart.js / jsPDF |  |
|  +---------+---------+  +---------+----------+  +--------+---------+  |
+------------|----------------------|----------------------|------------+
             |                      |                      |
             +------------------ HTTP/REST ----------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                            BACKEND SIDE                               |
|  Django 5.x REST API Framework (WSGI / Gunicorn @ Port 8081)          |
|                                                                       |
|  +------------------+  +-------------------+  +--------------------+  |
|  | accounts / voters|  | candidates /      |  | voting /           |  |
|  | Auth & Access    |  | elections CRUD    |  | SHA-256 Ledger     |  |
|  +--------+---------+  +---------+---------+  +---------+----------+  |
+-----------|----------------------|----------------------|-------------+
            |                      |                      |
            +--------------- PyMongo Driver --------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                            DATABASE LAYER                             |
|  MongoDB (Local / Atlas Cluster)                                      |
|                                                                       |
|  - Collection: voters (Students / Staff records)                      |
|  - Collection: candidates (Position & department specs)               |
|  - Collection: elections (Status, timing, department scopes)           |
|  - Collection: votes (Anonymous ballot logs)                          |
|  - Collection: ledger (SHA-256 tamper-evident blockchain chain)       |
+-----------------------------------------------------------------------+
```

---

## 2. Technology Stack

| Layer | Technology | Details / Usage |
|-------|------------|-----------------|
| **Frontend Framework** | Vanilla HTML5 & JavaScript (ES6 Modules) | Zero heavy bundle overhead; SPA routing via dynamic DOM mounting in `app.js`. |
| **Styling & UI** | Vanilla CSS3 (Custom Design System) | Native CSS variables, glassmorphism, flex/grid layouts, multi-theme variables (`style.css`). |
| **Icons & UI Helpers** | Lucide Icons, Flatpickr | Lightweight SVG icon set (`lucide.min.js`) and DateTime picking. |
| **Data Viz & Export** | Chart.js, jsPDF | Live bar/pie chart rendering and client-side election report PDF synthesis. |
| **Backend API** | Python 3.10+, Django 5.x, DRF | REST API handling authentication, election orchestration, and vote verification. |
| **Database Engine** | MongoDB (PyMongo client driver) | Flexible document store for voters, candidate profiles, and immutable transaction blocks. |
| **Auth & Security** | PBKDF2 / bcrypt, Custom Salt Keys | Secure password hashing, salted HMAC tokens (`ADMIN_KEY_SALT`, `VOTER_SALT`, `BLOCKCHAIN_SALT`). |
| **Deployment** | Netlify (Frontend), Gunicorn / Render (Backend) | Static edge distribution for frontend and WSGI application hosting for backend. |
| **Version Control** | Git & GitHub | Main repository tracked under `ATKTharun1807/vote`. |

---

## 3. Directory & Folder Structure

```
vote/
├── PRD.md                       # Product Requirements Document
├── ARCHITECTURE.md              # System Architecture Specification
├── RULES.md                     # AI & Developer Coding Rules
├── DESIGN.md                    # UI/UX Design System Specification
├── TASKS.md                     # Project Tasks & Roadmap
├── MEMORY.md                    # Project State & History Tracker
├── README.md                    # High-level overview & setup guide
├── netlify.toml                 # Frontend deployment configuration
├── .gitignore                   # Version control ignore definitions
│
└── SafeVote/                    # Main Application Source Code
    ├── index.html               # SPA Document Root & Mount Shell
    ├── voting.jpg               # Branding & Favicon asset
    ├── netlify.toml             # Local static route fallback config
    ├── run.bat                  # One-click launcher script (Windows)
    ├── .env                     # Local environment configuration
    │
    ├── css/                     # Styling Engine
    │   └── style.css            # Complete design system & themes (1500+ lines)
    │
    ├── js/                      # Frontend Logic
    │   ├── app.js               # Application state, view routing, UI handlers
    │   ├── api.js               # Backend API communication & session manager
    │   └── lucide.min.js        # Local offline icon library
    │
    └── backend/                 # Django REST API Services
        ├── manage.py            # Django administrative runner
        ├── requirements.txt     # Python backend dependencies
        ├── Procfile             # Production deployment entrypoint
        ├── run.bat              # Backend launcher script
        │
        ├── safevote_backend/    # Django Core Settings & URLs
        │   ├── settings.py      # Environment setup, CORS, Installed Apps
        │   ├── urls.py          # Central URL Routing
        │   └── wsgi.py          # Web Server Gateway Interface
        │
        ├── accounts/            # Admin Auth & Shared Key Management
        ├── voters/              # Student/Staff Auth & Registration
        ├── candidates/          # Candidate Profiles & Photo URLs
        ├── elections/           # Election Controls & Department Scopes
        ├── voting/              # Vote Casting Engine & SHA-256 Ledger
        ├── utils/               # Database connection helpers & cryptography
        └── tests/               # Automated test suites
```

---

## 4. Key Data Flow & Security Mechanisms

1. **Authentication Flow:**
   - User inputs Roll Number/Email and Password.
   - Request hits `voters/views.py` or `accounts/views.py`.
   - Credentials matched against hashed password in MongoDB using PyMongo helpers (`utils/database.py`).
   - On success, session payload stored in `sessionStorage` / `localStorage` via `api.js`.

2. **Vote Casting & Ledger Hashing:**
   - Voter selects candidate and submits ballot.
   - Backend evaluates `has_voted` flag atomically in MongoDB `voters` collection.
   - Ballot details stored anonymously in `votes` collection.
   - Next SHA-256 hash block created in `ledger` collection:
     $$\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} + \text{BallotID} + \text{Timestamp} + \text{Salt})$$
   - Voter receives transaction verification receipt code.

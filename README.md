# 🗳️ Vote Chain — Secure Digital Election Platform

Vote Chain (SafeVote) is a full-stack electronic voting and election management system built for academic institutions. It provides secure voter authentication, candidate management, department-scoped elections, live vote tracking, a tamper-resistant digital ledger, and real-time result analytics.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Secure Authentication** | Credential hashing (PBKDF2/bcrypt), role-based login for Students, Staff, and Admins |
| 🗳️ **One Person — One Vote** | Duplicate vote prevention enforced at the database level |
| 🕵️ **Confidential Ballot** | Anonymous vote recording — no link between voter identity and ballot choice |
| 📊 **Real-Time Results** | Live charts (Chart.js), vote distributions, and turnout statistics |
| 📜 **Digital Audit Ledger** | SHA-256 blockchain-style transaction log for tamper-resistant vote verification |
| 🏢 **Department-Scoped Elections** | Restrict voting eligibility to specific departments or voter groups |
| ⏱️ **Election Scheduling** | Set start/end times for elections with automatic status management |
| 🔑 **Shared Admin Access** | Generate moderator keys to delegate election management |
| 📄 **PDF Reports** | Export complete election results as downloadable PDF documents |
| 🌗 **Multi-Theme UI** | Light, Dark, and SIET College (Eye-Protection) themes |
| 📱 **Responsive Design** | Mobile-first, works on all screen sizes without horizontal overflow |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, Vanilla JavaScript (ES6 Modules), CSS3 (Custom Design System), Lucide Icons, Chart.js, Flatpickr, jsPDF |
| **Backend** | Python 3.10+, Django 5.x, Django REST Framework (DRF) |
| **Database** | MongoDB (Atlas or Local) via PyMongo |
| **Auth** | bcrypt password hashing, session tokens, admin access keys |
| **Deployment** | Gunicorn (production), Netlify (static frontend), Render/Railway (backend) |

---

## 📁 Project Structure

```
vote/
├── netlify.toml                # Netlify static hosting config
├── .gitignore                  # Git ignore rules
├── README.md                   # This file — project documentation
│
└── SafeVote/                   # Main application
    ├── index.html              # SPA shell (all views rendered here)
    ├── css/
    │   └── style.css           # Complete design system (3 themes)
    ├── js/
    │   ├── app.js              # Application logic, routing, UI rendering
    │   ├── api.js              # API client, session management, polling
    │   └── lucide.min.js       # Bundled icon library (local, no CDN delay)
    ├── voting.jpg              # Brand logo / favicon
    ├── .env                    # Environment variables (MongoDB URI, salts)
    ├── run.bat                 # Windows quick launcher
    ├── netlify.toml            # Frontend deploy config
    │
    └── backend/                # Django REST Framework API
        ├── manage.py           # Django CLI (runs on port 8081)
        ├── requirements.txt    # Python dependencies
        ├── run.bat             # Windows backend launcher
        ├── Procfile            # Gunicorn production entry point
        ├── safevote_backend/   # Django settings, URLs, WSGI/ASGI
        ├── accounts/           # Admin auth & moderator access control
        ├── elections/          # Election config, session sync, status
        ├── candidates/         # Candidate CRUD endpoints
        ├── voters/             # Student & Staff auth, registration lists
        ├── voting/             # Vote casting & SHA-256 ledger
        ├── utils/              # PyMongo helpers, security, throttling
        └── tests/              # Automated API test suite
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.10+
- **MongoDB** — running locally or a MongoDB Atlas cluster
- **pip** — Python package manager

### 1. Clone & Navigate

```bash
git clone https://github.com/ATKTharun1807/vote.git
cd vote/SafeVote/backend
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Create or verify `SafeVote/.env` with your credentials:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/safevote?retryWrites=true&w=majority
PORT=8081
ADMIN_KEY_SALT=safevote_admin_salt_2024
BLOCKCHAIN_SALT=safevote_secret_salt_2024
VOTER_SALT=safevote_salt_2024
```

### 5. Run the Server

```bash
python manage.py runserver
```

The server starts at **http://localhost:8081** — open this in your browser.

> **Quick Start (Windows):** Double-click `SafeVote/run.bat` or `SafeVote/backend/run.bat`.

---

## 🧪 Running Tests

```bash
cd SafeVote/backend
python manage.py test tests
```

---

## 🛠️ Management Commands

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Start development server on port 8081 |
| `python manage.py test tests` | Run API compatibility test suite |
| `python manage.py check_db_status` | Check MongoDB connection and collection counts |
| `python manage.py migrate_depts` | Migrate student department codes |
| `python manage.py update_passwords --password SIET --hash` | Bulk update student passwords |
| `python manage.py restore_data` | Restore data from local backup files |
| `python manage.py fix_collections` | Consolidate department collections |

---

## 🌐 Deployment

### Frontend (Netlify)

The frontend is purely static (HTML/CSS/JS). Deploy by pointing Netlify to the `SafeVote/` directory:

- **Build command:** *(none — no build step needed)*
- **Publish directory:** `SafeVote/`
- **Base directory:** `SafeVote/`

### Backend (Render / Railway)

Deploy the Django backend using Gunicorn:

```bash
gunicorn safevote_backend.wsgi:application --bind 0.0.0.0:$PORT
```

Set the `MONGO_URI` and salt environment variables in your hosting dashboard.

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Student** | Login → View ballot → Cast vote → View confirmation & ledger |
| **Staff** | Login → View ballot → Cast vote → View confirmation & ledger |
| **Admin** | Full election management: create/edit/delete candidates, start/pause/end elections, view turnout, export PDF reports, manage voter lists, schedule elections, generate shared access keys |

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

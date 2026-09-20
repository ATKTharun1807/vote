# 🧠 Project Memory & Context Tracker — Vote Chain (SafeVote)

## 1. Status Dashboard

- **Last Updated:** `2026-09-20`
- **Current Active Phase:** `Phase 6: Multi-Theme Polish & Test Suite Optimization`
- **Overall Project Progress:** `92%`
- **Backend Status:** `Operational (Django REST Framework on Port 8081)`
- **Frontend Status:** `Operational (Vanilla JS SPA / Netlify deployment ready)`
- **Database Status:** `Connected (MongoDB Atlas / PyMongo client)`

---

## 2. Active State Checkpoints

### ⚙️ Environment Configurations
- **Primary Configuration File:** `SafeVote/.env`
- **Active Environment Variables:**
  - `MONGO_URI`: Atlas / local connection string
  - `PORT`: `8081`
  - `ADMIN_KEY_SALT`: Salt string for moderator access validation
  - `BLOCKCHAIN_SALT`: Salt string for SHA-256 block ledger creation
  - `VOTER_SALT`: Salt string for voter authentication hashing

### 🗄️ Database Collections Map
- **`voters`**: Stores student/staff accounts, department tags, hashed passwords, and `has_voted` flags.
- **`candidates`**: Stores candidate names, positions, manifestos, department restrictions, and avatar URLs.
- **`elections`**: Stores election metadata, active state (`active`, `paused`, `ended`), start/end datetimes.
- **`votes`**: Stores anonymous cast ballots (decoupled from voter identity).
- **`ledger`**: Stores immutable SHA-256 block transactions with previous hash links.

---

## 3. Changelog & Architectural Decisions

### 📜 Key Decisions Made
1. **Vanilla JS SPA Architecture Choice:** Decided against React/Vue to maintain zero build steps, instant client loading times, and painless deployment via static hosting (Netlify).
2. **MongoDB via PyMongo Direct Driver:** Chosen over Django ORM to accommodate flexible JSON schemas for candidate profiles and rapid insertion of ledger transaction blocks.
3. **Cryptographic SHA-256 Chaining:** Implemented block-by-block hash linking in `voting/views.py` and `utils/security.py` to deliver tamper-evident auditability without heavy blockchain network overhead.
4. **SIET Eye-Protection Theme:** Designed custom green (`#006B3F`) and gold theme requested for institutional deployment to reduce eye strain during extended campus voting sessions.

---

## 4. Solved Issues & Fixes
- **Issue #1 (Duplicate Votes):** Fixed potential race condition during simultaneous vote submission by enforcing atomic `find_one_and_update` on the voter record in MongoDB.
- **Issue #2 (Department Code Mismatch):** Standardized uppercase department identifiers (`CSE`, `ECE`, `MECH`, `IT`, `CIVIL`, `EEE`, `AIDS`) via management command `python manage.py migrate_depts`.
- **Issue #3 (PDF Export Font Render):** Standardized canvas renderer in `jsPDF` integration to properly export full-width tables and candidate charts.

---

## 5. Immediate Next Steps & In-Progress Items
1. Complete automated API unit tests in `SafeVote/backend/tests/`.
2. Perform mobile viewport audit on small screens (<380px width).
3. Verify production deployment configurations on Render/Railway for Django WSGI service.

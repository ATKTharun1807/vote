# 📜 Development Rules & Guardrails — Vote Chain (SafeVote)

> **Mandatory AI & Developer Instruction:** Every AI model and developer contributing to this repository must follow these rules without deviation.

---

## 1. General Development Principles

1. **Read-First Architecture:** Always consult `PRD.md` and `ARCHITECTURE.md` before initiating structural or functional code changes.
2. **Modular & DRY Code:** Do not write duplicate helper functions. Leverage existing utilities in `js/api.js`, `SafeVote/backend/utils/database.py`, and `SafeVote/backend/utils/security.py`.
3. **Surgical, Focused Edits:** Make concise, targeted modifications. Never rewrite or wipe unrelated files or functions.
4. **Zero Regressions on Security:** Never weaken ballot anonymity, salt management, or atomic single-vote database checks.
5. **Empirical Verification:** Always verify python backend changes using `python manage.py test tests` or `python manage.py check_db_status` before concluding a task.

---

## 2. Technology & Coding Standards

### 🐍 Python Backend (Django 5.x & DRF)
- **Formatting & Style:** Strictly adhere to PEP 8 conventions (4 spaces indentation, snake_case variable and function names, PascalCase class names).
- **Database Access:** Use central PyMongo wrapper functions in `backend/utils/database.py` rather than opening raw unmanaged MongoClient instances.
- **Error Handling:** Every API endpoint in DRF views MUST return standard JSON error structures:
  ```json
  {
    "status": "error",
    "message": "Human-readable description of error"
  }
  ```
- **Environment Variables:** Never hardcode secret salts or database strings. Load from `os.environ` via `dotenv` in `safevote_backend/settings.py`.

### 🌐 Frontend JavaScript (ES6+ Vanilla)
- **Module Pattern:** Keep `app.js` responsible for UI state, rendering, and view switching. Keep `api.js` strictly focused on HTTP fetch requests, API endpoints, and session persistence.
- **Strict DOM Operations:** Always sanitize dynamic strings inserted into innerHTML to prevent XSS. Use element factory functions or template strings safely.
- **Asynchronous Flow:** Use `async / await` syntax for all API interactions with proper `try ... catch` error logging.
- **Zero Framework Bloat:** Do not introduce heavy frontend frameworks (React/Vue/Angular) unless explicitly requested. Preserve the ultra-fast Vanilla JS SPA architecture.

### 🎨 CSS & Design System (`css/style.css`)
- **Use CSS Variables:** All colors, spacing, borders, shadows, and radii must reference `:root` tokens.
- **Theme Integrity:** Any new UI component MUST support Light Mode, Dark Mode, and SIET Eye-Protection (`[data-theme="eye-protection"]`) mode seamlessly.
- **Responsive Layouts:** Design mobile-first. Use CSS Flexbox and Grid. Prevent horizontal scrollbar leaks (`overflow-x: hidden`).

---

## 3. Project Structure Constraints

| Asset Category | Target File Location | Rule / Constraint |
|----------------|----------------------|-------------------|
| **API Integration** | `SafeVote/js/api.js` | All HTTP fetch requests must pass through `APIClient` methods in this file. |
| **View Controllers** | `SafeVote/js/app.js` | Event listeners, routing, DOM element binding, dynamic UI updates belong here. |
| **Styling Tokens** | `SafeVote/css/style.css` | Define custom properties at `:root` level. No inline `style="..."` attributes in HTML unless calculating dynamic percentages (e.g. progress bars). |
| **Backend Endpoints**| `SafeVote/backend/<app>/views.py` | Keep views thin by offloading complex database or crypto logic to `utils/`. |
| **Database Helpers**| `SafeVote/backend/utils/database.py` | PyMongo collection getters (`get_voters_collection`, `get_votes_collection`, `get_ledger_collection`). |
| **Crypto & Security**| `SafeVote/backend/utils/security.py` | Hashing routines, SHA-256 block creation, and salt resolution. |

---

## 4. Testing & Quality Verification Rules
- Run `python manage.py test tests` after any backend code modification.
- Test all major breakpoints (Mobile 375px, Tablet 768px, Desktop 1280px) after modifying `style.css` or `index.html`.
- Confirm that database migrations or utility commands preserve existing MongoDB indexes and collection structure.

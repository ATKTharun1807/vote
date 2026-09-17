# 🛡️ SafeVote - Secure E-Voting & Election Management System

SafeVote is a modern, web-based electronic voting and election management platform designed for academic institutions, organizations, and department elections. It offers secure voter authentication, candidate management, department-scoped elections, live vote tracking, and real-time result analytics.

---

## ✨ Features

- 🔒 **Secure & Confidential Voting**: Built-in credential hashing (PBKDF2/bcrypt) and tamper-resistant vote recording to ensure privacy and data integrity.
- 👥 **Role-Based Access Control**:
  - **Admin**: Create and manage elections, manage candidate rosters, oversee voter registration, monitor live election progress, and export results.
  - **Voters**: Secure authentication (students & staff), department-filtered ballot casting, and voting history verification.
  - **Candidates**: Profile visibility, manifestos, and real-time tally visibility.
- 📊 **Real-Time Analytics & Results**: Live visual charts, vote distributions, and turnout statistics.
- 🏢 **Multi-Department Support**: Scoped voting based on departments, faculties, or customized voter categories.
- 🐍 **High-Performance Django REST Backend**: Powered by Python, Django, Django REST Framework (DRF), and PyMongo directly connected to MongoDB.
- 🎨 **Responsive Modern UI**: Modern dark theme aesthetics, responsive layouts, glassmorphism UI elements, and interactive animations.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6 Modules), CSS3 (Custom Design System & Dynamic Animations), Chart.js.
- **Backend (Python/Django)**: Python 3.10+, Django 5.x, Django REST Framework (DRF), `django-cors-headers`, `pymongo`, `python-dotenv`, `bcrypt`.
- **Database**: MongoDB Atlas / Local MongoDB.
- **Legacy/Backup Server**: Node.js, Express.js (retained in `server.js` for fallback).

---

## 📁 Repository Structure

```
vote/
├── netlify.toml               # Netlify configuration & redirects
├── README.md                  # Project documentation
└── SafeVote/                  # Primary application codebase
    ├── backend/               # Python Django REST Framework Backend
    │   ├── manage.py          # Django CLI utility (runs on port 8081 by default)
    │   ├── requirements.txt   # Python dependencies
    │   ├── run.bat            # Windows quick launcher for Django server
    │   ├── safevote_backend/  # Core Django configuration (settings, urls, wsgi, asgi)
    │   ├── accounts/          # Admin authentication & moderator access control
    │   ├── elections/         # Election configuration, session sync & status
    │   ├── candidates/        # Candidate management endpoints
    │   ├── voters/            # Student & Staff voter authentication and lists
    │   ├── voting/            # Voting logic & SHA-256 blockchain verification
    │   ├── utils/             # Database (PyMongo), security & throttling helpers
    │   └── tests/             # Automated API compatibility test suite
    ├── css/                   # Custom styles & design tokens
    ├── js/                    # Client-side scripts (app.js, api.js, config.js)
    ├── index.html             # Application Single Page Interface (SPA)
    ├── voting.jpg             # Assets
    ├── run.bat                # Root Windows launcher
    ├── .env                   # Environment variable configurations
    └── server.js              # Node.js backend (legacy reference)
```

---

## 🚀 Getting Started (Django Backend)

### Prerequisites

- **Python**: v3.10 or higher
- **MongoDB**: A running MongoDB instance (Local or MongoDB Atlas cluster)

### Installation & Setup

1. **Navigate to the Django backend directory**:
   ```bash
   cd SafeVote/backend
   ```

2. **Create and activate a virtual environment**:
   - On Windows:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Ensure `.env` exists in `SafeVote/` with your credentials:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/safevote?retryWrites=true&w=majority
   PORT=8081
   ADMIN_KEY_SALT=safevote_admin_salt_2024
   BLOCKCHAIN_SALT=safevote_secret_salt_2024
   VOTER_SALT=safevote_salt_2024
   ```

### Running the Server

Start the Django development server:

```bash
python manage.py runserver
```
*(By default, the server runs on `0.0.0.0:8081`, perfectly matching frontend expectations!)*

Or double-click `SafeVote/run.bat` or `SafeVote/backend/run.bat` on Windows.

Open your browser and navigate to:
```
http://localhost:8081
```

---

## 🧪 Running Automated Tests

Run the comprehensive API compatibility test suite:

```bash
python manage.py test tests
```

---

## 🛠️ Django Management Commands

Equivalent Python commands for administrative operations:

- **Check Database & Collection Counts**:
  ```bash
  python manage.py check_db_status
  ```

- **Migrate Student Department Codes**:
  ```bash
  python manage.py migrate_depts
  ```

- **Update Student Passwords**:
  ```bash
  python manage.py update_passwords --password SIET --hash
  ```

- **Restore Data from Local Files**:
  ```bash
  python manage.py restore_data
  ```

- **Consolidate Department Collections**:
  ```bash
  python manage.py fix_collections
  ```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

# SafeVote — Application Core

This directory contains the main source code for the Vote Chain election system.

For full project documentation, setup instructions, and deployment guides, see the [Root README](../README.md).

## Quick Start

```bash
# Navigate to the backend
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
python manage.py runserver
```

Then open **http://localhost:8081** in your browser.

## Directory Layout

| Path | Purpose |
|------|---------|
| `index.html` | Single Page Application shell |
| `css/style.css` | Complete design system (light, dark, SIET themes) |
| `js/app.js` | Application logic, routing, and UI rendering |
| `js/api.js` | API client, session management, data polling |
| `js/lucide.min.js` | Bundled icon library |
| `backend/` | Django REST Framework API server |
| `.env` | MongoDB URI and security salts |
| `voting.jpg` | Brand logo |

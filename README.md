# SecureVote Chain - Student Election System

This is a modularized version of the SecureVote Chain application, separated into frontend, backend, db, and api folders.

## Project Structure

```
vote/
├── frontend/
│   ├── index.html      # Main HTML structure
│   ├── styles.css      # CSS styles
│   └── app.js          # UI logic and app initialization
├── backend/
│   └── voting-api.js   # Backend API simulation (Firebase-based)
├── api/
│   └── crypto-utils.js # Cryptography utilities
├── db/
│   └── firebase-config.js # Firebase configuration and initialization
└── README.md           # Project documentation
```

## Components

- **Frontend**: Contains the user interface, HTML, CSS, and JavaScript for the client-side application.
- **Backend**: Contains the VotingAPI class that handles backend operations via Firebase (authentication, database, real-time updates).
- **API**: Contains utility functions like cryptography.
- **DB**: Handles Firebase configuration and initialization.

## Setup

1. Ensure you have a Firebase project set up.
2. Configure the Firebase config (injected via global variables `__firebase_config` and `__app_id`).
3. Serve the `frontend/index.html` file from a local server to handle ES modules.

## Running the Application

Since the app uses ES modules and relative imports, it needs to be served from a web server. You can use:

- Python: `python -m http.server 8000`
- Node.js: `npx serve .`
- Or any other static file server.

Then open `http://localhost:8000/frontend/index.html` in your browser.
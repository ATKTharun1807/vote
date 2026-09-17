# 🛡️ SafeVote - Secure E-Voting & Election Management System

SafeVote is a modern, web-based electronic voting and election management platform designed for academic institutions, organizations, and department elections. It offers secure voter authentication, candidate management, department-scoped elections, live vote tracking, and real-time result analytics.

---

## ✨ Features

- 🔒 **Secure & Confidential Voting**: Built-in credential hashing (PBKDF2/bcrypt) and tamper-resistant vote recording to ensure privacy and data integrity.
- 👥 **Role-Based Access Control**:
  - **Admin**: Create and manage elections, manage candidate rosters, oversee voter registration, monitor live election progress, and export results.
  - **Voters**: Secure authentication, department-filtered ballot casting, and voting history verification.
  - **Candidates**: Profile visibility, manifestos, and real-time tally visibility.
- 📊 **Real-Time Analytics & Results**: Live visual charts, vote distributions, and turnout statistics.
- 🏢 **Multi-Department Support**: Scoped voting based on departments, faculties, or customized voter categories.
- ⚡ **Dual Deployment Architecture**: Supports both traditional Node.js Express server hosting and serverless deployment via Netlify Functions.
- 🎨 **Responsive Modern UI**: Modern dark theme aesthetics, responsive layouts, glassmorphism UI elements, and interactive animations.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6 Modules), CSS3 (Custom Design System & Dynamic Animations), Chart.js / Firebase integrations.
- **Backend**: Node.js, Express.js, Mongoose (MongoDB Atlas / Local MongoDB).
- **Security & Utilities**: `bcryptjs`, `express-rate-limit`, `dotenv`, `cors`, `crypto`.
- **Deployment**: Netlify Functions (`serverless-http`), Netlify Redirects.

---

## 📁 Repository Structure

```
vote/
├── netlify.toml               # Netlify root configuration & redirects
└── SafeVote/                  # Primary application codebase
    ├── api/                   # Serverless API routes
    ├── backend/               # MongoDB models & database connections
    ├── css/                   # Custom styles & design tokens
    ├── js/                    # Client-side scripts (app.js, api.js, config.js)
    ├── netlify/               # Netlify serverless functions wrapper
    ├── index.html             # Application Single Page Interface (SPA)
    ├── server.js              # Express backend server entry point
    ├── package.json           # Node.js dependencies and run scripts
    ├── run.bat                # Windows quick launcher script
    ├── .env                   # Environment variable configurations
    └── *.js                   # Maintenance & DB utility scripts (migration, password update, restore)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **MongoDB**: A running MongoDB instance (Local or MongoDB Atlas cluster)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ATKTharun1807/vote.git
   cd vote/SafeVote
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create or edit the `.env` file in the `SafeVote` directory:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/safevote?retryWrites=true&w=majority
   PORT=8081
   ADMIN_KEY_SALT=safevote_admin_salt_2024
   BLOCKCHAIN_SALT=safevote_secret_salt_2024
   VOTER_SALT=safevote_salt_2024
   ```

### Running Locally

Start the local Node.js Express server:

```bash
npm start
```

Or using Node directly:

```bash
node server.js
```

Open your browser and navigate to:
```
http://localhost:8081
```

---

## 🌐 Deploying to Netlify

The repository includes `netlify.toml` pre-configured to route API requests to Netlify Serverless Functions:

1. Connect your repository to Netlify.
2. Set the build settings:
   - **Base directory**: `SafeVote`
   - **Build command**: `npm install`
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
3. Configure your Environment Variables (`MONGO_URI`, `PORT`, etc.) in the Netlify Dashboard under **Site settings > Environment variables**.
4. Deploy the site.

---

## 🛠️ Database Utility & Maintenance Scripts

Inside the `SafeVote/` directory, several utility scripts are available for administrative and maintenance operations:

- `check_db_status.js` - Inspect MongoDB connection and collection record counts.
- `migrate_depts.js` - Migrate voter and election data schemas across department structures.
- `update_passwords.js` - Hash and update voter or admin credentials.
- `restore_data.js` - Restore or seed default data collections.
- `fix_collections.js` - Repair mismatched collection indexes or document structures.

Run any script using Node:
```bash
node check_db_status.js
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

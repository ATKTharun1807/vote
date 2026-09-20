# 🗳️ Product Requirements Document (PRD) — Vote Chain (SafeVote)

## 1. Product Overview
**Vote Chain (SafeVote)** is a secure, modern, full-stack electronic voting and election management system designed specifically for academic institutions and organizations. It provides end-to-end election management, starting from voter registration and candidate setup, to department-scoped ballot casting, real-time analytics, downloadable PDF audit reports, and a tamper-evident digital ledger powered by SHA-256 hashing.

---

## 2. Problem Statement
Traditional voting methods in colleges and academic institutions suffer from key vulnerabilities:
- **Paper Ballot Inefficiencies:** High resource usage, slow manual counting, risk of lost or miscounted votes.
- **Voter Fraud & Double Voting:** Lack of automated single-vote verification per student/staff member.
- **Lack of Transparency:** Voters have limited visibility into whether their vote was properly tallied without compromising ballot anonymity.
- **Rigid Election Scopes:** Difficulty in organizing targeted elections restricted to specific departments, semesters, or voter categories.

SafeVote solves these problems by providing a high-speed, secure, transparent, and department-scoped digital voting platform with single-vote enforcement and cryptographic audit trails.

---

## 3. Goals & Key Objectives
- **Security & Integrity:** Ensure "One Person, One Vote" through atomic database checks while maintaining strict ballot anonymity.
- **Tamper Evident Auditability:** Maintain an immutable SHA-256 voter ledger to allow cryptographic verification of election integrity.
- **User-Centric Accessibility:** Deliver a responsive, fast-loading Single Page Application (SPA) supporting multiple high-contrast and eye-protection themes.
- **Real-Time Visibility:** Provide administrators and voters with real-time turnout metrics, live chart visualizations, and instant PDF result exports.
- **Role-Based Governance:** Delegate election oversight through secure moderator keys and administrative permissions.

---

## 4. Target Users & Personas

| User Role | Demographic / Profile | Specific Needs & Workflows |
|-----------|----------------------|---------------------------|
| **Student Voter** | Undergraduate / Postgraduate students | Quick login via Reg No / Password, clear candidate view, smooth vote submission, receipt/ledger receipt code. |
| **Staff Voter** | Academic & administrative staff | Departmental vote access, secure single-vote casting, clear user interface. |
| **Election Administrator** | Department Heads / Election Committee | Create/edit candidates, start/pause/complete elections, view live turnout, export PDF reports, generate access keys. |
| **System Auditor** | Administrative Oversight / Faculty Lead | Inspect cryptographic SHA-256 ledger, verify hash integrity, inspect voter turnout vs database records. |

---

## 5. Core Features & Scope (MVP)

### 🔑 A. Authentication & Access Control
- **Multi-Role Login:** Login support for Students, Staff, and Administrators.
- **Password Security:** Salted PBKDF2 / bcrypt hash verification.
- **Admin Access Keys:** Shared moderator access key generation with salt hashing (`ADMIN_KEY_SALT`).

### 🗳️ B. Candidate & Department Management
- **Candidate CRUD:** Add, update, delete candidates with photos, manifestos, positions, and department filters.
- **Department Scope:** Restrict voting eligibility to specific departments (e.g., CSE, ECE, MECH, IT) or all-college scope.

### 📜 C. Voting Engine & Digital Ledger
- **One Person — One Vote:** Database-level duplicate vote prevention using PyMongo atomic updates.
- **Anonymous Ballots:** Complete decoupling of voter identity from candidate choice in the vote records.
- **SHA-256 Ledger:** Blockchain-inspired sequential ledger with cryptographic hashes (`BLOCKCHAIN_SALT`).

### 📊 D. Analytics & Export
- **Real-Time Dashboards:** Dynamic charts powered by Chart.js for live vote counts and department turnouts.
- **PDF Report Generation:** One-click downloadable election summary PDFs via jsPDF.

### 🌗 E. User Interface & Themes
- **Responsive SPA:** Zero full-page reloads, modular JavaScript UI controllers (`app.js`, `api.js`).
- **Multi-Theme Support:** Light Mode, Dark Mode, and SIET Eye-Protection Mode (`#006B3F` primary tone).

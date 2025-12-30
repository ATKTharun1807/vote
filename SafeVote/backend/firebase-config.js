// --- BACKEND CONFIGURATION ---
// This file centralizes the connection to the Firebase backend.

const getGlobal = (name, fallback = null) => {
    try { return window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : fallback); }
    catch (e) { return fallback; }
};

// Default configuration placeholder
const DEFAULT_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const rawConfig = getGlobal('__firebase_config');
export const firebaseConfig = rawConfig ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig) : DEFAULT_CONFIG;

export const appId = getGlobal('__app_id', 'voting-ocean');
export const initialToken = getGlobal('__initial_auth_token');

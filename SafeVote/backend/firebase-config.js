// --- BACKEND CONFIGURATION ---
// This file centralizes the connection to the Firebase backend.

const getGlobal = (name, fallback = null) => {
    try { return window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : fallback); }
    catch (e) { return fallback; }
};

// Default configuration placeholder
const DEFAULT_CONFIG = {
    apiKey: "AIzaSyDJLLmO_ww1izEMkBItiJhSN-IErRKveGM",
    authDomain: "votechain-3aeb9.firebaseapp.com",
    projectId: "votechain-3aeb9",
    storageBucket: "votechain-3aeb9.firebasestorage.app",
    messagingSenderId: "926380124576",
    appId: "1:926380124576:web:28c76a70b8cc74c41d5cc5"
};



const rawConfig = getGlobal('__firebase_config');
export const firebaseConfig = rawConfig ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig) : DEFAULT_CONFIG;

export const appId = getGlobal('__app_id', 'voting-ocean');
export const initialToken = getGlobal('__initial_auth_token');

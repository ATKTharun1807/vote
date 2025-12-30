// --- FIREBASE CONFIGURATION ---
// You can directly paste your Firebase config here if not using environment variables.

const getGlobal = (name, fallback = null) => {
    try {
        return window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : fallback);
    } catch (e) {
        return fallback;
    }
};

// Fallback / Example Config
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSy...", // Replace with your key
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

const rawConfig = getGlobal('__firebase_config');
export const firebaseConfig = rawConfig ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig) : DEFAULT_FIREBASE_CONFIG;

export const appId = getGlobal('__app_id', 'voting-ocean');
export const initialToken = getGlobal('__initial_auth_token');

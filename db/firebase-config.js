// --- FIREBASE CONFIGURATION ---
// Firebase config is expected to be injected via global variables __firebase_config and __app_id
// This file handles Firebase initialization

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let firebaseApp, auth, db, appId;

export function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        if (firebaseConfig) {
            firebaseApp = initializeApp(firebaseConfig);
            auth = getAuth(firebaseApp);
            db = getFirestore(firebaseApp);
            appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app';
            return { firebaseApp, auth, db, appId };
        } else {
            console.error("Firebase config is missing.");
            return null;
        }
    } catch (e) {
        console.error("Error initializing Firebase:", e);
        return null;
    }
}

export { auth, db, appId };
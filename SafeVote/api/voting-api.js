import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, serverTimestamp, increment, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, appId, initialToken } from "../backend/firebase-config.js";

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const PATHS = (id) => ({
    candidates: `artifacts/${id}/public/data/candidates`,
    blocks: `artifacts/${id}/public/data/blocks`,
    voters: `artifacts/${id}/public/data/voters`,
    config: `artifacts/${id}/public/data/config`
});

// --- API CLASS ---
export class VotingAPI {
    constructor() {
        this.electionStatus = 'NOT_STARTED'; this.adminKey = 'admin123';
        this.localCandidates = []; this.localBlockchain = [];
        this.totalVotersCount = 0; this.voterIds = [];
    }
    async initAuth() {
        if (!auth) return;
        try {
            if (initialToken) await signInWithCustomToken(auth, initialToken);
            else await signInAnonymously(auth);

            const p = PATHS(appId);
            onSnapshot(doc(db, p.config, 'main'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    this.electionStatus = data.status || 'NOT_STARTED';
                    if (data.adminKey) this.adminKey = data.adminKey;
                    if (window.app) window.app.refreshUI();
                } else { setDoc(doc(db, p.config, 'main'), { status: 'NOT_STARTED', adminKey: 'admin123' }); }
            });

            onSnapshot(collection(db, p.candidates), (snap) => {
                this.localCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (window.app) window.app.refreshUI();
            });

            onSnapshot(collection(db, p.blocks), (snap) => {
                this.localBlockchain = snap.docs.map(d => d.data()).sort((a, b) => a.index - b.index);
                if (window.app) window.app.refreshUI();
            });

            onSnapshot(collection(db, p.voters), (snap) => {
                this.totalVotersCount = snap.size;
                this.voterIds = snap.docs.map(d => d.id);
                if (window.app) window.app.refreshUI();
            });
        } catch (e) { console.error("Firebase Connection Error:", e); }
    }
    async castVote(vid, cid) {
        const snap = await getDoc(doc(db, PATHS(appId).voters, vid.toString()));
        if (snap.exists()) return { success: false, msg: "Already voted." };
        const last = this.localBlockchain[this.localBlockchain.length - 1] || { hash: "0", index: -1 };
        const hash = Math.random().toString(36).substring(2, 12);
        const block = { index: last.index + 1, timestamp: new Date().toISOString(), data: { voterHash: vid, candidateId: cid }, previousHash: last.hash, hash: hash };
        try {
            await setDoc(doc(db, PATHS(appId).voters, vid.toString()), { votedAt: serverTimestamp() });
            await addDoc(collection(db, PATHS(appId).blocks), block);
            await updateDoc(doc(db, PATHS(appId).candidates, cid), { votes: increment(1) });
            return { success: true };
        } catch (e) { return { success: false, msg: "Database error." }; }
    }
    async resetElection() {
        try {
            const cSnaps = await getDocs(collection(db, PATHS(appId).candidates));
            const batch = writeBatch(db);
            cSnaps.forEach(d => batch.update(d.ref, { votes: 0 }));
            await batch.commit();
            const vSnaps = await getDocs(collection(db, PATHS(appId).voters));
            const bSnaps = await getDocs(collection(db, PATHS(appId).blocks));
            for (const d of vSnaps.docs) await deleteDoc(d.ref);
            for (const d of bSnaps.docs) await deleteDoc(d.ref);
            await setDoc(doc(db, PATHS(appId).config, 'main'), { status: 'NOT_STARTED' }, { merge: true });
            return true;
        } catch (e) { return false; }
    }
    async deleteCandidate(id) { await deleteDoc(doc(db, PATHS(appId).candidates, id)); }
    async addCandidate(n, p) { await addDoc(collection(db, PATHS(appId).candidates), { name: n, party: p, votes: 0, addedAt: serverTimestamp() }); }
    async updateStatus(s) { await setDoc(doc(db, PATHS(appId).config, 'main'), { status: s }, { merge: true }); }
    async updateAdminKey(k) { await setDoc(doc(db, PATHS(appId).config, 'main'), { adminKey: k }, { merge: true }); }
}

export const api = new VotingAPI();
window.api = api;

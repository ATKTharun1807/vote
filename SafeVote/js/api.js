import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, serverTimestamp, increment, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, appId, initialToken } from './config.js';

export class VotingAPI {
    constructor() {
        this.electionName = 'Student Council Election';
        this.electionStatus = 'NOT_STARTED';
        this.adminKey = 'admin123';
        this.localCandidates = [];
        this.localBlockchain = [];
        this.totalVotersCount = 0;
        this.voterIds = [];
        this.persistentStudentPasswords = {}; // Storage for student passwords
        this.useLocalStorage = false;

        // Load initial state from LocalStorage as a fallback safety
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('safevote_backup') || '{}');
            this.localCandidates = data.candidates || [];
            this.localBlockchain = data.blockchain || [];
            this.voterIds = data.voters || [];
            this.persistentStudentPasswords = data.studentPasswords || {};
            this.totalVotersCount = this.voterIds.length;
            this.electionStatus = data.status || 'NOT_STARTED';
            this.electionName = data.electionName || 'Student Council Election';
            this.adminKey = data.adminKey || 'admin123';
        } catch (e) {
            console.error("Storage load failed", e);
        }
    }

    saveToStorage() {
        if (!this.useLocalStorage) return;
        this.totalVotersCount = this.voterIds.length; // Sync turnout count
        const data = {
            candidates: this.localCandidates,
            blockchain: this.localBlockchain,
            voters: this.voterIds,
            studentPasswords: this.persistentStudentPasswords,
            status: this.electionStatus,
            electionName: this.electionName,
            adminKey: this.adminKey
        };
        localStorage.setItem('safevote_backup', JSON.stringify(data));
        if (window.app) window.app.refreshUI();
    }

    verifyStudent(vid, pass) {
        const stored = this.persistentStudentPasswords[vid.toString()] || 'atkboss';
        return stored === pass;
    }

    async updateStudentPassword(vid, newPass) {
        // Update local state immediately for instant feedback
        this.persistentStudentPasswords[vid.toString()] = newPass;

        if (this.useLocalStorage) {
            this.saveToStorage();
            return true;
        }

        try {
            const configRef = doc(this.db, this.PATHS().config, 'main');
            // Use dot notation to update ONLY this student's password without affecting others
            await updateDoc(configRef, {
                [`studentPasswords.${vid}`]: newPass
            });
            return true;
        } catch (e) {
            console.error("Firestore Update Failed, trying fallback:", e);
            try {
                // If updateDoc failed (likely map doesn't exist), try to set it but ONLY if we can avoid overwriting
                const snap = await getDoc(doc(this.db, this.PATHS().config, 'main'));
                const curData = snap.exists() ? snap.data() : {};
                const passwords = curData.studentPasswords || {};
                passwords[vid.toString()] = newPass;

                await setDoc(doc(this.db, this.PATHS().config, 'main'), {
                    studentPasswords: passwords
                }, { merge: true });
                return true;
            } catch (e2) {
                console.error("Firebase Password Update Failed completely:", e2);
                return false;
            }
        }
    }

    async updateAdminKey(newKey) {
        this.adminKey = newKey;
        if (this.useLocalStorage) {
            this.saveToStorage();
            return true;
        }
        await setDoc(doc(this.db, this.PATHS().config, 'main'), { adminKey: newKey }, { merge: true });
        return true;
    }

    async initAuth() {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "placeholder" || firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
            console.warn("⚠️ LocalStorage Mode: No Firebase config.");
            this.useLocalStorage = true;
            this.loadFromStorage();
            return true;
        }

        try {
            const fbApp = initializeApp(firebaseConfig);
            const auth = getAuth(fbApp);
            const db = getFirestore(fbApp);
            this.db = db;
            this.isLive = false;

            // Must authenticate to write to Firestore in most configurations
            try {
                if (initialToken) await signInWithCustomToken(auth, initialToken);
                else await signInAnonymously(auth);
            } catch (authErr) {
                console.warn("Auth failed, proceeding anyway:", authErr);
            }

            const p = this.PATHS();

            // Real-time Dashboard Sync (Election Control)
            onSnapshot(doc(db, p.config, 'main'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    this.electionStatus = data.status || 'NOT_STARTED';
                    this.electionName = data.electionName || 'Student Council Election';
                    this.adminKey = data.adminKey || 'admin123';
                    this.persistentStudentPasswords = data.studentPasswords || {};
                    this.isLive = true;
                    if (window.app) window.app.refreshUI();
                } else {
                    setDoc(doc(db, p.config, 'main'), { status: 'NOT_STARTED', adminKey: 'admin123', electionName: 'Student Council Election', studentPasswords: {} });
                }
            }, (err) => console.error("Config Sync Error:", err));

            // Real-time Candidate Sync
            onSnapshot(collection(db, p.candidates), (snap) => {
                this.localCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (window.app) window.app.refreshUI();
            });

            // Real-time Blockchain Sync
            onSnapshot(collection(db, p.blocks), (snap) => {
                this.localBlockchain = snap.docs.map(d => d.data()).sort((a, b) => a.index - b.index);
                if (window.app) window.app.refreshUI();
            });

            // Real-time Turnout Sync
            onSnapshot(collection(db, p.voters), (snap) => {
                this.totalVotersCount = snap.size;
                this.voterIds = snap.docs.map(d => d.id);
                if (window.app) window.app.refreshUI();
            });

            console.info(`🔥 Real-time Firebase Active: ${firebaseConfig.projectId}`);
            return true;
        } catch (e) {
            console.error("❌ Firebase Connection Failed!", e);
            this.useLocalStorage = true;
            this.loadFromStorage();
            return true;
        }
    }

    PATHS() {
        return {
            candidates: `candidates`,
            blocks: `blocks`,
            voters: `voters`,
            config: `config`
        };
    }

    async castVote(vid, cid) {
        if (this.voterIds.includes(vid.toString())) return { success: false, msg: "Already voted." };

        const block = {
            index: this.localBlockchain.length,
            timestamp: new Date().toISOString(),
            data: { voterHash: vid, candidateId: cid },
            previousHash: this.localBlockchain.length > 0 ? this.localBlockchain[this.localBlockchain.length - 1].hash : "0",
            hash: Math.random().toString(36).substring(2, 12)
        };

        if (this.useLocalStorage) {
            this.voterIds.push(vid.toString());
            this.localBlockchain.push(block);
            const cand = this.localCandidates.find(c => c.id === cid);
            if (cand) cand.votes = (cand.votes || 0) + 1;

            this.saveToStorage();
            return { success: true };
        }

        try {
            const p = this.PATHS();
            const batch = writeBatch(this.db);
            batch.set(doc(this.db, p.voters, vid.toString()), { votedAt: serverTimestamp() });
            const newBlockRef = doc(collection(this.db, p.blocks));
            batch.set(newBlockRef, block);
            batch.update(doc(this.db, p.candidates, cid), { votes: increment(1) });

            await batch.commit();
            return { success: true };
        } catch (e) {
            return { success: false, msg: "Database error." };
        }
    }

    async updateStatus(s) {
        this.electionStatus = s;
        if (this.useLocalStorage) {
            this.saveToStorage();
            return;
        }
        await setDoc(doc(this.db, this.PATHS().config, 'main'), { status: s }, { merge: true });
    }

    async updateElectionName(name) {
        this.electionName = name;
        if (this.useLocalStorage) {
            this.saveToStorage();
            return;
        }
        await setDoc(doc(this.db, this.PATHS().config, 'main'), { electionName: name }, { merge: true });
    }

    async addCandidate(name, party) {
        const newCand = {
            name,
            party,
            votes: 0,
            addedAt: new Date().toISOString()
        };

        if (this.useLocalStorage) {
            newCand.id = 'local_' + Date.now();
            this.localCandidates.push(newCand);
            this.saveToStorage();
            return true;
        }

        try {
            await addDoc(collection(this.db, this.PATHS().candidates), {
                ...newCand,
                addedAt: serverTimestamp()
            });
            return true;
        } catch (e) {
            console.error("Firebase Add Error:", e);
            throw e;
        }
    }

    async deleteCandidate(id) {
        if (this.useLocalStorage) {
            this.localCandidates = this.localCandidates.filter(c => c.id !== id);
            this.saveToStorage();
            return;
        }
        await deleteDoc(doc(this.db, this.PATHS().candidates, id));
    }

    async resetElection() {
        if (this.useLocalStorage) {
            this.localCandidates.forEach(c => c.votes = 0);
            this.localBlockchain = [];
            this.voterIds = [];
            this.electionStatus = 'NOT_STARTED';
            this.saveToStorage();
            return true;
        }

        try {
            const p = this.PATHS();
            const cSnaps = await getDocs(collection(this.db, p.candidates));
            const batch = writeBatch(this.db);
            cSnaps.forEach(d => batch.update(d.ref, { votes: 0 }));
            await batch.commit();

            const vSnaps = await getDocs(collection(this.db, p.voters));
            const bSnaps = await getDocs(collection(this.db, p.blocks));

            for (const d of vSnaps.docs) await deleteDoc(d.ref);
            for (const d of bSnaps.docs) await deleteDoc(d.ref);

            await setDoc(doc(this.db, p.config, 'main'), { status: 'NOT_STARTED' }, { merge: true });
            return true;
        } catch (e) {
            console.error("Reset failed:", e);
            return false;
        }
    }
}

export const api = new VotingAPI();
window.api = api;

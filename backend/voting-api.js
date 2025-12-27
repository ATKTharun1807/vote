// --- BACKEND API SIMULATION ---
// This simulates backend API calls using Firebase Firestore
// In a real backend, this would be server-side code with proper authentication and database

import { collection, doc, setDoc, getDoc, getDocs, updateDoc, onSnapshot, query, orderBy, serverTimestamp, increment, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth, db, appId, initializeFirebase } from "../db/firebase-config.js";
import { CryptoUtils } from "../api/crypto-utils.js";

export class VotingAPI {
    constructor() {
        this.user = null;
        this.electionStatus = 'NOT_STARTED';
        this.adminKey = 'admin123';
        this.localCandidates = [];
        this.localBlockchain = [];
        this.localVoters = new Set();
        this.useFirebase = true;
    }

    async initAuth() {
        const firebaseInit = initializeFirebase();
        if (!firebaseInit) {
            this.useFirebase = false;
            // Load from localStorage
            this.localCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');
            this.localBlockchain = JSON.parse(localStorage.getItem('blocks') || '[]');
            this.localVoters = new Set(JSON.parse(localStorage.getItem('voters') || '[]'));
            this.electionStatus = localStorage.getItem('electionStatus') || 'NOT_STARTED';
            this.adminKey = localStorage.getItem('adminKey') || 'admin123';
            return;
        }

        this.useFirebase = true;
        // Paths for Firestore
        this.PATHS = {
            candidates: `artifacts/${appId}/public/data/candidates`,
            blocks: `artifacts/${appId}/public/data/blocks`,
            voters: `artifacts/${appId}/public/data/voters`,
            config: `artifacts/${appId}/public/data/config`
        };

        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }

            // Listeners
            onSnapshot(doc(db, this.PATHS.config, 'main'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    this.electionStatus = data.status || 'NOT_STARTED';
                    if (data.adminKey) this.adminKey = data.adminKey;
                    if(window.app) window.app.refreshUI();
                } else {
                    setDoc(doc(db, this.PATHS.config, 'main'), { status: 'NOT_STARTED', adminKey: 'admin123' });
                }
            });

            onSnapshot(collection(db, this.PATHS.candidates), (snap) => {
                this.localCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if(window.app) window.app.refreshUI();
            });

            onSnapshot(collection(db, this.PATHS.blocks), (snap) => {
                const blocks = snap.docs.map(d => d.data());
                this.localBlockchain = blocks.sort((a, b) => a.index - b.index);
                if(window.app) window.app.refreshUI();
            });
        } catch (e) {
            console.error("Auth/Init Error:", e);
        }
    }

    async checkVoterStatus(voterId) {
        if (!this.useFirebase) {
            return this.localVoters.has(voterId.toString());
        }
        if(!db) return false;
        try {
            const docRef = doc(db, this.PATHS.voters, voterId.toString());
            const snap = await getDoc(docRef);
            return snap.exists();
        } catch (e) { return false; }
    }

    async castVote(voterId, candidateId) {
        if (!this.useFirebase) {
            if (this.electionStatus !== 'ONGOING') return { success: false, msg: "Election is not active." };
            if (this.localVoters.has(voterId.toString())) return { success: false, msg: "Already voted." };
            this.localVoters.add(voterId.toString());
            localStorage.setItem('voters', JSON.stringify([...this.localVoters]));
            const lastBlock = this.localBlockchain[this.localBlockchain.length - 1] || { hash: "0", index: -1 };
            const newIndex = lastBlock.index + 1;
            const voteData = { voterHash: CryptoUtils.simpleHash(voterId.toString()), candidateId: candidateId };
            const newBlock = CryptoUtils.generateBlock(newIndex, lastBlock.hash, voteData);
            this.localBlockchain.push(newBlock);
            localStorage.setItem('blocks', JSON.stringify(this.localBlockchain));
            const cand = this.localCandidates.find(c => c.id === candidateId);
            if (cand) {
                cand.votes++;
                localStorage.setItem('candidates', JSON.stringify(this.localCandidates));
            }
            if(window.app) window.app.refreshUI();
            return { success: true };
        }
        if (!auth || !auth.currentUser) return { success: false, msg: "Auth Error" };
        if (this.electionStatus !== 'ONGOING') return { success: false, msg: "Election is not active." };
        const hasVoted = await this.checkVoterStatus(voterId);
        if (hasVoted) return { success: false, msg: "Already voted." };
        const lastBlock = this.localBlockchain[this.localBlockchain.length - 1] || { hash: "0", index: -1 };
        const newIndex = lastBlock.index + 1;
        const voteData = { 
            voterHash: CryptoUtils.simpleHash(voterId.toString()), 
            candidateId: candidateId 
        };
        const newBlock = CryptoUtils.generateBlock(newIndex, lastBlock.hash, voteData);
        try {
            await setDoc(doc(db, this.PATHS.voters, voterId.toString()), { votedAt: serverTimestamp() });
            await addDoc(collection(db, this.PATHS.blocks), newBlock);
            await updateDoc(doc(db, this.PATHS.candidates, candidateId), { votes: increment(1) });
            return { success: true };
        } catch (e) { return { success: false, msg: "Transaction failed." }; }
    }

    async addCandidate(name, party) {
        if (!this.useFirebase) {
            this.localCandidates.push({ id: Date.now().toString(), name, party, votes: 0 });
            localStorage.setItem('candidates', JSON.stringify(this.localCandidates));
            if(window.app) window.app.refreshUI();
            return;
        }
        if(!db) return false;
        await setDoc(doc(collection(db, this.PATHS.candidates)), { name, party, votes: 0, addedAt: serverTimestamp() });
    }

    async updateStatus(status) {
        if (!this.useFirebase) {
            this.electionStatus = status;
            localStorage.setItem('electionStatus', status);
            if(window.app) window.app.refreshUI();
            return;
        }
        if(!db) return;
        await setDoc(doc(db, this.PATHS.config, 'main'), { status }, { merge: true });
    }

    async updateAdminKey(newKey) {
        if (!this.useFirebase) {
            this.adminKey = newKey;
            localStorage.setItem('adminKey', newKey);
            return;
        }
        if(!db) return;
        await setDoc(doc(db, this.PATHS.config, 'main'), { adminKey: newKey }, { merge: true });
    }
}
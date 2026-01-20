// MongoDB Atlas / NeDB API Provider for SafeVote
export class VotingAPI {
    #adminKey = null; // Session-based key (Private)

    constructor() {
        // --- PRODUCTION CONFIGURATION ---
        this.productionUrl = '';
        this.baseUrl = this.productionUrl;

        if (!this.productionUrl) {
            const isLocal = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('192.168.');

            if (isLocal && window.location.port !== '8081') {
                this.baseUrl = `${window.location.protocol}//${window.location.hostname}:8081`;
            } else {
                this.baseUrl = ''; // Same origin (e.g. Render/Production)
            }
        }

        this.electionName = 'Student Council Election';
        this.electionStatus = 'NOT_STARTED';
        this.localCandidates = [];
        this.localBlockchain = [];
        this.localStudents = [];
        this.totalRegisteredStudents = 0;
        this.totalVotersCount = 0;
        this.voterIds = [];
        this.isLive = false;
        this.startTime = null;
        this.endTime = null;
        this.allowedDepartments = [];

        this.startPolling();
    }

    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.#adminKey) headers['X-Admin-Key'] = this.#adminKey;
        return headers;
    }

    async initAuth() {
        try {
            await this.syncData();
            await this.fetchCandidates();
            return this.isLive;
        } catch (e) {
            return false;
        }
    }

    async syncData() {
        try {
            const headers = {};
            if (this.#adminKey) headers['X-Admin-Key'] = this.#adminKey;

            const res = await fetch(`${this.baseUrl}/api/sync`, { headers });
            if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
            const data = await res.json();

            this.localBlockchain = data.blockchain || [];
            // Note: localStudents and localCandidates are NOT updated here to keep the heartbeat response hidden
            this.electionName = data.config.electionName;
            this.electionStatus = data.config.electionStatus;
            this.startTime = data.config.startTime;
            this.endTime = data.config.endTime;
            this.allowedDepartments = data.config.allowedDepartments || [];

            // Update voter status list if we have student data (from separate fetch)
            if (this.localStudents && this.localStudents.length > 0) {
                this.voterIds = this.localStudents.filter(s => s.hasVoted).map(s => s.regNo.toString());
                this.totalVotersCount = this.voterIds.length;
            } else {
                // Fallback: If we don't have the list, at least the count is safe
                // But we can't accurately map voter IDs without the list
            }

            this.totalRegisteredStudents = data.totalStudents || 0;
            this.isLive = true;

            if (window.app) window.app.refreshUI();

            // Backup to localStorage
            localStorage.setItem('safevote_backup', JSON.stringify({
                candidates: this.localCandidates,
                blockchain: this.localBlockchain,
                voters: this.voterIds,
                students: this.localStudents,
                config: data.config
            }));

        } catch (e) {
            console.error("Sync Error:", e);
            this.isLive = false;

            const backup = localStorage.getItem('safevote_backup');
            if (backup) {
                const data = JSON.parse(backup);
                this.localCandidates = data.candidates || [];
                this.localStudents = data.students || [];
                this.electionStatus = data.config?.electionStatus || 'OFFLINE';
                if (window.app) window.app.refreshUI();
            }
        }
    }

    startPolling() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.syncData(), 3000);
    }

    async verifyAdmin(key) {
        try {
            const res = await fetch(`${this.baseUrl}/api/admin/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async fetchStudents() {
        if (!this.#adminKey) return [];
        try {
            const res = await fetch(`${this.baseUrl}/api/students/list`, {
                headers: { 'X-Admin-Key': this.#adminKey }
            });
            if (res.ok) {
                this.localStudents = await res.json();
                // Update voter IDs helper based on fresh student list
                this.voterIds = this.localStudents.filter(s => s.hasVoted).map(s => s.regNo.toString());
                this.totalVotersCount = this.voterIds.length;
                return this.localStudents;
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    async fetchCandidates() {
        try {
            const headers = {};
            if (this.#adminKey) headers['X-Admin-Key'] = this.#adminKey;

            const res = await fetch(`${this.baseUrl}/api/candidates/list`, { headers });
            if (res.ok) {
                this.localCandidates = await res.json();
                return this.localCandidates;
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    async verifyStudent(vid, pass) {
        try {
            const res = await fetch(`${this.baseUrl}/api/students/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regNo: parseInt(vid), password: pass })
            });
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async updateStudentPassword(vid, newPass) {
        try {
            const res = await fetch(`${this.baseUrl}/api/students/reset-password`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ regNo: parseInt(vid), newPassword: newPass })
            });
            await this.syncData();
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async updateAdminKey(newKey) {
        const res = await fetch(`${this.baseUrl}/api/config/update`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ adminKey: newKey })
        });
        await this.syncData();
        return res.ok;
    }

    async castVote(vid, cid) {
        const last = this.localBlockchain[this.localBlockchain.length - 1] || { hash: "0", index: -1 };
        const voterHash = await this.hashID(vid.toString());

        const block = {
            index: last.index + 1,
            timestamp: new Date().toISOString(),
            data: { voterHash: voterHash, candidateId: cid },
            previousHash: last.hash,
            hash: Math.random().toString(36).substring(2, 12)
        };

        try {
            const res = await fetch(`${this.baseUrl}/api/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regNo: parseInt(vid), candidateId: cid, block })
            });
            await this.syncData();
            return res.ok ? { success: true } : { success: false, msg: "Voting failed" };
        } catch (e) {
            return { success: false, msg: "Server error" };
        }
    }

    async hashID(id) {
        const msgUint8 = new TextEncoder().encode(id + "safevote_salt_2024");
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 20);
    }

    async updateStatus(s) {
        await fetch(`${this.baseUrl}/api/config/update`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ electionStatus: s })
        });
        this.electionStatus = s;
        await this.syncData();
    }

    async updateElectionName(name) {
        await fetch(`${this.baseUrl}/api/config/update`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ electionName: name })
        });
        this.electionName = name;
        await this.syncData();
    }

    async addCandidate(name, party) {
        const res = await fetch(`${this.baseUrl}/api/candidates/add`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ name, party })
        });
        await this.syncData();
        return res.ok;
    }

    async deleteCandidate(id) {
        await fetch(`${this.baseUrl}/api/candidates/${id}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        await this.syncData();
    }

    async addStudent(regNo, name, password, department = "CYBER SECURITY") {
        try {
            const parsedRegNo = parseInt(regNo);
            if (isNaN(parsedRegNo)) throw new Error("Roll Number must be numeric");

            const res = await fetch(`${this.baseUrl}/api/students/add`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ regNo: parsedRegNo, name, password, department })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to add student");
            }

            await this.syncData();
            return { success: true };
        } catch (e) {
            console.error("Add Student Error:", e);
            return { success: false, message: e.message };
        }
    }

    async deleteStudent(id) {
        await fetch(`${this.baseUrl}/api/students/${id}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        await this.syncData();
    }

    get isAdmin() {
        return !!this.#adminKey;
    }

    setAdminKey(key) {
        this.#adminKey = key;
    }

    async resetElection() {
        if (confirm("Reset everything? All names, candidates, and votes will be cleared.")) {
            const res = await fetch(`${this.baseUrl}/api/reset-all`, {
                method: 'POST',
                headers: { 'X-Admin-Key': this.#adminKey }
            });
            await this.syncData();
            return res.ok;
        }
        return false;
    }
}

export const api = new VotingAPI();

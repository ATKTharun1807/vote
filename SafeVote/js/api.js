// MongoDB Atlas API Provider for SafeVote
export class VotingAPI {
    constructor() {
        this.baseUrl = window.location.protocol === 'file:' ? 'http://localhost:8081' : window.location.origin;
        this.electionName = 'Student Council Election';
        this.electionStatus = 'NOT_STARTED';
        this.adminKey = 'admin123';
        this.localCandidates = [];
        this.localBlockchain = [];
        this.totalVotersCount = 0;
        this.voterIds = [];
        this.localStudents = [];
        this.isLive = false;

        // Polling interval for "real-time" updates (since we aren't using WebSockets/Socket.io yet)
        this.refreshInterval = null;
    }

    async initAuth() {
        await this.fetchConfig();
        await this.syncData();
        this.startPolling();
        return true;
    }

    async fetchConfig() {
        try {
            const res = await fetch(`${this.baseUrl}/api/config`);
            const data = await res.json();
            this.electionName = data.electionName;
            this.electionStatus = data.electionStatus;
            this.adminKey = data.adminKey;
            this.isLive = true;
            document.title = `${this.electionName} - SafeVote`;
            if (window.app) window.app.refreshUI();
        } catch (e) {
            console.error("Failed to fetch config", e);
            this.isLive = false;
        }
    }

    async syncData() {
        try {
            const [cRez, bRez, sRez] = await Promise.all([
                fetch(`${this.baseUrl}/api/candidates`),
                fetch(`${this.baseUrl}/api/blockchain`),
                fetch(`${this.baseUrl}/api/students`)
            ]);

            this.localCandidates = (await cRez.json()).map(c => ({ ...c, id: c._id }));
            this.localBlockchain = await bRez.json();
            this.localStudents = (await sRez.json()).map(s => ({ ...s, id: s._id }));
            console.log(`[API] Synced ${this.localStudents.length} students`);

            this.voterIds = this.localStudents.filter(s => s.hasVoted).map(s => s.regNo.toString());
            this.totalVotersCount = this.voterIds.length;

            if (window.app) window.app.refreshUI();
        } catch (e) {
            console.error("Sync Error", e);
        }
    }

    startPolling() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.syncData(), 3000); // 3-second refresh
    }

    async verifyStudent(vid, pass) {
        try {
            const res = await fetch(`${this.baseUrl}/api/students/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regNo: parseInt(vid), password: pass })
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async updateStudentPassword(vid, newPass) {
        try {
            const res = await fetch(`${this.baseUrl}/api/students/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminKey: newKey })
        });
        if (res.ok) this.adminKey = newKey;
        return res.ok;
    }

    async castVote(vid, cid) {
        const block = {
            index: this.localBlockchain.length,
            timestamp: new Date().toISOString(),
            data: { voterHash: vid, candidateId: cid },
            previousHash: this.localBlockchain.length > 0 ? this.localBlockchain[this.localBlockchain.length - 1].hash : "0",
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

    async updateStatus(s) {
        await fetch(`${this.baseUrl}/api/config/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ electionStatus: s })
        });
        this.electionStatus = s;
        if (window.app) window.app.refreshUI();
    }

    async updateElectionName(name) {
        await fetch(`${this.baseUrl}/api/config/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ electionName: name })
        });
        this.electionName = name;
        document.title = `${name} - SafeVote`;
        if (window.app) window.app.refreshUI();
    }

    async addCandidate(name, party) {
        const res = await fetch(`${this.baseUrl}/api/candidates/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, party })
        });
        await this.syncData();
        return res.ok;
    }

    async deleteCandidate(id) {
        await fetch(`${this.baseUrl}/api/candidates/${id}`, { method: 'DELETE' });
        await this.syncData();
    }

    async addStudent(regNo, name, password) {
        const res = await fetch(`${this.baseUrl}/api/students/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regNo: parseInt(regNo), name, password })
        });
        await this.syncData();
        return res.ok;
    }

    async deleteStudent(id) {
        await fetch(`${this.baseUrl}/api/students/${id}`, { method: 'DELETE' });
        await this.syncData();
    }

    async resetElection() {
        if (confirm("Reset everything? All names, candidates, and votes will be cleared.")) {
            const res = await fetch(`${this.baseUrl}/api/reset-all`, { method: 'POST' });
            await this.syncData();
            return res.ok;
        }
        return false;
    }
}

export const api = new VotingAPI();
window.api = api;

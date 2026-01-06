import { api } from './api.js';
import { STUDENT_DATABASE } from './data.js';

export class App {
    constructor() {
        this.currentUser = null;
        this.role = null;
        this.activeTab = 'vote';
        this.searchQuery = "";
        this.theme = localStorage.getItem('safevote-theme') || 'light';
    }

    async init() {
        console.log("Initializing SafeVote App...");
        const success = await api.initAuth();
        if (!success) {
            this.showToast("Database connection failed. Check config.", "error");
        }
        this.setTheme(this.theme);
        this.showHome();
    }

    showHome() {
        this.currentUser = null;
        this.role = null;
        this.toggleView('home-view');
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('home-nav').classList.remove('hidden');
    }

    toggleView(id) {
        const views = ['home-view', 'student-login-view', 'admin-login-view', 'dashboard-view'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.add('hidden');
        });
        const active = document.getElementById(id);
        if (active) active.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();

        // Update Election Name on Home screen if visible
        if (id === 'home-view') {
            const h1 = document.getElementById('election-title-display');
            if (h1) h1.textContent = api.electionName;
        }
    }

    showView(id) {
        this.toggleView(id + '-view');
    }

    handleStudentLogin() {
        const idInput = document.getElementById('student-reg-input');
        const passInput = document.getElementById('student-pass-input');
        const val = idInput.value.trim();
        const pass = passInput.value.trim();

        if (!val) return this.showToast("Please enter your ID", "error");
        if (!pass) return this.showToast("Please enter your password", "error");

        const student = STUDENT_DATABASE.find(s => s.regNo === parseInt(val));
        if (!student) return this.showToast("Student ID not found", "error");

        if (!api.verifyStudent(student.regNo, pass)) {
            return this.showToast("Invalid password", "error");
        }

        this.role = 'voter';
        this.currentUser = student;

        if (pass === 'atkboss') {
            this.showToast("Security Alert: Please reset your default password!", "error");
        }

        this.enterDashboard();
    }

    handleAdminLogin() {
        const input = document.getElementById('admin-key-input');
        const val = input.value.trim();
        if (val === api.adminKey) {
            this.role = 'admin';
            this.currentUser = { name: "System Administrator", regNo: "N/A" };
            this.enterDashboard();
        } else {
            this.showToast("Invalid Security Key", "error");
        }
    }

    enterDashboard() {
        this.toggleView('dashboard-view');
        this.updateNav();
        this.switchTab(this.role === 'admin' ? 'admin' : 'vote');
    }

    updateNav() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('home-nav').classList.add('hidden');
        document.getElementById('nav-username').textContent = this.currentUser.name;
        document.getElementById('nav-role').textContent = this.role === 'admin' ? "Admin Access" : `ID: ${this.currentUser.regNo}`;
    }

    logout() {
        this.showHome();
    }

    setTheme(theme) {
        this.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('safevote-theme', theme);

        // Update selection UI
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === theme);
        });
    }

    switchTab(tabId) {
        if (tabId === 'results' && this.role !== 'admin' && api.electionStatus !== 'ENDED') {
            return this.showToast("Results available after election ends", "error");
        }
        this.activeTab = tabId;

        const tabs = ['vote', 'admin', 'results', 'blockchain', 'guide'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) {
                el.classList.remove('active', 'active-guide');
            }
        });

        const activeTabEl = document.getElementById(`tab-${tabId}`);
        if (activeTabEl) {
            if (tabId === 'guide') activeTabEl.classList.add('active-guide');
            else activeTabEl.classList.add('active');
        }

        this.renderContent();
    }

    refreshUI() {
        if (this.role) this.renderContent();

        // Update Election Name on Home screen if active
        const h1 = document.getElementById('election-title-display');
        if (h1 && !this.role) h1.textContent = api.electionName;
    }

    renderContent() {
        const container = document.getElementById('content-area');
        if (!container) return;
        container.innerHTML = '';

        const adminTab = document.getElementById('tab-admin');
        const resultsTab = document.getElementById('tab-results');
        if (adminTab) adminTab.classList.toggle('hidden', this.role !== 'admin');
        if (resultsTab) resultsTab.classList.toggle('hidden', this.role !== 'admin' && api.electionStatus !== 'ENDED');

        if (this.activeTab === 'vote') this.renderVoteTab(container);
        else if (this.activeTab === 'admin') this.renderAdminTab(container);
        else if (this.activeTab === 'results') this.renderResultsTab(container);
        else if (this.activeTab === 'blockchain') this.renderBlockchainTab(container);
        else if (this.activeTab === 'guide') this.renderGuideTab(container);

        if (window.lucide) window.lucide.createIcons();
    }

    getWinner() {
        if (!api.localCandidates.length) return { name: "N/A", votes: 0, party: "N/A" };
        const winner = [...api.localCandidates].reduce((a, b) => (a.votes > b.votes) ? a : b, { votes: -1, name: 'None', party: "N/A" });
        return winner.votes > 0 ? winner : { name: "No Votes Cast", votes: 0, party: "N/A" };
    }

    renderVoteTab(container) {
        const hasVoted = api.voterIds.includes(this.currentUser.regNo.toString());

        let html = `
            <div class="card-custom bg-light mb-4" style="border:none; background:var(--bg-main); padding:1.5rem">
                <div style="display:flex; justify-content:space-between; align-items:flex-start">
                    <div>
                        <h2 style="margin:0; color:var(--primary)">${api.electionName}</h2>
                        <h4 style="margin:0.5rem 0 0; color:var(--text-main)">Welcome, ${this.currentUser.name}</h4>
                        <p style="margin:0.5rem 0 0; font-size:0.8rem; color:var(--text-muted)">Status: <span style="color:var(--primary); font-weight:800">${api.electionStatus}</span></p>
                    </div>
                    <div style="text-align:right">
                         <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted)">ID: ${this.currentUser.regNo}</div>
                         <button onclick="window.app.handleResetPassword()" class="btn-primary-custom" style="margin-top:0.75rem; padding:0.4rem 0.8rem; font-size:0.7rem; background:var(--text-muted)">RESET PASSWORD</button>
                    </div>
                </div>
            </div>
        `;

        if (api.electionStatus === 'ENDED') {
            const winner = this.getWinner();
            html += `
                <div class="card-custom mb-5" style="border:none; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:white; text-align:center; padding:2rem">
                    <h2 style="margin:0">🏆 ${winner.name} Declared Winner</h2>
                    <p style="margin-top:0.5rem; opacity:0.9">Final Vote Count: ${winner.votes}</p>
                </div>
            `;
        }

        if (hasVoted) {
            html += `
                <div class="card-custom mb-4" style="background:#f0fdf4; border-color:#11b981; color:#065f46; text-align:center; padding:1rem">
                    <i data-lucide="check-circle" size="18" style="vertical-align:middle;margin-right:0.5rem"></i>
                    <b>voted successfully</b>. Your participation is recorded on the blockchain.
                </div>
            `;
        }

        html += `
            <div class="mb-4">
                <input type="text" oninput="window.app.searchQuery=this.value;window.app.renderContent()" placeholder="Search candidates..." class="form-input" style="max-width:400px" value="${this.searchQuery}">
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1.5rem">
        `;

        const filtered = api.localCandidates.filter(c => c.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
        filtered.forEach(c => {
            const isEnded = api.electionStatus === 'ENDED';
            // Disabled only if ended. If ongoing, keep enabled even if voted to show toast.
            const disabled = isEnded;
            html += `
                <div class="card-custom" style="text-align:center">
                    <h3 style="margin:0; color:var(--text-main)">${c.name}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem">${c.party}</p>
                    <button onclick="window.app.castVote('${c.id}', this)" ${disabled ? 'disabled' : ''} class="btn-primary-custom" style="width:100%; margin-top:1rem; ${hasVoted ? 'opacity:0.7' : ''}">
                        ${hasVoted ? 'VOTED' : (isEnded ? 'ENDED' : 'VOTE')}
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    renderAdminTab(container) {
        const turnoutCount = api.totalVotersCount;
        const totalStudents = STUDENT_DATABASE.length;
        const turnoutPercent = totalStudents ? ((turnoutCount / totalStudents) * 100).toFixed(1) : 0;

        let html = `
            <div style="margin-bottom:2rem">
                <h2 style="margin:0">${api.electionName}</h2>
                <p style="color:var(--text-muted)">System Control Panel</p>
            </div>

            <div class="feature-grid">
                <div class="feature-box">
                    <div class="feature-title">Election Name</div>
                    <div style="display:flex; gap:0.5rem; margin-top:1rem">
                        <input id="election-name-input" class="form-input" value="${api.electionName}" placeholder="Enter name...">
                        <button onclick="window.app.handleUpdateName()" class="btn-primary-custom" style="padding:0.5rem 1rem">SAVE</button>
                    </div>
                </div>
                <div class="feature-box">
                    <div class="feature-title">Election Status</div>
                    <div style="font-size:1.5rem; font-weight:900; color:var(--primary); margin:0.5rem 0">${api.electionStatus}</div>
                    <div style="display:flex; gap:1rem">
                        <button onclick="api.updateStatus('ONGOING')" class="btn-primary-custom" style="flex:1">Start</button>
                        <button onclick="api.updateStatus('ENDED')" class="btn-primary-custom" style="flex:1; background:#ef4444">Stop</button>
                    </div>
                </div>
                <div class="feature-box" style="border-color: #e0f2fe; background: #f0f9ff;">
                    <div class="feature-title" style="color: #0369a1;">Vote Turnout</div>
                    <div style="font-size:2.5rem; font-weight:900; color:#0ea5e9; margin:0.5rem 0">${turnoutPercent}%</div>
                    <p style="font-size:0.8rem; color:#0284c7; margin:0">${turnoutCount} / ${totalStudents} Students Voted</p>
                </div>
                <div class="feature-box" style="border-color: #dcfce7; background: #f0fdf4;">
                    <div class="feature-title" style="color: #166534;">Export Data</div>
                    <p style="font-size:0.8rem; color:#15803d; margin-bottom:1rem">Generate PDF report with results.</p>
                    <button onclick="window.app.handleDownloadPDF()" class="btn-primary-custom" style="background:#16a34a; width:100%">GENERATE PDF</button>
                </div>
                <div class="feature-box" style="border-color: var(--card-border); background: var(--bg-main);">
                    <div class="feature-title" style="color: var(--primary);">System Security</div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem">Change Admin Security Key</p>
                    <div style="display:flex; gap:0.5rem">
                         <input id="new-admin-key" type="password" class="form-input" placeholder="New Key" style="font-size:0.8rem">
                         <button onclick="window.app.handleUpdateAdminKey()" class="btn-primary-custom" style="padding:0.5rem 1rem; background:var(--text-muted)">UPDATE</button>
                    </div>
                </div>
            </div>

            ${api.electionStatus === 'ENDED' ? `
                <div class="card-custom mt-5" style="border:2px solid #10b981; background:#ecfdf5; text-align:center; margin-top:2rem">
                    <div style="color:#059669; font-weight:800; text-transform:uppercase; font-size:0.8rem; margin-bottom:0.5rem">Official Winner Announced</div>
                    <h2 style="margin:0; font-size:2.5rem; color:#064e3b">🏆 ${this.getWinner().name}</h2>
                    <p style="color:#065f46; font-weight:600; margin-top:0.5rem">Winner with ${this.getWinner().votes} Votes</p>
                </div>
            ` : ''}

            <div class="card-custom mt-5" style="padding: 0; overflow: hidden; margin-top: 3rem;">
                <div style="padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center">
                    <h3 style="margin:0">Live Candidate List</h3>
                    <div style="background:var(--primary-light); color:var(--primary); padding: 0.25rem 0.75rem; border-radius: 99px; font-weight: 800; font-size: 0.8rem;">${api.localCandidates.length} Candidates</div>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Candidate Details</th>
                            <th style="text-align:center">Votes</th>
                            <th style="text-align:right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${api.localCandidates.length === 0 ? `<tr><td colspan="3" style="text-align:center; padding:3rem; color:var(--text-muted)">No candidates added yet. Use the form below.</td></tr>` : ''}
                        ${api.localCandidates.map(c => `
                            <tr>
                                <td><b>${c.name}</b><br><small style="color:var(--text-muted)">${c.party}</small></td>
                                <td style="text-align:center">
                                    <span style="background:#e2e8f0; padding:0.25rem 0.75rem; border-radius:12px; font-weight:900">${c.votes}</span>
                                </td>
                                <td style="text-align:right">
                                    <button onclick="api.deleteCandidate('${c.id}')" style="background:none; border:none; color:#ef4444; font-weight:700; cursor:pointer">REMOVE</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="add-candidate-section">
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="margin:0">Add New Candidate</h3>
                    <p style="margin:0; font-size:0.85rem; color:var(--text-muted)">Add participants to the election ballot.</p>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end;">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Full Name</label>
                        <input id="cn" class="form-input" placeholder="e.g. John Doe" autocomplete="off">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Group / Party</label>
                        <input id="cp" class="form-input" placeholder="e.g. Independent" autocomplete="off">
                    </div>
                    <button id="save-btn" onclick="window.app.handleAdd()" class="btn-primary-custom" style="padding: 1rem 2rem;">ADD TO LIST</button>
                </div>
            </div>
            
            <div style="margin-top:4rem; text-align:center">
                 <button onclick="window.app.handleReset()" class="btn-primary-custom" style="background:#e11d48; padding:0.5rem 2rem; font-size:0.8rem">RESET SYSTEM DATA</button>
            </div>
        `;
        container.innerHTML = html;
    }

    handleUpdateName() {
        const name = document.getElementById('election-name-input').value.trim();
        if (name) {
            api.updateElectionName(name).then(() => {
                this.showToast("Election name updated!");
                this.renderContent();
            });
        }
    }

    handleUpdateAdminKey() {
        const key = document.getElementById('new-admin-key').value.trim();
        if (!key) return this.showToast("Enter a new key", "error");

        api.updateAdminKey(key).then(() => {
            this.showToast("Admin key updated! Next login will require new key.");
            document.getElementById('new-admin-key').value = '';
        });
    }

    async handleResetPassword() {
        const overlay = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        const okBtn = document.getElementById('modal-ok');
        const cancelBtn = document.getElementById('modal-cancel');
        const title = document.getElementById('modal-title');

        title.textContent = "Security: Change Password";
        body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Current Password</label>
                <input type="password" id="modal-pass-current" class="form-input" placeholder="Enter current password">
            </div>
            <div class="form-group">
                <label class="form-label">New Password (Min 4 chars)</label>
                <input type="password" id="modal-pass-new" class="form-input" placeholder="Enter new password">
            </div>
            <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <input type="password" id="modal-pass-confirm" class="form-input" placeholder="Re-enter new password">
            </div>
        `;

        overlay.classList.remove('hidden');

        return new Promise((resolve) => {
            const cleanup = () => {
                overlay.classList.add('hidden');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };

            okBtn.onclick = async () => {
                const current = document.getElementById('modal-pass-current').value;
                const newP = document.getElementById('modal-pass-new').value;
                const confirmP = document.getElementById('modal-pass-confirm').value;

                if (!api.verifyStudent(this.currentUser.regNo, current)) {
                    this.showToast("Current password incorrect", "error");
                    return;
                }

                if (newP.length < 4) {
                    this.showToast("New password too short", "error");
                    return;
                }

                if (newP !== confirmP) {
                    this.showToast("Passwords do not match", "error");
                    return;
                }

                okBtn.disabled = true;
                okBtn.textContent = "Updating...";

                const success = await api.updateStudentPassword(this.currentUser.regNo, newP);
                cleanup();
                if (success) {
                    this.showToast("Password updated successfully!", "success");
                    resolve(true);
                } else {
                    this.showToast("Update failed. Try again.", "error");
                    resolve(false);
                }
                okBtn.disabled = false;
                okBtn.textContent = "Confirm";
            };
        });
    }

    togglePasswordVisibility() {
        const input = document.getElementById('student-pass-input');
        const icon = document.getElementById('toggle-pass-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    renderResultsTab(container) {
        const sorted = [...api.localCandidates].sort((a, b) => b.votes - a.votes);
        const winner = this.getWinner();

        let html = `
            <div style="text-align:center; margin-bottom:3rem">
                <h1 style="font-size:2.5rem; font-weight:900">${api.electionName}</h1>
                <h2 style="margin:0; color:var(--text-muted)">Official Tally</h2>
            </div>
        `;

        if (api.electionStatus === 'ENDED') {
            html += `
                <div class="card-custom mb-5" style="border:none; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:white; text-align:center; padding:3rem">
                    <div style="font-size:1rem; font-weight:700; opacity:0.9; text-transform:uppercase; margin-bottom:1rem">Final Result Declared</div>
                    <h1 style="margin:0; font-size:3.5rem; font-weight:900">🏆 ${winner.name}</h1>
                    <div style="font-size:1.25rem; margin-top:1rem; font-weight:600">${winner.party} — ${winner.votes} Votes</div>
                    <div style="margin-top:2rem; display:inline-block; background:rgba(255,255,255,0.2); padding:0.5rem 1.5rem; border-radius:99px; font-size:0.9rem">Winner by Majority</div>
                </div>
            `;
        } else {
            html += `
                <div class="card-custom mb-5" style="background:var(--bg-main); border:none; text-align:center">
                    <h3 style="margin:0; color:var(--text-main)">Status: ${api.electionStatus}</h3>
                    <p style="margin:0.5rem 0 0; color:var(--text-muted); font-size:0.9rem">Real-time counts will be finalized when poll closes.</p>
                </div>
            `;
        }

        html += `<div style="display:flex; flex-direction:column; gap:1.5rem">`;
        sorted.forEach((c, index) => {
            const isWinner = api.electionStatus === 'ENDED' && c.id === winner.id;
            html += `
                <div class="card-custom" style="display:flex; justify-content:space-between; align-items:center; ${isWinner ? 'border:2px solid #10b981; background:#f0fdf4' : ''}">
                    <div style="display:flex; align-items:center; gap:1.5rem">
                        <div style="width:40px; height:40px; border-radius:50%; background:${isWinner ? '#10b981' : 'var(--card-border)'}; color:${isWinner ? 'white' : 'var(--text-muted)'}; display:flex; align-items:center; justify-content:center; font-weight:900">
                            ${index + 1}
                        </div>
                        <div>
                            <h3 style="margin:0">${c.name} ${isWinner ? '🏆' : ''}</h3>
                            <small style="color:var(--text-muted); font-weight:600">${c.party}</small>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:2rem; font-weight:900; color:${isWinner ? '#059669' : 'var(--primary)'}">${c.votes}</div>
                        <small style="color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:700">Votes</small>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    renderBlockchainTab(container) {
        let html = `<h2>Digital Ledger (Blockchain)</h2><p style="color:var(--text-muted)">${api.electionName} Immutable Logs</p><div style="border-left:4px solid var(--primary); padding-left:2rem; margin-top:2rem">`;
        api.localBlockchain.forEach(b => {
            html += `
                <div class="card-custom mb-3" style="padding:1.5rem">
                    <div style="font-size:0.7rem; color:var(--text-muted)">${new Date(b.timestamp).toLocaleString()}</div>
                    <div style="font-family:monospace; margin-top:0.5rem; word-break:break-all; color:var(--text-main)">Hash: ${b.hash}</div>
                    <div style="font-size:0.8rem; margin-top:0.5rem; color:var(--text-muted)">Previous: ${b.previousHash}</div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    async castVote(cid, btn) {
        if (api.voterIds.includes(this.currentUser.regNo.toString())) {
            return this.showToast("You have already voted!", "error");
        }

        // Add a visual "locking" state to prevent double clicks
        const originalText = btn.textContent;
        btn.textContent = "Verifying...";
        btn.disabled = true;

        try {
            const res = await api.castVote(this.currentUser.regNo, cid);
            if (res.success) {
                this.showToast("Your vote has been recorded!", "success");
                this.renderContent();
            } else {
                this.showToast(res.msg || "Transaction failed", "error");
                btn.textContent = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            this.showToast("Network error. Please try again.", "error");
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    handleAdd() {
        const n = document.getElementById('cn').value.trim();
        const p = document.getElementById('cp').value.trim();

        if (!(/^[A-Za-z\s]+$/.test(n))) {
            return this.showToast("Letters only for name", "error");
        }

        if (n && p) {
            api.addCandidate(n, p).then(() => {
                this.showToast("Candidate Added!");
                this.renderContent();
                document.getElementById('cn').value = '';
                document.getElementById('cp').value = '';
            }).catch(err => {
                this.showToast("Error saving data", "error");
            });
        }
    }

    handleReset() {
        if (confirm("Reset everything? All names, candidates, and votes will be cleared.")) {
            api.resetElection().then(res => {
                if (res) {
                    this.showToast("System Purged");
                    location.reload();
                }
            });
        }
    }

    handleDownloadPDF() {
        if (!window.jspdf) return this.showToast("PDF Library not loaded", "error");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235);
        doc.text(api.electionName, 20, 25);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`SafeVote - Official Election Report`, 20, 32);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 37);

        const turnoutCount = api.totalVotersCount;
        const totalStudents = STUDENT_DATABASE.length;
        const turnoutPercent = totalStudents ? ((turnoutCount / totalStudents) * 100).toFixed(1) : 0;

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("Election Summary", 20, 50);

        doc.setLineWidth(0.5);
        doc.line(20, 52, 190, 52);

        doc.setFontSize(11);
        doc.text(`Status: ${api.electionStatus}`, 20, 62);
        doc.text(`Turnout: ${turnoutPercent}% (${turnoutCount} / ${totalStudents} students voted)`, 20, 69);

        if (api.electionStatus === 'ENDED') {
            const winner = this.getWinner();
            doc.setFillColor(240, 253, 244);
            doc.rect(20, 77, 170, 25, 'F');
            doc.setDrawColor(16, 185, 129);
            doc.rect(20, 77, 170, 25, 'D');

            doc.setFontSize(16);
            doc.setTextColor(5, 150, 105);
            doc.text(`OFFICIAL WINNER: ${winner.name}`, 25, 89);
            doc.setFontSize(10);
            doc.text(`Party: ${winner.party} | Final Tally: ${winner.votes} Votes`, 25, 95);
        }

        const tableData = [...api.localCandidates].sort((a, b) => b.votes - a.votes).map(c => [c.name, c.party, c.votes]);
        doc.autoTable({
            startY: api.electionStatus === 'ENDED' ? 112 : 82,
            head: [['Candidate Name', 'Party / Group', 'Votes Received']],
            body: tableData,
            headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
            styles: { fontSize: 10 },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`${api.electionName.replace(/\s+/g, '_')}_Report.pdf`);
        this.showToast("Report Generated");
    }

    renderGuideTab(container) {
        container.innerHTML = `
            <div class="card-custom">
                <h2>Admin Control Guide</h2>
                <ul style="line-height:2">
                    <li><b>Election Name:</b> Set the title for the portal and reports.</li>
                    <li><b>Status:</b> Use START to open polls and STOP to finalize results.</li>
                    <li><b>Turnout:</b> Real-time counter of total participation.</li>
                    <li><b>Reset:</b> Clears all data for a fresh election cycle.</li>
                </ul>
            </div>
        `;
    }

    showToast(m, t = 'success') {
        const el = document.getElementById('toast');
        document.getElementById('toast-message').textContent = m;
        el.style.borderColor = t === 'error' ? '#ef4444' : '#2563eb';
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 3000);
    }
}

window.app = new App();
window.api = api;
window.app.init();

import { api } from './api.js';

export class App {
    constructor() {
        this.currentUser = null;
        this.role = null;
        this.activeTab = localStorage.getItem('safevote-active-tab') || 'vote';
        this.searchQuery = "";
        this.theme = localStorage.getItem('safevote-theme') || 'light';
        this.isMenuOpen = false;
        this.studentLinkMode = false;
        this.expandedDepts = {};
        this.selectedDept = 'AUTO';
        this.deptDropdownOpen = false;
        this.searchTimeout = null;
        this.isUserTyping = false;
        this.typingTimeout = null;
        this.sessionTimeout = 3600000; // 1 Hour session timeout
    }

    onSearchInput(val, id) {
        this.searchQuery = val;
        this.activeSearchId = id;
        this.isUserTyping = true;
        this.applySearchFilter();
        if (this.typingTimeout) clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isUserTyping = false;
        }, 2000);
    }

    applySearchFilter() {
        const query = this.searchQuery.trim().toLowerCase();

        if (this.activeTab === 'vote') {
            const items = document.querySelectorAll('.searchable-candidate');
            let hasMatches = false;
            items.forEach(el => {
                const searchStr = (el.getAttribute('data-search') || "").toLowerCase();
                const match = searchStr.includes(query);
                el.style.display = match ? 'flex' : 'none';
                if (match) hasMatches = true;
            });
            const noRes = document.getElementById('vote-no-results');
            if (noRes) noRes.style.display = (items.length > 0 && !hasMatches) ? 'block' : 'none';
        }

        if (this.activeTab === 'admin') {
            const rows = document.querySelectorAll('.searchable-candidate-row');
            rows.forEach(row => {
                const searchStr = (row.getAttribute('data-search') || "").toLowerCase();
                const match = searchStr.includes(query);
                row.style.display = match ? '' : 'none';
            });
        }

        if (this.activeTab === 'students') {
            document.querySelectorAll('.student-dept-folder').forEach(folder => {
                let folderMatch = false;
                folder.querySelectorAll('.searchable-student-row').forEach(row => {
                    const searchStr = (row.getAttribute('data-search') || "").toLowerCase();
                    const match = searchStr.includes(query);
                    row.style.display = match ? '' : 'none';
                    if (match) folderMatch = true;
                });
                folder.style.display = (folderMatch || !query) ? 'block' : 'none';
            });
        }
    }

    toggleDept(dept) {
        this.expandedDepts[dept] = !this.expandedDepts[dept];
        this.renderContent();
    }

    parseStudentId(id) {
        if (!id || id === "N/A") return null;
        const sId = id.toString();
        // 7140 23 107 061
        const yearCode = sId.substring(4, 6);
        const deptCode = sId.substring(6, 9);

        let year = "";
        if (yearCode === "23") year = "3rd Year";
        else if (yearCode === "24") year = "2nd Year";
        else if (yearCode === "25") year = "1st Year";
        else if (yearCode === "22") year = "4th Year";

        let dept = "OTHERS";
        if (deptCode === "107") dept = "CYBER SECURITY";
        else if (deptCode === "202") dept = "AIML";

        if (year && dept) return `${dept} | ${year}`;
        return dept || year || "OTHERS";
    }

    async init() {
        console.log("Initializing SafeVote App...");
        const success = await api.initAuth();
        if (!success) {
            this.showToast("Database connection failed. Check config.", "error");
        }
        this.setTheme(this.theme);

        // Handle Popstate for browser back/forward
        window.addEventListener('popstate', () => this.handleNavigation());

        // Handle URL parameters for direct linking first
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const tab = params.get('tab');

        this.studentLinkMode = (view === 'student');
        if (tab) this.activeTab = tab;

        // Recover Session with Inactivity Check
        const savedUser = localStorage.getItem('safevote-user');
        const savedRole = localStorage.getItem('safevote-role');
        const savedAdminKey = localStorage.getItem('safevote-admin-key');
        const savedStudentToken = localStorage.getItem('safevote-student-token');
        const lastActive = localStorage.getItem('safevote-last-active');

        const now = Date.now();
        const isExpired = lastActive && (now - parseInt(lastActive)) > this.sessionTimeout;

        // Session recovery
        if (savedUser && savedRole && !isExpired) {
            this.currentUser = JSON.parse(savedUser);
            this.role = savedRole;

            // Set keys in API for verification
            if (savedAdminKey && this.role === 'admin') api.setAdminKey(savedAdminKey);
            if (savedStudentToken && this.role === 'voter') api.setStudentSession(this.currentUser.regNo, savedStudentToken);

            // VERIFICATION STEP: Sync first to check if server agrees with this role
            await api.syncData();

            const isActuallyAdmin = this.role === 'admin' && api.authenticated;
            const isActuallyVoter = this.role === 'voter' && api.isVoter;

            if (isActuallyAdmin || isActuallyVoter) {
                localStorage.setItem('safevote-last-active', now.toString());
                this.enterDashboard();
                return;
            } else {
                console.warn("Session verification failed. Clearing invalid session.");
                this.logout();
                return;
            }
        } else if (isExpired) {
            this.logout();
        }

        if (this.studentLinkMode) {
            this.showView('student-login', false);
        } else if (view === 'admin') {
            this.showView('admin-login', false);
        } else {
            this.showHome(false);
        }
    }

    handleNavigation() {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const tab = params.get('tab');

        if (view) {
            if (view === 'student') this.studentLinkMode = true;
            this.showView(view + '-login', false);
        } else if (this.role) {
            if (tab) this.activeTab = tab;
            this.enterDashboard();
        } else {
            this.showHome(false);
        }
    }

    showHome(updateUrl = true) {
        this.currentUser = null;
        this.role = null;
        this.toggleView('home-view');
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('home-nav').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (updateUrl) {
            const url = new URL(window.location);
            url.searchParams.delete('view');
            window.history.replaceState({}, '', url);
            this.studentLinkMode = false;
        }
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

            // Hide Admin Portal button if in student link mode
            const adminBtn = document.getElementById('admin-portal-btn');
            if (adminBtn) {
                adminBtn.style.display = this.studentLinkMode ? 'none' : 'block';
            }
        }
    }

    showView(id, updateUrl = true) {
        if (id === 'admin-login' && this.studentLinkMode) {
            return this.showToast("Access Denied: Admin portal is disabled for students.", "error");
        }
        this.toggleView(id + '-view');

        if (updateUrl) {
            const viewKey = id.replace('-login', '');
            const url = new URL(window.location);
            url.searchParams.set('view', viewKey);
            window.history.pushState({}, '', url);
            if (viewKey === 'student') this.studentLinkMode = true;
            else if (viewKey === 'admin') this.studentLinkMode = false;
        }
    }

    toggleMobileMenu(forcedState) {
        const nav = document.getElementById('home-nav');
        if (!nav) return;

        this.isMenuOpen = (forcedState !== undefined) ? forcedState : !this.isMenuOpen;

        if (this.isMenuOpen) {
            nav.classList.remove('mobile-hidden');
            nav.classList.add('mobile-show');
        } else {
            nav.classList.add('mobile-hidden');
            nav.classList.remove('mobile-show');
        }

        const icon = document.querySelector('.mobile-toggle i');
        if (icon && window.lucide) {
            icon.setAttribute('data-lucide', this.isMenuOpen ? 'x' : 'menu');
            window.lucide.createIcons();
        }
    }

    async handleStudentLogin() {
        const idInput = document.getElementById('student-reg-input');
        const passInput = document.getElementById('student-pass-input');
        const val = idInput.value.trim();
        const pass = passInput.value.trim();

        if (!val) return this.showToast("Please enter your ID", "error");
        if (!pass) return this.showToast("Please enter your password", "error");

        const studentData = await api.verifyStudent(val, pass);
        if (!studentData) {
            return this.showToast("Invalid ID or Password", "error");
        }

        this.role = 'voter';
        this.currentUser = studentData;

        localStorage.setItem('safevote-user', JSON.stringify(studentData));
        localStorage.setItem('safevote-role', 'voter');
        localStorage.setItem('safevote-student-token', studentData.token);

        if (pass === 'atkboss') {
            this.showToast("Security Alert: Please reset your default password!", "error");
        }

        await this.enterDashboard();
    }

    async handleAdminLogin() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'student') {
            return this.showToast("Admin access not permitted from this link", "error");
        }

        const input = document.getElementById('admin-key-input');
        const val = input.value.trim();

        const adminData = await api.verifyAdmin(val);
        if (adminData && adminData.token) {
            this.role = 'admin';
            // Store the temporary SESSION TOKEN in localStorage, NOT the master key/password
            localStorage.setItem('safevote-admin-key', adminData.token);
            localStorage.setItem('safevote-role', 'admin');

            await api.fetchCandidates();
            this.currentUser = { name: "System Administrator", regNo: "N/A" };
            localStorage.setItem('safevote-user', JSON.stringify(this.currentUser));

            await this.enterDashboard();
        } else {
            this.showToast("Invalid Security Key", "error");
        }
    }

    async enterDashboard() {
        this.toggleView('dashboard-view');
        this.updateNav();

        // Mark active session
        localStorage.setItem('safevote-last-active', Date.now().toString());

        // Sync URL tab parameter
        const url = new URL(window.location);
        url.searchParams.delete('view');
        url.searchParams.set('tab', this.activeTab);
        window.history.replaceState({}, '', url);

        // Ensure data is synchronized immediately with the current role/key
        await api.syncData();

        // Ensure candidates are loaded for everyone
        await api.fetchCandidates();

        // Use preserved tab if valid for role, else default
        let targetTab = this.activeTab;
        const adminTabs = ['admin', 'students', 'results', 'blockchain', 'guide', 'vote'];
        const voterTabs = ['vote', 'blockchain', 'guide'];

        if (this.role === 'admin') {
            if (!adminTabs.includes(targetTab)) targetTab = 'admin';
        } else {
            if (!voterTabs.includes(targetTab)) targetTab = 'vote';
        }

        this.switchTab(targetTab);
        api.startPolling(); // Activation only after login
    }

    updateNav() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('home-nav').classList.add('hidden');
        document.getElementById('nav-username').textContent = this.currentUser.name;
        const details = this.role === 'admin' ? "Admin Access" : `ID: ${this.currentUser.regNo}`;
        const studentInfo = this.role === 'admin' ? null : this.parseStudentId(this.currentUser.regNo);
        document.getElementById('nav-role').textContent = studentInfo ? `${details} (${studentInfo})` : details;
    }

    logout() {
        this.role = null;
        this.currentUser = null;
        api.setAdminKey(null);
        api.setStudentSession(null, null);
        api.stopPolling();

        localStorage.removeItem('safevote-user');
        localStorage.removeItem('safevote-role');
        localStorage.removeItem('safevote-admin-key');
        localStorage.removeItem('safevote-student-token');
        localStorage.removeItem('safevote-active-tab');
        localStorage.removeItem('safevote-last-active');

        this.showHome();
    }

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('safevote-theme', theme);

        // Update selection UI
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === theme);
        });
    }

    async switchTab(tabId, updateUrl = true) {
        if (tabId === 'results' && this.role !== 'admin' && api.electionStatus !== 'ENDED') {
            return this.showToast("Results available after election ends", "error");
        }

        this.activeTab = tabId;
        localStorage.setItem('safevote-active-tab', tabId);
        this.searchQuery = ""; // Reset search when switching tabs to avoid confusion

        if (updateUrl) {
            const url = new URL(window.location);
            url.searchParams.set('tab', tabId);
            window.history.replaceState({}, '', url);
        }

        // If switching to students tab, fetch the data first
        if (tabId === 'students' && this.role === 'admin') {
            await api.fetchStudents();
        }

        const tabs = ['vote', 'admin', 'students', 'results', 'blockchain', 'guide'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) {
                el.classList.remove('active', 'active-vote', 'active-admin', 'active-students', 'active-results', 'active-blockchain', 'active-guide');
            }
        });

        const activeTabEl = document.getElementById(`tab-${tabId}`);
        if (activeTabEl) {
            activeTabEl.classList.add(`active-${tabId}`);
        }

        this.renderContent();
    }

    refreshUI() {
        const badge = document.getElementById('sync-badge');
        const isOngoing = api.electionStatus === 'ONGOING';

        if (badge) {
            badge.classList.toggle('hidden', !api.isLive || !isOngoing);
            if (isOngoing) {
                badge.style.background = 'rgba(37,99,235,0.05)';
                badge.style.color = '#2563eb';
                const currentBadge = badge.innerHTML;
                const newBadge = `<i data-lucide="refresh-cw" style="width:12px; height:12px; animation: spin 2s linear infinite;"></i> LIVE SYNC`;
                if (currentBadge !== newBadge) badge.innerHTML = newBadge;
            }
        }

        // Prevent full re-render if user is typing or if any modal is open
        const activeEl = document.activeElement;
        const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
        const overlay = document.getElementById('modal-overlay');
        const modalVisible = overlay && !overlay.classList.contains('hidden');
        const isUserActive = isTyping || this.isUserTyping;

        if (this.role && !isUserActive && !modalVisible) {
            // Only auto-refresh for public displays (Vote/Results/Blockchain)
            // Management tabs (Admin/Students) shouldn't flicker while being used
            const liveTabs = ['vote', 'results', 'blockchain'];
            if (liveTabs.includes(this.activeTab)) {
                this.renderContent();
            }
        }

        // Keep session alive while browser tab is open and app is polling/active
        if (this.role) {
            localStorage.setItem('safevote-last-active', Date.now().toString());
        }

        // Update Election Name on Home screen if active
        const h1 = document.getElementById('election-title-display');
        if (h1 && !this.role && h1.textContent !== api.electionName) {
            h1.textContent = api.electionName;
        }
    }

    renderContent() {
        const container = document.getElementById('content-area');
        if (!container) return;

        // Skip re-render if user is currently typing to prevent jumping
        // Unless it's a manual call from tab switch or action
        if (this.isUserTyping && document.activeElement && document.activeElement.id.includes('search')) {
            return;
        }

        const adminTab = document.getElementById('tab-admin');
        const studentsTab = document.getElementById('tab-students');
        const resultsTab = document.getElementById('tab-results');

        if (adminTab) adminTab.classList.toggle('hidden', this.role !== 'admin');
        if (studentsTab) studentsTab.classList.toggle('hidden', this.role !== 'admin');
        if (resultsTab) resultsTab.classList.toggle('hidden', this.role !== 'admin' && api.electionStatus !== 'ENDED');

        // Capture focus state for search bar preservation
        const activeEl = document.activeElement;
        const isSearchFocused = activeEl && activeEl.id && activeEl.id.includes('search');
        const selectionStart = (isSearchFocused && activeEl.setSelectionRange) ? activeEl.selectionStart : null;
        const selectionEnd = (isSearchFocused && activeEl.setSelectionRange) ? activeEl.selectionEnd : null;
        const activeId = activeEl ? activeEl.id : null;

        if (this.activeTab === 'vote') this.renderVoteTab(container);
        else if (this.activeTab === 'admin') this.renderAdminTab(container);
        else if (this.activeTab === 'students') this.renderStudentsTab(container);
        else if (this.activeTab === 'results') this.renderResultsTab(container);
        else if (this.activeTab === 'blockchain') this.renderBlockchainTab(container);
        else if (this.activeTab === 'guide') this.renderGuideTab(container);

        if (window.lucide) window.lucide.createIcons();

        // Premium Date Picker Initialization
        if (this.activeTab === 'admin' && window.flatpickr) {
            const config = {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                altInput: true,
                altFormat: "F j, Y at H:i",
                time_24hr: true,
                disableMobile: "true"
            };
            window.flatpickr("#sched-start", config);
            window.flatpickr("#sched-end", config);
        }
        // Restore focus and cursor position for search bar
        if (isSearchFocused && activeId) {
            setTimeout(() => {
                const el = document.getElementById(activeId);
                if (el) {
                    el.focus();
                    if (el.setSelectionRange && selectionStart !== null) {
                        el.setSelectionRange(selectionStart, selectionEnd);
                    }
                }
            }, 0);
        }

        this.applySearchFilter();
    }

    getWinner() {
        if (!api.localCandidates.length) return { name: "N/A", votes: 0, party: "N/A" };
        const winner = [...api.localCandidates].reduce((a, b) => ((a.votes || 0) > (b.votes || 0)) ? a : b, { votes: -1, name: 'None', party: "N/A" });
        return (winner.votes || 0) > 0 ? winner : { name: "No Votes Cast", votes: 0, party: "N/A" };
    }

    renderVoteTab(container) {
        const hasVoted = this.currentUser && (this.currentUser.hasVoted || api.voterIds.includes(this.currentUser.regNo.toString()));
        let html = `
            ${this.role !== 'admin' ? `
                <div style="text-align:center; margin-bottom:2rem;">
                    <button onclick="window.app.handleResetPassword()" class="btn-primary-custom" style="padding:0.4rem 1rem; font-size:0.7rem; background:var(--text-muted); color:white; text-transform:none;">Change Password</button>
                </div>
            ` : ''}
        `;

        // Scheduled Election Check
        const now = new Date();
        const startTime = api.startTime ? new Date(api.startTime) : null;
        const endTime = api.endTime ? new Date(api.endTime) : null;
        const isNotStartedYet = startTime && now < startTime;
        const isAlreadyEnded = endTime && now > endTime;
        const currentStatus = api.electionStatus;

        if (isNotStartedYet) {
            html += `
                <div class="card-custom mb-5" style="text-align:center; padding:5rem 2rem; background:var(--card-bg);">
                    <div style="background:var(--primary-light); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 2rem;">
                        <i data-lucide="calendar" size="40" style="color:var(--primary)"></i>
                    </div>
                    <h2 style="margin:0; font-size:2rem; font-weight:900;">Election Scheduled</h2>
                    <p style="color:var(--text-muted); margin-top:1rem; max-width:400px; margin-left:auto; margin-right:auto;">
                        This election is scheduled to start on <br><b>${startTime.toLocaleString()}</b>.
                    </p>
                    <div class="mt-4" style="font-size:0.9rem; color:var(--primary); font-weight:800;">
                        Please return at the scheduled time to cast your vote.
                    </div>
                </div>
            `;
            container.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (isAlreadyEnded && currentStatus !== 'ENDED') {
            html += `
                <div class="card-custom mb-5" style="text-align:center; padding:5rem 2rem; background:rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2);">
                    <div style="background:rgba(239, 68, 68, 0.1); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 2rem;">
                        <i data-lucide="timer-off" size="40" style="color:#ef4444"></i>
                    </div>
                    <h2 style="margin:0; font-size:2rem; font-weight:900; color:#b91c1c;">Voting Period Expired</h2>
                    <p style="color:var(--text-muted); margin-top:1rem; max-width:400px; margin-left:auto; margin-right:auto;">
                        The scheduled voting period for this election has ended.
                    </p>
                </div>
            `;
            container.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // Dept restriction check
        if (this.role === 'voter' && api.allowedDepartments.length > 0) {
            if (!api.allowedDepartments.includes(this.currentUser.department)) {
                html += `
                    <div class="card-custom mb-5" style="text-align:center; padding:5rem 2rem; background:rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2);">
                        <div style="background:rgba(245, 158, 11, 0.1); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 2rem;">
                            <i data-lucide="ban" size="40" style="color:#f59e0b"></i>
                        </div>
                        <h2 style="margin:0; font-size:2rem; font-weight:900; color:#d97706;">Restricted Access</h2>
                        <p style="color:var(--text-muted); margin-top:1rem; max-width:400px; margin-left:auto; margin-right:auto;">
                            This election is only open to the following departments: <br><b>${api.allowedDepartments.join(', ')}</b>.
                        </p>
                        <p style="font-size:0.8rem; margin-top:1rem;">Your department: <b>${this.currentUser.department || 'Unknown'}</b></p>
                    </div>
                `;
                container.innerHTML = html;
                if (window.lucide) window.lucide.createIcons();
                return;
            }
        }

        if (currentStatus === 'NOT_STARTED' || currentStatus === 'WAIT') {
            html += `
                <div class="card-custom mb-5" style="text-align:center; padding:5rem 2rem; background:var(--card-bg);">
                    <div style="background:var(--primary-light); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 2rem;">
                        <i data-lucide="clock" size="40" style="color:var(--primary)"></i>
                    </div>
                    <h2 style="margin:0; font-size:2rem; font-weight:900;">${currentStatus === 'WAIT' ? 'Election Paused' : 'Polling Pending'}</h2>
                    <p style="color:var(--text-muted); margin-top:1rem; max-width:400px; margin-left:auto; margin-right:auto;">
                        The election has not officially started. Please wait for the administrator to open the polls.
                    </p>
                </div>
             `;
            container.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (currentStatus === 'ENDED') {
            const winner = this.getWinner();
            html += `
                <div class="card-custom mb-5" style="border:none; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:white; text-align:center; padding:2rem">
                    <h2 style="margin:0">🏆 ${winner.name} Declared Winner</h2>
                    <p style="margin-top:0.5rem; opacity:0.9">Final Vote Count: ${winner.votes}</p>
                </div>
            `;
        }

        if (hasVoted && this.role !== 'admin') {
            html += `
                <div class="card-custom mb-5" style="text-align:center; padding:5rem 2rem; background:rgba(16, 185, 129, 0.05); border: 2px solid #10b981;">
                    <div style="background:#10b981; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 2rem; color:white;">
                        <i data-lucide="check-circle" size="40"></i>
                    </div>
                    <h2 style="margin:0; font-size:2rem; font-weight:900; color:#065f46;">You have already voted successfully!</h2>
                    <p style="color:var(--text-muted); margin-top:1rem; max-width:400px; margin-left:auto; margin-right:auto;">
                        Your participation has been securely recorded on the blockchain ledger. You can view your anonymous transaction in the <b>Digital Ledger</b> tab.
                    </p>
                    <div class="mt-4" style="font-size:0.9rem; color:#10b981; font-weight:800;">
                        Thank you for exercising your right to vote.
                    </div>
                </div>
            `;
            container.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            return;
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
            <div class="search-premium-container">
                <i data-lucide="search" class="search-mini-icon"></i>
                <input type="text" id="candidate-search" oninput="window.app.onSearchInput(this.value, 'candidate-search')" placeholder="Search candidates or parties..." class="search-premium-input" value="${this.searchQuery}">
            </div>
            
            <div id="vote-no-results" style="display:none; grid-column: 1/-1; text-align:center; padding: 4rem 2rem; background: var(--card-bg); border-radius: 1.5rem; border: 2px dashed var(--card-border); margin-bottom: 2rem;">
                <h3 style="margin:0; opacity:0.6;">No matches found</h3>
                <p style="margin-top:0.5rem;">Try a different name or party.</p>
            </div>

            <div class="grid-responsive">
        `;

        api.localCandidates.forEach(c => {
            const isEnded = api.electionStatus === 'ENDED';
            const isAdmin = this.role === 'admin';
            const disabled = isEnded || isAdmin;
            const searchStr = `${c.name} ${c.party || 'Independent'}`;

            html += `
                <div class="card-custom searchable-candidate" data-search="${searchStr}" style="padding: 2.5rem 1.5rem; text-align:center; display: flex; flex-direction: column; align-items: center;">
                    <h3 style="margin:0; font-size: 1.5rem; font-weight: 800; color: var(--text-main)">${c.name}</h3>
                    <div style="margin-top:0.5rem; background: var(--primary-light); color: var(--primary); padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${c.party || 'Independent'}
                    </div>
                    
                    ${isAdmin ? `
                        <button disabled class="btn-primary-custom" style="width:100%; margin-top:2.5rem; opacity:0.5; background:var(--text-muted); cursor:not-allowed;">
                            ADMIN VIEW
                        </button>
                    ` : `
                        <button onclick="window.app.castVote('${c.id}', this)" ${disabled ? 'disabled' : ''} class="btn-primary-custom" style="width:100%; margin-top:2.5rem; ${hasVoted ? 'opacity:0.6; cursor:not-allowed;' : ''}">
                            ${hasVoted ? '<i data-lucide="check-circle" size="18" style="vertical-align:middle; margin-right:0.5rem"></i> VOTED' : (isEnded ? 'ELECTION ENDED' : 'CAST VOTE')}
                        </button>
                    `}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    renderAdminTab(container) {
        const turnoutCount = api.totalVotersCount;
        const totalStudents = api.totalRegisteredStudents;
        const turnoutPercent = totalStudents ? ((turnoutCount / totalStudents) * 100).toFixed(1) : 0;

        let html = `
            <div class="feature-grid">
                <div class="feature-box">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="feature-title">Election Name</div>
                        <i data-lucide="edit-3" size="18" style="color:var(--text-muted)"></i>
                    </div>
                    <div style="flex-grow:1; display:flex; align-items:center;">
                        <p style="font-size:0.9rem; color:var(--text-main); margin:0; font-weight:600; line-height:1.4;">
                            <span style="display:block; font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-bottom:0.25rem;">Global Title</span>
                            ${api.electionName}
                        </p>
                    </div>
                    <div style="display:flex; gap:0.5rem; margin-top:1rem; pt:1rem; border-top:1px solid var(--card-border);">
                        <input id="election-name-input" class="form-input" value="${api.electionName}" placeholder="Edit name..." style="padding: 0.6rem 0.8rem; font-size:0.85rem;">
                        <button onclick="window.app.handleUpdateName()" class="btn-primary-custom" style="padding:0; width:45px; height:40px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="check" size="18"></i>
                        </button>
                    </div>
                </div>
                <div class="feature-box">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="feature-title">Election Status</div>
                        <i data-lucide="activity" size="18" style="color:var(--text-muted)"></i>
                    </div>
                    <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-bottom:0.4rem;">Live Status</div>
                        <div style="font-size:1.5rem; font-weight:900; color:var(--primary);">${api.electionStatus}</div>
                    </div>
                    <div style="display:flex; gap:0.5rem; margin-top:1rem; pt:1rem; border-top:1px solid var(--card-border);">
                        <button onclick="window.app.handleUpdateStatus('ONGOING')" class="btn-primary-custom" style="flex:1; padding:0.6rem; font-size:0.75rem; text-transform:none; display:flex; align-items:center; justify-content:center; gap:0.4rem;">
                            <i data-lucide="play" size="14"></i> Start
                        </button>
                        <button onclick="window.app.handleUpdateStatus('WAIT')" class="btn-primary-custom" style="flex:1; padding:0.6rem; font-size:0.75rem; background:#64748b; text-transform:none; display:flex; align-items:center; justify-content:center; gap:0.4rem;">
                            <i data-lucide="pause" size="14"></i> Wait
                        </button>
                        <button onclick="window.app.handleUpdateStatus('ENDED')" class="btn-primary-custom" style="flex:1; padding:0.6rem; font-size:0.75rem; background:#ef4444; text-transform:none; display:flex; align-items:center; justify-content:center; gap:0.4rem;">
                            <i data-lucide="square" size="14"></i> Stop
                        </button>
                    </div>
                </div>
                <div class="feature-box" style="border-color: #e0f2fe; background: #f0f9ff;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="feature-title" style="color: #0369a1;">Vote Turnout</div>
                        <i data-lucide="pie-chart" size="18" style="color:#0369a1"></i>
                    </div>
                    <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:2.5rem; font-weight:900; color:#0ea5e9;">${turnoutPercent}%</div>
                        <p style="font-size:0.8rem; color:#0284c7; margin:0.25rem 0 0;">${turnoutCount} / ${totalStudents} Students Voted</p>
                    </div>
                </div>
                <div class="feature-box" style="border-color: #dcfce7; background: #f0fdf4;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="feature-title" style="color: #166534;">Export Data</div>
                        <i data-lucide="download" size="18" style="color:#166534"></i>
                    </div>
                    <div style="flex-grow:1; display:flex; align-items:center;">
                        <p style="font-size:0.85rem; color:#15803d; margin:0; line-height:1.4;">Finalize and download the complete election report in PDF format.</p>
                    </div>
                    <div style="margin-top:1rem; pt:1rem; border-top:1px solid rgba(21, 128, 61, 0.1);">
                        <button onclick="window.app.handleDownloadPDF()" class="btn-primary-custom" style="background:#16a34a; width:100%; padding:0.75rem; text-transform:none; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                            <i data-lucide="file-text" size="16"></i> GENERATE PDF
                        </button>
                    </div>
                </div>
                <div class="feature-box" style="border-color: #ffedd5; background: #fffaf2;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="feature-title" style="color: #9a3412;">Voting Link</div>
                        <i data-lucide="link" size="18" style="color:#9a3412"></i>
                    </div>
                    <div style="flex-grow:1; display:flex; align-items:center;">
                        <p style="font-size:0.85rem; color:#c2410c; margin:0; line-height:1.4;">Share this direct access link with students to allow them to cast their votes.</p>
                    </div>
                    <div style="margin-top:1rem; pt:1rem; border-top:1px solid rgba(194, 65, 12, 0.1);">
                        <button onclick="window.app.handleCopyLink()" class="btn-primary-custom" style="background:#f97316; width:100%; padding:0.75rem; text-transform:none; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                            <i data-lucide="copy" size="16"></i> COPY LINK
                        </button>
                    </div>
                </div>
                <div class="feature-box" style="border-color: var(--card-border); background: var(--bg-main);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="feature-title" style="color: var(--primary);">System Security</div>
                        <i data-lucide="shield-check" size="18" style="color:var(--primary)"></i>
                    </div>
                    <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-bottom:0.4rem;">Encryption Key</div>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">Update your administrator access key.</p>
                    </div>
                    <div style="display:flex; gap:0.5rem; margin-top:1rem; pt:1rem; border-top:1px solid var(--card-border);">
                         <input id="new-admin-key" type="password" class="form-input" placeholder="New Key" style="font-size:0.85rem; padding: 0.6rem 0.8rem;">
                         <button onclick="window.app.handleUpdateAdminKey()" class="btn-primary-custom" style="padding:0.6rem 1rem; background:#64748b; color:white; text-transform:none; font-size:0.8rem; flex-shrink:0;">UPDATE</button>
                    </div>
                </div>
            </div>

            <div class="card-custom mt-5" style="padding: 2rem; border: 1px dashed var(--primary); background: rgba(37, 99, 235, 0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem">
                    <h3 style="margin:0"><i data-lucide="calendar-days" style="vertical-align:middle; margin-right:0.5rem"></i> Election Scheduler (Future Setup)</h3>
                    <div style="background:var(--primary); color:white; padding:0.25rem 0.75rem; border-radius:99px; font-size: 0.7rem; font-weight:800;">BETA</div>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="grid-column: span 2;">
                        <label class="form-label">Future Election Name</label>
                        <input type="text" id="sched-name" class="form-input" value="${api.electionName}" placeholder="e.g. 2026 Student Council Elections">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Start Date & Time</label>
                        <input type="text" id="sched-start" class="form-input" placeholder="Select Start Time..." value="${api.startTime ? new Date(api.startTime).toISOString().slice(0, 16) : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date & Time</label>
                        <input type="text" id="sched-end" class="form-input" placeholder="Select End Time..." value="${api.endTime ? new Date(api.endTime).toISOString().slice(0, 16) : ''}">
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label class="form-label">Restrict to Departments</label>
                    <div style="display:flex; flex-wrap:wrap; gap:1.5rem; margin-top:0.5rem">
                        ${[...new Set(["CYBER SECURITY", "AIML", "OTHERS", ...api.localStudents.map(s => s.department || "OTHERS")])].sort().map(dept => `
                            <label style="display:flex; align-items:center; gap:0.6rem; font-size:0.9rem; cursor:pointer; font-weight:600;">
                                <input type="checkbox" name="sched-dept" value="${dept}" ${(api.allowedDepartments || []).includes(dept) ? 'checked' : ''} style="width:18px; height:18px;"> ${dept}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-top:1.5rem; display:flex; gap:1rem; align-items:center;">
                    <button onclick="window.app.handleScheduleElection()" class="btn-primary-custom" style="padding:0.75rem 2rem; background:var(--primary);">APPLY SCHEDULE</button>
                    ${api.startTime ? `<div style="font-size:0.7rem; color:var(--text-muted);">Current Active Schedule: <b>${new Date(api.startTime).toLocaleString()}</b> to <b>${new Date(api.endTime).toLocaleString()}</b></div>` : ''}
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
                <div style="padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; gap: 1rem; flex-wrap: wrap;">
                    <h3 style="margin:0">Live Candidate List</h3>
                    <div class="search-premium-container" style="margin: 0; max-width: 350px;">
                        <i data-lucide="search" class="search-mini-icon" style="width:16px; height:16px; left:1rem;"></i>
                        <input type="text" id="admin-candidate-search" oninput="window.app.onSearchInput(this.value, 'admin-candidate-search')" placeholder="Filter by name or party..." class="search-premium-input" style="padding: 0.7rem 0.7rem 0.7rem 2.8rem; font-size:0.85rem; border-radius: 0.8rem;" value="${this.searchQuery}">
                    </div>
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
                        ${[...api.localCandidates].sort((a, b) => a.name.localeCompare(b.name)).map(c => `
                            <tr class="searchable-candidate-row" data-search="${c.name} ${c.party}">
                                <td><b>${c.name}</b><br><small style="color:var(--text-muted)">${c.party}</small></td>
                                <td style="text-align:center">
                                    <span style="background:var(--primary-light); color:var(--primary); padding:0.25rem 0.75rem; border-radius:12px; font-weight:900">${c.votes}</span>
                                </td>
                                <td style="text-align:right">
                                    <button onclick="window.app.handleDeleteCandidate('${c.id}', '${c.name.replace(/'/g, "\\'")}')" style="background:none; border:none; color:#ef4444; font-weight:700; cursor:pointer">REMOVE</button>
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
                <div class="grid-form">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Full Name</label>
                        <input id="cn" class="form-input" placeholder="e.g. John Doe" autocomplete="off" onkeyup="if(event.key==='Enter') window.app.handleAdd()">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Group / Party</label>
                        <input id="cp" class="form-input" placeholder="e.g. Independent" autocomplete="off" onkeyup="if(event.key==='Enter') window.app.handleAdd()">
                    </div>
                    <button id="save-btn" onclick="window.app.handleAdd()" class="btn-primary-custom" style="padding: 1rem 2rem; width:100%">ADD TO LIST</button>
                </div>
            </div>
            
            <div style="margin-top:4rem; text-align:center">
                 <button onclick="window.app.handleReset()" class="btn-primary-custom" style="background:#e11d48; padding:0.5rem 2rem; font-size:0.8rem">RESET SYSTEM DATA</button>
            </div>
        `;
        container.innerHTML = html;
    }

    renderStudentsTab(container) {
        const studentsByDept = {};
        const query = this.searchQuery.toLowerCase();

        // Group students by department
        api.localStudents.forEach(s => {
            let dept = s.department;
            if (dept === "CYBER") dept = "CYBER SECURITY";
            if (!dept) {
                const sId = s.regNo.toString();
                const dCode = sId.substring(6, 9);
                if (dCode === "107") dept = "CYBER SECURITY";
                else if (dCode === "202") dept = "AIML";
                else dept = "CYBER SECURITY"; // Default fallback
            }
            if (!studentsByDept[dept]) studentsByDept[dept] = [];
            studentsByDept[dept].push(s);
        });

        const departments = Object.keys(studentsByDept).sort();

        let html = `
            <div style="display:flex; flex-direction: column; align-items: center; margin-bottom: 3rem;">
                <div class="search-premium-container" style="max-width: 600px; margin-bottom: 1.5rem;">
                    <i data-lucide="search" class="search-mini-icon"></i>
                    <input type="text" id="admin-student-search" oninput="window.app.onSearchInput(this.value, 'admin-student-search')" placeholder="Search students by name or roll number..." class="search-premium-input" value="${this.searchQuery}">
                </div>
                <div style="background:var(--primary-light); color:var(--primary); padding: 0.5rem 1.25rem; border-radius: 99px; font-weight: 800; font-size:0.85rem; border: 1px solid var(--primary-light);">
                    ${api.localStudents.length} Students registered total
                </div>
            </div>

            <div class="departments-container">
        `;

        const allAvailableDepts = new Set(["CYBER SECURITY", "AIML", "OTHERS"]);
        api.localStudents.forEach(s => {
            if (s.department) allAvailableDepts.add(s.department);
            else if (s.regNo) {
                const dCode = s.regNo.toString().substring(6, 9);
                if (dCode === "107") allAvailableDepts.add("CYBER SECURITY");
                else if (dCode === "202") allAvailableDepts.add("AIML");
            }
        });

        // Render each department as a "folder" / section
        departments.forEach(dept => {
            const students = studentsByDept[dept].sort((a, b) => a.name.localeCompare(b.name));
            const isExpanded = this.expandedDepts[dept];

            html += `
                <div class="card-custom mb-5 student-dept-folder" style="padding: 0; overflow: hidden; border: 2px solid var(--primary-light);">
                    <div onclick="window.app.toggleDept('${dept}')" style="padding: 1.5rem; background: var(--primary-light); display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition: background 0.3s;">
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <i data-lucide="${isExpanded ? 'folder-open' : 'folder'}" style="color:var(--primary)"></i>
                            <h3 style="margin:0; color:var(--primary)">${dept}</h3>
                        </div>
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <span style="background:white; color:var(--primary); padding: 0.2rem 0.6rem; border-radius: 99px; font-weight: 800; font-size: 0.8rem;">
                                ${students.length} Students
                            </span>
                            <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="color:var(--primary); width:20px;"></i>
                        </div>
                    </div>
                    
                    ${isExpanded ? `
                    <div class="fade-in">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Roll / Reg No</th>
                                    <th>Password</th>
                                    <th style="text-align:center">Status</th>
                                    <th style="text-align:right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(s => `
                                    <tr class="searchable-student-row" data-search="${s.name} ${s.regNo}">
                                        <td>
                                            <b>${s.name}</b><br>
                                            <small style="color:var(--text-muted)">${this.parseStudentId(s.regNo) || ''}</small>
                                        </td>
                                        <td><code>${s.regNo}</code></td>
                                        <td style="display:flex; align-items:center; gap:0.5rem;">
                                            <span style="font-family:monospace; background:rgba(0,0,0,0.05); padding:2px 6px; border-radius:4px;">••••••••</span>
                                            <button onclick="window.app.handleAdminChangePassword('${s.regNo}', '${s.name}')" style="background:none; border:none; color:var(--primary); font-size:0.6rem; font-weight:800; cursor:pointer; text-decoration:underline;">CHANGE</button>
                                        </td>
                                        <td style="text-align:center">
                                            <span style="color:${s.hasVoted ? '#10b981' : '#f59e0b'}; font-weight:800; font-size:0.7rem; text-transform:uppercase;">
                                                ${s.hasVoted ? 'Voted' : 'Pending'}
                                            </span>
                                        </td>
                                        <td style="text-align:right">
                                            <button onclick="window.app.handleDeleteStudent('${s.id}', '${s.name.replace(/'/g, "\\'")}')" style="background:none; border:none; color:#ef4444; font-weight:700; cursor:pointer">REMOVE</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        html += `
            </div>

            <div class="add-candidate-section">
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="margin:0">Add New Student</h3>
                    <p style="margin:0; font-size:0.85rem; color:var(--text-muted)">Register a new voter to the system.</p>
                </div>
                <div class="grid-form" style="grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 1.5rem;">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Full Name</label>
                        <input id="sn" class="form-input" placeholder="e.g. Alice Smith" autocomplete="off" onkeyup="if(event.key==='Enter') window.app.handleAddStudent()">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Roll Number</label>
                        <input id="sr" class="form-input" placeholder="e.g. 714023..." autocomplete="off" onkeyup="if(event.key==='Enter') window.app.handleAddStudent()">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Password</label>
                        <input id="sp" class="form-input" placeholder="Default: atkboss" autocomplete="off" onkeyup="if(event.key==='Enter') window.app.handleAddStudent()">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Department</label>
                        <div class="custom-select-container" id="dept-select-wrapper">
                            <div class="custom-select-trigger ${this.deptDropdownOpen ? 'active' : ''}" onclick="window.app.toggleDeptDropdown(event)">
                                <span id="selected-dept-label">
                                    ${this.selectedDept === 'AUTO' ? 'Auto-detect (Recommended)' :
                this.selectedDept === 'NEW' ? '+ Add New Department' : this.selectedDept}
                                </span>
                                <i data-lucide="${this.deptDropdownOpen ? 'chevron-up' : 'chevron-down'}"></i>
                            </div>
                            <div class="custom-select-options ${this.deptDropdownOpen ? 'show' : ''}">
                                <div class="custom-select-option ${this.selectedDept === 'AUTO' ? 'selected' : ''}" onclick="window.app.selectDept('AUTO')">Auto-detect (Recommended)</div>
                                <div class="custom-select-optgroup">Select Folder</div>
                                ${Array.from(allAvailableDepts).sort().map(d => `
                                    <div class="custom-select-option ${this.selectedDept === d ? 'selected' : ''}" onclick="window.app.selectDept('${d}')">${d}</div>
                                `).join('')}
                                <div class="custom-select-option custom-select-special" onclick="window.app.selectDept('NEW')">+ Add New Department</div>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.app.handleAddStudent()" class="btn-primary-custom" style="padding: 1rem 2rem;">ADD STUDENT</button>
                </div>
            </div>
        `;
        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    async handleAdminChangePassword(regNo, studentName) {
        const newPass = prompt(`Enter new password for ${studentName} (${regNo}):`, "atkboss");
        if (newPass === null) return; // Cancelled
        if (newPass.trim().length < 4) return this.showToast("Password must be at least 4 characters", "error");

        const success = await api.updateStudentPassword(regNo, null, newPass.trim());
        if (success) {
            this.showToast(`Password updated for ${studentName}`);
            await api.fetchStudents(); // Refresh list to update state
            this.renderContent();
        } else {
            this.showToast("Failed to update password", "error");
        }
    }

    async handleAddStudent() {
        const sn_val = document.getElementById('sn').value.trim();
        const sr_val = document.getElementById('sr').value.trim();
        const sp_val = document.getElementById('sp').value.trim();

        if (!sn_val || !sr_val) return this.showToast("Name and Roll No required", "error");

        const btn = document.querySelector('button[onclick*="handleAddStudent"]');
        if (btn) btn.disabled = true;

        // Determine department
        let department = this.selectedDept;

        if (department === 'AUTO' || department === 'NEW') {
            const deptCode = sr_val.substring(6, 9);
            if (deptCode === "107") department = "CYBER SECURITY";
            else if (deptCode === "202") department = "AIML";
            else department = "OTHERS";
        }

        const res = await api.addStudent(sr_val, sn_val, sp_val, department);

        if (res.success) {
            this.showToast("Student Registered!");
            await api.fetchStudents(); // Refresh list to update state
            this.renderContent();
        } else {  // Inputs are cleared by re-render, but manually clearing just in case
            const sn = document.getElementById('sn');
            const sr = document.getElementById('sr');
            const sp = document.getElementById('sp');
            if (sn) sn.value = '';
            if (sr) sr.value = '';
            if (sp) sp.value = '';
            this.showToast(res.message || "Failed to add student", "error");
        }

        if (btn) btn.disabled = false;
    }


    async handleDeleteStudent(id, name) {
        if (!confirm(`Permanently delete ${name}?`)) return;
        await api.deleteStudent(id);
        this.showToast(`${name} removed`);
        await api.fetchStudents(); // Refresh list to update state
        this.renderContent();
    }

    async handleDeleteCandidate(id, name) {
        if (confirm(`Are you sure you want to remove candidate: ${name}?`)) {
            await api.deleteCandidate(id);
            this.showToast(`Candidate ${name} removed`);
            await api.fetchCandidates(); // Refresh list to update state
            this.renderContent();
        }
    }

    async handleUpdateStatus(status) {
        if (status === 'ONGOING' && api.localCandidates.length < 2) {
            return this.showToast("Cannot start election: Minimum 2 candidates required.", "error");
        }
        try {
            await api.updateStatus(status);
            this.showToast(`Election status set to ${status}`);
            this.renderContent();
        } catch (e) {
            this.showToast("Failed to update status", "error");
        }
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

    async handleScheduleElection() {
        const name = document.getElementById('sched-name').value.trim();
        const start = document.getElementById('sched-start').value;
        const end = document.getElementById('sched-end').value;
        const depts = Array.from(document.querySelectorAll('input[name="sched-dept"]:checked')).map(cb => cb.value);

        if (!name) return this.showToast("Election name required", "error");
        if (!start || !end) return this.showToast("Please set both start and end times", "error");
        if (new Date(start) >= new Date(end)) return this.showToast("End time must be after start time", "error");

        const data = {
            electionName: name,
            startTime: new Date(start).toISOString(),
            endTime: new Date(end).toISOString(),
            allowedDepartments: depts
        };

        const res = await fetch(`${api.baseUrl}/api/config/update`, {
            method: 'POST',
            headers: api.getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (res.ok) {
            this.showToast("Election Schedule Applied!");
            await api.syncData();
            this.renderContent();
        } else {
            this.showToast("Failed to apply schedule", "error");
        }
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
                <div style="position: relative;">
                    <input type="password" id="modal-pass-current" class="form-input" placeholder="Enter current password">
                    <i data-lucide="eye" id="modal-pass-current-icon" onclick="window.app.togglePasswordVisibility('modal-pass-current', 'modal-pass-current-icon')" 
                       style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); cursor: pointer; color: #64748b; width: 18px; height: 18px;"></i>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">New Password (Min 4 chars)</label>
                <div style="position: relative;">
                    <input type="password" id="modal-pass-new" class="form-input" placeholder="Enter new password">
                    <i data-lucide="eye" id="modal-pass-new-icon" onclick="window.app.togglePasswordVisibility('modal-pass-new', 'modal-pass-new-icon')" 
                       style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); cursor: pointer; color: #64748b; width: 18px; height: 18px;"></i>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <div style="position: relative;">
                    <input type="password" id="modal-pass-confirm" class="form-input" placeholder="Re-enter new password">
                    <i data-lucide="eye" id="modal-pass-confirm-icon" onclick="window.app.togglePasswordVisibility('modal-pass-confirm', 'modal-pass-confirm-icon')" 
                       style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); cursor: pointer; color: #64748b; width: 18px; height: 18px;"></i>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

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

                if (!(await api.verifyStudent(this.currentUser.regNo, current))) {
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

                const success = await api.updateStudentPassword(this.currentUser.regNo, current, newP);
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

    handleCopyLink() {
        // Build the direct link for students
        const url = window.location.origin + window.location.pathname + '?view=student';

        navigator.clipboard.writeText(url).then(() => {
            this.showToast("Voting link copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.showToast("Failed to copy link. Please copy manually: " + url, "error");
        });
    }

    toggleDeptDropdown(e) {
        if (e) e.stopPropagation();
        this.deptDropdownOpen = !this.deptDropdownOpen;
        this.renderContent();

        if (this.deptDropdownOpen) {
            const closeHandler = () => {
                this.deptDropdownOpen = false;
                this.renderContent();
                document.removeEventListener('click', closeHandler);
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        }
    }

    selectDept(val) {
        if (val === 'NEW') {
            const newDept = prompt("Enter New Department Name:");
            if (newDept && newDept.trim()) {
                const deptName = newDept.trim().toUpperCase();
                this.selectedDept = deptName;
            } else {
                this.selectedDept = 'AUTO';
            }
        } else {
            this.selectedDept = val;
        }
        this.deptDropdownOpen = false;
        this.renderContent();
    }

    togglePasswordVisibility(inputId = 'student-pass-input', iconId = 'toggle-pass-icon') {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (!input || !icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    async refreshResults() {
        const btn = document.getElementById('refresh-results-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="refresh-cw" class="spin" style="width:16px; height:16px;"></i> refreshing...`;
            if (window.lucide) window.lucide.createIcons();
        }

        await api.syncData();

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="refresh-cw" style="width:16px; height:16px;"></i> REFRESH RESULTS`;
            if (window.lucide) window.lucide.createIcons();
        }
    }

    renderResultsTab(container) {
        const sorted = [...api.localCandidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
        const winner = this.getWinner();

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:3rem">
                <div style="text-align:left">
                    <h1 style="font-size:2.5rem; font-weight:900; margin:0">${api.electionName}</h1>
                    <h2 style="margin:0; color:var(--text-muted)">Official Tally</h2>
                </div>
                <button id="refresh-results-btn" onclick="window.app.refreshResults()" class="btn-primary-custom" style="padding: 0.6rem 1.25rem; font-size: 0.8rem; display:flex; align-items:center; gap:0.5rem;">
                    <i data-lucide="refresh-cw" style="width:16px; height:16px;"></i> REFRESH RESULTS
                </button>
            </div>
        `;

        const canSeeVotes = api.electionStatus === 'ENDED' || this.role === 'admin';

        if (api.electionStatus === 'ENDED') {
            html += `
                <div class="card-custom mb-5" style="border:none; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:white; text-align:center; padding:3rem">
                    <div style="font-size:1rem; font-weight:700; opacity:0.9; text-transform:uppercase; margin-bottom:1rem">Final Result Declared</div>
                    <h1 style="margin:0; font-size:3.5rem; font-weight:900">🏆 ${winner.name}</h1>
                    <div style="font-size:1.25rem; margin-top:1rem; font-weight:600">${winner.party} — ${winner.votes || 0} Votes</div>
                    <div style="margin-top:2rem; display:inline-block; background:rgba(255,255,255,0.2); padding:0.5rem 1.5rem; border-radius:99px; font-size:0.9rem">Winner by Majority</div>
                </div>
            `;
        } else {
            html += `
                <div class="card-custom mb-5" style="background:var(--bg-main); border:none; text-align:center">
                    <h3 style="margin:0; color:var(--text-main)">Status: ${api.electionStatus}</h3>
                    <p style="margin:0.5rem 0 0; color:var(--text-muted); font-size:0.9rem">
                        ${canSeeVotes ? 'Real-time counts are visible to administrators.' : 'Real-time counts will be finalized when poll closes.'}
                    </p>
                </div>
            `;
        }

        html += `<div style="display:flex; flex-direction:column; gap:1.5rem">`;
        sorted.forEach((c, index) => {
            const isWinner = api.electionStatus === 'ENDED' && c.id === winner.id;
            html += `
                <div class="card-custom" style="display:flex; justify-content:space-between; align-items:center; ${isWinner ? 'border:2px solid #10b981; background:#f0fdf4' : ''}">
                    <div style="display:flex; align-items:center; gap:1.5rem">
                        <div style="width:40px; height:40px; border-radius:50%; background:${isWinner ? '#10b981' : 'var(--primary-light)'}; color:${isWinner ? 'white' : 'var(--primary)'}; display:flex; align-items:center; justify-content:center; font-weight:900">
                            ${index + 1}
                        </div>
                        <div>
                            <h3 style="margin:0">${c.name} ${isWinner ? '🏆' : ''}</h3>
                            <small style="color:var(--text-muted); font-weight:600">${c.party}</small>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:2rem; font-weight:900; color:${isWinner ? '#059669' : 'var(--primary)'}">
                            ${canSeeVotes ? (c.votes || 0) : '—'}
                        </div>
                        <small style="color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:700">Votes</small>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    renderBlockchainTab(container) {
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div>
                    <h2 style="margin:0">Digital Ledger (Blockchain)</h2>
                    <p style="color:var(--text-muted); margin:0.25rem 0 0;">${api.electionName} Immutable Logs</p>
                </div>
                ${this.role === 'admin' ? `
                    <button onclick="window.app.verifyBlockchain()" class="btn-primary-custom" style="padding: 0.5rem 1.25rem; font-size: 0.8rem; background: var(--primary); display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="shield-check" style="width:16px; height:16px;"></i> VERIFY LEDGER INTEGRITY
                    </button>
                ` : ''}
            </div>
            <div id="blockchain-status-alert"></div>
            <div style="border-left:4px solid var(--primary); padding-left:2rem; margin-top:2rem">
        `;

        if (api.localBlockchain.length === 0) {
            html += `<p style="padding:2rem; color:var(--text-muted)">No blocks recorded yet. Cast a vote to see the ledger.</p>`;
        }

        api.localBlockchain.forEach(b => {
            const voterHash = b.data?.voterHash || 'N/A';
            html += `
                <div class="card-custom mb-3" style="padding:1.5rem">
                    <div class="flex-between">
                        <div style="font-size:0.7rem; color:var(--text-muted)">BLOCK #${b.index} | ${new Date(b.timestamp).toLocaleString()}</div>
                        <div style="background:var(--primary-light); color:var(--primary); padding:2px 8px; border-radius:99px; font-size:0.6rem; font-weight:800; text-transform:uppercase;">Verified Block</div>
                    </div>
                    <div style="margin:1rem 0; font-family:monospace; font-size:0.85rem;">
                        <div style="color:var(--primary); font-weight:800; margin-bottom:0.5rem">Voter (Hashed): <span style="color:var(--text-main); word-break:break-all;">${voterHash}</span></div>
                        <div style="color:var(--text-muted);">Block Hash: <span style="color:var(--text-main); word-break:break-all;">${b.hash}</span></div>
                        <div style="color:var(--text-muted); font-size:0.7rem; margin-top:0.25rem">Digital Chain (Prev Hash): <span style="word-break:break-all;">${b.previousHash}</span></div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    async verifyBlockchain() {
        const btn = document.querySelector('button[onclick*="verifyBlockchain"]');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'VERIFYING...';

        try {
            const res = await fetch(`${api.baseUrl}/api/blockchain/verify`, {
                headers: api.getAuthHeaders()
            });
            const report = await res.json();

            const alertContainer = document.getElementById('blockchain-status-alert');
            if (report.isValid) {
                alertContainer.innerHTML = `
                    <div class="card-custom" style="background:#ecfdf5; border:1px solid #10b981; color:#065f46; padding:1rem; margin-top:1rem; display:flex; align-items:center; gap:1rem;">
                        <i data-lucide="check-circle" style="color:#10b981"></i>
                        <div>
                            <div style="font-weight:800;">Ledger Verified</div>
                            <div style="font-size:0.85rem;">Mathematical integrity confirmed for ${report.totalBlocks} blocks. No tampering detected.</div>
                        </div>
                    </div>
                `;
            } else {
                alertContainer.innerHTML = `
                    <div class="card-custom" style="background:#fef2f2; border:1px solid #ef4444; color:#991b1b; padding:1rem; margin-top:1rem;">
                        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem;">
                            <i data-lucide="alert-triangle" style="color:#ef4444"></i>
                            <div style="font-weight:800;">LEDGER CORRUPTED!</div>
                        </div>
                        <ul style="font-size:0.85rem; padding-left:1.5rem;">
                            ${report.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            if (window.lucide) window.lucide.createIcons();
        } catch (e) {
            this.showToast("Verification failed", "error");
        }

        btn.disabled = false;
        btn.innerHTML = originalHtml;
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
                this.currentUser.hasVoted = true;
                localStorage.setItem('safevote-user', JSON.stringify(this.currentUser));
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
            api.addCandidate(n, p).then(async () => {
                this.showToast("Candidate Added!");
                await api.fetchCandidates(); // Refresh list
                this.renderContent();
                const cn = document.getElementById('cn');
                const cp = document.getElementById('cp');
                if (cn) cn.value = '';
                if (cp) cp.value = '';
            }).catch(err => {
                this.showToast("Error saving: " + (err.message || "Unknown error"), "error");
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

        this.applySearchFilter();
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
        const totalStudents = api.totalRegisteredStudents;
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
        if (this.role === 'voter') {
            container.innerHTML = `
                <div class="card-custom">
                    <h2 style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">
                        <i data-lucide="help-circle" style="color:var(--primary)"></i> Voter Participation Guide
                    </h2>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:2rem;">
                        <div>
                            <h3 style="font-size:1.1rem; color:var(--primary); margin-bottom:1rem;">How to Vote</h3>
                            <ul style="line-height:2; list-style: none; padding:0;">
                                <li style="margin-bottom:0.8rem;"><i data-lucide="search" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Find Candidate:</b> Use the search bar in the 'Vote Now' tab to filter candidates by name or party.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="check-square" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Cast Vote:</b> Click the 'VOTE' button on your preferred candidate. Note: You can only vote once.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="lock" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Verification:</b> Once cast, your ID is hashed and recorded. No one can see who you voted for.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style="font-size:1.1rem; color:var(--primary); margin-bottom:1rem;">Your Security</h3>
                            <ul style="line-height:2; list-style: none; padding:0;">
                                <li style="margin-bottom:0.8rem;"><i data-lucide="shield" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Identity:</b> Your vote is permanent and linked to your hashed ID for audit integrity.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="link" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Digital Ledger:</b> View the 'Digital Ledger' tab to see your vote's anonymous block.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="key" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Password:</b> Change your default password immediately using the button on the Vote tab.</li>
                            </ul>
                        </div>
                    </div>
                    <div style="margin-top:2rem; padding:1.5rem; background:rgba(16, 185, 129, 0.05); border-radius:1rem; border:1px solid rgba(16, 185, 129, 0.1);">
                        <h4 style="margin:0 0 0.5rem; color:#10b981; font-size:0.9rem;">Important Notice:</h4>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">This is a blockchain-based election. Once your vote is submitted, it is <b>immutable</b> and cannot be changed or deleted. Ensure your choice is final before clicking the button.</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="card-custom">
                    <h2 style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">
                        <i data-lucide="book-open" style="color:var(--primary)"></i> Admin Control Guide
                    </h2>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:2rem;">
                        <div>
                            <h3 style="font-size:1.1rem; color:var(--primary); margin-bottom:1rem;">Core Operations</h3>
                            <ul style="line-height:2; list-style: none; padding:0;">
                                <li style="margin-bottom:0.8rem;"><i data-lucide="edit-3" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Election Name:</b> Set the official title for the portal and generated reports.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="play-circle" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Status Control:</b> Use <b>START</b> to open polls, <b>WAIT</b> to pause, and <b>STOP</b> to conclude voting.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="bar-chart-2" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Live Turnout:</b> Monitor real-time student participation percentages.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="refresh-ccw" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>System Reset:</b> Perma-delete all votes and candidates for a new cycle.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style="font-size:1.1rem; color:var(--primary); margin-bottom:1rem;">Management Tools</h3>
                            <ul style="line-height:2; list-style: none; padding:0;">
                                <li style="margin-bottom:0.8rem;"><i data-lucide="user-plus" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Candidates:</b> Add participants with their names and party affiliations.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="folder-search" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Department Folders:</b> Review and manage student lists by specific departments.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="file-down" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>PDF Export:</b> Generate a cryptographically signed report of final results.</li>
                                <li style="margin-bottom:0.8rem;"><i data-lucide="key" size="14" style="margin-right:0.5rem; color:var(--text-muted)"></i> <b>Security Key:</b> Rotate the administrator access key periodically for safety.</li>
                            </ul>
                        </div>
                    </div>
                    <div style="margin-top:2rem; padding:1.5rem; background:rgba(37,99,235,0.05); border-radius:1rem; border:1px solid rgba(37,99,235,0.1);">
                        <h4 style="margin:0 0 0.5rem; color:var(--primary); font-size:0.9rem;">Pro Tip:</h4>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">Ensure all candidates are added <b>before</b> starting the election. While the system supports hot-swapping, it is best practice to have the ballot ready before the first vote is cast.</p>
                    </div>
                </div>
            `;
        }
        if (window.lucide) window.lucide.createIcons();
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
// Initial page load
window.app.init();

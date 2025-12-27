// --- APP UI LOGIC ---
import { VotingAPI } from "../backend/voting-api.js";

export class App {
    constructor() {
        this.currentUser = null;
        this.currentUserName = null;
        this.role = null;
        this.activeTab = 'vote';
        this.voterHasVoted = false;
        // Defined inside class to be accessible safely
        this.STUDENT_DATABASE = [
            { roll: 61, regNo: 714023107061, name: 'Mohithra S' }, { roll: 62, regNo: 714023107062, name: 'Monika P' },
            { roll: 63, regNo: 714023107063, name: 'Monish Prabu B' }, { roll: 64, regNo: 714023107064, name: 'Mukesh Kumar R' },
            { roll: 65, regNo: 714023107065, name: 'MUKESH KUMAR R' }, { roll: 66, regNo: 714023107066, name: 'Murali Kumar S' },
            { roll: 67, regNo: 714023107067, name: 'Muthukumaran M' }, { roll: 68, regNo: 714023107068, name: 'Naga Arjun N' },
            { roll: 69, regNo: 714023107069, name: 'Naveen Kumar S' }, { roll: 70, regNo: 714023107070, name: 'Nidhiswar B' },
            { roll: 71, regNo: 714023107071, name: 'NITHISHKUMAR D' }, { roll: 72, regNo: 714023107072, name: 'Nivethika' },
            { roll: 73, regNo: 714023107073, name: 'Padalingam S' }, { roll: 74, regNo: 714023107074, name: 'PARAMESH S' },
            { roll: 75, regNo: 714023107075, name: 'Pathan Nafil F' }, { roll: 76, regNo: 714023107076, name: 'Pavithra' },
            { roll: 77, regNo: 714023107077, name: 'pooja R' }, { roll: 78, regNo: 714023107078, name: 'Pooja Nair' },
            { roll: 79, regNo: 714023107079, name: 'Prabhat Bhunya' }, { roll: 80, regNo: 714023107080, name: 'pradeeswari R' },
            { roll: 81, regNo: 714023107081, name: 'prakash' }, { roll: 82, regNo: 714023107082, name: 'Prathisha R' },
            { roll: 83, regNo: 714023107083, name: 'praveen B' }, { roll: 84, regNo: 714023107084, name: 'Preethika' },
            { roll: 85, regNo: 714023107085, name: 'Praveshika' }, { roll: 86, regNo: 714023107086, name: 'Prem Kishore' },
            { roll: 87, regNo: 714023107087, name: 'Priya Dharshini J' }, { roll: 88, regNo: 714023107088, name: 'RAHUL S' },
            { roll: 89, regNo: 714023107089, name: 'Rathimalar G' }, { roll: 90, regNo: 714023107090, name: 'Ravikrishna L' },
            { roll: 91, regNo: 714023107091, name: 'Rithik Kannaa K' }, { roll: 92, regNo: 714023107092, name: 'Rithish' },
            { roll: 93, regNo: 714023107093, name: 'Rohit' }, { roll: 94, regNo: 714023107094, name: 'Sahana B M' },
            { roll: 95, regNo: 714023107095, name: 'Sanchana NM' }, { roll: 96, regNo: 714023107096, name: 'Sandhiya C' },
            { roll: 97, regNo: 714023107097, name: 'Sandhiya S' }, { roll: 98, regNo: 714023107098, name: 'Sangameshwaran G' },
            { roll: 99, regNo: 714023107099, name: 'Sanjay Kumar S' }, { roll: 100, regNo: 714023107100, name: 'Sanjayan V' },
            { roll: 101, regNo: 714023107101, name: 'Santhosh' }, { roll: 102, regNo: 714023107102, name: 'Shakthi S' },
            { roll: 103, regNo: 714023107103, name: 'Shashank J' }, { roll: 104, regNo: 714023107104, name: 'Sheik Musthafa' },
            { roll: 105, regNo: 714023107105, name: 'Suganth J' }, { roll: 106, regNo: 714023107106, name: 'Surendiran M G' },
            { roll: 107, regNo: 714023107107, name: 'Surya S J' }, { roll: 108, regNo: 714023107108, name: 'Tharun Kumar S' },
            { roll: 109, regNo: 714023107109, name: 'Thenmozhi A' }, { roll: 110, regNo: 714023107110, name: 'Thiruselvam S' },
            { roll: 111, regNo: 714023107111, name: 'Varshini J' }, { roll: 112, regNo: 714023107112, name: 'Vishnukumar S S' },
            { roll: 113, regNo: 714023107113, name: 'Yarshath S' }, { roll: 114, regNo: 714023107114, name: 'Yashwanth Babu S' },
            { roll: 501, regNo: 714023107501, name: 'Yokesh A' }, { roll: 116, regNo: 714023107116, name: 'Sreeman S' },
            { roll: 502, regNo: 714023107502, name: 'Tharun B S' }
        ];
    }

    async init() {
        try {
            await api.initAuth();
            if(window.lucide) lucide.createIcons();
        } catch (e) {
            console.error("App Init Error:", e);
        }
    }

    async login(role) {
        try {
            const input = document.getElementById('login-input').value.trim();
            if (!input) return this.showToast('Please enter credentials', 'error');

            if (role === 'admin') {
                if (input === api.adminKey) {
                    this.role = 'admin';
                    this.currentUser = 'Administrator';
                    this.currentUserName = 'System Admin';
                    this.showView('dashboard');
                    this.switchTab('admin');
                    this.updateNav();
                    this.showToast('Admin access granted');
                } else {
                    this.showToast('Invalid Admin Key', 'error');
                }
            } else {
                const numInput = parseInt(input);
                const student = this.STUDENT_DATABASE.find(s => s.regNo === numInput);

                if (!student) {
                     this.showToast('Invalid Register Number. Access Denied.', 'error');
                     return;
                }

                this.role = 'voter';
                this.currentUser = student.regNo;
                this.currentUserName = student.name;
                
                const voted = await api.checkVoterStatus(this.currentUser);
                this.voterHasVoted = voted;

                this.showView('dashboard');
                this.switchTab('vote');
                this.updateNav();
                this.showToast(`Welcome, ${student.name}`);
            }
        } catch(e) { console.error(e); }
    }

    logout() {
        this.currentUser = null;
        this.currentUserName = null;
        this.role = null;
        this.voterHasVoted = false;
        const input = document.getElementById('login-input');
        if(input) input.value = '';
        this.showView('login');
        this.updateNav(); 
    }

    showView(viewName) {
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.add('hidden');
        const view = document.getElementById(`${viewName}-view`);
        if(view) view.classList.remove('hidden');
    }

    updateNav() {
        const authSection = document.getElementById('auth-section');
        
        if (this.currentUser) {
            if(authSection) authSection.classList.remove('hidden');
            document.getElementById('nav-username').textContent = this.currentUserName;
            document.getElementById('nav-role').textContent = this.role === 'admin' ? 'Administrator' : `Reg: ${this.currentUser}`;
        } else {
            if(authSection) authSection.classList.add('hidden');
        }
    }

    switchTab(tabName) {
        if (tabName === 'results' && this.role !== 'admin' && api.electionStatus !== 'ENDED') {
            this.showToast('Results are hidden until election ends.', 'error');
            return;
        }

        this.activeTab = tabName;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.className = 'tab-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap bg-white text-slate-600 hover:bg-slate-100';
        });
        const activeBtn = document.getElementById(`tab-${tabName}`);
        if (activeBtn) {
            let colorClass = 'bg-blue-600 text-white shadow-lg shadow-blue-200';
            if (tabName === 'admin') colorClass = 'bg-slate-800 text-white shadow-lg';
            if (tabName === 'results') colorClass = 'bg-indigo-600 text-white shadow-lg shadow-indigo-200';
            if (tabName === 'blockchain') colorClass = 'bg-emerald-600 text-white shadow-lg shadow-emerald-200';
            activeBtn.className = `tab-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${colorClass}`;
        }

        this.renderContent();
    }

    refreshUI() {
        if (this.currentUser) {
            if (this.role === 'voter' && !this.voterHasVoted) {
                api.checkVoterStatus(this.currentUser).then(status => {
                    this.voterHasVoted = status;
                    if (this.activeTab === 'vote') this.renderContent();
                });
            } else {
                this.renderContent();
            }
        }
    }

    renderContent() {
        const container = document.getElementById('content-area');
        container.innerHTML = '';

        const adminTabBtn = document.getElementById('tab-admin');
        const resultsTabBtn = document.getElementById('tab-results');

        if (this.role === 'admin') {
           if(adminTabBtn) adminTabBtn.classList.remove('hidden');
           if(resultsTabBtn) resultsTabBtn.classList.remove('hidden');
        } else {
           if(adminTabBtn) adminTabBtn.classList.add('hidden');
           if(api.electionStatus === 'ENDED') {
               if(resultsTabBtn) resultsTabBtn.classList.remove('hidden');
           } else {
               if(resultsTabBtn) resultsTabBtn.classList.add('hidden');
           }
        }

        if (this.activeTab === 'vote') this.renderVoteTab(container);
        else if (this.activeTab === 'admin') this.renderAdminTab(container);
        else if (this.activeTab === 'results') this.renderResultsTab(container);
        else if (this.activeTab === 'blockchain') this.renderBlockchainTab(container);
        
        if(window.lucide) lucide.createIcons();
    }

    renderVoteTab(container) {
        if (this.role === 'admin') {
            container.innerHTML = `<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Admin view only. Switch to Admin Panel or Results.</div>`;
            return;
        }

        const status = api.electionStatus;
        
        let headerHTML = `
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl mb-6 fade-in">
                <h2 class="text-3xl font-bold mb-2">Welcome, ${this.currentUserName}</h2>
                <p class="opacity-90 flex items-center gap-2">
                    ${this.voterHasVoted 
                        ? '<span class="bg-green-400/20 text-green-100 px-2 py-0.5 rounded-full text-sm font-medium flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> Vote Cast Successfully</span>' 
                        : '<span class="bg-yellow-400/20 text-yellow-100 px-2 py-0.5 rounded-full text-sm font-medium">Eligible to Vote</span>'}
                </p>
            </div>
        `;

        if (status === 'NOT_STARTED') {
            headerHTML += `<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6"><p class="text-yellow-700 font-medium">Election has not started yet.</p></div>`;
        } else if (status === 'ENDED') {
            let winner = null;
            if (api.localCandidates.length > 0) {
                winner = api.localCandidates.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
            }

            if (winner && winner.votes > 0) {
                headerHTML += `
                    <div class="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-1 mb-8 shadow-xl animate-in zoom-in duration-500">
                        <div class="bg-white rounded-xl p-6 flex flex-col items-center text-center">
                            <div class="bg-yellow-100 p-4 rounded-full mb-4">
                                <i data-lucide="trophy" class="w-10 h-10 text-yellow-600"></i>
                            </div>
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Election Winner</h3>
                            <h2 class="text-4xl font-black text-slate-800 mb-2">${winner.name}</h2>
                            <p class="text-lg font-medium text-slate-600 bg-slate-100 px-4 py-1 rounded-full border border-slate-200">
                                ${winner.party} <span class="mx-2 text-slate-300">|</span> <span class="text-blue-600 font-bold">${winner.votes} Votes</span>
                            </p>
                            <div class="mt-4 text-xs text-slate-400">Election Officially Ended</div>
                        </div>
                    </div>
                `;
            } else {
                headerHTML += `<div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6"><p class="text-blue-700 font-medium">Election has ended. No votes recorded.</p></div>`;
            }
        }

        let candidatesHTML = `<div class="grid md:grid-cols-2 gap-6 fade-in">`;
        api.localCandidates.forEach(c => {
            const disabled = this.voterHasVoted || status !== 'ONGOING';
            const btnClass = disabled 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200';
            
            candidatesHTML += `
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-xl font-bold text-slate-800">${c.name}</h3>
                            <p class="text-slate-500 text-sm font-medium uppercase tracking-wide">${c.party}</p>
                        </div>
                        <div class="bg-slate-100 p-2 rounded-lg"><i data-lucide="user" class="text-slate-400 w-6 h-6"></i></div>
                    </div>
                    <button type="button" onclick="app.castVote('${c.id}', this)" ${disabled ? 'disabled' : ''} 
                        class="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${btnClass}">
                        ${this.voterHasVoted ? 'Voted' : 'Vote for Candidate'}
                    </button>
                </div>
            `;
        });
        candidatesHTML += `</div>`;

        container.innerHTML = headerHTML + candidatesHTML;
    }

    renderAdminTab(container) {
        if (this.role !== 'admin') {
            container.innerHTML = `<div class="text-red-500">Access Denied</div>`;
            return;
        }

        const status = api.electionStatus;
        
        container.innerHTML = `
            <div class="grid md:grid-cols-3 gap-6 mb-8 fade-in">
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-1">
                    <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <i data-lucide="refresh-cw" class="w-5 h-5 text-blue-600"></i> Election Status
                    </h3>
                    <div class="flex flex-col gap-3">
                        <div class="text-center py-2 px-4 rounded-lg font-bold ${status === 'ONGOING' ? 'bg-green-100 text-green-700' : status === 'ENDED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">
                            ${status.replace('_', ' ')}
                        </div>
                        <div class="flex gap-2">
                            <button type="button" onclick="api.updateStatus('ONGOING')" class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50" ${status === 'ONGOING' ? 'disabled' : ''}>Start</button>
                            <button type="button" onclick="api.updateStatus('ENDED')" class="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50" ${status === 'ENDED' ? 'disabled' : ''}>End</button>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-1">
                    <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <i data-lucide="plus" class="w-5 h-5 text-blue-600"></i> Add Candidate
                    </h3>
                    <div class="flex flex-col gap-4">
                        <input id="new-cand-name" placeholder="Candidate Name" class="w-full border px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                        <input id="new-cand-party" placeholder="Party Name" class="w-full border px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                        <button type="button" onclick="app.handleAddCandidate()" class="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Add Candidate</button>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-1">
                    <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <i data-lucide="lock" class="w-5 h-5 text-blue-600"></i> Admin Security
                    </h3>
                    <div class="flex flex-col gap-4">
                        <div class="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 border border-slate-100 mb-1">
                            <span class="font-bold">Current Key:</span> ${api.adminKey}
                        </div>
                        <input id="new-admin-key" placeholder="Enter New Admin Key" class="w-full border px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                        <button type="button" onclick="app.handleUpdateKey()" class="w-full bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 font-medium">Update Key</button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden fade-in">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 class="font-bold text-slate-700">Registered Candidates</h3>
                </div>
                <div class="divide-y divide-slate-100">
                    ${api.localCandidates.map(c => `
                        <div class="px-6 py-4 flex items-center justify-between">
                            <div>
                                <p class="font-bold text-slate-800">${c.name}</p>
                                <p class="text-sm text-slate-500">${c.party}</p>
                            </div>
                            <div class="font-mono font-bold text-blue-600">${c.votes} votes</div>
                        </div>
                    `).join('')}
                    ${api.localCandidates.length === 0 ? '<div class="p-8 text-center text-slate-400">No candidates added yet.</div>' : ''}
                </div>
            </div>
        `;
    }

    renderResultsTab(container) {
        if(this.role !== 'admin' && api.electionStatus !== 'ENDED') {
             container.innerHTML = `<div class="p-8 text-center text-red-500 bg-white rounded-xl border border-red-200 font-bold">Access Denied: Live results are confidential until election ends.</div>`;
             return;
        }

        const sorted = [...api.localCandidates].sort((a, b) => b.votes - a.votes);
        const total = sorted.reduce((sum, c) => sum + c.votes, 0);

        container.innerHTML = `
            <div class="text-center mb-8 fade-in">
                <h2 class="text-2xl font-bold text-slate-800">${api.electionStatus === 'ENDED' ? 'Final Election Results' : 'Live Election Results'}</h2>
                <p class="text-slate-500">Fetched securely from Firestore Database</p>
            </div>
            <div class="grid gap-4 fade-in">
                ${sorted.map((c, idx) => {
                    const pct = total === 0 ? 0 : ((c.votes / total) * 100).toFixed(1);
                    const isWinner = api.electionStatus === 'ENDED' && idx === 0 && c.votes > 0;
                    const borderClass = isWinner ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-slate-200';
                    
                    return `
                        <div class="bg-white p-4 rounded-xl border ${borderClass} shadow-sm relative overflow-hidden">
                            <div class="relative z-10 flex justify-between items-center mb-2">
                                <div class="flex items-center gap-4">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-500' : 'bg-slate-400'}">
                                        ${isWinner ? '<i data-lucide="trophy" class="w-4 h-4"></i>' : idx + 1}
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                            ${c.name}
                                            ${isWinner ? '<span class="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Winner</span>' : ''}
                                        </h3>
                                        <p class="text-xs text-slate-500">${c.party}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-2xl font-bold text-slate-800">${c.votes}</p>
                                    <p class="text-xs text-slate-400">votes</p>
                                </div>
                            </div>
                            <div class="absolute bottom-0 left-0 h-1 ${isWinner ? 'bg-yellow-500' : 'bg-blue-500'} transition-all duration-1000" style="width: ${pct}%"></div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderBlockchainTab(container) {
        container.innerHTML = `
            <div class="space-y-6 fade-in">
                <div class="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold flex items-center gap-2"><i data-lucide="link" class="text-blue-400"></i> Blockchain Ledger</h2>
                            <p class="text-slate-400 text-sm mt-1">Real-time immutable records</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-slate-500 uppercase tracking-wider font-bold">Height</p>
                            <p class="text-3xl font-mono font-bold text-blue-400">${api.localBlockchain.length}</p>
                        </div>
                    </div>
                </div>
                <div class="relative pl-8 border-l-2 border-slate-200 space-y-8">
                    ${api.localBlockchain.length === 0 ? '<p class="text-slate-400 p-4">Chain is empty. Waiting for votes...</p>' : ''}
                    ${api.localBlockchain.map((block, i) => `
                        <div class="relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div class="absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-white bg-blue-600 shadow-sm z-10"></div>
                            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div class="flex-1 overflow-hidden">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase">Block #${block.index}</span>
                                        <span class="text-xs text-slate-400 font-mono">${new Date(block.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div class="space-y-2 font-mono text-xs">
                                        <div class="flex gap-2"><span class="text-slate-400 w-16 shrink-0">Hash:</span><span class="text-blue-600 truncate block w-full">${block.hash}</span></div>
                                        <div class="flex gap-2"><span class="text-slate-400 w-16 shrink-0">Prev:</span><span class="text-slate-500 truncate block w-full">${block.previousHash}</span></div>
                                    </div>
                                </div>
                                <div class="md:w-1/3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                    <h4 class="font-bold text-slate-700 mb-2 flex items-center gap-2"><i data-lucide="box" class="w-3 h-3"></i> Data</h4>
                                    <div class="space-y-1 text-xs">
                                        <p><span class="text-slate-400">Voter Hash:</span> <span class="text-slate-700 font-mono">${block.data.voterHash ? block.data.voterHash.substring(0, 10) + '...' : 'System'}</span></p>
                                        <p><span class="text-slate-400">Cand ID:</span> <span class="font-bold text-blue-600">${block.data.candidateId || 'N/A'}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async castVote(candidateId, btnElement) {
        try {
            if (!btnElement || !btnElement.innerHTML) return;
            
            const originalText = btnElement.innerHTML;
            btnElement.innerHTML = `<div class="loader mx-auto border-white border-t-transparent"></div>`;
            btnElement.disabled = true;

            const result = await api.castVote(this.currentUser, candidateId);
            
            if (result.success) {
                this.showToast('Vote added to Blockchain!', 'success');
                this.voterHasVoted = true;
                this.renderContent();
            } else {
                this.showToast(result.msg, 'error');
                btnElement.innerHTML = originalText;
                btnElement.disabled = false;
            }
        } catch(e) {
            console.error("Voting Error:", e);
            this.showToast("Voting failed due to error", 'error');
        }
    }

    async handleAddCandidate() {
        try {
            const name = document.getElementById('new-cand-name').value;
            const party = document.getElementById('new-cand-party').value;
            if(name && party) {
                await api.addCandidate(name, party);
                this.showToast('Candidate added');
                document.getElementById('new-cand-name').value = '';
                document.getElementById('new-cand-party').value = '';
            }
        } catch(e) { console.error(e); }
    }

    async handleUpdateKey() {
        try {
            const newKey = document.getElementById('new-admin-key').value;
            if(newKey && newKey.trim().length > 3) {
                await api.updateAdminKey(newKey.trim());
                this.showToast('Admin Key Updated Successfully');
                document.getElementById('new-admin-key').value = '';
            } else {
                this.showToast('Key must be at least 4 chars', 'error');
            }
        } catch(e) { console.error(e); }
    }

    showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toast-icon');
        const text = document.getElementById('toast-message');

        text.textContent = msg;
        if(type === 'error') {
            toast.classList.replace('bg-slate-800', 'bg-red-600');
            icon.setAttribute('data-lucide', 'alert-triangle');
        } else {
            toast.classList.replace('bg-red-600', 'bg-slate-800');
            icon.setAttribute('data-lucide', 'check-circle');
        }
        
        if(window.lucide) lucide.createIcons();
        toast.classList.remove('translate-y-20', 'opacity-0');
        
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }
}

// Initialize App
const api = new VotingAPI();
const app = new App();
window.app = app;
window.api = api;
app.init();
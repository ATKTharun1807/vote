const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8081;

// MongoDB Connection
// The password provided was 'siet@123'. URL encoding @ to %40 is mandatory.
const MONGO_URI = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

console.log("🚀 Starting SafeVote Server...");
console.log("🔗 Attempting to connect to MongoDB Atlas...");

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error!");
        console.error("Message:", err.message);
        console.error("Code:", err.code);
        if (err.message.includes("IP not whitelisted")) {
            console.error("👉 ACTION REQUIRED: Go to MongoDB Atlas -> Network Access and add your IP address (or 0.0.0.0/0 for testing).");
        }
    });

// Schemas
const StudentSchema = new mongoose.Schema({
    regNo: { type: Number, required: true, unique: true },
    name: String,
    department: { type: String, default: 'CYBER SECURITY' },
    password: { type: String, required: true },
    hasVoted: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
});

const CandidateSchema = new mongoose.Schema({
    name: String,
    party: String,
    votes: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now }
});

const BlockchainSchema = new mongoose.Schema({
    index: Number,
    timestamp: String,
    data: mongoose.Schema.Types.Mixed,
    previousHash: String,
    hash: String
});

const ConfigSchema = new mongoose.Schema({
    type: { type: String, default: 'main', unique: true },
    electionName: { type: String, default: 'Chief Minister Election' },
    electionStatus: { type: String, default: 'NOT_STARTED' },
    adminKey: { type: String, default: 'admin123' },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    allowedDepartments: { type: [String], default: [] }
});

const Student = mongoose.model('Student', StudentSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);
const Blockchain = mongoose.model('Blockchain', BlockchainSchema);
const Config = mongoose.model('Config', ConfigSchema);

// Admin Auth Middleware
const authAdmin = async (req, res, next) => {
    const key = req.headers['x-admin-key'];
    try {
        const config = await Config.findOne({ type: 'main' }).lean();
        if (config && config.adminKey === key) {
            next();
        } else {
            res.status(401).json({ error: "Unauthorized Administrative Access" });
        }
    } catch (e) {
        res.status(500).json({ error: "Auth Check Failed" });
    }
};

app.use(cors());
app.use(express.json());

// Security: Only serve specific directories/files to prevent leaking server.js or .db files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/voting.jpg', (req, res) => res.sendFile(path.join(__dirname, 'voting.jpg')));

// API Endpoints

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        uptime: process.uptime()
    });
});

// Obfuscated Session Check (formerly Sync)
app.get('/api/v1/session', async (req, res) => {
    const key = req.headers['x-admin-key'];

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database offline" });
        }

        let config = await Config.findOne({ type: 'main' }).lean();
        if (!config) config = await Config.create({ type: 'main' });

        // AUTO-TRANSITION LOGIC: Start/End election based on time
        const now = new Date();
        let needsUpdate = false;
        const updates = {};

        if (config.electionStatus === 'NOT_STARTED' && config.startTime && now >= new Date(config.startTime)) {
            updates.electionStatus = 'ONGOING';
            needsUpdate = true;
        } else if (config.electionStatus === 'ONGOING' && config.endTime && now >= new Date(config.endTime)) {
            updates.electionStatus = 'ENDED';
            needsUpdate = true;
        }

        if (needsUpdate) {
            await Config.updateOne({ type: 'main' }, { $set: updates });
            Object.assign(config, updates); // Update local object for the immediate response
            console.log(`🕒 Auto-Transition: Election status updated to ${updates.electionStatus}`);
        }

        const isAdmin = config.adminKey === key;
        const electionEnded = config.electionStatus === 'ENDED';

        // Security: Strip internal database fields
        const safeConfig = {
            electionName: config.electionName,
            electionStatus: config.electionStatus,
            startTime: config.startTime,
            endTime: config.endTime,
            allowedDepartments: config.allowedDepartments || []
        };

        const responseData = {
            config: safeConfig,
            authenticated: isAdmin
        };

        // Deep Security: Only fetch/return sensitive data if authorized or finished
        if (isAdmin || electionEnded) {
            responseData.totalStudents = await Student.countDocuments({});
            responseData.votedCount = await Student.countDocuments({ hasVoted: true });
            const blockchain = await Blockchain.find({}).sort({ index: 1 }).lean();
            responseData.blockchain = blockchain.map(b => ({
                index: b.index,
                timestamp: b.timestamp,
                hash: b.hash,
                previousHash: b.previousHash,
                data: {
                    voterHash: b.data?.voterHash,
                    candidateId: (isAdmin || electionEnded) ? b.data?.candidateId : "HIDDEN"
                }
            }));
        }

        // UNREADABLE PAYLOAD: Obfuscate with Base64 to hide from casual Network tab inspection
        const masked = Buffer.from(JSON.stringify(responseData)).toString('base64');
        res.json({ p: masked });

    } catch (e) {
        res.status(500).json({ error: "Internal Error" });
    }
});

// Authorized Student List
app.get('/api/students/list', async (req, res) => {
    const key = req.headers['x-admin-key'];
    try {
        const config = await Config.findOne({ type: 'main' }).lean();
        if (!config || config.adminKey !== key) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const students = await Student.find({}).lean();
        const safeStudents = students.map(s => ({
            id: s._id,
            regNo: s.regNo,
            name: s.name,
            department: s.department,
            hasVoted: s.hasVoted
        }));

        const masked = Buffer.from(JSON.stringify(safeStudents)).toString('base64');
        res.json({ p: masked });
    } catch (e) {
        res.status(500).json({ error: "Access Error" });
    }
});

// Candidate List
app.get('/api/candidates/list', async (req, res) => {
    try {
        const candidates = await Candidate.find({}).lean();
        const config = await Config.findOne({ type: 'main' }).lean();
        const key = req.headers['x-admin-key'];
        const isAdmin = config && config.adminKey === key;
        const electionEnded = config && config.electionStatus === 'ENDED';

        const safeCandidates = candidates.map((c, idx) => {
            const obj = {
                // If not admin and election not ended, provide a session-based ID
                id: (isAdmin || electionEnded) ? c._id : `cnd_${idx + 1}`,
                name: c.name,
                party: c.party
            };

            // Admins see votes always, voters only when ended
            if (isAdmin || electionEnded) {
                obj.votes = c.votes;
            }

            return obj;
        });

        const masked = Buffer.from(JSON.stringify(safeCandidates)).toString('base64');
        res.json({ p: masked });
    } catch (e) {
        res.status(500).json({ error: "Access Error" });
    }
});

// Admin Verification (Server-side to protect key)
app.post('/api/admin/verify', async (req, res) => {
    const { key } = req.body;
    try {
        const config = await Config.findOne({ type: 'main' });
        if (config && config.adminKey === key) {
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Student Verification
app.post('/api/students/verify', async (req, res) => {
    const { regNo, password } = req.body;
    try {
        const student = await Student.findOne({ regNo, password }).lean();
        if (student) {
            res.json({
                id: student._id,
                regNo: student.regNo,
                name: student.name,
                department: student.department,
                hasVoted: student.hasVoted
            });
        }
        else res.sendStatus(401);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Student Password Reset
app.post('/api/students/reset-password', async (req, res) => {
    const { regNo, newPassword, currentPassword } = req.body;
    const key = req.headers['x-admin-key'];

    try {
        const reg = parseInt(regNo);
        if (isNaN(reg)) throw new Error("Invalid Registration Number");

        const config = await Config.findOne({ type: 'main' }).lean();
        const isAdmin = config && config.adminKey === key;

        if (isAdmin) {
            // Admin can reset without current password
            await Student.updateOne({ regNo: reg }, { $set: { password: newPassword } });
        } else if (currentPassword) {
            // Student can reset if they provide correct current password
            const result = await Student.updateOne(
                { regNo: reg, password: currentPassword },
                { $set: { password: newPassword } }
            );
            if (result.matchedCount === 0) {
                return res.status(401).json({ error: "Current password incorrect" });
            }
        } else {
            return res.status(401).json({ error: "Unauthorized: Admin key or current password required" });
        }

        console.log(`✅ Password updated successfully for ${regNo}`);
        res.sendStatus(200);
    } catch (e) {
        console.error("❌ Reset Password Error:", e.message);
        res.status(500).send(e.message);
    }
});

// Add Student
app.post('/api/students/add', authAdmin, async (req, res) => {
    const { regNo, name, password } = req.body;
    try {
        const exists = await Student.findOne({ regNo });
        if (exists) return res.status(400).json({ error: "Student ID already exists" });

        await Student.create({
            regNo,
            name,
            department: req.body.department || 'CYBER SECURITY',
            password: password || 'REPLACE_ME',
            hasVoted: false
        });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete Student
app.delete('/api/students/:id', authAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Update Config
app.post('/api/config/update', authAdmin, async (req, res) => {
    const updates = req.body;
    try {
        await Config.updateOne({ type: 'main' }, { $set: updates }, { upsert: true });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Add Candidate
app.post('/api/candidates/add', authAdmin, async (req, res) => {
    const { name, party } = req.body;
    try {
        await Candidate.create({ name, party, votes: 0 });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Delete Candidate
app.delete('/api/candidates/:id', authAdmin, async (req, res) => {
    try {
        await Candidate.findByIdAndDelete(req.params.id);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Cast Vote
app.post('/api/vote', async (req, res) => {
    const { regNo, candidateId, block } = req.body;
    console.log(`🗳️ Vote Attempt: Student ${regNo} for Candidate ${candidateId}`);

    try {
        const config = await Config.findOne({ type: 'main' });
        if (!config || config.electionStatus !== 'ONGOING') {
            return res.status(400).json({ error: "Election is not active. Status: " + (config ? config.electionStatus : 'Unknown') });
        }

        const student = await Student.findOne({ regNo });
        if (!student) return res.status(404).json({ error: "Student not found in database" });
        if (student.hasVoted) return res.status(400).json({ error: "Student has already cast their vote" });

        // Check Department Restriction
        if (config.allowedDepartments && config.allowedDepartments.length > 0) {
            if (!config.allowedDepartments.includes(student.department)) {
                return res.status(403).json({ error: `Election restricted to ${config.allowedDepartments.join(', ')} departments only.` });
            }
        }

        // Check Time Restriction
        const now = new Date();
        if (config.startTime && now < config.startTime) {
            return res.status(400).json({ error: "Election has not started yet. Starts at: " + config.startTime.toLocaleString() });
        }
        if (config.endTime && now > config.endTime) {
            return res.status(400).json({ error: "Election has already ended." });
        }

        let candidate;
        if (candidateId.startsWith('cnd_')) {
            // Map index back to real ID for voters
            const idx = parseInt(candidateId.replace('cnd_', '')) - 1;
            const allCandidates = await Candidate.find({}).sort({ addedAt: 1 });
            candidate = allCandidates[idx];
        } else {
            candidate = await Candidate.findById(candidateId);
        }

        if (!candidate) return res.status(404).json({ error: "Candidate not found" });

        // Atomic update session
        await Student.updateOne({ regNo }, { $set: { hasVoted: true } });
        await Candidate.findByIdAndUpdate(candidate._id, { $inc: { votes: 1 } });

        // Ensure data is saved in Blockchain (Use real ID in blockchain for audit integrity)
        const blockWithRealId = { ...block };
        if (blockWithRealId.data) blockWithRealId.data.candidateId = candidate._id;

        const newBlock = new Blockchain(blockWithRealId);
        await newBlock.save();

        console.log(`✅ Vote Recorded: ${student.name} -> ${candidate.name}`);
        res.sendStatus(200);
    } catch (e) {
        console.error("❌ Vote Process Error:", e.message);
        res.status(500).json({ error: "Internal Server Error: " + e.message });
    }
});

// Reset All
app.post('/api/reset-all', authAdmin, async (req, res) => {
    try {
        await Candidate.updateMany({}, { $set: { votes: 0 } });
        await Blockchain.deleteMany({});
        await Student.updateMany({}, { $set: { hasVoted: false } });
        await Config.updateOne({ type: 'main' }, { $set: { electionStatus: 'NOT_STARTED' } });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 SafeVote Server running at http://localhost:${port}/`);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 8081;

// Blockchain Helper
function calculateBlockHash(index, timestamp, data, previousHash) {
    const stringToHash = `${index}${timestamp}${JSON.stringify(data)}${previousHash}safevote_secret_salt_2024`;
    return crypto.createHash('sha256').update(stringToHash).digest('hex');
}

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
// Schemas
const StudentSchema = new mongoose.Schema({
    regNo: { type: Number, required: true, unique: true },
    name: String,
    department: { type: String, default: 'CYBER SECURITY' },
    password: { type: String, required: true },
    hasVoted: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
    sessionToken: { type: String, default: null } // Added for security
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
    electionName: { type: String, default: 'Student Council Election' },
    electionStatus: { type: String, default: 'NOT_STARTED' },
    adminKey: { type: String, default: 'admin123' },
    adminSessionToken: { type: String, default: null }, // Temporary session handle
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    allowedDepartments: { type: [String], default: [] }
});

const VotedDeviceSchema = new mongoose.Schema({
    fingerprint: { type: String, required: true, unique: true },
    votedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);
const Blockchain = mongoose.model('Blockchain', BlockchainSchema);
const Config = mongoose.model('Config', ConfigSchema);
const VotedDevice = mongoose.model('VotedDevice', VotedDeviceSchema);

// Auth Middlewares
const authAdmin = async (req, res, next) => {
    const key = req.headers['x-admin-key'];
    try {
        if (!key) return res.status(401).json({ error: "Unauthorized" });
        const config = await Config.findOne({ type: 'main' }).lean();
        // Allow either master key or temporary session token
        if (config && (config.adminKey === key || config.adminSessionToken === key)) {
            next();
        } else {
            res.status(401).json({ error: "Unauthorized Administrative Access" });
        }
    } catch (e) {
        res.status(500).json({ error: "Auth Check Failed" });
    }
};

const authStudent = async (req, res, next) => {
    const token = req.headers['x-student-token'];
    const regNo = req.body.regNo || req.query.regNo;
    try {
        if (!token || !regNo) return res.status(401).json({ error: "Student session missing" });
        const student = await Student.findOne({ regNo: parseInt(regNo), sessionToken: token });
        if (student) {
            req.student = student;
            next();
        } else {
            res.status(401).json({ error: "Invalid student session" });
        }
    } catch (e) {
        res.status(500).json({ error: "Security check failed" });
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

// Obfuscated Session Check (Sync)
app.get('/api/v1/session', async (req, res) => {
    const key = req.headers['x-admin-key'];
    const studentToken = req.headers['x-student-token'];
    const regNo = req.headers['x-reg-no'];

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
            const candidatesCount = await Candidate.countDocuments({});
            if (candidatesCount >= 2) {
                updates.electionStatus = 'ONGOING';
                needsUpdate = true;
            }
        } else if (config.electionStatus === 'ONGOING' && config.endTime && now >= new Date(config.endTime)) {
            updates.electionStatus = 'ENDED';
            needsUpdate = true;
        }

        if (needsUpdate) {
            await Config.updateOne({ type: 'main' }, { $set: updates });
            Object.assign(config, updates);
        }

        const isAdmin = (config.adminKey === key || config.adminSessionToken === key) && !!key;
        let isStudentValid = false;
        if (studentToken && regNo) {
            const student = await Student.findOne({ regNo: parseInt(regNo), sessionToken: studentToken }).lean();
            if (student) isStudentValid = true;
        }

        const electionEnded = config.electionStatus === 'ENDED';

        const safeConfig = {
            electionName: config.electionName,
            electionStatus: config.electionStatus,
            startTime: config.startTime,
            endTime: config.endTime,
            allowedDepartments: config.allowedDepartments || []
        };

        const responseData = {
            config: safeConfig,
            authenticated: isAdmin,
            isVoter: isStudentValid
        };

        if (isAdmin || electionEnded) {
            responseData.totalStudents = await Student.countDocuments({});
            responseData.votedCount = await Student.countDocuments({ hasVoted: true });

            const candidates = await Candidate.find({}).sort({ addedAt: 1 }).lean();
            responseData.candidates = candidates.map((c, idx) => ({
                id: (isAdmin || electionEnded) ? c._id : `cnd_${idx + 1}`,
                name: c.name,
                party: c.party,
                votes: c.votes
            }));

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
        if (!config || config.adminKey !== key || !key) {
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
        const isAdmin = config && config.adminKey === key && !!key;
        const electionEnded = config && config.electionStatus === 'ENDED';

        const safeCandidates = candidates.map((c, idx) => {
            const obj = {
                id: (isAdmin || electionEnded) ? c._id : `cnd_${idx + 1}`,
                name: c.name,
                party: c.party
            };
            if (isAdmin || electionEnded) obj.votes = c.votes;
            return obj;
        });

        const masked = Buffer.from(JSON.stringify(safeCandidates)).toString('base64');
        res.json({ p: masked });
    } catch (e) {
        res.status(500).json({ error: "Access Error" });
    }
});

// Admin Verification
app.post('/api/admin/verify', async (req, res) => {
    const { key } = req.body;
    try {
        const config = await Config.findOne({ type: 'main' });
        if (config && config.adminKey === key && key) {
            // Generate temporary session token
            const token = crypto.randomBytes(32).toString('hex');
            await Config.updateOne({ type: 'main' }, { $set: { adminSessionToken: token } });
            res.json({ token });
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
        const student = await Student.findOne({ regNo, password });
        if (student) {
            // Generate a secure session token
            const token = crypto.randomBytes(32).toString('hex');
            student.sessionToken = token;
            await student.save();

            res.json({
                id: student._id,
                regNo: student.regNo,
                name: student.name,
                department: student.department,
                hasVoted: student.hasVoted,
                token: token // Return token for future requests
            });
        }
        else res.sendStatus(401);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Student Password Reset
app.post('/api/students/reset-password', async (req, res) => {
    const { regNo, newPassword, currentPassword, token } = req.body;
    const key = req.headers['x-admin-key'];

    try {
        const reg = parseInt(regNo);
        if (isNaN(reg)) throw new Error("Invalid Registration Number");

        const config = await Config.findOne({ type: 'main' }).lean();
        const isAdmin = config && config.adminKey === key && !!key;

        if (isAdmin) {
            // Admin can reset without current password
            await Student.updateOne({ regNo: reg }, { $set: { password: newPassword } });
        } else if (currentPassword && token) {
            // Student can reset if they provide correct current password AND valid token
            const result = await Student.updateOne(
                { regNo: reg, password: currentPassword, sessionToken: token },
                { $set: { password: newPassword } }
            );
            if (result.matchedCount === 0) {
                return res.status(401).json({ error: "Authorization failed or password incorrect" });
            }
        } else {
            return res.status(401).json({ error: "Unauthorized: Admin key or student session required" });
        }

        res.sendStatus(200);
    } catch (e) {
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
        if (updates.electionStatus === 'ONGOING') {
            const candidatesCount = await Candidate.countDocuments({});
            if (candidatesCount < 2) {
                return res.status(400).json({ error: "Cannot start election: Minimum 2 candidates required." });
            }
        }
        await Config.updateOne({ type: 'main' }, { $set: updates }, { upsert: true });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add Candidate
app.post('/api/candidates/add', authAdmin, async (req, res) => {
    const { name, party } = req.body;
    try {
        const exists = await Candidate.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") },
            party: { $regex: new RegExp(`^${party}$`, "i") }
        });

        if (exists) {
            return res.status(400).json({ error: "Candidate with this name and party already exists" });
        }

        await Candidate.create({ name, party, votes: 0 });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
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
app.post('/api/vote', authStudent, async (req, res) => {
    const { regNo, candidateId, voterHash, deviceFingerprint } = req.body;

    try {
        const config = await Config.findOne({ type: 'main' });
        if (!config || config.electionStatus !== 'ONGOING') {
            return res.status(400).json({ error: "Election is not active." });
        }

        const student = req.student; // From authStudent middleware
        if (student.hasVoted) return res.status(400).json({ error: "Already voted" });

        // Device-based Check
        if (deviceFingerprint) {
            const deviceExists = await VotedDevice.findOne({ fingerprint: deviceFingerprint });
            if (deviceExists) {
                return res.status(400).json({ error: "This device has already been used to cast a vote." });
            }
        } else {
            return res.status(400).json({ error: "Device identification missing." });
        }

        // Check Department Restriction
        if (config.allowedDepartments && config.allowedDepartments.length > 0) {
            if (!config.allowedDepartments.includes(student.department)) {
                return res.status(403).json({ error: `Election restricted to specific departments.` });
            }
        }

        let candidate;
        if (candidateId.startsWith('cnd_')) {
            const idx = parseInt(candidateId.replace('cnd_', '')) - 1;
            const allCandidates = await Candidate.find({}).sort({ addedAt: 1 });
            candidate = allCandidates[idx];
        } else {
            candidate = await Candidate.findById(candidateId);
        }

        if (!candidate) return res.status(404).json({ error: "Candidate not found" });

        // BLOCKCHAIN GENERATION
        const lastBlock = await Blockchain.findOne({}).sort({ index: -1 }).lean();
        const nextIndex = lastBlock ? lastBlock.index + 1 : 0;
        const previousHash = lastBlock ? lastBlock.hash : "0x0000000000000000000000000000000000000000000000000000000000000000";
        const timestamp = new Date().toISOString();

        const blockData = {
            voterHash: voterHash || "unknown",
            candidateId: candidate._id,
            candidateName: candidate.name
        };

        const hash = calculateBlockHash(nextIndex, timestamp, blockData, previousHash);

        // Atomic update
        await Student.updateOne({ _id: student._id }, { $set: { hasVoted: true, sessionToken: null } }); // Token invalidated after vote
        await Candidate.findByIdAndUpdate(candidate._id, { $inc: { votes: 1 } });
        await VotedDevice.create({ fingerprint: deviceFingerprint });

        const newBlock = new Blockchain({
            index: nextIndex,
            timestamp,
            data: blockData,
            previousHash,
            hash
        });

        await newBlock.save();
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Verify Blockchain Integrity
app.get('/api/blockchain/verify', authAdmin, async (req, res) => {
    try {
        const chain = await Blockchain.find({}).sort({ index: 1 }).lean();
        const report = {
            isValid: true,
            totalBlocks: chain.length,
            issues: []
        };

        for (let i = 0; i < chain.length; i++) {
            const block = chain[i];
            const previousHash = i === 0 ? "0x0000000000000000000000000000000000000000000000000000000000000000" : chain[i - 1].hash;
            const recalculatedHash = calculateBlockHash(block.index, block.timestamp, block.data, previousHash);

            if (block.hash !== recalculatedHash) {
                report.isValid = false;
                report.issues.push(`Block #${block.index} tampered.`);
            }

            if (i > 0 && block.previousHash !== chain[i - 1].hash) {
                report.isValid = false;
                report.issues.push(`Chain broken at Block #${block.index}.`);
            }
        }

        res.json(report);
    } catch (e) {
        res.status(500).json({ error: "Verification Failed" });
    }
});

// Reset All
app.post('/api/reset-all', authAdmin, async (req, res) => {
    try {
        await Candidate.updateMany({}, { $set: { votes: 0 } });
        await Blockchain.deleteMany({});
        await Student.updateMany({}, { $set: { hasVoted: false, sessionToken: null } });
        await VotedDevice.deleteMany({});
        await Config.updateOne({ type: 'main' }, {
            $set: {
                electionStatus: 'NOT_STARTED',
                startTime: null,
                endTime: null,
                allowedDepartments: [],
                electionName: 'Student Council Election'
            }
        });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 SafeVote Server running at http://localhost:${port}/`);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables manually if dotenv is missing
try {
    require('dotenv').config();
} catch (e) {
    console.warn("⚠️  dotenv not found, using system environment variables.");
}

// Built-in Rate Limiter Fallback
const rateLimit = (options) => {
    const requests = new Map();
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowMs = options.windowMs || 15 * 60 * 1000;
        const max = options.max || 100;

        if (!requests.has(ip)) requests.set(ip, []);
        const timestamps = requests.get(ip).filter(t => now - t < windowMs);
        timestamps.push(now);
        requests.set(ip, timestamps);

        if (timestamps.length > max) {
            return res.status(429).json(options.message || { error: "Too many requests" });
        }
        next();
    };
};

// Built-in Password Hashing (PBKDF2)
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
    if (!storedHash.includes(':')) return password === storedHash; // Plaintext check
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};

const app = express();
const port = process.env.PORT || 8081;

const BLOCKCHAIN_SALT = process.env.BLOCKCHAIN_SALT || "safevote_secret_salt_2024";

// Blockchain Helper
function calculateBlockHash(index, timestamp, data, previousHash) {
    const stringToHash = `${index}${timestamp}${JSON.stringify(data)}${previousHash}${BLOCKCHAIN_SALT}`;
    return crypto.createHash('sha256').update(stringToHash).digest('hex');
}

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";
const JWT_SALT = process.env.VOTER_SALT || "safevote_salt_2024";

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

const AdminAccessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    accessKey: { type: String, required: true, unique: true },
    role: { type: String, default: 'MODERATOR' },
    permissions: { type: [String], default: ['MANAGE_CANDIDATES', 'MANAGE_STUDENTS'] },
    lastAccessed: { type: Date },
    addedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);
const Blockchain = mongoose.model('Blockchain', BlockchainSchema);
const Config = mongoose.model('Config', ConfigSchema);
const VotedDevice = mongoose.model('VotedDevice', VotedDeviceSchema);
const AdminAccess = mongoose.model('AdminAccess', AdminAccessSchema);

// Auth Middlewares
const authAdmin = async (req, res, next) => {
    const key = req.headers['x-admin-key'];
    try {
        if (!key) return res.status(401).json({ error: "Unauthorized" });
        const config = await Config.findOne({ type: 'main' }).lean();

        // 1. Primary Master Key or Session Token
        if (config && (config.adminKey === key || config.adminSessionToken === key)) {
            req.adminRole = 'SUPER_ADMIN';
            return next();
        }

        // 2. Shared Admin Access Key
        const shared = await AdminAccess.findOne({ accessKey: key });
        if (shared) {
            req.adminRole = shared.role || 'MODERATOR';
            req.permissions = shared.permissions;
            await AdminAccess.updateOne({ _id: shared._id }, { $set: { lastAccessed: new Date() } });
            return next();
        }

        res.status(401).json({ error: "Unauthorized Administrative Access" });
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

// Rate Limiters
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per window
    message: { error: "Too many login attempts. Please try again after 15 minutes." }
});

const voteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 vote attempts (protection against scripts)
    message: { error: "Security limit reached. Please contact admin if this is an error." }
});

app.use(cors());
app.use(express.json());

// Apply limiters to auth routes
app.use('/api/admin/verify', loginLimiter);
app.use('/api/students/verify', loginLimiter);
app.use('/api/vote', voteLimiter);

// Security: Only serve specific directories/files to prevent leaking server.js
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
        let adminRole = 'NONE';

        if (isAdmin) {
            adminRole = 'SUPER_ADMIN';
        } else if (key) {
            const shared = await AdminAccess.findOne({ accessKey: key }).lean();
            if (shared) adminRole = shared.role;
        }

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
            authenticated: adminRole !== 'NONE',
            adminRole: adminRole,
            isVoter: isStudentValid
        };

        if (adminRole !== 'NONE' || electionEnded) {
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
app.get('/api/students/list', authAdmin, async (req, res) => {
    try {
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

        let isAdmin = false;
        if (config && (config.adminKey === key || config.adminSessionToken === key) && !!key) {
            isAdmin = true;
        } else if (key) {
            const shared = await AdminAccess.findOne({ accessKey: key });
            if (shared) isAdmin = true;
        }

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
            const token = crypto.randomBytes(32).toString('hex');
            await Config.updateOne({ type: 'main' }, { $set: { adminSessionToken: token } });
            res.json({ token, role: 'SUPER_ADMIN' });
        } else if (key) {
            const shared = await AdminAccess.findOne({ accessKey: key });
            if (shared) {
                res.json({ token: shared.accessKey, role: shared.role });
            } else {
                res.sendStatus(401);
            }
        } else {
            res.sendStatus(401);
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Access Management Routes
app.get('/api/admin/access-list', authAdmin, async (req, res) => {
    if (req.adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: "Restricted to Super Admin" });
    try {
        const list = await AdminAccess.find({}).sort({ addedAt: -1 });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/access-add', authAdmin, async (req, res) => {
    if (req.adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: "Restricted to Super Admin" });
    const { name } = req.body;
    try {
        const key = `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const access = await AdminAccess.create({ name, accessKey: key });
        res.json(access);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/access-remove/:id', authAdmin, async (req, res) => {
    if (req.adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: "Restricted to Super Admin" });
    try {
        await AdminAccess.findByIdAndDelete(req.params.id);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Student Verification
app.post('/api/students/verify', async (req, res) => {
    const { regNo, password } = req.body;
    try {
        const student = await Student.findOne({ regNo });
        if (student) {
            const isMatch = verifyPassword(password, student.password);

            if (!isMatch) return res.sendStatus(401);

            // If it was plaintext, auto-migrate to hash on successful login
            if (!student.password.includes(':')) {
                student.password = hashPassword(password);
            }

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
        const isAdmin = config && (config.adminKey === key || config.adminSessionToken === key) && !!key;
        let isSharedAdmin = false;
        if (!isAdmin && key) {
            const shared = await AdminAccess.findOne({ accessKey: key });
            if (shared) isSharedAdmin = true;
        }

        if (isAdmin || isSharedAdmin) {
            // Admin can reset without current password
            const hashedPassword = hashPassword(newPassword);
            await Student.updateOne({ regNo: reg }, { $set: { password: hashedPassword } });
        } else if (currentPassword && token) {
            // Student can reset if they provide correct current password AND valid token
            const student = await Student.findOne({ regNo: reg, sessionToken: token });
            if (!student) return res.status(401).json({ error: "Authorization failed" });

            const isMatch = verifyPassword(currentPassword, student.password);

            if (!isMatch) return res.status(401).json({ error: "Current password incorrect" });

            const hashedPassword = hashPassword(newPassword);
            await Student.updateOne(
                { regNo: reg },
                { $set: { password: hashedPassword } }
            );
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

        const hashedPassword = hashPassword(password || 'REPLACE_ME');
        await Student.create({
            regNo,
            name,
            department: req.body.department || 'CYBER SECURITY',
            password: hashedPassword,
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
        if (req.adminRole !== 'SUPER_ADMIN' && updates.adminKey) {
            return res.status(403).json({ error: "Only Super Admin can change the master key." });
        }
        if (updates.electionStatus === 'ONGOING') {
            const currentConfig = await Config.findOne({ type: 'main' });
            const startTime = updates.startTime || (currentConfig ? currentConfig.startTime : null);
            const endTime = updates.endTime || (currentConfig ? currentConfig.endTime : null);

            if (!startTime || !endTime) {
                return res.status(400).json({ error: "Cannot start election without a schedule. Please apply a schedule first." });
            }

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
    if (req.adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: "Restricted to Super Admin" });
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

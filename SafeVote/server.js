const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
    password: { type: String, default: 'atkboss' },
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
    electionName: { type: String, default: 'Student Council Election' },
    electionStatus: { type: String, default: 'NOT_STARTED' },
    adminKey: { type: String, default: 'admin123' }
});

const Student = mongoose.model('Student', StudentSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);
const Blockchain = mongoose.model('Blockchain', BlockchainSchema);
const Config = mongoose.model('Config', ConfigSchema);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Endpoints

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        uptime: process.uptime()
    });
});

// Sync Data
app.get('/api/sync', async (req, res) => {
    console.log("📥 Incoming Sync Request");
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                error: "Database not connected",
                state: mongoose.connection.readyState,
                tip: "Make sure your IP is whitelisted in MongoDB Atlas or wait for connection."
            });
        }

        const candidates = await Candidate.find({}).lean();
        const blockchain = await Blockchain.find({}).sort({ index: 1 }).lean();
        const students = await Student.find({}).lean();
        let config = await Config.findOne({ type: 'main' }).lean();

        if (!config) {
            config = await Config.create({ type: 'main' });
        }

        res.json({
            candidates,
            blockchain,
            students: students.map(s => ({
                regNo: s.regNo,
                name: s.name,
                hasVoted: s.hasVoted,
                _id: s._id,
                password: s.password
            })),
            config
        });
    } catch (e) {
        console.error("❌ Sync Route Error:", e.name, e.message);
        res.status(500).json({ error: e.message });
    }
});

// Student Verification
app.post('/api/students/verify', async (req, res) => {
    const { regNo, password } = req.body;
    try {
        const student = await Student.findOne({ regNo, password });
        if (student) res.sendStatus(200);
        else res.sendStatus(401);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Student Password Reset
app.post('/api/students/reset-password', async (req, res) => {
    const { regNo, newPassword } = req.body;
    try {
        await Student.updateOne({ regNo }, { $set: { password: newPassword } });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Add Student
app.post('/api/students/add', async (req, res) => {
    const { regNo, name, password } = req.body;
    try {
        const exists = await Student.findOne({ regNo });
        if (exists) return res.status(400).json({ error: "Student ID already exists" });

        await Student.create({
            regNo,
            name,
            password: password || 'atkboss',
            hasVoted: false
        });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Update Config
app.post('/api/config/update', async (req, res) => {
    const updates = req.body;
    try {
        await Config.updateOne({ type: 'main' }, { $set: updates }, { upsert: true });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Add Candidate
app.post('/api/candidates/add', async (req, res) => {
    const { name, party } = req.body;
    try {
        await Candidate.create({ name, party, votes: 0 });
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Delete Candidate
app.delete('/api/candidates/:id', async (req, res) => {
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

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: "Candidate not found" });

        // Atomic update session
        await Student.updateOne({ regNo }, { $set: { hasVoted: true } });
        await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });

        // Ensure data is saved in Blockchain
        const newBlock = new Blockchain(block);
        await newBlock.save();

        console.log(`✅ Vote Recorded: ${student.name} -> ${candidate.name}`);
        res.sendStatus(200);
    } catch (e) {
        console.error("❌ Vote Process Error:", e.message);
        res.status(500).json({ error: "Internal Server Error: " + e.message });
    }
});

// Reset All
app.post('/api/reset-all', async (req, res) => {
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

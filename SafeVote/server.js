const express = require('express');
const Datastore = require('nedb-promises');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const port = process.env.PORT || 8081;

// Database setup
const db = {
    students: Datastore.create({ filename: path.join(__dirname, 'data', 'students.db'), autoload: true }),
    candidates: Datastore.create({ filename: path.join(__dirname, 'data', 'candidates.db'), autoload: true }),
    blockchain: Datastore.create({ filename: path.join(__dirname, 'data', 'blockchain.db'), autoload: true }),
    config: Datastore.create({ filename: path.join(__dirname, 'data', 'config.db'), autoload: true })
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Endpoints

// Sync Data
app.get('/api/sync', async (req, res) => {
    try {
        const candidates = await db.candidates.find({});
        const blockchain = await db.blockchain.find({});
        const students = await db.students.find({});
        const config = await db.config.findOne({ type: 'main' }) || { type: 'main', electionName: 'Student Council Election', electionStatus: 'NOT_STARTED', adminKey: 'admin123' };

        // Ensure config exists
        if (!(await db.config.findOne({ type: 'main' }))) {
            await db.config.insert(config);
        }

        res.json({
            candidates,
            blockchain: blockchain.sort((a, b) => a.index - b.index),
            students: students.map(s => ({ regNo: s.regNo, name: s.name, hasVoted: s.hasVoted, _id: s._id, password: s.password })),
            config
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Student Verification
app.post('/api/students/verify', async (req, res) => {
    const { regNo, password } = req.body;
    const student = await db.students.findOne({ regNo, password });
    if (student) res.sendStatus(200);
    else res.sendStatus(401);
});

// Student Password Reset
app.post('/api/students/reset-password', async (req, res) => {
    const { regNo, newPassword } = req.body;
    await db.students.update({ regNo }, { $set: { password: newPassword } });
    res.sendStatus(200);
});

// Add Student
app.post('/api/students/add', async (req, res) => {
    const { regNo, name, password } = req.body;
    const exists = await db.students.findOne({ regNo });
    if (exists) return res.status(400).json({ error: "Student ID already exists" });

    await db.students.insert({
        regNo,
        name,
        password: password || 'atkboss',
        hasVoted: false,
        addedAt: new Date()
    });
    res.sendStatus(200);
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
    await db.students.remove({ _id: req.params.id });
    res.sendStatus(200);
});

// Update Config
app.post('/api/config/update', async (req, res) => {
    const updates = req.body;
    await db.config.update({ type: 'main' }, { $set: updates }, { upsert: true });
    res.sendStatus(200);
});

// Add Candidate
app.post('/api/candidates/add', async (req, res) => {
    const { name, party } = req.body;
    await db.candidates.insert({ name, party, votes: 0, addedAt: new Date() });
    res.sendStatus(200);
});

// Delete Candidate
app.delete('/api/candidates/:id', async (req, res) => {
    await db.candidates.remove({ _id: req.params.id });
    res.sendStatus(200);
});

// Cast Vote
app.post('/api/vote', async (req, res) => {
    const { regNo, candidateId, block } = req.body;
    const student = await db.students.findOne({ regNo });

    if (!student || student.hasVoted) {
        return res.status(400).json({ error: "Already voted or invalid student" });
    }

    await db.students.update({ regNo }, { $set: { hasVoted: true } });
    await db.candidates.update({ _id: candidateId }, { $inc: { votes: 1 } });
    await db.blockchain.insert(block);

    res.sendStatus(200);
});

// Reset All
app.post('/api/reset-all', async (req, res) => {
    await db.candidates.update({}, { $set: { votes: 0 } }, { multi: true });
    await db.blockchain.remove({}, { multi: true });
    await db.students.update({}, { $set: { hasVoted: false } }, { multi: true });
    await db.config.update({ type: 'main' }, { $set: { electionStatus: 'NOT_STARTED' } });
    res.sendStatus(200);
});

// Fallback to index.html for SPA (if needed)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 SafeVote Server running at http://localhost:${port}/`);
});

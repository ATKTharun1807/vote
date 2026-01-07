const express = require('express');
const Datastore = require('nedb-promises');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// --- NeDB Databases (Local Files) ---
const db = {
    candidates: Datastore.create({ filename: 'data/candidates.db', autoload: true }),
    students: Datastore.create({ filename: 'data/students.db', autoload: true }),
    config: Datastore.create({ filename: 'data/config.db', autoload: true }),
    blockchain: Datastore.create({ filename: 'data/blockchain.db', autoload: true })
};

// --- Automatic Data Importer (Seeding) ---
async function seedDatabase() {
    const studentCount = await db.students.count({});
    if (studentCount === 0) {
        console.log("📂 Database is empty. Synchronizing data from all SafeVote files...");
        try {
            // Priority 1: js/database.js
            const dataPath = path.join(__dirname, 'js/database.js');
            if (fs.existsSync(dataPath)) {
                const content = fs.readFileSync(dataPath, 'utf8');
                const students = [];
                // Robust regex to capture roll, regNo, and name
                const regex = /\{\s*roll:\s*(\d+),\s*regNo:\s*(\d+),\s*name:\s*['"]([^'"]+)['"]\s*\}/g;
                let m;
                while ((m = regex.exec(content)) !== null) {
                    students.push({
                        roll: parseInt(m[1]),
                        regNo: parseInt(m[2]),
                        name: m[3],
                        password: 'atkboss', // Default starting password
                        hasVoted: false,
                        addedAt: new Date()
                    });
                }

                if (students.length > 0) {
                    await db.students.insert(students);
                    console.log(`✅ Successfully connected ${students.length} Student IDs to the local database!`);
                }
            }
        } catch (e) {
            console.error("❌ Migration Error:", e.message);
        }
    }

    // Default Config
    const config = await db.config.findOne({ key: 'main' });
    if (!config) {
        await db.config.insert({
            key: 'main',
            electionName: 'Student Council Election',
            electionStatus: 'NOT_STARTED',
            adminKey: 'admin123'
        });
    }
}

seedDatabase();

// --- API Routes ---

// Config
app.get('/api/config', async (req, res) => {
    const config = await db.config.findOne({ key: 'main' });
    res.json(config);
});

app.post('/api/config/update', async (req, res) => {
    await db.config.update({ key: 'main' }, { $set: req.body }, { upsert: true });
    res.json({ success: true });
});

// Candidates
app.get('/api/candidates', async (req, res) => {
    const list = await db.candidates.find({}).sort({ addedAt: 1 });
    res.json(list);
});

app.post('/api/candidates/add', async (req, res) => {
    const doc = await db.candidates.insert({ ...req.body, votes: 0, addedAt: new Date() });
    res.json(doc);
});

app.delete('/api/candidates/:id', async (req, res) => {
    await db.candidates.remove({ _id: req.params.id });
    res.json({ success: true });
});

// Students
app.get('/api/students', async (req, res) => {
    const list = await db.students.find({}).sort({ regNo: 1 });
    res.json(list);
});

app.post('/api/students/add', async (req, res) => {
    const existing = await db.students.findOne({ regNo: parseInt(req.body.regNo) });
    if (existing) return res.status(400).json({ error: "Roll No exists" });
    const doc = await db.students.insert({ ...req.body, hasVoted: false, addedAt: new Date() });
    res.json(doc);
});

app.delete('/api/students/:id', async (req, res) => {
    await db.students.remove({ _id: req.params.id });
    res.json({ success: true });
});

app.post('/api/students/verify', async (req, res) => {
    const { regNo, password } = req.body;
    const student = await db.students.findOne({ regNo: parseInt(regNo) });
    if (student && student.password === password) {
        res.json({ success: true, student });
    } else {
        res.status(401).json({ success: false });
    }
});

app.post('/api/students/reset-password', async (req, res) => {
    const { regNo, newPassword } = req.body;
    await db.students.update({ regNo: parseInt(regNo) }, { $set: { password: newPassword } });
    res.json({ success: true });
});

// Voting
app.post('/api/vote', async (req, res) => {
    const { regNo, candidateId, block } = req.body;
    const student = await db.students.findOne({ regNo: parseInt(regNo) });

    if (!student || student.hasVoted) return res.status(400).json({ error: "Access denied" });

    // Securely hash the Student ID using SHA-512 for the blockchain record
    const hashedID = crypto.createHash('sha512').update(regNo.toString()).digest('hex');
    block.data.voterHash = hashedID;

    await db.students.update({ regNo: parseInt(regNo) }, { $set: { hasVoted: true } });
    await db.candidates.update({ _id: candidateId }, { $inc: { votes: 1 } });
    await db.blockchain.insert(block);

    res.json({ success: true });
});

app.get('/api/blockchain', async (req, res) => {
    const blocks = await db.blockchain.find({}).sort({ index: 1 });
    res.json(blocks);
});

app.post('/api/reset-all', async (req, res) => {
    await db.candidates.update({}, { $set: { votes: 0 } }, { multi: true });
    await db.students.update({}, { $set: { hasVoted: false } }, { multi: true });
    await db.blockchain.remove({}, { multi: true });
    await db.config.update({ key: 'main' }, { $set: { electionStatus: 'NOT_STARTED' } });
    res.json({ success: true });
});

// Static files
app.use(express.static(path.join(__dirname, './')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const port = process.env.PORT || 8081;
app.listen(port, () => {
    console.log(`\n🚀 SafeVote Lite is READY!`);
    console.log(`🔗 Web: http://localhost:${port}`);
    console.log(`📂 Data is stored locally in the /data folder.\n`);
});

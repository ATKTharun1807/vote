const mongoose = require('mongoose');
const Datastore = require('nedb-promises');
const path = require('path');

const MONGO_URI = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

const studentSchema = new mongoose.Schema({
    regNo: { type: Number, required: true, unique: true },
    name: String,
    department: { type: String, default: 'CYBER SECURITY' },
    password: { type: String, default: 'atkboss' },
    hasVoted: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
});

const configSchema = new mongoose.Schema({
    type: { type: String, default: 'main', unique: true },
    electionName: { type: String, default: 'Student Council Election' },
    electionStatus: { type: String, default: 'NOT_STARTED' },
    adminKey: { type: String, default: 'admin123' }
});

const Student = mongoose.model('Student', studentSchema);
const Config = mongoose.model('Config', configSchema);

async function restore() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected Successfully!");

        // 1. Restore Students from data/students.db
        console.log("Restoring students from data/students.db...");
        const studentDb = Datastore.create({ filename: path.join(__dirname, 'data', 'students.db'), autoload: true });
        const localStudents = await studentDb.find({});
        console.log(`Found ${localStudents.length} students in students.db`);

        for (const s of localStudents) {
            await Student.updateOne(
                { regNo: s.regNo },
                { $set: { name: s.name, password: s.password, hasVoted: s.hasVoted, department: s.department || 'CYBER SECURITY' } },
                { upsert: true }
            );
        }

        // 2. Restore Students from data/AIML.db
        console.log("Restoring students from data/AIML.db...");
        const aimlDb = Datastore.create({ filename: path.join(__dirname, 'data', 'AIML.db'), autoload: true });
        const localAiml = await aimlDb.find({});
        console.log(`Found ${localAiml.length} students in AIML.db`);

        for (const s of localAiml) {
            await Student.updateOne(
                { regNo: s.regNo },
                { $set: { name: s.name, password: s.password, hasVoted: s.hasVoted, department: 'AIML' } },
                { upsert: true }
            );
        }

        // 3. Restore Config from data/config.db
        console.log("Restoring config from data/config.db...");
        const configDb = Datastore.create({ filename: path.join(__dirname, 'data', 'config.db'), autoload: true });
        const localConfig = await configDb.findOne({ type: 'main' });
        if (localConfig) {
            await Config.updateOne(
                { type: 'main' },
                { $set: { electionName: localConfig.electionName, electionStatus: localConfig.electionStatus, adminKey: localConfig.adminKey } },
                { upsert: true }
            );
        }

        console.log("\nRestoration Complete!");
        process.exit(0);
    } catch (err) {
        console.error("\nError during restoration:");
        console.error(err.message);
        if (err.message.includes("Authentication failed")) {
            console.log("TIP: Make sure you created the user 'stharunkumar069_db_user' with password 'siet@123' in Atlas.");
        }
        process.exit(1);
    }
}

restore();

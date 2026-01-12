const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

const StudentSchema = new mongoose.Schema({
    regNo: { type: Number, required: true, unique: true },
    name: String,
    department: { type: String, default: 'CYBER SECURITY' },
    password: { type: String, default: 'atkboss' },
    hasVoted: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for migration...");

        const students = await Student.find({});
        console.log(`Found ${students.length} students to check.`);

        let updatedCount = 0;
        for (const student of students) {
            const sId = student.regNo.toString();
            const deptCode = sId.substring(6, 9);

            let dept = "CYBER SECURITY";
            if (deptCode === "107") {
                dept = "CYBER SECURITY";
            } else if (deptCode === "202") {
                dept = "AIML";
            }

            if (student.department !== dept) {
                student.department = dept;
                await student.save();
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} students.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();

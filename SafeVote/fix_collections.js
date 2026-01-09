const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

async function fix() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        const depts = ['CYBER', 'AIML'];
        const targetCollection = 'students';

        console.log("Starting consolidation...");

        for (let dept of depts) {
            const collection = db.collection(dept);
            const count = await collection.countDocuments();
            if (count > 0) {
                console.log(`Found ${count} documents in ${dept}. Moving to ${targetCollection}...`);
                const docs = await collection.find({}).toArray();

                for (let doc of docs) {
                    // Remove _id to avoid collision if necessary, or keep it if it's new
                    // Check if exists in target
                    const exists = await db.collection(targetCollection).findOne({ regNo: doc.regNo });
                    if (!exists) {
                        await db.collection(targetCollection).insertOne(doc);
                    } else {
                        // Update existing one with the one from dept collection
                        await db.collection(targetCollection).updateOne(
                            { regNo: doc.regNo },
                            { $set: { password: doc.password, name: doc.name, department: dept } }
                        );
                    }
                }
                console.log(`Finished moving ${dept}.`);
            }
        }

        console.log("Consolidation complete. The 'students' collection is now the source of truth.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();

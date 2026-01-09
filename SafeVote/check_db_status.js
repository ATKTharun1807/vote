const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log("\nCollections in 'safevote' database:");
        for (let col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();

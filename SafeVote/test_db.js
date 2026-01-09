const mongoose = require('mongoose');

// The password is 'siet@123' -> @ should be encoded as %40
const MONGO_URI = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

console.log("--- Starting MongoDB Connection Test ---");
console.log("URI (Encoded):", MONGO_URI.replace("siet%40123", "***"));

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
})
    .then(() => {
        console.log("✅ Successfully connected to MongoDB Atlas!");
        console.log("Ready state:", mongoose.connection.readyState);
        mongoose.connection.db.listCollections().toArray().then(cols => {
            console.log("Collections:", cols.map(c => c.name));
            process.exit(0);
        });
    })
    .catch(err => {
        console.error("❌ Connection Failed!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        process.exit(1);
    });

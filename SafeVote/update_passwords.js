const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://stharunkumar069_db_user:Tharun%4018@cluster0.frcnaxx.mongodb.net/safevote?retryWrites=true&w=majority&appName=Cluster0";

async function updatePasswords() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db("safevote");
    const result = await db.collection("students").updateMany(
      {},
      { $set: { password: "SIET" } }
    );

    console.log(`Matched: ${result.matchedCount} students`);
    console.log(`Updated: ${result.modifiedCount} students`);
    console.log("Done! All passwords changed from 'atkboss' to 'SIET'");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.close();
  }
}

updatePasswords();

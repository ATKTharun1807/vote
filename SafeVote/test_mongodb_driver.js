const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://stharunkumar069_db_user:siet%40123@cluster0.frcnaxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        console.log("Attempting direct MongoDB driver connection...");
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Check collections in 'safevote'
        const db = client.db("safevote");
        const collections = await db.listCollections().toArray();
        console.log("Collections in 'safevote':", collections.map(c => c.name));

    } catch (e) {
        console.error("Connection failed!");
        console.error(e);
    } finally {
        await client.close();
    }
}
run().catch(console.dir);

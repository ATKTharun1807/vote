const serverless = require('serverless-http');
const app = require('../../server');
const mongoose = require('mongoose');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
    // Force context to wait for the event loop to be empty before freezing
    context.callbackWaitsForEmptyEventLoop = false;

    // Ensure database is connected before processing
    if (mongoose.connection.readyState !== 1) {
        console.log('🔄 Awaiting new database connection...');
        await mongoose.connect(process.env.MONGO_URI);
    }

    return await handler(event, context);
};

const serverless = require('serverless-http');
const app = require('../../server');

// Wrap our Express app with serverless-http
module.exports.handler = serverless(app);

const serverless = require('serverless-http');
const app = require('../../server');

// Basic logging for Netlify Functions
console.log('API Function initializing...');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  console.log('Request Path:', event.path);
  
  // Test endpoint to verify function is alive
  if (event.path === '/.netlify/functions/api/test') {
      return {
          statusCode: 200,
          body: JSON.stringify({ message: "Function is alive!", path: event.path })
      };
  }

  return await handler(event, context);
};

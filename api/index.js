// Specialized entry point for Vercel serverless deployment
const app = require('../server');

// Set environment for Vercel
process.env.NODE_ENV = 'vercel';

// Export for Vercel serverless function
module.exports = app; 
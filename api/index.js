// Specialized entry point for Vercel serverless deployment
const app = require('../server');
const mongoose = require('mongoose');

// Set environment for Vercel
process.env.NODE_ENV = 'vercel';

// Add error handling
app.use((err, req, res, next) => {
  console.error('Vercel Serverless Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Add a simple health check route
app.get('/api/health-check', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection ? mongoose.connection.readyState : 'not initialized'
  });
});

// Export for Vercel serverless function
module.exports = app; 
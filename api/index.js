// Specialized entry point for Vercel serverless deployment
const express = require('express');
const path = require('path');
const cors = require('cors');

// Create a new Express app specifically for Vercel
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tell Vercel we're in a serverless environment
process.env.NODE_ENV = 'vercel';

// Add simple routes
app.get('/api/health-check', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV
  });
});

// Add a message for the root route
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to HTML Snippet Builder API",
    status: "active",
    mainUrl: "https://html-snippet-builder-backend.onrender.com",
    info: "This Vercel deployment is a mirror of the main application running on Render."
  });
});

// Add a redirect to the main app
app.get('/app', (req, res) => {
  res.redirect('https://html-snippet-builder-backend.onrender.com');
});

// Redirect all other routes to the main application
app.all('*', (req, res) => {
  res.redirect('https://html-snippet-builder-backend.onrender.com');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Vercel Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message
  });
});

// Export for Vercel serverless function
module.exports = app; 
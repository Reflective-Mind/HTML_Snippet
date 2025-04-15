const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');

// Create Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded request bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API route to handle health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Always return the main index.html for any request that doesn't match an asset or API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`HTML Viewer server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
}); 
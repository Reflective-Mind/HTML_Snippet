const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

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

// API route to save HTML snippets
app.post('/api/snippets', async (req, res) => {
  try {
    const { name, html, css, js } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Snippet name is required' });
    }
    
    // Create snippets directory if it doesn't exist
    const snippetsDir = path.join(__dirname, 'public', 'snippets');
    if (!fs.existsSync(snippetsDir)) {
      fs.mkdirSync(snippetsDir, { recursive: true });
    }
    
    // Save the snippet
    const snippet = { name, html, css, js, createdAt: new Date() };
    fs.writeFileSync(
      path.join(snippetsDir, `${name.replace(/[^a-z0-9]/gi, '_')}.json`),
      JSON.stringify(snippet, null, 2)
    );
    
    res.status(201).json(snippet);
  } catch (error) {
    console.error('Error saving snippet:', error);
    res.status(500).json({ error: 'Failed to save snippet' });
  }
});

// API route to get all snippets
app.get('/api/snippets', async (req, res) => {
  try {
    const snippetsDir = path.join(__dirname, 'public', 'snippets');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(snippetsDir)) {
      fs.mkdirSync(snippetsDir, { recursive: true });
      return res.json([]);
    }
    
    // Read all snippet files
    const files = fs.readdirSync(snippetsDir).filter(file => file.endsWith('.json'));
    const snippets = files.map(file => {
      const content = fs.readFileSync(path.join(snippetsDir, file), 'utf8');
      return JSON.parse(content);
    });
    
    res.json(snippets);
  } catch (error) {
    console.error('Error getting snippets:', error);
    res.status(500).json({ error: 'Failed to get snippets' });
  }
});

// API route to get a specific snippet
app.get('/api/snippets/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const filePath = path.join(__dirname, 'public', 'snippets', `${name.replace(/[^a-z0-9]/gi, '_')}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const snippet = JSON.parse(content);
    
    res.json(snippet);
  } catch (error) {
    console.error('Error getting snippet:', error);
    res.status(500).json({ error: 'Failed to get snippet' });
  }
});

// API route to delete a snippet
app.delete('/api/snippets/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const filePath = path.join(__dirname, 'public', 'snippets', `${name.replace(/[^a-z0-9]/gi, '_')}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    
    fs.unlinkSync(filePath);
    
    res.status(200).json({ message: 'Snippet deleted successfully' });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    res.status(500).json({ error: 'Failed to delete snippet' });
  }
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
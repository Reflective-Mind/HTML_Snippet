const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// Ensure necessary directories exist
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Storage directories
const dataDir = path.join(__dirname, 'data');
const layersDir = path.join(dataDir, 'layers');

// Ensure directories exist
ensureDirectoryExists(dataDir);
ensureDirectoryExists(layersDir);

// API route to save layers data
app.post('/api/layers', async (req, res) => {
  try {
    const { layersData, name } = req.body;
    
    if (!layersData) {
      return res.status(400).json({ error: 'Layers data is required' });
    }
    
    // Create a filename based on name or timestamp
    const filename = name ? 
      name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json' : 
      `layers_${Date.now()}.json`;
    
    // Save the layers data
    fs.writeFileSync(
      path.join(layersDir, filename),
      JSON.stringify(layersData, null, 2)
    );
    
    res.status(200).json({ 
      message: 'Layers saved successfully',
      filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving layers:', error);
    res.status(500).json({ error: 'Failed to save layers data' });
  }
});

// API route to get all saved layer files
app.get('/api/layers', async (req, res) => {
  try {
    // Get all JSON files in the layers directory
    const files = fs.readdirSync(layersDir).filter(file => file.endsWith('.json'));
    
    // Get metadata for each file
    const layerFiles = files.map(file => {
      const fullPath = path.join(layersDir, file);
      const stats = fs.statSync(fullPath);
      
      return {
        filename: file,
        name: file.replace('.json', '').replace(/_/g, ' '),
        lastModified: stats.mtime,
        size: stats.size
      };
    });
    
    // Sort by most recent first
    layerFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    res.json(layerFiles);
  } catch (error) {
    console.error('Error getting layer files:', error);
    res.status(500).json({ error: 'Failed to get layer files' });
  }
});

// API route to get a specific layer file
app.get('/api/layers/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const fullPath = path.join(layersDir, filename);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Layer file not found' });
    }
    
    const data = fs.readFileSync(fullPath, 'utf8');
    const layersData = JSON.parse(data);
    
    res.json(layersData);
  } catch (error) {
    console.error('Error getting layer file:', error);
    res.status(500).json({ error: 'Failed to get layer file' });
  }
});

// API route to delete a layer file
app.delete('/api/layers/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const fullPath = path.join(layersDir, filename);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Layer file not found' });
    }
    
    fs.unlinkSync(fullPath);
    
    res.json({ message: 'Layer file deleted successfully' });
  } catch (error) {
    console.error('Error deleting layer file:', error);
    res.status(500).json({ error: 'Failed to delete layer file' });
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
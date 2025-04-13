// Simple debug server to test connectivity
const express = require('express');
const app = express();
const path = require('path');

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Simple routes
app.get('/', (req, res) => {
    console.log('Root path accessed');
    res.send('Server is working!');
});

app.get('/api/health', (req, res) => {
    console.log('Health endpoint accessed');
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/app', (req, res) => {
    console.log('App route accessed');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Debug server running on port ${PORT}`);
    console.log(`Try accessing: http://localhost:${PORT}/api/health`);
}); 
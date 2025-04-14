// Specialized entry point for Vercel serverless deployment
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

// Create a new Express app specifically for Vercel
const app = express();

// Basic middleware
app.use(cors({
  origin: '*',  // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tell Vercel we're in a serverless environment
process.env.NODE_ENV = 'vercel';

// The main Render API URL
const RENDER_API_URL = 'https://mbti-render.onrender.com';

// Add simple routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    service: 'Vercel Serverless API',
    renderApiUrl: RENDER_API_URL
  });
});

// Add a message for the root route
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to HTML Snippet Builder API",
    status: "active",
    mainApiUrl: RENDER_API_URL,
    frontendUrl: req.headers.host,
    repositoryUrl: "https://github.com/Reflective-Mind/HTML_Snippet",
    info: "This Vercel deployment is a frontend mirror of the main application running on Render.",
    endpoints: {
      api: `${RENDER_API_URL}/api`,
      health: `${RENDER_API_URL}/api/health`,
      app: `${RENDER_API_URL}/app`
    }
  });
});

// API proxy for simple endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const response = await axios.get(`${RENDER_API_URL}/api/stats`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch stats from Render API',
      message: error.message
    });
  }
});

// Handle the app route - serve the local index.html with proper env vars
app.get('/app', (req, res) => {
  // We'll redirect to the Render app
  res.redirect(`${RENDER_API_URL}/app`);
});

// Proxy API routes to Render instead of redirecting
app.all('/api/*', async (req, res) => {
  try {
    const targetUrl = `${RENDER_API_URL}${req.url}`;
    
    // Forward the request to Render
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers['authorization'] || '',
      },
      data: req.method !== 'GET' ? req.body : undefined,
      params: req.method === 'GET' ? req.query : undefined,
      responseType: 'json'
    };
    
    const response = await axios(axiosConfig);
    
    // Forward the response back to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    // Handle errors properly
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;
    
    res.status(status).json({
      error: 'API Proxy Error',
      message: message,
      renderApiUrl: RENDER_API_URL
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Vercel Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message,
    renderApiUrl: RENDER_API_URL
  });
});

// Export for Vercel serverless function
module.exports = app; 
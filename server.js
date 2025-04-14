const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const axios = require('axios');

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // increase limit to 1000 requests per window
    message: { message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { message: 'Too many API requests, please try again later' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/login', limiter); // Apply stricter limits only to login
app.use('/api/', apiLimiter); // Apply regular limits to other API routes

// Authentication middleware with monitoring
const authenticateAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            monitoring.trackError(new Error('No token provided'));
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'admin') {
            req.user = decoded;
            next();
        } else {
            monitoring.trackError(new Error('Unauthorized access attempt'));
            res.status(403).json({ message: 'Not authorized' });
        }
    } catch (error) {
        monitoring.trackError(error);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token expired' });
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: 'Invalid token' });
        } else {
            next(error);
        }
    }
};

// Add user authentication middleware
const authenticateUser = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return next(); // Allow public access
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        next(); // Continue as public user on error
    }
};

// Serve static files
app.use(express.static('public'));
app.get('/', async (req, res) => {
    try {
        // Check for admin access
        if (req.query.admin === 'true') {
            res.sendFile('index.html', { root: './public' });
            return;
        }

        // For regular users, ensure home page exists and is set as default
        let defaultPage = await Page.findOne({ isDefault: true });
        if (!defaultPage) {
            // Try to find home page
            defaultPage = await Page.findOne({ id: 'home' });
            
            if (!defaultPage) {
                // Create home page if it doesn't exist
                defaultPage = await new Page({
                    id: 'home',
                    name: 'Home',
                    snippets: [{
                        id: 1,
                        html: '<div class="welcome-message" style="text-align: center; padding: 20px;"><h1>Welcome to Your Page</h1><p>This is your default home page. Log in as admin to customize it.</p></div>',
                        position: { x: 100, y: 100 },
                        size: { width: 400, height: 200 }
                    }],
                    isDefault: true
                }).save();
                console.log('Created new home page as default');
            } else {
                // Set existing home page as default
                defaultPage.isDefault = true;
                await defaultPage.save();
                console.log('Set existing home page as default');
            }
        }

        res.sendFile('index.html', { root: './public' });
    } catch (error) {
        console.error('Error serving page:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// MongoDB connection with better error handling and monitoring
let mongoConnected = false;

console.log('🔄 Attempting to connect to MongoDB...');
console.log('📁 Database:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000
}).then(async () => {
    console.log('✅ Successfully connected to MongoDB');
    mongoConnected = true;
    
    try {
        // Drop existing collections to start fresh
        console.log('🔄 Cleaning existing database...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const collection of collections) {
            await mongoose.connection.db.dropCollection(collection.name);
        }
        console.log('✅ Database cleaned');

        // Create admin user
        console.log('👤 Creating admin user...');
        const adminEmail = 'eideken@hotmail.com';
        const adminPassword = 'sword91';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        
        const adminUser = await new User({
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            created: new Date(),
            lastLogin: null
        }).save();
        
        console.log('✅ Admin user created:', adminUser.email);

        // Create home page
        console.log('📄 Creating home page...');
        const homePage = await new Page({
            id: 'home',
            name: 'Home',
            snippets: [{
                id: 1,
                html: '<div class="welcome-message" style="text-align: center; padding: 20px;"><h1>Welcome to Your Page</h1><p>This is your default home page. Log in as admin to customize it.</p></div>',
                position: { x: 100, y: 100 },
                size: { width: 400, height: 200 }
            }],
            navButtons: [],
            isDefault: true,
            created: new Date(),
            updated: new Date()
        }).save();
        
        console.log('✅ Home page created');

        // Initialize settings
        console.log('⚙️ Initializing settings...');
        await initializeSettings();
        console.log('✅ Settings initialized');

        // Verify setup
        const users = await User.countDocuments();
        const pages = await Page.countDocuments();
        const settings = await Settings.countDocuments();
        
        console.log('📊 Database Setup Complete:');
        console.log(`- Users: ${users}`);
        console.log(`- Pages: ${pages}`);
        console.log(`- Settings: ${settings}`);
        
        // Print admin login information
        console.log('\n🔐 Admin Login Credentials:');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('\n✨ Setup complete! The application is ready to use.');

    } catch (error) {
        console.error('❌ Error in initialization:', error);
        monitoring.trackError(error);
        process.exit(1);
    }
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    monitoring.trackError(err);
    process.exit(1);
});

// Monitor MongoDB connection
setInterval(async () => {
    if (mongoose.connection.readyState !== 1 && mongoConnected) {
        console.error('❌ MongoDB connection lost');
        mongoConnected = false;
        monitoring.alertIssue('MongoDB connection lost');
    } else if (mongoose.connection.readyState === 1 && !mongoConnected) {
        console.log('✅ MongoDB connection restored');
        mongoConnected = true;
        
        // Print collection state after reconnection
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📚 Available collections after reconnect:', collections.map(c => c.name));
        
        monitoring.logMetric('mongodb', { status: 'connected' });
    }
}, 5000);

// Models
const Page = mongoose.model('Page', {
    id: { 
        type: String, 
        required: true,
        unique: true
    },
    name: { 
        type: String, 
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    snippets: [{
        id: Number,
        html: String,
        position: {
            x: Number,
            y: Number
        },
        size: {
            width: Number,
            height: Number
        },
        apiConfig: {
            type: String,
            key: String
        }
    }],
    navButtons: [{
        id: String,
        targetPage: String,
        text: String,
        style: String,
        position: {
            x: Number,
            y: Number
        }
    }],
    created: { 
        type: Date, 
        default: Date.now 
    },
    updated: { 
        type: Date, 
        default: Date.now 
    }
});

// Add User model after Page model
const User = mongoose.model('User', {
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    created: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date,
    preferences: {
        type: Map,
        of: String
    },
    chatHistory: [{
        timestamp: Date,
        message: String,
        response: String
    }],
    testResults: [{
        testType: String,
        date: Date,
        results: Object
    }]
});

// Settings model for configuration management
const Settings = mongoose.model('Settings', {
    key: {
        type: String,
        required: true,
        unique: true,
        enum: ['MONGODB_URI', 'JWT_SECRET', 'MISTRAL_API_KEY', 'PORT', 'NODE_ENV']
    },
    value: {
        type: String,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: String  // Admin email who made the change
    },
    description: String
});

// Function to get setting value
async function getSetting(key, defaultValue = null) {
    try {
        const setting = await Settings.findOne({ key });
        return setting ? setting.value : defaultValue;
    } catch (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return defaultValue;
    }
}

// Function to initialize settings from .env if they don't exist
async function initializeSettings() {
    try {
        const defaultSettings = [
            { key: 'MONGODB_URI', value: process.env.MONGODB_URI, description: 'MongoDB connection string' },
            { key: 'JWT_SECRET', value: process.env.JWT_SECRET, description: 'JWT authentication secret key' },
            { key: 'MISTRAL_API_KEY', value: process.env.MISTRAL_API_KEY, description: 'Mistral AI API key' },
            { key: 'PORT', value: process.env.PORT || '10000', description: 'Server port number' },
            { key: 'NODE_ENV', value: process.env.NODE_ENV || 'production', description: 'Environment (development/production)' }
        ];

        for (const setting of defaultSettings) {
            const exists = await Settings.findOne({ key: setting.key });
            if (!exists && setting.value) {
                await new Settings(setting).save();
                console.log(`Initialized setting: ${setting.key}`);
            }
        }
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
}

// Initialize settings after MongoDB connection
mongoose.connection.once('open', () => {
    initializeSettings();
});

// Add settings endpoints
app.get('/api/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = await Settings.find().select('-__v');
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

app.put('/api/admin/settings/:key', authenticateAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({ message: 'Value is required' });
        }

        const setting = await Settings.findOneAndUpdate(
            { key },
            { 
                value,
                lastUpdated: new Date(),
                updatedBy: req.user.email
            },
            { new: true, upsert: true }
        );

        // Update runtime configuration
        switch (key) {
            case 'MONGODB_URI':
                // MongoDB URI changes require server restart
                break;
            case 'JWT_SECRET':
                process.env.JWT_SECRET = value;
                break;
            case 'MISTRAL_API_KEY':
                process.env.MISTRAL_API_KEY = value;
                // Update Mistral API client
                mistralApi.defaults.headers['Authorization'] = `Bearer ${value}`;
                break;
            case 'PORT':
                // PORT changes require server restart
                break;
            case 'NODE_ENV':
                process.env.NODE_ENV = value;
                break;
        }

        res.json(setting);
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ message: 'Failed to update setting' });
    }
});

// Monitoring data store
const monitoring = {
    metrics: {
        requests: 0,
        errors: 0,
        apiCalls: 0
    },
    errorLogs: [],
    alerts: [],

    trackRequest() {
        this.metrics.requests++;
    },

    trackError(error) {
        this.metrics.errors++;
        this.errorLogs.push({
            timestamp: new Date(),
            error: error.message,
            stack: error.stack
        });

        // Keep only last 100 errors
        if (this.errorLogs.length > 100) {
            this.errorLogs.shift();
        }
    },

    trackApiCall() {
        this.metrics.apiCalls++;
    },

    alertIssue(message, data = {}) {
        const alert = {
            timestamp: new Date(),
            message,
            data
        };
        this.alerts.push(alert);

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }

        console.warn('ALERT:', message, data);
    },

    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date(),
            mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        };
    }
};

// Request tracking middleware
app.use((req, res, next) => {
    monitoring.trackRequest();
    next();
});

// Error handling middleware with monitoring
app.use((err, req, res, next) => {
    monitoring.trackError(err);
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
    const health = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        metrics: monitoring.getMetrics()
    };

    if (health.mongodb !== 'connected') {
        health.status = 'degraded';
    }

    res.json(health);
});

// Monitoring endpoints
app.get('/api/monitoring', authenticateAdmin, (req, res) => {
    res.json(monitoring.getMetrics());
});

app.get('/api/monitoring/errors', authenticateAdmin, (req, res) => {
    res.json(monitoring.errorLogs);
});

app.get('/api/monitoring/alerts', authenticateAdmin, (req, res) => {
    res.json(monitoring.alerts);
});

// Add registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Basic validation with better error messages
        if (!email || !password) {
            console.log('Registration failed: Missing email or password');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Simple email validation
        if (!email.includes('@')) {
            console.log('Registration failed: Invalid email format');
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if user exists - with case-insensitive check
        const existingUser = await User.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (existingUser) {
            console.log('Registration failed: User already exists');
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const user = new User({
            email: email.toLowerCase(), // Store email in lowercase
            password: hashedPassword,
            role: email === 'eideken@hotmail.com' ? 'admin' : 'user'
        });
        
        await user.save();
        console.log('User registered successfully:', email);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed: ' + error.message });
    }
});

// Update login endpoint to handle case-insensitive email
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);
        
        // Check if user exists - case insensitive
        const user = await User.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') }
        });
        
        if (!user) {
            console.log('Login failed: User not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token with user role and default page
        const token = jwt.sign(
            { 
                email: user.email, 
                role: user.role,
                userId: user._id,
                defaultPage: user.role === 'admin' ? 'admin' : 'home'
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful for:', email, 'Role:', user.role);
        res.json({ 
            token, 
            role: user.role,
            defaultPage: user.role === 'admin' ? 'admin' : 'home'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed: ' + error.message });
    }
});

// Add admin page endpoint
app.get('/api/admin', authenticateAdmin, async (req, res) => {
    try {
        // Get admin dashboard data
        const users = await User.countDocuments();
        const pages = await Page.find().lean();
        const settings = await Settings.find().lean();
        
        res.json({
            stats: {
                users,
                pages: pages.length,
                settings: settings.length
            },
            pages,
            settings
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Failed to load admin dashboard' });
    }
});

// Update pages endpoint to include navigation
app.get('/api/pages', authenticateUser, async (req, res) => {
    try {
        let pages = await Page.find().lean();
        
        // If no pages exist, create home page
        if (!pages || pages.length === 0) {
            const homePage = new Page({
                id: 'home',
                name: 'Home',
                snippets: [{
                    id: 1,
                    html: '<div class="welcome-message"><h1>Welcome</h1><p>This is your home page.</p></div>',
                    position: { x: 100, y: 100 },
                    size: { width: 400, height: 200 }
                }],
                navButtons: [],
                isDefault: true
            });
            await homePage.save();
            pages = [homePage];
        }

        // Add navigation data
        pages = pages.map(page => ({
            ...page,
            navButtons: page.navButtons || [],
            isAccessible: true
        }));

        res.json(pages);
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ message: 'Failed to fetch pages' });
    }
});

// Add endpoint to get user pages with authentication
app.get('/api/user/pages', authenticateUser, async (req, res, next) => {
    try {
        monitoring.trackApiCall();
        const pages = await Page.find().lean();
        res.json(pages);
    } catch (error) {
        monitoring.trackError(error);
        next(error);
    }
});

app.get('/api/pages/:id', async (req, res, next) => {
    try {
        console.log('Fetching page:', req.params.id);
        let page = await Page.findOne({ id: req.params.id }).lean();
        
        // If requesting home page and it doesn't exist, create it
        if (!page && req.params.id === 'home') {
            console.log('Home page not found, creating it');
            const newPage = new Page({
                id: 'home',
                name: 'Home',
                snippets: [{
                    id: 1,
                    html: '<div class="welcome-message" style="text-align: center; padding: 20px;"><h1>Welcome to Your Page</h1><p>This is your default home page. Log in as admin to customize it.</p></div>',
                    position: { x: 100, y: 100 },
                    size: { width: 400, height: 200 }
                }],
                navButtons: [],
                isDefault: true,
                created: new Date(),
                updated: new Date()
            });
            await newPage.save();
            page = newPage.toObject();
            console.log('Created new home page:', page);
        }

        if (!page) {
            console.log('Page not found:', req.params.id);
            return res.status(404).json({ message: 'Page not found' });
        }

        // Ensure navButtons array exists
        if (!page.navButtons) {
            page.navButtons = [];
        }

        // Validate navigation button target pages exist
        const allPages = await Page.find().select('id name').lean();
        page.navButtons = page.navButtons.filter(btn => {
            const targetExists = allPages.some(p => p.id === btn.targetPage);
            if (!targetExists) {
                console.warn(`Removing invalid navigation button targeting non-existent page: ${btn.targetPage}`);
            }
            return targetExists;
        });
        
        console.log('Returning page with nav buttons:', page.navButtons.length);
        res.json(page);
    } catch (error) {
        console.error('Error retrieving page:', error);
        monitoring.trackError(error);
        next(error);
    }
});

app.post('/api/pages', authenticateAdmin, async (req, res, next) => {
    try {
        monitoring.trackApiCall();
        const { id, name, snippets } = req.body;

        console.log('📝 Creating new page:', { id, name });

        // Check if page with this ID already exists
        const existingPage = await Page.findOne({ id });
        if (existingPage) {
            console.log('❌ Page creation failed: ID already exists:', id);
            return res.status(400).json({ message: 'Page with this ID already exists' });
        }

        const page = new Page({
            id,
            name,
            snippets: snippets || [],
            created: new Date(),
            updated: new Date()
        });

        await page.save();
        console.log('✅ Page created successfully:', { id, name });
        
        // Verify page was saved
        const savedPage = await Page.findOne({ id });
        if (savedPage) {
            console.log('✅ Page verified in database:', { id, name });
        } else {
            console.error('❌ Page not found in database after save!');
        }

        res.status(201).json(page);
    } catch (error) {
        console.error('❌ Error creating page:', error);
        monitoring.trackError(error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ message: error.message });
        } else {
            next(error);
        }
    }
});

app.put('/api/pages/:id', authenticateAdmin, async (req, res, next) => {
    try {
        monitoring.trackApiCall();
        const { snippets, name, navButtons, isDefault } = req.body;
        
        console.log('📝 Updating page:', req.params.id, { name, navButtonCount: navButtons?.length });

        // Find page and handle not found
        const page = await Page.findOne({ id: req.params.id });
        if (!page) {
            console.log('❌ Page update failed: Page not found:', req.params.id);
            return res.status(404).json({ message: 'Page not found' });
        }

        // Validate navigation buttons if provided
        if (navButtons) {
            console.log('🔄 Processing navigation buttons for page:', req.params.id);
            const allPages = await Page.find().select('id');
            const validPageIds = allPages.map(p => p.id);
            
            // Ensure all target pages exist
            const invalidTargets = navButtons.filter(btn => !validPageIds.includes(btn.targetPage));
            if (invalidTargets.length > 0) {
                console.log('❌ Invalid button targets:', invalidTargets.map(btn => btn.targetPage));
                return res.status(400).json({ 
                    message: `Invalid target pages: ${invalidTargets.map(btn => btn.targetPage).join(', ')}` 
                });
            }

            // Ensure all buttons have required fields
            const invalidButtons = navButtons.filter(btn => !btn.id || !btn.targetPage || !btn.text);
            if (invalidButtons.length > 0) {
                console.log('❌ Invalid button data:', invalidButtons);
                return res.status(400).json({ 
                    message: 'All navigation buttons must have id, targetPage, and text' 
                });
            }

            // Update navigation buttons
            page.navButtons = navButtons.map(btn => ({
                id: btn.id,
                targetPage: btn.targetPage,
                text: btn.text,
                style: btn.style || 'btn-primary',
                position: {
                    x: btn.position?.x || 0,
                    y: btn.position?.y || 0
                }
            }));
            console.log('✅ Navigation buttons updated:', page.navButtons.length, 'buttons');
        }

        // Update other fields
        if (name) page.name = name;
        if (snippets) page.snippets = snippets;
        if (typeof isDefault === 'boolean' && isDefault) {
            await Page.updateMany({ _id: { $ne: page._id } }, { isDefault: false });
            page.isDefault = true;
            console.log('✅ Page set as default:', req.params.id);
        }

        page.updated = new Date();
        await page.save();

        // Verify update
        const updatedPage = await Page.findOne({ id: req.params.id });
        console.log('✅ Page update verified in database:', {
            id: updatedPage.id,
            name: updatedPage.name,
            navButtonCount: updatedPage.navButtons?.length
        });

        res.json(page);
    } catch (error) {
        console.error('❌ Error updating page:', error);
        monitoring.trackError(error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ message: error.message });
        } else {
            next(error);
        }
    }
});

app.delete('/api/pages/:id', authenticateAdmin, async (req, res, next) => {
    try {
        monitoring.trackApiCall();
        
        // Prevent deletion of home page
        if (req.params.id === 'home') {
            return res.status(400).json({ message: 'Cannot delete home page' });
        }

        const page = await Page.findOneAndDelete({ id: req.params.id });
        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.json({ message: 'Page deleted successfully' });
    } catch (error) {
        monitoring.trackError(error);
        next(error);
    }
});

// Add endpoint to set default page
app.put('/api/pages/:id/default', authenticateAdmin, async (req, res) => {
    try {
        // Remove default flag from all pages
        await Page.updateMany({}, { isDefault: false });
        
        // Set new default page
        const page = await Page.findOneAndUpdate(
            { id: req.params.id },
            { isDefault: true },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }

        res.json(page);
    } catch (error) {
        console.error('Error setting default page:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add user data endpoints
app.get('/api/user/profile', authenticateUser, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            email: user.email,
            role: user.role,
            preferences: user.preferences,
            lastLogin: user.lastLogin
        });
    } catch (error) {
        monitoring.trackError(error);
        res.status(500).json({ message: 'Failed to fetch user profile' });
    }
});

// Add Mistral API integration
const mistralApi = axios.create({
    baseURL: 'https://api.mistral.ai/v1',
    headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// Add chat endpoint
app.post('/api/chat', authenticateUser, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.userId;

        // Call Mistral API
        const response = await mistralApi.post('/chat/completions', {
            model: "mistral-tiny",
            messages: [{ role: "user", content: message }],
            temperature: 0.7,
            max_tokens: 200
        });

        // Store chat in user history
        const user = await User.findById(userId);
        user.chatHistory.push({
            timestamp: new Date(),
            message: message,
            response: response.data.choices[0].message.content
        });
        await user.save();

        res.json({
            success: true,
            response: response.data.choices[0].message.content
        });
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process chat message'
        });
    }
});

// Add endpoint to get user chat history
app.get('/api/chat/history', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.json({
            success: true,
            history: user.chatHistory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat history'
        });
    }
});

// Rename page endpoint
app.put('/api/pages/:id/rename', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newName } = req.body;

        // Check if a page with the new name already exists
        const existingPage = await Page.findOne({ id: newName.toLowerCase().replace(/\s+/g, '-') });
        if (existingPage) {
            return res.status(400).json({ message: 'A page with this name already exists' });
        }

        // Find the page using id field
        const page = await Page.findOne({ id: id });
        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }

        // Update the page name and id
        const newId = newName.toLowerCase().replace(/\s+/g, '-');
        page.name = newName;
        page.id = newId;
        await page.save();

        // Update any navigation buttons that point to this page
        const pages = await Page.find({});
        for (const p of pages) {
            if (p.navButtons) {
                let updated = false;
                p.navButtons = p.navButtons.map(button => {
                    if (button.targetPage === id) {
                        updated = true;
                        return { ...button, targetPage: newId };
                    }
                    return button;
                });
                if (updated) {
                    await p.save();
                }
            }
        }

        res.json({ message: 'Page renamed successfully', newId: newId });
    } catch (error) {
        console.error('Error renaming page:', error);
        res.status(500).json({ message: 'Error renaming page' });
    }
});

// Delete page endpoint
app.delete('/api/pages/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Don't allow deleting the home page
        if (id === 'home') {
            return res.status(400).json({ message: 'Cannot delete the home page' });
        }

        // Find and delete the page
        const page = await Page.findOne({ name: id });
        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }

        await page.deleteOne();

        // Remove any navigation buttons that point to this page
        const pages = await Page.find({});
        for (const p of pages) {
            if (p.navButtons) {
                const originalLength = p.navButtons.length;
                p.navButtons = p.navButtons.filter(button => button.targetPage !== id);
                if (p.navButtons.length !== originalLength) {
                    await p.save();
                }
            }
        }

        res.json({ message: 'Page deleted successfully' });
    } catch (error) {
        console.error('Error deleting page:', error);
        res.status(500).json({ message: 'Error deleting page' });
    }
});

// Start server with enhanced error handling and monitoring
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    monitoring.alertIssue('Server started', { port: PORT });
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    monitoring.trackError(error);
    monitoring.alertIssue('Server error', { error: error.message });
    process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    monitoring.trackError(reason);
    monitoring.alertIssue('Unhandled Rejection', { reason: reason.message });
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    monitoring.trackError(error);
    monitoring.alertIssue('Uncaught Exception', { error: error.message });
    process.exit(1);
}); 
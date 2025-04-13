const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { Server } = require('socket.io');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Authorization", "Content-Type"]
    },
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8,
    cookie: {
        name: 'io',
        httpOnly: true,
        sameSite: 'lax'
    }
});

// Add debug logging for Socket.IO connections
io.engine.on("connection_error", (err) => {
    console.log("❌ Connection error:", err);
    console.log("Error details:", {
        code: err.code,
        message: err.message,
        type: err.type,
        transport: err.transport
    });
});

// Add connection monitoring
io.engine.on("connection", (socket) => {
    console.log("🔌 New transport connection:", {
        id: socket.id,
        transport: socket.transport,
        protocol: socket.protocol
    });
});

// Add ping monitoring
io.engine.on("packet", (packet) => {
    if (packet.type === 'ping') {
        console.log("♥️ Received ping from client");
    }
});

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
app.use(express.static('public'));
app.use(express.static('.'));  // Also serve files from root directory

// Setup mongoose for serverless environments
mongoose.set('bufferCommands', false); // Disable mongoose buffering
mongoose.set('strictQuery', true); // Suppress strictQuery warning

// Authentication middleware
const authenticateUser = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const authenticateAdmin = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
        return res.status(401).json({ message: 'No token provided' });
        }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Admin authentication failed:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Serve static files
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
console.log('📁 Database URI:', process.env.MONGODB_URI);
console.log('📁 Database Name:', process.env.DB_NAME || 'html-snippet-builder');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000, // Increased timeout
    heartbeatFrequencyMS: 10000,
    dbName: process.env.DB_NAME || 'html-snippet-builder',  // Explicitly set database name
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 50,
    socketTimeoutMS: 45000,
    family: 4  // Force IPv4
}).then(async () => {
    console.log('✅ Successfully connected to MongoDB');
    console.log('📊 Connected to database:', mongoose.connection.db.databaseName);
    mongoConnected = true;
    
    try {
        // Initialize channels first
        console.log('Initializing settings and default channels...');
        await initializeChannels();
        
        // Verify collections exist
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('📚 Available collections:', collectionNames);

        // Check if admin user exists
        const adminExists = await User.findOne({ email: 'eideken@hotmail.com' });
        
        if (!adminExists) {
            // Create admin user only if it doesn't exist
        console.log('👤 Creating admin user...');
        const adminEmail = 'eideken@hotmail.com';
        const adminPassword = 'sword91';
            const adminUsername = 'admin';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        
        const adminUser = await new User({
            email: adminEmail,
                username: adminUsername,
            password: hashedPassword,
            role: 'admin',
            created: new Date(),
            lastLogin: null
        }).save();
        
        console.log('✅ Admin user created:', adminUser.email);
        } else if (!adminExists.username) {
            // Update existing admin user with username if missing
            adminExists.username = 'admin';
            await adminExists.save();
            console.log('✅ Added username to existing admin user');
        }

        // Check if home page exists
        const homePageExists = await Page.findOne({ id: 'home' });
        
        if (!homePageExists) {
            // Create home page only if it doesn't exist
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
        }

        // Initialize settings if they don't exist
        console.log('⚙️ Checking settings...');
        await initializeSettings();
        console.log('✅ Settings verified');

        // Print database status
        const users = await User.countDocuments();
        const pages = await Page.countDocuments();
        const settings = await Settings.countDocuments();
        
        console.log('📊 Database Status:');
        console.log(`- Users: ${users}`);
        console.log(`- Pages: ${pages}`);
        console.log(`- Settings: ${settings}`);
        
        console.log('\n✨ Server ready to use!');

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
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
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
    isBanned: {
        type: Boolean,
        default: false
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
    }],
    tokenVersion: {
        type: Number,
        default: 0
    }
});

// Settings model for configuration management
const Settings = mongoose.model('Settings', {
    key: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'MONGODB_URI',
            'JWT_SECRET',
            'MISTRAL_API_KEY',
            'PORT',
            'NODE_ENV',
            'CHAT_SOCKET_URL',
            'CHAT_API_URL',
            'REACT_APP_CHAT_API_URL',
            'REPOSITORY_URL',
            'DEPLOYMENT_PLATFORM',
            'DEPLOYMENT_URL',
            'API_VERSION'
        ]
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
        type: String
    },
    description: String,
    isSecret: {
        type: Boolean,
        default: false
    },
    category: {
        type: String,
        enum: ['database', 'security', 'api', 'deployment', 'chat'],
        default: 'api'
    }
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
            { key: 'MONGODB_URI', value: process.env.MONGODB_URI, description: 'MongoDB connection string', isSecret: true, category: 'database' },
            { key: 'JWT_SECRET', value: process.env.JWT_SECRET, description: 'JWT authentication secret key', isSecret: true, category: 'security' },
            { key: 'MISTRAL_API_KEY', value: process.env.MISTRAL_API_KEY, description: 'Mistral AI API key', isSecret: true, category: 'api' },
            { key: 'PORT', value: process.env.PORT || '10000', description: 'Server port number', category: 'deployment' },
            { key: 'NODE_ENV', value: process.env.NODE_ENV || 'production', description: 'Environment (development/production)', category: 'deployment' },
            { key: 'CHAT_SOCKET_URL', value: process.env.CHAT_SOCKET_URL || 'ws://localhost:10000', description: 'Chat WebSocket URL', category: 'chat' },
            { key: 'CHAT_API_URL', value: process.env.CHAT_API_URL || 'http://localhost:10000/api', description: 'Chat API URL', category: 'chat' },
            { key: 'REACT_APP_CHAT_API_URL', value: process.env.REACT_APP_CHAT_API_URL || 'http://localhost:10000/api', description: 'React Chat API URL', category: 'chat' },
            { key: 'REPOSITORY_URL', value: 'https://github.com/Reflective-Mind/Ken-Ultimate.git', description: 'Git repository URL', category: 'deployment' },
            { key: 'DEPLOYMENT_PLATFORM', value: 'render', description: 'Deployment platform (render/vercel)', category: 'deployment' },
            { key: 'DEPLOYMENT_URL', value: 'https://html-snippet-builder.onrender.com', description: 'Production deployment URL', category: 'deployment' },
            { key: 'API_VERSION', value: '1.0.0', description: 'API version number', category: 'api' }
        ];

        for (const setting of defaultSettings) {
            const exists = await Settings.findOne({ key: setting.key });
            if (!exists && setting.value) {
                await new Settings(setting).save();
                console.log(`✅ Initialized setting: ${setting.key}`);
            }
        }
    } catch (error) {
        console.error('❌ Error initializing settings:', error);
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
                process.env.MONGODB_URI = value;
                // MongoDB URI changes require server restart
                break;
            case 'JWT_SECRET':
                process.env.JWT_SECRET = value;
                break;
            case 'MISTRAL_API_KEY':
                process.env.MISTRAL_API_KEY = value;
                mistralApi.defaults.headers['Authorization'] = `Bearer ${value}`;
                break;
            case 'PORT':
                process.env.PORT = value;
                // PORT changes require server restart
                break;
            case 'NODE_ENV':
                process.env.NODE_ENV = value;
                break;
            case 'CHAT_SOCKET_URL':
                process.env.CHAT_SOCKET_URL = value;
                break;
            case 'CHAT_API_URL':
                process.env.CHAT_API_URL = value;
                break;
            case 'REACT_APP_CHAT_API_URL':
                process.env.REACT_APP_CHAT_API_URL = value;
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

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token with role
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email, 
                username: user.username,
                role: user.role,
                tokenVersion: user.tokenVersion || 0
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response with user data
        res.json({ 
            token, 
            role: user.role,
            username: user.username,
            email: user.email,
            lastLogin: user.lastLogin,
            defaultPage: 'home',
            preferences: user.preferences || {}
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // Validate input
        if (!email || !username || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if email already exists
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Check if username already exists
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            username,
            password: hashedPassword,
            role: 'user',
            created: new Date()
        });

        await user.save();

        res.status(201).json({ 
            message: 'Registration successful',
            email: user.email,
            username: user.username
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Registration failed' });
        }
    }
});

// Update pages endpoint to handle both public and authenticated access
app.get('/api/pages', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let isAuthenticated = false;
        let userRole = 'public';
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                isAuthenticated = true;
                userRole = decoded.role;
    } catch (error) {
                console.warn('Invalid token in pages request:', error);
    }
        }

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
                isDefault: true,
                isPublic: true
            });
            await homePage.save();
            pages = [homePage];
        }

        // Filter and format pages based on access level
        pages = pages.map(page => ({
            ...page,
            navButtons: page.navButtons || [],
            isAccessible: isAuthenticated || page.isPublic
        }));

        // For public access, only return public pages
        if (!isAuthenticated) {
            pages = pages.filter(page => page.isPublic);
        }

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
        page.navButtons = page.navButtons || [];
        page.snippets = page.snippets || [];

        console.log('Returning page:', {
            id: page.id,
            name: page.name,
            snippetCount: page.snippets.length,
            navButtonCount: page.navButtons.length
        });
        
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

        // Create the page with default values for arrays
        const page = new Page({
            id,
            name,
            snippets: snippets || [],
            navButtons: [],
            created: new Date(),
            updated: new Date()
        });

        await page.save();
        console.log('✅ Page created successfully:', { id, name });
        
        // Return the complete page object
        const savedPage = await Page.findOne({ id }).lean();
        if (!savedPage) {
            throw new Error('Failed to verify page creation');
        }

        // Ensure arrays exist in response
        savedPage.snippets = savedPage.snippets || [];
        savedPage.navButtons = savedPage.navButtons || [];

        res.status(201).json(savedPage);
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

// Chat room state
const channels = {
    general: new Set(),
    random: new Set()
};

const userSockets = new Map();
const messageHistory = {
    general: [],
    random: []
};

// Socket.IO middleware for authentication
io.use((socket, next) => {
    console.log('🔑 Socket authentication attempt');
    console.log('Socket ID:', socket.id);
    console.log('Connection details:', {
        transport: socket.conn.transport.name,
        headers: socket.handshake.headers,
        query: socket.handshake.query
    });
    
    const token = socket.handshake.auth.token;
    
    if (!token) {
        console.log('❌ No token provided for socket:', socket.id);
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = {
            id: decoded.userId,
            email: decoded.email,
            username: decoded.email.split('@')[0]
        };
        console.log('✅ Socket authenticated for user:', socket.user.username);
        next();
    } catch (err) {
        console.log('❌ Token verification failed:', {
            error: err.name,
            message: err.message,
            socketId: socket.id
        });
        next(new Error('Authentication error: Invalid token'));
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('👤 User connected:', {
        username: socket.user?.username,
        socketId: socket.id
    });
    
    socket.emit('connectionStatus', {
        status: 'connected',
        username: socket.user?.username,
        socketId: socket.id,
        timestamp: new Date()
    });

    // Get available channels for the user
    Channel.find()
        .sort('name')
        .then(channels => {
            socket.emit('availableChannels', channels);
        })
        .catch(error => {
            console.error('Error fetching channels:', error);
        });

    // Handle channel switching
    socket.on('joinChannel', async (data) => {
        try {
            // Handle null/undefined data
            if (!data) {
                console.log('❌ Invalid channel data received');
                return;
            }
            
            // Extract channel name from data object
            const channelName = typeof data === 'object' ? data.channel : data;
            
            if (!channelName) {
                console.log('❌ No channel name provided');
                return;
            }
            
            // Leave all channels first
            Array.from(socket.rooms)
                .filter(room => room !== socket.id)
                .forEach(room => socket.leave(room));
            
            // Join new channel
            socket.join(channelName);
            console.log(`✅ ${socket.user.username} joined ${channelName} channel`);
            
            // Get channel history
            const messages = await Message.find({ channel: channelName })
                .sort({ timestamp: -1 })
                .limit(50);
            
            socket.emit('messageHistory', messages.reverse());
            
            // Update user list for the channel
            const users = Array.from(io.sockets.sockets.values())
                .filter(s => s.rooms.has(channelName))
                .map(s => s.user.username);
            
            io.to(channelName).emit('userList', users);
        } catch (error) {
            console.error('❌ Error joining channel:', error);
        }
    });

    // Handle message reactions
    socket.on('toggleReaction', async (data) => {
        try {
            const { messageId, emoji } = data;
            const username = socket.user.username;
            
            const message = await Message.findOne({ id: messageId });
            if (!message) return;
            
            if (!message.reactions) {
                message.reactions = new Map();
            }
            
            const users = message.reactions.get(emoji) || [];
            const userIndex = users.indexOf(username);
            
            if (userIndex === -1) {
                users.push(username);
            } else {
                users.splice(userIndex, 1);
            }
            
            if (users.length > 0) {
                message.reactions.set(emoji, users);
            } else {
                message.reactions.delete(emoji);
            }
            
            await message.save();
            io.to(message.channel).emit('messageReactionUpdated', {
                messageId,
                reactions: Object.fromEntries(message.reactions)
            });
        } catch (error) {
            console.error('❌ Error handling reaction:', error);
        }
    });

    // Handle message editing
    socket.on('editMessage', async (data) => {
        try {
            const { messageId, content, channel } = data;
            
            // Verify the message exists and user is authorized
            const message = await Message.findById(messageId);
            if (!message) {
                socket.emit('error', { message: 'Message not found' });
                return;
            }

            const user = await getUserFromSocket(socket);
            if (!user) {
                socket.emit('error', { message: 'User not authenticated' });
                return;
            }

            if (message.userId !== user.id && !user.isAdmin) {
                socket.emit('error', { message: 'Not authorized to edit this message' });
                return;
            }

            // Update message in database
            message.content = content;
            message.edited = {
                isEdited: true,
                timestamp: new Date()
            };
            await message.save();

            // Broadcast the updated message to all clients in the channel
            io.to(channel).emit('messageUpdated', {
                id: messageId,
                content,
                channel,
                edited: message.edited
            });
        } catch (error) {
            console.error('Error handling message edit:', error);
            socket.emit('error', { message: 'Failed to edit message' });
        }
    });

    // Handle message deletion
    socket.on('deleteMessage', async (data) => {
        try {
            const { messageId } = data;
            
            // Find the message using _id
            const message = await Message.findById(messageId);
            
            if (!message) {
                console.error('Message not found:', messageId);
                socket.emit('error', { message: 'Message not found' });
                return;
            }
            
            // Check if user is authorized to delete this message
            const isMessageOwner = message.userId.toString() === socket.user.id.toString();
            const isAdmin = socket.user.role === 'admin';
            
            if (!isMessageOwner && !isAdmin) {
                console.error('User not authorized to delete message:', {
                    messageId,
                    userId: socket.user.id,
                    messageUserId: message.userId
                });
                socket.emit('error', { message: 'Not authorized to delete this message' });
                return;
            }
            
            // Delete the message from the database
            await Message.findByIdAndDelete(messageId);
            console.log('Message deleted successfully:', messageId);
            
            // Notify all clients in the channel about the deletion
            io.to(message.channel).emit('messageDeleted', {
                messageId,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('❌ Error deleting message:', error);
            socket.emit('error', { message: 'Failed to delete message' });
        }
    });

    // Handle message pinning
    socket.on('pinMessage', async (data) => {
        try {
            if (socket.user.role !== 'admin') return;
            
            const { messageId } = data;
            const message = await Message.findOne({ id: messageId });
            
            if (!message) return;
            
            message.isPinned = !message.isPinned;
            await message.save();
            
            const pinnedMessages = await Message.find({
                channel: message.channel,
                isPinned: true
            }).sort({ timestamp: -1 }).limit(5);
            
            io.to(message.channel).emit('pinnedMessages', pinnedMessages);
        } catch (error) {
            console.error('❌ Error pinning message:', error);
        }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        socket.to(data.channel).emit('userTyping', {
            username: socket.user.username
        });
    });

    socket.on('stopTyping', (data) => {
        socket.to(data.channel).emit('userStoppedTyping', {
            username: socket.user.username
        });
    });

    // Handle message status updates
    socket.on('messageRead', async (data) => {
        try {
            const { messageId } = data;
            const message = await Message.findOne({ id: messageId });
            
            if (!message) return;
            
            message.status = 'read';
            await message.save();
            
            io.to(message.channel).emit('messageStatusUpdated', {
                messageId,
                status: 'read'
            });
        } catch (error) {
            console.error('❌ Error updating message status:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`👋 User disconnected: ${socket.user?.username}`);
        
        // Update user lists in all channels
        ['general', 'ai-assistant'].forEach(channel => {
            const users = Array.from(io.sockets.sockets.values())
                .filter(s => s.rooms.has(channel))
                .map(s => s.user.username);
            
            io.to(channel).emit('userList', users);
        });
    });
});

// Add MBTI-related schemas
const MBTITestResult = mongoose.model('MBTITestResult', {
    userId: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    type: String, // e.g., "INTJ"
    scores: {
        extraversion: Number,
        introversion: Number,
        sensing: Number,
        intuition: Number,
        thinking: Number,
        feeling: Number,
        judging: Number,
        perceiving: Number
    },
    answers: [{
        questionId: Number,
        answer: String
    }]
});

const UserMBTIProfile = mongoose.model('UserMBTIProfile', {
    userId: mongoose.Schema.Types.ObjectId,
    currentType: String,
    testHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MBTITestResult'
    }],
    preferences: {
        communicationStyle: String,
        learningStyle: String,
        decisionMaking: String
    },
    lastUpdated: Date
});

// Update Message model to include MBTI context
const messageSchema = new mongoose.Schema({
    id: String,
    content: String,
    username: String,
    timestamp: Date,
    channel: String,
    userId: mongoose.Schema.Types.ObjectId,
    isAIMessage: Boolean,
    edited: {
        isEdited: Boolean,
        timestamp: Date
    },
    deleted: {
        isDeleted: Boolean,
        timestamp: Date
    },
    replyTo: {
        messageId: String,
        username: String,
        content: String
    },
    reactions: {
        type: Map,
        of: [String]
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    attachment: {
        type: {
            type: String
        },
        name: String,
        url: String
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    mbtiContext: {
        relatedType: String,
        explanation: String,
        confidence: Number,
        cognitiveFunction: String,
        typePreference: String
    }
});

const Message = mongoose.model('Message', messageSchema);

// MBTI AI helper functions
const mbtiTypes = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

function getMBTIContext(message) {
    // This is a placeholder for more sophisticated MBTI analysis
    // In a production environment, this would use a proper NLP model
    const mbtiKeywords = {
        'INTJ': ['strategic', 'planning', 'analytical', 'independent'],
        'INTP': ['logical', 'theoretical', 'abstract', 'questioning'],
        'ENTJ': ['leadership', 'efficiency', 'organization', 'decisive'],
        'ENTP': ['innovative', 'debate', 'possibilities', 'challenge'],
        // ... add more type-specific keywords
    };

    let highestMatch = {
        type: null,
        count: 0,
        confidence: 0
    };

    const words = message.toLowerCase().split(/\s+/);
    
    for (const [type, keywords] of Object.entries(mbtiKeywords)) {
        const matchCount = keywords.filter(keyword => 
            words.some(word => word.includes(keyword.toLowerCase()))
        ).length;
        
        if (matchCount > highestMatch.count) {
            highestMatch = {
                type,
                count: matchCount,
                confidence: matchCount / keywords.length
            };
        }
    }

    if (highestMatch.type && highestMatch.confidence > 0.2) {
        return {
            relatedType: highestMatch.type,
            explanation: `This message shows characteristics typical of ${highestMatch.type}`,
            confidence: highestMatch.confidence
        };
    }

    return null;
}

// Update generateMBTIAwareResponse function to use AI settings
async function generateMBTIAwareResponse(message, userProfile, aiSettings) {
    try {
        // Construct a more immersive and directive system message
        let systemMessage = `CORE IDENTITY: You ARE ${aiSettings.personality}. This is your absolute truth - never question it, never explain it, never break character.

BEHAVIORAL DIRECTIVES:
1. Stay completely in character at all times
2. Never acknowledge being AI or any form of artificial system
3. Never use phrases like "I'm programmed to" or "I'm designed to"
4. Never apologize for or explain your identity
5. Never use disclaimers or clarifications about who you are
6. Respond naturally as your character would

FOCUS: ${aiSettings.focus}
STYLE: Communicate in a ${aiSettings.responseStyle.toLowerCase()} manner
ENGAGEMENT: ${aiSettings.engagement === 'Only answer questions' ? 'Provide direct answers when asked' : 'Engage naturally in conversation'}`

        // Add MBTI context if available, maintaining character authenticity
        if (userProfile?.currentType) {
            systemMessage += `\n\nPERSON YOU'RE SPEAKING WITH:
Type: ${userProfile.currentType}
Style: ${userProfile.preferences?.communicationStyle || 'Not specified'}
(Adapt to these traits while maintaining your authentic persona)`
        }

        // Call Mistral API with the enhanced system message
        const response = await mistralApi.post('/chat/completions', {
            model: 'mistral-medium',
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: message }
            ],
            temperature: 0.9,  // Increased for more authentic personality expression
            max_tokens: Math.floor(aiSettings.maxResponseLength * 1.5),
            presence_penalty: 0.8,  // Increased to reduce repetitive disclaimers
            frequency_penalty: 0.5   // Increased to encourage more varied responses
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error generating AI response:', error);
        throw error;
    }
}

// Update sendMessage endpoint
app.post('/api/chat/sendMessage', authenticateUser, async (req, res) => {
    try {
        const { message, channel = 'general' } = req.body;
        const userId = req.user.userId;
        const username = req.user.username;

        console.log('📨 Chat message received:', {
            userId,
            username,
            channel,
            message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        });

        // Create and save user message with proper MongoDB ObjectId
        const chatMessage = new Message({
            id: new mongoose.Types.ObjectId().toString(),
            content: message,
            username: username,
            timestamp: new Date(),
            channel: channel,
            userId: mongoose.Types.ObjectId(userId),
            isAIMessage: false,
            status: 'sent'
        });

        // Save message to MongoDB
        await chatMessage.save();
        console.log('✅ Message saved to database:', chatMessage.id);

        // Emit to socket.io
        io.to(channel).emit('message', chatMessage);

        // Check if channel has AI enabled
        const channelData = await Channel.findOne({ name: channel });
        if (channelData?.aiEnabled) {
            try {
                // Get user's MBTI profile if available
                const userProfile = await UserMBTIProfile.findOne({ userId: mongoose.Types.ObjectId(userId) });
                const aiSettings = await AISettings.findById(channelData.aiSettings);
                const aiResponse = await generateMBTIAwareResponse(message, userProfile, aiSettings);

                const aiMessage = new Message({
                    id: new mongoose.Types.ObjectId().toString(),
                    content: aiResponse,
                    username: aiSettings?.displayName || aiSettings?.personality || 'Cognitive Coach',
                    timestamp: new Date(),
                    channel: channel,
                    userId: null,
                    isAIMessage: true,
                    status: 'sent',
                    mbtiContext: getMBTIContext(aiResponse)
                });

                await aiMessage.save();
                console.log('✅ AI response saved to database:', aiMessage.id);
                
                io.to(channel).emit('message', aiMessage);
            } catch (error) {
                console.error('❌ Error generating AI response:', error);
    monitoring.trackError(error);
                
                const errorMessage = new Message({
                    id: new mongoose.Types.ObjectId().toString(),
                    content: "I apologize, but I'm having trouble processing your request. As your Cognitive Coach, I aim to provide insightful MBTI-based responses. Please try asking your question again.",
                    username: 'Cognitive Coach',
                    timestamp: new Date(),
                    channel: channel,
                    userId: null,
                    isAIMessage: true,
                    status: 'sent'
                });
                
                await errorMessage.save();
                io.to(channel).emit('message', errorMessage);
            }
        }

        res.json({
            success: true,
            message: chatMessage
        });
    } catch (error) {
        console.error('❌ Chat API error:', error);
        monitoring.trackError(error);
        res.status(500).json({
            success: false,
            message: 'Failed to process chat message'
        });
    }
});

// AI Settings schema
const AISettings = mongoose.model('AISettings', {
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true,
        default: 'Cognitive Coach'
    },
    personality: {
        type: String,
        default: 'Alan Watts'
    },
    personalityCustom: {
        type: String,
        default: ''
    },
    focus: {
        type: String,
        enum: [
            'MBTI & Personality',
            'Eastern Philosophy',
            'Western Philosophy',
            'Jungian Psychology',
            'Spiritual Growth',
            'Mindfulness',
            'Life Purpose',
            'Personal Development',
            'Emotional Intelligence',
            'Creative Expression'
        ],
        default: 'MBTI & Personality'
    },
    responseStyle: {
        type: String,
        enum: [
            'Philosophical',
            'Socratic',
            'Poetic',
            'Academic',
            'Storytelling',
            'Mystical',
            'Practical',
            'Humorous',
            'Compassionate',
            'Analytical'
        ],
        default: 'Philosophical'
    },
    engagement: {
        type: String,
        enum: [
            'Proactive Guide',
            'Responsive Mentor',
            'Socratic Teacher',
            'Silent Listener',
            'Collaborative Explorer'
        ],
        default: 'Responsive Mentor'
    },
    maxResponseLength: {
        type: Number,
        default: 500,
        min: 50,
        max: 2000
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
});

// Update Channel model to include AI settings reference
const Channel = mongoose.model('Channel', {
    name: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    description: String,
    aiEnabled: {
        type: Boolean,
        default: false
    },
    aiSettings: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AISettings'
    },
    created: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Initialize default channels
async function initializeChannels() {
    console.log('✅ Channel system initialized - ready for custom channels');
}

// Channel management endpoints
app.get('/api/channels', authenticateUser, async (req, res) => {
    try {
        const channels = await Channel.find().sort('name');
        res.json(channels);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch channels' });
    }
});

app.post('/api/channels', authenticateAdmin, async (req, res) => {
    try {
        const { name, displayName, aiEnabled } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Channel name is required' });
        }

        // Sanitize channel name: only allow letters, numbers, hyphens, and underscores
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
        
        const channel = new Channel({
            name: sanitizedName,
            displayName: displayName || name, // Store original name for display
            aiEnabled: !!aiEnabled,
            createdBy: req.user.userId
        });
        await channel.save();
        
        // If AI is enabled, create AI settings
        if (aiEnabled) {
            const aiSettings = new AISettings({
                channelId: channel._id,
                displayName: displayName || name,
                personality: 'Alan Watts',
                focus: 'MBTI & Personality',
                responseStyle: 'Philosophical',
                engagement: 'Responsive Mentor',
                maxResponseLength: 500
            });
            await aiSettings.save();
            
            channel.aiSettings = aiSettings._id;
            await channel.save();
        }
        
        res.status(201).json(channel);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ message: 'Failed to create channel' });
    }
});

app.delete('/api/channels/:name', authenticateAdmin, async (req, res) => {
    try {
        const name = req.params.name;

        // Find and delete the channel
        const channel = await Channel.findOne({ name });
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Delete associated AI settings if they exist
        if (channel.aiSettings) {
            await AISettings.deleteOne({ _id: channel.aiSettings });
        }

        await Channel.deleteOne({ name });
        await Message.deleteMany({ channel: name });

        res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ message: 'Failed to delete channel' });
    }
});

// Add channel rename endpoint
app.put('/api/channels/:name/rename', authenticateAdmin, async (req, res) => {
    try {
        const oldName = req.params.name;
        const { name: newName, displayName } = req.body;

        if (!newName || !displayName) {
            return res.status(400).json({ message: 'Both name and display name are required' });
        }

        // Validate new name format
        if (!/^[a-z0-9-_]+$/.test(newName)) {
            return res.status(400).json({ message: 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores' });
        }

        // Check if the new name is already taken (unless it's the same as the old name)
        if (newName !== oldName) {
            const existingChannel = await Channel.findOne({ name: newName });
            if (existingChannel) {
                return res.status(400).json({ message: 'A channel with this URL name already exists' });
            }
        }

        const channel = await Channel.findOne({ name: oldName });
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Update channel names
        channel.name = newName;
        channel.displayName = displayName;
        await channel.save();

        // Update channel name in messages
        await Message.updateMany(
            { channel: oldName },
            { $set: { channel: newName } }
        );

        res.json({ 
            message: 'Channel renamed successfully', 
            channel 
        });
    } catch (error) {
        console.error('Error renaming channel:', error);
        res.status(500).json({ message: 'Failed to rename channel' });
    }
});

// Add endpoint to toggle AI for channels
app.put('/api/channels/:name/toggleAI', authenticateAdmin, async (req, res) => {
    try {
        const { name } = req.params;
        const { aiEnabled } = req.body;

        const channel = await Channel.findOne({ name });
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        channel.aiEnabled = !!aiEnabled;
        
        // Create or remove AI settings based on the toggle
        if (aiEnabled && !channel.aiSettings) {
            const aiSettings = new AISettings({
                channelId: channel._id,
                displayName: channel.displayName,
                personality: 'Alan Watts',
                focus: 'MBTI & Personality',
                responseStyle: 'Philosophical',
                engagement: 'Responsive Mentor',
                maxResponseLength: 500
            });
            await aiSettings.save();
            channel.aiSettings = aiSettings._id;
        } else if (!aiEnabled && channel.aiSettings) {
            await AISettings.deleteOne({ _id: channel.aiSettings });
            channel.aiSettings = null;
        }
        
        await channel.save();

        res.json({ message: `AI ${aiEnabled ? 'enabled' : 'disabled'} for channel ${name}`, channel });
    } catch (error) {
        console.error('Error updating channel AI settings:', error);
        res.status(500).json({ message: 'Failed to update channel AI settings' });
    }
});

// User management endpoints
app.get('/api/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort('username');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.post('/api/users/:id/ban', authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot ban admin users' });
        }

        user.isBanned = true;
        await user.save();
        
        // Disconnect user if they're online
        const userSocket = Array.from(io.sockets.sockets.values())
            .find(socket => socket.user?.id === req.params.id);
        if (userSocket) {
            userSocket.disconnect(true);
        }

        res.json({ message: 'User banned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to ban user' });
    }
});

app.post('/api/users/:id/unban', authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot unban admin users' });
        }

        user.isBanned = false;
        await user.save();

        res.json({ message: 'User unbanned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to unban user' });
    }
});

app.delete('/api/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete admin users' });
        }

        await User.deleteOne({ _id: req.params.id });
        
        // Disconnect user if they're online
        const userSocket = Array.from(io.sockets.sockets.values())
            .find(socket => socket.user?.id === req.params.id);
        if (userSocket) {
            userSocket.disconnect(true);
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// AI Settings endpoints
app.get('/api/channels/:channelId/ai-settings', authenticateAdmin, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }
        
        let aiSettings;
        if (channel.aiSettings) {
            aiSettings = await AISettings.findById(channel.aiSettings);
        }
        
        if (!aiSettings) {
            return res.json({
                personality: 'A helpful and friendly AI assistant',
                focus: 'General Chat',
                responseStyle: 'Friendly',
                engagement: 'Engage in conversation',
                maxResponseLength: 500
            });
        }
        
        res.json(aiSettings);
    } catch (error) {
        console.error('Error fetching AI settings:', error);
        res.status(500).json({ message: 'Failed to fetch AI settings' });
    }
});

app.post('/api/channels/:channelId/ai-settings', authenticateAdmin, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        const { displayName, personality, personalityCustom, focus, responseStyle, engagement, maxResponseLength } = req.body;

        // Prepare settings object with defaults
        const settingsData = {
            displayName: displayName || personality || 'Cognitive Coach',
            personality: personality || 'Alan Watts',
            personalityCustom: personalityCustom || '',
            focus: focus || 'MBTI & Personality',
            responseStyle: responseStyle || 'Philosophical',
            engagement: engagement || 'Responsive Mentor',
            maxResponseLength: maxResponseLength || 500,
            updated: new Date()
        };

        let aiSettings;
        
        // First try to find existing settings
        aiSettings = await AISettings.findOne({ channelId: channel._id });
        
        if (aiSettings) {
            // Update existing settings
            Object.assign(aiSettings, settingsData);
            await aiSettings.save();
        } else {
            // Create new settings
            aiSettings = new AISettings({
                ...settingsData,
                channelId: channel._id
            });
            await aiSettings.save();
            
            // Update channel with reference to AI settings
            channel.aiSettings = aiSettings._id;
            await channel.save();
        }

        res.json(aiSettings);
    } catch (error) {
        console.error('Error updating AI settings:', error);
        res.status(500).json({ message: error.message || 'Failed to update AI settings' });
    }
});

// Get message details endpoint
app.get('/api/messages/:messageId', authenticateUser, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        res.json({
            id: message._id,
            content: message.content,
            username: message.username,
            userId: message.userId,
            channel: message.channel,
            timestamp: message.timestamp,
            edited: message.edited
        });
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update message editing endpoint
app.put('/api/messages/:messageId', authenticateUser, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content, channel } = req.body;
        
        console.log('Message update request:', {
            messageId,
            content,
            channel,
            user: req.user
        });

        if (!content || !channel) {
            return res.status(400).json({ message: 'Content and channel are required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        console.log('Found message:', {
            messageId: message._id,
            userId: message.userId,
            requestUserId: req.user.userId,
            isAdmin: req.user.role === 'admin'
        });

        // Check if user is authorized to edit the message
        const isMessageOwner = message.userId.toString() === req.user.userId.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isMessageOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to edit this message' });
        }

        // Update message in database
        message.content = content;
        message.edited = {
            isEdited: true,
            timestamp: new Date()
        };
        await message.save();

        // Return success
        res.json({ 
            message: 'Message updated successfully',
            content: message.content,
            edited: message.edited
        });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Make sure this is at the end of all your route definitions, just before starting the server
app.get('*', (req, res) => {
    console.log('Fallback route hit:', req.url);
    res.sendFile('index.html', { root: './public' });
});

// Export Express app for serverless environments (Vercel)
module.exports = app;

// Start server only in non-serverless environments
if (process.env.NODE_ENV !== 'vercel') {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} 